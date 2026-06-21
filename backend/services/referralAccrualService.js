/**
 * Monthly referral accrual (TRI/TRO net, 3-tier, brand rules).
 */

const { pool } = require("../config/database");
const { pktMonthBoundsUtc, pktPreviousMonthYm, pktYmdForInstant } = require("../utils/pakistanTime");
const { getProgramSettings, resolveTierRate } = require("./referralRates");
const { getUplineEarners } = require("./referralUpline");
const { loadAllBrandRules, resolveBrandIncludedAt } = require("./referralBrandRules");

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Fetch approved transfers in month with brand_id (unlinked excluded per B5).
 */
async function fetchMonthTransfers(monthYm) {
  const { start, end } = pktMonthBoundsUtc(monthYm);
  const [rows] = await pool.query(
    `SELECT tt.client_id, tt.direction, tt.amount, tt.updated_at, b.id AS brand_id
     FROM transfer_tickets tt
     INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
     INNER JOIN brands b ON b.id = bc.brand_id
     WHERE tt.status = 'approved'
       AND tt.updated_at >= ? AND tt.updated_at <= ?`,
    [start, end]
  );
  return rows || [];
}

/**
 * Aggregate TRI/TRO per source client (clients.id) for month after brand filtering.
 */
function aggregateNetByClient(transfers, allBrandRules, clientIdByUserId) {
  const byUserId = new Map();

  for (const t of transfers) {
    const userId = Number(t.client_id);
    if (!byUserId.has(userId)) {
      byUserId.set(userId, []);
    }
    byUserId.get(userId).push(t);
  }

  const result = new Map();
  for (const [userId, userTransfers] of byUserId) {
    const sourceClientId = clientIdByUserId.get(userId);
    if (!sourceClientId) continue;
    result.set(sourceClientId, computeNetForSourceClient(sourceClientId, userTransfers, allBrandRules));
  }
  return result;
}

function earnerCanAccrue(earnerRow) {
  if (!earnerRow) return false;
  if (earnerRow.referrer_status === "disabled" && earnerRow.referrer_stop_accruals) {
    return false;
  }
  return true;
}

async function getClientIdForUserId(userId) {
  const [[row]] = await pool.query("SELECT id FROM clients WHERE user_id = ? LIMIT 1", [userId]);
  return row?.id ?? null;
}

async function buildClientIdByUserIdMap(userIds) {
  const map = new Map();
  const ids = [...new Set(userIds.filter((id) => id != null))];
  if (!ids.length) return map;
  const [rows] = await pool.query("SELECT id, user_id FROM clients WHERE user_id IN (?)", [ids]);
  for (const row of rows || []) {
    map.set(Number(row.user_id), Number(row.id));
  }
  return map;
}

function computeNetForSourceClient(sourceClientId, transfers, allBrandRules) {
  let tri = 0;
  let tro = 0;

  for (const t of transfers || []) {
    const brandId = Number(t.brand_id);
    const at = new Date(t.updated_at);
    if (!resolveBrandIncludedAt(sourceClientId, brandId, at, allBrandRules)) continue;

    const amt = Number(t.amount) || 0;
    if (String(t.direction).toUpperCase() === "IN") tri += amt;
    else if (String(t.direction).toUpperCase() === "OUT") tro += amt;
  }

  return {
    transferIn: roundMoney(tri),
    transferOut: roundMoney(tro),
    net: roundMoney(tri - tro),
  };
}

async function upsertAccrualsForSourceClient(sourceClientId, monthYm, totals, settings) {
  const earners = await getUplineEarners(sourceClientId);
  let rowsWritten = 0;
  const { transferIn, transferOut, net } = totals;

  for (const { tier, clientId: earnerId } of earners) {
    const [[earner]] = await pool.query("SELECT * FROM clients WHERE id = ? LIMIT 1", [earnerId]);
    if (!earnerCanAccrue(earner)) continue;

    const rate = resolveTierRate(settings, earner, tier);
    const amount = roundMoney((net * rate) / 100);

    await pool.query(
      `INSERT INTO referral_accruals
        (earner_client_id, source_client_id, tier, accrual_month,
         transfer_in_total, transfer_out_total, net_base, rate_applied, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE
         transfer_in_total = VALUES(transfer_in_total),
         transfer_out_total = VALUES(transfer_out_total),
         net_base = VALUES(net_base),
         rate_applied = VALUES(rate_applied),
         amount = VALUES(amount)`,
      [earnerId, sourceClientId, tier, monthYm, transferIn, transferOut, net, rate, amount]
    );
    rowsWritten += 1;
  }

  return rowsWritten;
}

/**
 * Recalculate referral accruals for one source client and Karachi month.
 */
async function recalculateAccrualsForSourceClient(sourceClientId, monthYm, settings = null) {
  const activeSettings = settings || (await getProgramSettings());
  if (!activeSettings?.is_enabled) {
    return { skipped: true, reason: "program_disabled" };
  }

  const startMonth = activeSettings.accrual_start_month;
  if (startMonth && String(monthYm) < String(startMonth)) {
    return { skipped: true, reason: "before_go_live", monthYm };
  }

  const [[clientRow]] = await pool.query("SELECT user_id FROM clients WHERE id = ? LIMIT 1", [
    sourceClientId,
  ]);
  if (!clientRow?.user_id) {
    return { skipped: true, reason: "client_not_found" };
  }

  const { start, end } = pktMonthBoundsUtc(monthYm);
  const [transfers] = await pool.query(
    `SELECT tt.client_id, tt.direction, tt.amount, tt.updated_at, b.id AS brand_id
     FROM transfer_tickets tt
     INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
     INNER JOIN brands b ON b.id = bc.brand_id
     WHERE tt.status = 'approved'
       AND tt.client_id = ?
       AND tt.updated_at >= ? AND tt.updated_at <= ?`,
    [clientRow.user_id, start, end]
  );

  const allBrandRules = await loadAllBrandRules();
  const totals = computeNetForSourceClient(sourceClientId, transfers, allBrandRules);
  const rowsWritten = await upsertAccrualsForSourceClient(
    sourceClientId,
    monthYm,
    totals,
    activeSettings
  );

  return { ok: true, sourceClientId, monthYm, rowsWritten, ...totals };
}

/**
 * After a transfer ticket is approved, refresh accruals for that client/month.
 */
async function recalculateReferralAccrualsAfterTransferApproval(userId, approvedAt = new Date()) {
  const settings = await getProgramSettings();
  if (!settings?.is_enabled) {
    return { skipped: true, reason: "program_disabled" };
  }

  const monthYm = pktYmdForInstant(approvedAt).slice(0, 7);
  const sourceClientId = await getClientIdForUserId(userId);
  if (!sourceClientId) {
    return { skipped: true, reason: "not_a_client" };
  }

  return recalculateAccrualsForSourceClient(sourceClientId, monthYm, settings);
}

/**
 * Run accrual for a single Karachi month (YYYY-MM).
 */
async function runAccrualForMonth(monthYm) {
  const settings = await getProgramSettings();
  if (!settings?.is_enabled) {
    return { skipped: true, reason: "program_disabled" };
  }

  const startMonth = settings.accrual_start_month;
  if (startMonth && String(monthYm) < String(startMonth)) {
    return { skipped: true, reason: "before_go_live", monthYm };
  }

  const [[existing]] = await pool.query(
    "SELECT id, status FROM referral_accrual_runs WHERE accrual_month = ? LIMIT 1",
    [monthYm]
  );
  if (existing?.status === "completed") {
    return { skipped: true, reason: "already_completed", monthYm };
  }

  const [runResult] = await pool.query(
    `INSERT INTO referral_accrual_runs (accrual_month, status)
     VALUES (?, 'running')
     ON DUPLICATE KEY UPDATE status = 'running', started_at = CURRENT_TIMESTAMP, error_message = NULL`,
    [monthYm]
  );

  let rowsWritten = 0;

  try {
    const allBrandRules = await loadAllBrandRules();
    const transfers = await fetchMonthTransfers(monthYm);
    const clientIdByUserId = await buildClientIdByUserIdMap(transfers.map((t) => t.client_id));
    const netsByClient = aggregateNetByClient(transfers, allBrandRules, clientIdByUserId);

    for (const [sourceClientId, totals] of netsByClient) {
      rowsWritten += await upsertAccrualsForSourceClient(sourceClientId, monthYm, totals, settings);
    }

    await pool.query(
      `UPDATE referral_accrual_runs
       SET status = 'completed', rows_written = ?, finished_at = CURRENT_TIMESTAMP, error_message = NULL
       WHERE accrual_month = ?`,
      [rowsWritten, monthYm]
    );

    return { ok: true, monthYm, rowsWritten };
  } catch (err) {
    await pool.query(
      `UPDATE referral_accrual_runs
       SET status = 'failed', error_message = ?, finished_at = CURRENT_TIMESTAMP
       WHERE accrual_month = ?`,
      [String(err.message || err).slice(0, 2000), monthYm]
    );
    throw err;
  }
}

/**
 * On the 1st of each Karachi month, process the previous month once.
 */
async function runReferralAccrualTick() {
  const settings = await getProgramSettings();
  if (!settings?.is_enabled) return { skipped: true, reason: "program_disabled" };

  const todayYmd = pktYmdForInstant();
  const day = Number(todayYmd.split("-")[2]);
  if (day !== 1) {
    return { skipped: true, reason: "not_first_of_month" };
  }

  const prevMonth = pktPreviousMonthYm();
  return runAccrualForMonth(prevMonth);
}

module.exports = {
  runAccrualForMonth,
  runReferralAccrualTick,
  fetchMonthTransfers,
  aggregateNetByClient,
  recalculateAccrualsForSourceClient,
  recalculateReferralAccrualsAfterTransferApproval,
};

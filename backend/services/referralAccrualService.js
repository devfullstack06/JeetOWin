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
 * Aggregate TRI/TRO per source client for month after brand filtering.
 */
function aggregateNetByClient(transfers, allBrandRules) {
  const byClient = new Map();

  for (const t of transfers) {
    const clientId = Number(t.client_id);
    const brandId = Number(t.brand_id);
    const at = new Date(t.updated_at);
    if (!resolveBrandIncludedAt(clientId, brandId, at, allBrandRules)) continue;

    if (!byClient.has(clientId)) {
      byClient.set(clientId, { tri: 0, tro: 0 });
    }
    const bucket = byClient.get(clientId);
    const amt = Number(t.amount) || 0;
    if (String(t.direction).toUpperCase() === "IN") bucket.tri += amt;
    else if (String(t.direction).toUpperCase() === "OUT") bucket.tro += amt;
  }

  const result = new Map();
  for (const [clientId, { tri, tro }] of byClient) {
    result.set(clientId, {
      transferIn: roundMoney(tri),
      transferOut: roundMoney(tro),
      net: roundMoney(tri - tro),
    });
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
    const netsByClient = aggregateNetByClient(transfers, allBrandRules);

    const earnerCache = new Map();

    async function loadEarner(clientId) {
      if (earnerCache.has(clientId)) return earnerCache.get(clientId);
      const [[row]] = await pool.query("SELECT * FROM clients WHERE id = ? LIMIT 1", [clientId]);
      earnerCache.set(clientId, row || null);
      return row;
    }

    for (const [sourceClientId, { transferIn, transferOut, net }] of netsByClient) {
      const earners = await getUplineEarners(sourceClientId);

      for (const { tier, clientId: earnerId } of earners) {
        const earner = await loadEarner(earnerId);
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
          [
            earnerId,
            sourceClientId,
            tier,
            monthYm,
            transferIn,
            transferOut,
            net,
            rate,
            amount,
          ]
        );
        rowsWritten += 1;
      }
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
};

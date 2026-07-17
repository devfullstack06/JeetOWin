/**
 * Affiliate commission calculation from approved transfer tickets.
 * Formula: (TRI - TRO - bonus) * rate / 100. Bonus is 0 in v1.
 */

const { pool } = require("../config/database");
const {
  pktYmdForInstant,
  pktDayBoundsUtc,
  pktMonthBoundsUtc,
  pktCalendarAddDays,
  pktLastDayOfMonthYmd,
} = require("../utils/pakistanTime");
const { roundMoney } = require("./affiliateBalanceService");

async function fetchPlayerTransfersForPeriod(playerUserId, start, end) {
  const [rows] = await pool.query(
    `SELECT direction, amount, updated_at
     FROM transfer_tickets
     WHERE client_id = ?
       AND status = 'approved'
       AND updated_at >= ? AND updated_at <= ?`,
    [playerUserId, start, end]
  );
  return rows || [];
}

function sumTransfers(rows) {
  let transferIn = 0;
  let transferOut = 0;
  for (const t of rows || []) {
    const amt = Number(t.amount) || 0;
    if (String(t.direction).toUpperCase() === "IN") transferIn += amt;
    else if (String(t.direction).toUpperCase() === "OUT") transferOut += amt;
  }
  const bonusPaid = 0;
  const net = roundMoney(transferIn - transferOut - bonusPaid);
  return {
    transferIn: roundMoney(transferIn),
    transferOut: roundMoney(transferOut),
    bonusPaid,
    net,
  };
}

function computeMaturityAt(periodEndYmd, maturityDays) {
  const maturedYmd = pktCalendarAddDays(periodEndYmd, Number(maturityDays) || 30);
  return pktDayBoundsUtc(maturedYmd).end;
}

function monthPeriodForInstant(instant = new Date()) {
  const ym = pktYmdForInstant(instant).slice(0, 7);
  const startYmd = `${ym}-01`;
  const endYmd = pktLastDayOfMonthYmd(ym);
  const { start } = pktMonthBoundsUtc(ym);
  const { end } = pktDayBoundsUtc(endYmd);
  return { ym, startYmd, endYmd, start, end };
}

async function getAffiliatePlayerLink(playerUserId) {
  const [[row]] = await pool.query(
    `SELECT ap.id AS affiliate_id, ap.commission_maturity_days, ap.status AS affiliate_status,
            ap.plan_id, acp.commission_percent, ap2.id AS player_row_id, ap2.client_id, ap2.user_id
     FROM affiliate_players ap2
     INNER JOIN affiliate_profiles ap ON ap.id = ap2.affiliate_id
     INNER JOIN affiliate_commission_plans acp ON acp.id = ap.plan_id
     WHERE ap2.user_id = ? AND ap2.status = 'active'
     LIMIT 1`,
    [playerUserId]
  );
  return row || null;
}

async function upsertCommissionForPlayerPeriod(link, period, totals) {
  const rate = Number(link.commission_percent) || 0;
  const commissionAmount = roundMoney((totals.net * rate) / 100);
  const maturityAt = computeMaturityAt(period.endYmd, link.commission_maturity_days);

  await pool.query(
    `INSERT INTO affiliate_commissions
      (affiliate_id, player_user_id, client_id, period_start, period_end,
       transfer_in_total, transfer_out_total, bonus_paid_total, net_amount,
       commission_percent, commission_amount, maturity_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
     ON DUPLICATE KEY UPDATE
       transfer_in_total = VALUES(transfer_in_total),
       transfer_out_total = VALUES(transfer_out_total),
       bonus_paid_total = VALUES(bonus_paid_total),
       net_amount = VALUES(net_amount),
       commission_percent = VALUES(commission_percent),
       commission_amount = VALUES(commission_amount),
       maturity_at = VALUES(maturity_at),
       updated_at = NOW()`,
    [
      link.affiliate_id,
      link.user_id,
      link.client_id,
      period.startYmd,
      period.endYmd,
      totals.transferIn,
      totals.transferOut,
      totals.bonusPaid,
      totals.net,
      rate,
      commissionAmount,
      maturityAt,
    ]
  );
}

async function markFirstTransferIn(playerUserId, at = new Date()) {
  await pool.query(
    `UPDATE affiliate_players
     SET first_transfer_in_at = COALESCE(first_transfer_in_at, ?)
     WHERE user_id = ?`,
    [at, playerUserId]
  );
}

/**
 * Recalculate current Karachi month commission for a referred player after transfer approval.
 * @param {number} playerUserId - users.id (transfer_tickets.client_id)
 * @param {Date} [at]
 */
async function recalculateAffiliateCommissionAfterTransferApproval(playerUserId, at = new Date()) {
  const link = await getAffiliatePlayerLink(playerUserId);
  if (!link || link.affiliate_status !== "active") return { updated: false };

  const period = monthPeriodForInstant(at);
  const transfers = await fetchPlayerTransfersForPeriod(playerUserId, period.start, period.end);
  const totals = sumTransfers(transfers);
  await upsertCommissionForPlayerPeriod(link, period, totals);

  const hasIn = transfers.some((t) => String(t.direction).toUpperCase() === "IN");
  if (hasIn) await markFirstTransferIn(playerUserId, at);

  return { updated: true, affiliateId: link.affiliate_id, period: period.ym, totals };
}

module.exports = {
  fetchPlayerTransfersForPeriod,
  sumTransfers,
  computeMaturityAt,
  monthPeriodForInstant,
  recalculateAffiliateCommissionAfterTransferApproval,
  getAffiliatePlayerLink,
};

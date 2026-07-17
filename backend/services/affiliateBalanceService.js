/**
 * Affiliate available balance = matured approved commissions - paid withdrawals - pending withdrawals.
 */

const { pool } = require("../config/database");

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

async function getAffiliateBalanceSummary(affiliateId) {
  const [[approved]] = await pool.query(
    `SELECT COALESCE(SUM(commission_amount), 0) AS total
     FROM affiliate_commissions
     WHERE affiliate_id = ?
       AND status = 'approved'
       AND maturity_at <= NOW()`,
    [affiliateId]
  );

  const [[paid]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM affiliate_withdrawals
     WHERE affiliate_id = ? AND status = 'paid'`,
    [affiliateId]
  );

  const [[pendingWd]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM affiliate_withdrawals
     WHERE affiliate_id = ? AND status IN ('pending', 'approved')`,
    [affiliateId]
  );

  const [[pendingComm]] = await pool.query(
    `SELECT COALESCE(SUM(commission_amount), 0) AS total
     FROM affiliate_commissions
     WHERE affiliate_id = ? AND status = 'pending'`,
    [affiliateId]
  );

  const [[approvedNotMatured]] = await pool.query(
    `SELECT COALESCE(SUM(commission_amount), 0) AS total
     FROM affiliate_commissions
     WHERE affiliate_id = ?
       AND status = 'approved'
       AND maturity_at > NOW()`,
    [affiliateId]
  );

  const approvedTotal = roundMoney(approved?.total || 0);
  const paidTotal = roundMoney(paid?.total || 0);
  const pendingWithdrawals = roundMoney(pendingWd?.total || 0);
  const available = roundMoney(approvedTotal - paidTotal - pendingWithdrawals);

  return {
    approvedCommissions: approvedTotal,
    paidWithdrawals: paidTotal,
    pendingWithdrawals,
    pendingCommissions: roundMoney(pendingComm?.total || 0),
    approvedNotMatured: roundMoney(approvedNotMatured?.total || 0),
    availableBalance: available,
  };
}

module.exports = {
  getAffiliateBalanceSummary,
  roundMoney,
};

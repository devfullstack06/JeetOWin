const { pool } = require("../../config/database");
const { parseAffiliateDateRange } = require("../../utils/affiliateDateRanges");
const { getAffiliateBalanceSummary } = require("../../services/affiliateBalanceService");

exports.getAffiliateDashboard = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const range = parseAffiliateDateRange(req.query);
    const balance = await getAffiliateBalanceSummary(affiliate.id);

    const [[clicks]] = await pool.query(
      `SELECT COUNT(*) AS c FROM affiliate_clicks
       WHERE affiliate_id = ? AND created_at >= ? AND created_at <= ?`,
      [affiliate.id, range.start, range.end]
    );

    const [[regs]] = await pool.query(
      `SELECT COUNT(*) AS c FROM affiliate_players
       WHERE affiliate_id = ? AND registered_at >= ? AND registered_at <= ?`,
      [affiliate.id, range.start, range.end]
    );

    const [[activePlayers]] = await pool.query(
      `SELECT COUNT(*) AS c FROM affiliate_players
       WHERE affiliate_id = ? AND status = 'active'`,
      [affiliate.id]
    );

    const [[totals]] = await pool.query(
      `SELECT
         COALESCE(SUM(transfer_in_total), 0) AS transferIn,
         COALESCE(SUM(transfer_out_total), 0) AS transferOut,
         COALESCE(SUM(bonus_paid_total), 0) AS bonusPaid,
         COALESCE(SUM(net_amount), 0) AS netAmount,
         COALESCE(SUM(CASE WHEN period_start >= ? AND period_end <= ? THEN commission_amount ELSE 0 END), 0) AS commissionThisMonth
       FROM affiliate_commissions
       WHERE affiliate_id = ?`,
      [range.startYmd, range.endYmd, affiliate.id]
    );

    const [[paidComm]] = await pool.query(
      `SELECT COALESCE(SUM(commission_amount), 0) AS total
       FROM affiliate_commissions WHERE affiliate_id = ? AND status = 'paid'`,
      [affiliate.id]
    );

    return res.json({
      range,
      summary: {
        totalClicks: Number(clicks?.c || 0),
        totalRegistrations: Number(regs?.c || 0),
        activePlayers: Number(activePlayers?.c || 0),
        totalTransferIn: Number(totals?.transferIn || 0),
        totalTransferOut: Number(totals?.transferOut || 0),
        bonusPaid: Number(totals?.bonusPaid || 0),
        netAmount: Number(totals?.netAmount || 0),
        commissionThisMonth: Number(totals?.commissionThisMonth || 0),
        pendingCommission: balance.pendingCommissions,
        paidCommission: Number(paidComm?.total || 0),
        availableBalance: balance.availableBalance,
      },
    });
  } catch (e) {
    console.error("[affiliate] dashboard:", e);
    return res.status(500).json({ error: "Failed to load dashboard." });
  }
};

const { pool } = require("../../config/database");
const { parseAffiliateDateRange } = require("../../utils/affiliateDateRanges");
const { getAffiliateBalanceSummary } = require("../../services/affiliateBalanceService");

function normalizePage(query, fallback = 1) {
  const n = Number(query.page || fallback);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

exports.getAffiliatePlayers = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const search = String(req.query.search || req.query.q || "").trim();
    const range = parseAffiliateDateRange(req.query);
    const page = normalizePage(req.query);
    const pageSize = Math.min(100, Math.max(10, normalizePage(req.query.pageSize, 25)));
    const offset = (page - 1) * pageSize;

    const params = [affiliate.id];
    let where = "ap.affiliate_id = ?";

    if (search) {
      where += " AND u.username LIKE ?";
      params.push(`%${search}%`);
    }
    if (req.query.preset || req.query.startDate) {
      where += " AND ap.registered_at >= ? AND ap.registered_at <= ?";
      params.push(range.start, range.end);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM affiliate_players ap
       INNER JOIN users u ON u.id = ap.user_id
       WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT u.username,
              ap.registered_at AS registrationDate,
              ap.status,
              ap.first_transfer_in_at AS firstTransferIn,
              COALESCE(SUM(ac.transfer_in_total), 0) AS totalTransferIn,
              COALESCE(SUM(ac.transfer_out_total), 0) AS totalTransferOut,
              COALESCE(SUM(ac.bonus_paid_total), 0) AS bonusPaid,
              COALESCE(SUM(ac.net_amount), 0) AS netAmount,
              COALESCE(SUM(ac.commission_amount), 0) AS commissionEarned,
              u.last_login_at AS lastActive
       FROM affiliate_players ap
       INNER JOIN users u ON u.id = ap.user_id
       LEFT JOIN affiliate_commissions ac ON ac.affiliate_id = ap.affiliate_id AND ac.player_user_id = ap.user_id
       WHERE ${where}
       GROUP BY ap.id, u.username, ap.registered_at, ap.status, ap.first_transfer_in_at, u.last_login_at
       ORDER BY ap.registered_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return res.json({
      page,
      pageSize,
      total: Number(countRow?.total || 0),
      rows: rows || [],
    });
  } catch (e) {
    console.error("[affiliate] players:", e);
    return res.status(500).json({ error: "Failed to load players." });
  }
};

exports.getAffiliateCommissions = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const balance = await getAffiliateBalanceSummary(affiliate.id);

    const [[totals]] = await pool.query(
      `SELECT
         COALESCE(SUM(transfer_in_total), 0) AS transferIn,
         COALESCE(SUM(transfer_out_total), 0) AS transferOut,
         COALESCE(SUM(bonus_paid_total), 0) AS bonusPaid,
         COALESCE(SUM(net_amount), 0) AS netAmount,
         COALESCE(SUM(commission_amount), 0) AS commissionEarned,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END), 0) AS approved,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) AS paid
       FROM affiliate_commissions WHERE affiliate_id = ?`,
      [affiliate.id]
    );

    const [ledger] = await pool.query(
      `SELECT ac.period_start AS periodStart, ac.period_end AS periodEnd,
              u.username AS player,
              ac.transfer_in_total AS transferIn,
              ac.transfer_out_total AS transferOut,
              ac.bonus_paid_total AS bonusPaid,
              ac.net_amount AS netAmount,
              ac.commission_percent AS commissionPercent,
              ac.commission_amount AS commissionAmount,
              ac.status, ac.remarks, ac.maturity_at AS maturityAt, ac.created_at AS createdAt
       FROM affiliate_commissions ac
       INNER JOIN users u ON u.id = ac.player_user_id
       WHERE ac.affiliate_id = ?
       ORDER BY ac.period_end DESC, ac.id DESC
       LIMIT 500`,
      [affiliate.id]
    );

    return res.json({
      summary: {
        transferIn: Number(totals?.transferIn || 0),
        transferOut: Number(totals?.transferOut || 0),
        bonusPaid: Number(totals?.bonusPaid || 0),
        netAmount: Number(totals?.netAmount || 0),
        commissionPercent: Number(affiliate.commission_percent || 0),
        commissionEarned: Number(totals?.commissionEarned || 0),
        pending: Number(totals?.pending || 0),
        approved: Number(totals?.approved || 0),
        paid: Number(totals?.paid || 0),
        availableBalance: balance.availableBalance,
      },
      ledger: ledger || [],
    });
  } catch (e) {
    console.error("[affiliate] commissions:", e);
    return res.status(500).json({ error: "Failed to load commissions." });
  }
};

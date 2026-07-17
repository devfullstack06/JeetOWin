const { pool } = require("../../config/database");
const { parseAffiliateDateRange } = require("../../utils/affiliateDateRanges");
const {
  getAffiliateSettingsMap,
  patchAffiliateSettings,
} = require("../../services/affiliateSettingsService");
const { roundMoney } = require("../../services/affiliateBalanceService");
const { publicAssetPath } = require("../../middleware/uploadAffiliateAsset");

exports.getAdminAffiliateCommissions = async (req, res) => {
  try {
    const affiliateId = req.query.affiliateId ? Number(req.query.affiliateId) : null;
    const status = String(req.query.status || "").trim().toLowerCase();
    const params = [];
    let where = "1=1";
    if (affiliateId) {
      where += " AND ac.affiliate_id = ?";
      params.push(affiliateId);
    }
    if (status && ["pending", "approved", "rejected", "paid"].includes(status)) {
      where += " AND ac.status = ?";
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT ac.id, ac.period_start AS periodStart, ac.period_end AS periodEnd,
              ap.name AS affiliateName, u.username AS player,
              ac.transfer_in_total AS transferIn, ac.transfer_out_total AS transferOut,
              ac.bonus_paid_total AS bonusPaid, ac.net_amount AS netAmount,
              ac.commission_percent AS commissionPercent, ac.commission_amount AS commissionAmount,
              ac.status, ac.remarks, ac.maturity_at AS maturityAt
       FROM affiliate_commissions ac
       INNER JOIN affiliate_profiles ap ON ap.id = ac.affiliate_id
       INNER JOIN users u ON u.id = ac.player_user_id
       WHERE ${where}
       ORDER BY ac.period_end DESC, ac.id DESC
       LIMIT 1000`,
      params
    );
    return res.json({ commissions: rows || [] });
  } catch (e) {
    console.error("[admin affiliate] commissions:", e);
    return res.status(500).json({ message: "Failed to load commissions." });
  }
};

exports.patchAdminAffiliateCommissionStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "").toLowerCase();
    const remarks = req.body?.remarks != null ? String(req.body.remarks).trim() : null;
    const adminUserId = req.authUser?.userId || req.authUser?.id || null;

    if (!["approved", "rejected", "paid", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const [[row]] = await pool.query(
      "SELECT * FROM affiliate_commissions WHERE id = ? LIMIT 1",
      [id]
    );
    if (!row) return res.status(404).json({ message: "Commission not found." });

    await pool.query(
      `UPDATE affiliate_commissions SET status = ?, remarks = COALESCE(?, remarks), updated_at = NOW()
       WHERE id = ?`,
      [status, remarks, id]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("[admin affiliate] commission status:", e);
    return res.status(500).json({ message: "Failed to update commission." });
  }
};

exports.postAdminAffiliateCommissionAdjust = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const adjustmentAmount = Number(req.body?.adjustmentAmount ?? req.body?.amount);
    const reason = String(req.body?.reason || req.body?.remarks || "").trim();
    const adminUserId = req.authUser?.userId || req.authUser?.id || null;

    if (!Number.isFinite(adjustmentAmount)) {
      return res.status(400).json({ message: "Adjustment amount is required." });
    }
    if (!reason) {
      return res.status(400).json({ message: "Remarks/reason is required for adjustments." });
    }

    const [[row]] = await pool.query(
      "SELECT * FROM affiliate_commissions WHERE id = ? LIMIT 1",
      [id]
    );
    if (!row) return res.status(404).json({ message: "Commission not found." });

    const newAmount = roundMoney(Number(row.commission_amount) + adjustmentAmount);

    await pool.query(
      `INSERT INTO affiliate_commission_adjustments
        (commission_id, affiliate_id, adjustment_amount, reason, admin_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, row.affiliate_id, adjustmentAmount, reason, adminUserId]
    );

    await pool.query(
      `UPDATE affiliate_commissions
       SET commission_amount = ?, remarks = ?, updated_at = NOW()
       WHERE id = ?`,
      [newAmount, reason, id]
    );

    return res.json({ ok: true, commissionAmount: newAmount });
  } catch (e) {
    console.error("[admin affiliate] commission adjust:", e);
    return res.status(500).json({ message: "Failed to adjust commission." });
  }
};

exports.getAdminAffiliateWithdrawals = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT awd.id, awd.created_at AS date, ap.name AS affiliate, awd.amount,
              wc.name AS walletCompany, aw.account_title AS accountTitle,
              aw.account_number AS accountNumber, awd.status, awd.remarks
       FROM affiliate_withdrawals awd
       INNER JOIN affiliate_profiles ap ON ap.id = awd.affiliate_id
       INNER JOIN affiliate_wallets aw ON aw.id = awd.wallet_id
       INNER JOIN wallet_companies wc ON wc.id = aw.wallet_company_id
       ORDER BY awd.created_at DESC
       LIMIT 1000`
    );
    return res.json({ withdrawals: rows || [] });
  } catch (e) {
    console.error("[admin affiliate] withdrawals:", e);
    return res.status(500).json({ message: "Failed to load withdrawals." });
  }
};

exports.patchAdminAffiliateWithdrawalStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "").toLowerCase();
    const remarks = req.body?.remarks != null ? String(req.body.remarks).trim() : null;
    const adminUserId = req.authUser?.userId || req.authUser?.id || null;

    if (!["approved", "rejected", "paid", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const paidAt = status === "paid" ? new Date() : null;

    await pool.query(
      `UPDATE affiliate_withdrawals
       SET status = ?, remarks = COALESCE(?, remarks), admin_user_id = ?, paid_at = COALESCE(?, paid_at), updated_at = NOW()
       WHERE id = ?`,
      [status, remarks, adminUserId, paidAt, id]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("[admin affiliate] withdrawal status:", e);
    return res.status(500).json({ message: "Failed to update withdrawal." });
  }
};

exports.getAdminAffiliateWallets = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT aw.id, ap.name AS affiliate, wc.name AS walletCompany,
              aw.account_title AS accountTitle, aw.account_number AS accountNumber,
              aw.status, aw.created_at AS createdAt
       FROM affiliate_wallets aw
       INNER JOIN affiliate_profiles ap ON ap.id = aw.affiliate_id
       INNER JOIN wallet_companies wc ON wc.id = aw.wallet_company_id
       ORDER BY aw.created_at DESC
       LIMIT 1000`
    );
    return res.json({ wallets: rows || [] });
  } catch (e) {
    console.error("[admin affiliate] wallets:", e);
    return res.status(500).json({ message: "Failed to load wallets." });
  }
};

exports.patchAdminAffiliateWalletStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const action = String(req.body?.action || req.body?.status || "").toLowerCase();
    let status = null;
    if (action === "verify" || action === "verified") status = "verified";
    else if (action === "reject" || action === "rejected") status = "rejected";
    else if (action === "disable" || action === "inactive") status = "inactive";
    else return res.status(400).json({ message: "Invalid action." });

    await pool.query(
      `UPDATE affiliate_wallets SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );
    return res.json({ ok: true, status });
  } catch (e) {
    console.error("[admin affiliate] wallet status:", e);
    return res.status(500).json({ message: "Failed to update wallet." });
  }
};

exports.getAdminAffiliateAssets = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, type, file_url AS fileUrl, text_content AS textContent,
              status, sort_order AS sortOrder, created_at AS createdAt
       FROM affiliate_assets ORDER BY sort_order ASC, id DESC`
    );
    return res.json({ assets: rows || [] });
  } catch (e) {
    console.error("[admin affiliate] assets:", e);
    return res.status(500).json({ message: "Failed to load assets." });
  }
};

exports.postAdminAffiliateAsset = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const type = String(req.body?.type || "").trim();
    const textContent = req.body?.textContent != null ? String(req.body.textContent) : null;
    const sortOrder = Number(req.body?.sortOrder ?? 0) || 0;
    let fileUrl = req.body?.fileUrl != null ? String(req.body.fileUrl).trim() : null;

    if (req.file?.filename) {
      fileUrl = publicAssetPath(req.file.filename);
    }

    if (!title || !type) {
      return res.status(400).json({ message: "Title and type are required." });
    }

    const [result] = await pool.query(
      `INSERT INTO affiliate_assets (title, type, file_url, text_content, status, sort_order)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [title, type, fileUrl, textContent, sortOrder]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (e) {
    console.error("[admin affiliate] asset create:", e);
    return res.status(500).json({ message: "Failed to create asset." });
  }
};

exports.patchAdminAffiliateAsset = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const sets = [];
    const params = [];
    for (const [key, col] of [
      ["title", "title"],
      ["type", "type"],
      ["textContent", "text_content"],
      ["status", "status"],
      ["sortOrder", "sort_order"],
      ["fileUrl", "file_url"],
    ]) {
      if (req.body?.[key] == null) continue;
      sets.push(`${col} = ?`);
      params.push(req.body[key]);
    }
    if (req.file?.filename) {
      sets.push("file_url = ?");
      params.push(publicAssetPath(req.file.filename));
    }
    if (!sets.length) return res.status(400).json({ message: "No fields to update." });
    params.push(id);
    await pool.query(`UPDATE affiliate_assets SET ${sets.join(", ")} WHERE id = ?`, params);
    return res.json({ ok: true });
  } catch (e) {
    console.error("[admin affiliate] asset patch:", e);
    return res.status(500).json({ message: "Failed to update asset." });
  }
};

exports.deleteAdminAffiliateAsset = async (req, res) => {
  try {
    await pool.query("DELETE FROM affiliate_assets WHERE id = ?", [Number(req.params.id)]);
    return res.json({ ok: true });
  } catch (e) {
    console.error("[admin affiliate] asset delete:", e);
    return res.status(500).json({ message: "Failed to delete asset." });
  }
};

exports.getAdminAffiliateReports = async (req, res) => {
  try {
    const range = parseAffiliateDateRange(req.query);
    const affiliateId = req.query.affiliateId ? Number(req.query.affiliateId) : null;
    const params = [range.startYmd, range.endYmd];
    let where = "ac.period_start >= ? AND ac.period_end <= ?";
    if (affiliateId) {
      where += " AND ac.affiliate_id = ?";
      params.push(affiliateId);
    }

    const [[totals]] = await pool.query(
      `SELECT
         COALESCE(SUM(ac.transfer_in_total), 0) AS transferIn,
         COALESCE(SUM(ac.transfer_out_total), 0) AS transferOut,
         COALESCE(SUM(ac.bonus_paid_total), 0) AS bonusPaid,
         COALESCE(SUM(ac.net_amount), 0) AS netAmount,
         COALESCE(SUM(ac.commission_amount), 0) AS commission
       FROM affiliate_commissions ac WHERE ${where}`,
      params
    );

    const wdParams = [range.start, range.end];
    let wdWhere = "awd.created_at >= ? AND awd.created_at <= ? AND awd.status IN ('approved','paid')";
    if (affiliateId) {
      wdWhere += " AND awd.affiliate_id = ?";
      wdParams.push(affiliateId);
    }
    const [[withdrawals]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM affiliate_withdrawals awd WHERE ${wdWhere}`,
      wdParams
    );

    return res.json({
      range,
      metrics: {
        transferIn: Number(totals?.transferIn || 0),
        transferOut: Number(totals?.transferOut || 0),
        bonusPaid: Number(totals?.bonusPaid || 0),
        netAmount: Number(totals?.netAmount || 0),
        commission: Number(totals?.commission || 0),
        withdrawals: Number(withdrawals?.total || 0),
      },
    });
  } catch (e) {
    console.error("[admin affiliate] reports:", e);
    return res.status(500).json({ message: "Failed to load reports." });
  }
};

exports.getAdminAffiliateCommissionAdjustments = async (req, res) => {
  try {
    const commissionId = Number(req.params.id);
    if (!Number.isFinite(commissionId)) {
      return res.status(400).json({ message: "Invalid commission id." });
    }

    const [rows] = await pool.query(
      `SELECT aca.id, aca.adjustment_amount AS adjustmentAmount, aca.reason,
              aca.created_at AS createdAt, u.username AS adminUsername
       FROM affiliate_commission_adjustments aca
       LEFT JOIN users u ON u.id = aca.admin_user_id
       WHERE aca.commission_id = ?
       ORDER BY aca.created_at DESC`,
      [commissionId]
    );
    return res.json({ adjustments: rows || [] });
  } catch (e) {
    console.error("[admin affiliate] commission adjustments:", e);
    return res.status(500).json({ message: "Failed to load adjustment history." });
  }
};

exports.getAdminAffiliateSettings = async (req, res) => {
  try {
    const settings = await getAffiliateSettingsMap();
    const { getShareUrlTemplate } = require("../../services/affiliateSettingsService");
    const shareUrlTemplate = await getShareUrlTemplate();
    return res.json({ settings, shareUrlTemplate });
  } catch (e) {
    console.error("[admin affiliate] settings get:", e);
    return res.status(500).json({ message: "Failed to load settings." });
  }
};

exports.patchAdminAffiliateSettings = async (req, res) => {
  try {
    const settings = await patchAffiliateSettings(req.body || {});
    return res.json({ settings });
  } catch (e) {
    console.error("[admin affiliate] settings patch:", e);
    return res.status(500).json({ message: "Failed to update settings." });
  }
};

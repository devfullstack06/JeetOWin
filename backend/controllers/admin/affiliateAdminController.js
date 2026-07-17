const bcrypt = require("bcrypt");
const { pool } = require("../../config/database");
const { generateUniqueAffiliateCode } = require("../../utils/affiliateCode");
const { getAffiliateBalanceSummary } = require("../../services/affiliateBalanceService");
const { getAffiliateSetting } = require("../../services/affiliateSettingsService");

function mapAffiliateListRow(row) {
  return {
    id: row.id,
    affiliateId: row.id,
    userId: row.user_id,
    name: row.name,
    username: row.username,
    referralCode: row.referral_code,
    players: Number(row.players || 0),
    transferIn: Number(row.transferIn || 0),
    transferOut: Number(row.transferOut || 0),
    netAmount: Number(row.netAmount || 0),
    commission: Number(row.commission || 0),
    status: row.status,
    joined: row.created_at,
    planName: row.plan_name,
    commissionMaturityDays: row.commission_maturity_days,
  };
}

exports.getAdminAffiliates = async (req, res) => {
  try {
    const search = String(req.query.search || req.query.q || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const params = [];
    let where = "1=1";

    if (search) {
      where += " AND (ap.name LIKE ? OR u.username LIKE ? OR ap.referral_code LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status && ["active", "suspended", "pending"].includes(status)) {
      where += " AND ap.status = ?";
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT ap.id, ap.user_id, ap.name, u.username, ap.referral_code, ap.status, ap.created_at,
              ap.commission_maturity_days, acp.name AS plan_name,
              (SELECT COUNT(*) FROM affiliate_players ap2 WHERE ap2.affiliate_id = ap.id) AS players,
              COALESCE(SUM(ac.transfer_in_total), 0) AS transferIn,
              COALESCE(SUM(ac.transfer_out_total), 0) AS transferOut,
              COALESCE(SUM(ac.net_amount), 0) AS netAmount,
              COALESCE(SUM(ac.commission_amount), 0) AS commission
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       INNER JOIN affiliate_commission_plans acp ON acp.id = ap.plan_id
       LEFT JOIN affiliate_commissions ac ON ac.affiliate_id = ap.id
       WHERE ${where}
       GROUP BY ap.id, ap.user_id, ap.name, u.username, ap.referral_code, ap.status, ap.created_at,
                ap.commission_maturity_days, acp.name
       ORDER BY ap.created_at DESC
       LIMIT 500`,
      params
    );

    return res.json({ affiliates: (rows || []).map(mapAffiliateListRow) });
  } catch (e) {
    console.error("[admin affiliate] list:", e);
    return res.status(500).json({ message: "Failed to load affiliates." });
  }
};

exports.postAdminAffiliate = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const body = req.body || {};
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();
    const name = String(body.name || "").trim();
    const email = body.email != null ? String(body.email).trim() : null;
    const phone = body.phone != null ? String(body.phone).trim() : null;
    const country = body.country != null ? String(body.country).trim() : null;
    const telegram = body.telegram != null ? String(body.telegram).trim() : null;
    const whatsapp = body.whatsapp != null ? String(body.whatsapp).trim() : null;
    const defaultPlanId = Number(await getAffiliateSetting("default_commission_plan_id", "1")) || 1;
    const planId = Number(body.planId || body.plan_id || defaultPlanId);
    const maturityDays = Number(body.commissionMaturityDays || body.commission_maturity_days || 30);
    const status = ["active", "pending", "suspended"].includes(String(body.status || "pending").toLowerCase())
      ? String(body.status).toLowerCase()
      : "pending";

    if (!username || username.length < 3) {
      return res.status(400).json({ message: "Username is required (min 3 chars)." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password is required (min 6 chars)." });
    }
    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (![7, 14, 30].includes(maturityDays)) {
      return res.status(400).json({ message: "Commission maturity days must be 7, 14, or 30." });
    }

    await connection.beginTransaction();

    const [[roleRow]] = await connection.query(
      "SELECT id FROM roles WHERE name = 'affiliate' LIMIT 1"
    );
    if (!roleRow) {
      await connection.rollback();
      return res.status(500).json({ message: "Affiliate role not found. Run migrations." });
    }

    const [dup] = await connection.query("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
    if (dup.length) {
      await connection.rollback();
      return res.status(409).json({ message: "Username already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query(
      `INSERT INTO users (username, password_hash, role_id, status) VALUES (?, ?, ?, 'active')`,
      [username, passwordHash, roleRow.id]
    );
    const userId = userResult.insertId;
    const referralCode = body.referralCode
      ? String(body.referralCode).trim()
      : await generateUniqueAffiliateCode(connection);

    const [codeDup] = await connection.query(
      "SELECT id FROM affiliate_profiles WHERE referral_code = ? LIMIT 1",
      [referralCode]
    );
    if (codeDup.length) {
      await connection.rollback();
      return res.status(409).json({ message: "Referral code already exists." });
    }

    const [profileResult] = await connection.query(
      `INSERT INTO affiliate_profiles
        (user_id, referral_code, name, email, phone, country, telegram, whatsapp,
         plan_id, commission_maturity_days, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, referralCode, name, email, phone, country, telegram, whatsapp, planId, maturityDays, status]
    );

    await connection.commit();
    return res.status(201).json({
      id: profileResult.insertId,
      userId,
      username,
      referralCode,
    });
  } catch (e) {
    try {
      await connection.rollback();
    } catch {
      /* ignore */
    }
    console.error("[admin affiliate] create:", e);
    return res.status(500).json({ message: e.message || "Failed to create affiliate." });
  } finally {
    connection.release();
  }
};

exports.getAdminAffiliateById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid affiliate id." });
    }

    const [[profile]] = await pool.query(
      `SELECT ap.*, u.username, u.last_login_at AS lastLoginAt, acp.name AS plan_name, acp.commission_percent
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       INNER JOIN affiliate_commission_plans acp ON acp.id = ap.plan_id
       WHERE ap.id = ?
       LIMIT 1`,
      [id]
    );
    if (!profile) {
      return res.status(404).json({ message: "Affiliate not found." });
    }

    const balance = await getAffiliateBalanceSummary(id);

    const [players] = await pool.query(
      `SELECT u.username, ap2.registered_at AS registeredAt, ap2.status,
              COALESCE(SUM(ac.transfer_in_total), 0) AS transferIn,
              COALESCE(SUM(ac.transfer_out_total), 0) AS transferOut,
              COALESCE(SUM(ac.bonus_paid_total), 0) AS bonusPaid,
              COALESCE(SUM(ac.net_amount), 0) AS netAmount,
              COALESCE(SUM(ac.commission_amount), 0) AS commission
       FROM affiliate_players ap2
       INNER JOIN users u ON u.id = ap2.user_id
       LEFT JOIN affiliate_commissions ac ON ac.player_user_id = ap2.user_id AND ac.affiliate_id = ap2.affiliate_id
       WHERE ap2.affiliate_id = ?
       GROUP BY ap2.id, u.username, ap2.registered_at, ap2.status
       ORDER BY ap2.registered_at DESC`,
      [id]
    );

    const [commissions] = await pool.query(
      `SELECT ac.*, u.username AS playerUsername
       FROM affiliate_commissions ac
       INNER JOIN users u ON u.id = ac.player_user_id
       WHERE ac.affiliate_id = ?
       ORDER BY ac.period_end DESC LIMIT 200`,
      [id]
    );

    const [withdrawals] = await pool.query(
      `SELECT awd.*, wc.name AS walletCompany, aw.account_title AS accountTitle, aw.account_number AS accountNumber
       FROM affiliate_withdrawals awd
       INNER JOIN affiliate_wallets aw ON aw.id = awd.wallet_id
       INNER JOIN wallet_companies wc ON wc.id = aw.wallet_company_id
       WHERE awd.affiliate_id = ?
       ORDER BY awd.created_at DESC LIMIT 200`,
      [id]
    );

    const [wallets] = await pool.query(
      `SELECT aw.*, wc.name AS walletCompany
       FROM affiliate_wallets aw
       INNER JOIN wallet_companies wc ON wc.id = aw.wallet_company_id
       WHERE aw.affiliate_id = ?
       ORDER BY aw.created_at DESC`,
      [id]
    );

    const [loginHistory] = await pool.query(
      `SELECT last_login_at AS lastLoginAt FROM users WHERE id = ? LIMIT 1`,
      [profile.user_id]
    );

    return res.json({
      profile,
      balance,
      players: players || [],
      commissions: commissions || [],
      withdrawals: withdrawals || [],
      wallets: wallets || [],
      statistics: balance,
      loginHistory: loginHistory || [],
    });
  } catch (e) {
    console.error("[admin affiliate] detail:", e);
    return res.status(500).json({ message: "Failed to load affiliate." });
  }
};

exports.patchAdminAffiliate = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};

    const [[existing]] = await pool.query(
      `SELECT ap.*, u.id AS user_id FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id WHERE ap.id = ? LIMIT 1`,
      [id]
    );
    if (!existing) {
      return res.status(404).json({ message: "Affiliate not found." });
    }

    const sets = [];
    const params = [];
    const fields = ["name", "email", "phone", "country", "telegram", "whatsapp", "status"];
    for (const key of fields) {
      if (body[key] == null) continue;
      sets.push(`${key} = ?`);
      params.push(String(body[key]).trim() || null);
    }

    if (body.planId != null || body.plan_id != null) {
      sets.push("plan_id = ?");
      params.push(Number(body.planId || body.plan_id));
    }

    if (body.commissionMaturityDays != null || body.commission_maturity_days != null) {
      const days = Number(body.commissionMaturityDays || body.commission_maturity_days);
      if (![7, 14, 30].includes(days)) {
        return res.status(400).json({ message: "Commission maturity days must be 7, 14, or 30." });
      }
      sets.push("commission_maturity_days = ?");
      params.push(days);
    }

    if (sets.length) {
      params.push(id);
      await pool.query(`UPDATE affiliate_profiles SET ${sets.join(", ")}, updated_at = NOW() WHERE id = ?`, params);
    }

    if (body.newPassword) {
      const pwd = String(body.newPassword);
      if (pwd.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }
      const hash = await bcrypt.hash(pwd, 10);
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, existing.user_id]);
    }

    if (body.userStatus) {
      const us = String(body.userStatus).toLowerCase() === "active" ? "active" : "suspended";
      await pool.query("UPDATE users SET status = ? WHERE id = ?", [us, existing.user_id]);
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("[admin affiliate] patch:", e);
    return res.status(500).json({ message: "Failed to update affiliate." });
  }
};

exports.getAdminAffiliatePlans = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, commission_percent AS commissionPercent, status, created_at AS createdAt
       FROM affiliate_commission_plans ORDER BY id ASC`
    );
    return res.json({ plans: rows || [] });
  } catch (e) {
    console.error("[admin affiliate] plans:", e);
    return res.status(500).json({ message: "Failed to load plans." });
  }
};

exports.postAdminAffiliatePlan = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const commissionPercent = Number(req.body?.commissionPercent ?? req.body?.commission_percent);
    if (!name) return res.status(400).json({ message: "Plan name is required." });
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0) {
      return res.status(400).json({ message: "Valid commission percent is required." });
    }
    const [result] = await pool.query(
      `INSERT INTO affiliate_commission_plans (name, commission_percent, status) VALUES (?, ?, 'active')`,
      [name, commissionPercent]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Plan name already exists." });
    }
    console.error("[admin affiliate] plan create:", e);
    return res.status(500).json({ message: "Failed to create plan." });
  }
};

exports.patchAdminAffiliatePlan = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const sets = [];
    const params = [];
    if (req.body?.name != null) {
      sets.push("name = ?");
      params.push(String(req.body.name).trim());
    }
    if (req.body?.commissionPercent != null || req.body?.commission_percent != null) {
      sets.push("commission_percent = ?");
      params.push(Number(req.body.commissionPercent ?? req.body.commission_percent));
    }
    if (req.body?.status != null) {
      const st = String(req.body.status).toLowerCase() === "inactive" ? "inactive" : "active";
      sets.push("status = ?");
      params.push(st);
    }
    if (!sets.length) return res.status(400).json({ message: "No fields to update." });
    params.push(id);
    await pool.query(`UPDATE affiliate_commission_plans SET ${sets.join(", ")} WHERE id = ?`, params);
    return res.json({ ok: true });
  } catch (e) {
    console.error("[admin affiliate] plan patch:", e);
    return res.status(500).json({ message: "Failed to update plan." });
  }
};

const bcrypt = require("bcrypt");
const { pool } = require("../../config/database");
const { getAffiliateBalanceSummary } = require("../../services/affiliateBalanceService");
const { getAffiliateSetting } = require("../../services/affiliateSettingsService");
const { isAlphabeticWithSpaces, isDigitsOnly } = require("./affiliateHelpers");

exports.getAffiliateWallets = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const [rows] = await pool.query(
      `SELECT aw.id, wc.name AS walletCompany, aw.account_title AS accountTitle,
              aw.account_number AS accountNumber, aw.status, aw.created_at AS createdAt
       FROM affiliate_wallets aw
       INNER JOIN wallet_companies wc ON wc.id = aw.wallet_company_id
       WHERE aw.affiliate_id = ?
       ORDER BY aw.created_at DESC`,
      [affiliate.id]
    );
    return res.json({ wallets: rows || [] });
  } catch (e) {
    console.error("[affiliate] wallets list:", e);
    return res.status(500).json({ error: "Failed to load wallets." });
  }
};

exports.postAffiliateWallet = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const { walletCompanyId, accountTitle, accountNumber } = req.body || {};
    const title = String(accountTitle || "").trim();
    const number = String(accountNumber || "").trim();
    const companyId = Number(walletCompanyId);

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ error: "walletCompanyId is required." });
    }
    if (title.length < 4 || title.length > 50 || !isAlphabeticWithSpaces(title)) {
      return res.status(400).json({ error: "Account title must be alphabetic, 4-50 characters." });
    }
    if (number.length < 6 || number.length > 24 || !isDigitsOnly(number)) {
      return res.status(400).json({ error: "Account number must be 6-24 digits." });
    }

    const [company] = await pool.query(
      "SELECT id FROM wallet_companies WHERE id = ? AND is_active = 1 LIMIT 1",
      [companyId]
    );
    if (!company.length) {
      return res.status(400).json({ error: "Selected wallet company is not available." });
    }

    const verificationRequired = (await getAffiliateSetting("wallet_verification_required")) === "1";
    const status = verificationRequired ? "pending_verification" : "verified";

    const [result] = await pool.query(
      `INSERT INTO affiliate_wallets
        (affiliate_id, wallet_company_id, account_title, account_number, status)
       VALUES (?, ?, ?, ?, ?)`,
      [affiliate.id, companyId, title, number, status]
    );

    return res.status(201).json({ walletId: result.insertId, status });
  } catch (e) {
    if (String(e?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This wallet already exists." });
    }
    console.error("[affiliate] wallet create:", e);
    return res.status(500).json({ error: "Failed to add wallet." });
  }
};

exports.patchAffiliateWallet = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const walletId = Number(req.params.id);
    const status = String(req.body?.status || "").trim().toLowerCase();

    if (!Number.isFinite(walletId)) {
      return res.status(400).json({ error: "Invalid wallet id." });
    }
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Status must be active or inactive." });
    }

    const dbStatus = status === "active" ? "verified" : "inactive";

    const [result] = await pool.query(
      `UPDATE affiliate_wallets SET status = ?, updated_at = NOW()
       WHERE id = ? AND affiliate_id = ? AND status IN ('verified', 'inactive')`,
      [dbStatus, walletId, affiliate.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: "Wallet not found or cannot be updated." });
    }

    return res.json({ ok: true, status: dbStatus });
  } catch (e) {
    console.error("[affiliate] wallet patch:", e);
    return res.status(500).json({ error: "Failed to update wallet." });
  }
};

exports.getAffiliateWalletCompanies = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, code, icon_path AS iconPath, icon_key AS iconKey, sort_order AS sortOrder
       FROM wallet_companies
       WHERE is_active = 1 AND available_for_withdraw = 1
       ORDER BY sort_order ASC, name ASC`
    );
    return res.json({ companies: rows || [] });
  } catch (e) {
    console.error("[affiliate] wallet companies:", e);
    return res.status(500).json({ error: "Failed to load wallet companies." });
  }
};

exports.getAffiliateWithdrawals = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const balance = await getAffiliateBalanceSummary(affiliate.id);

    const [rows] = await pool.query(
      `SELECT awd.created_at AS date, awd.amount, wc.name AS walletCompany,
              aw.account_title AS accountTitle, aw.account_number AS accountNumber,
              awd.status, awd.remarks
       FROM affiliate_withdrawals awd
       INNER JOIN affiliate_wallets aw ON aw.id = awd.wallet_id
       INNER JOIN wallet_companies wc ON wc.id = aw.wallet_company_id
       WHERE awd.affiliate_id = ?
       ORDER BY awd.created_at DESC
       LIMIT 200`,
      [affiliate.id]
    );

    const minWithdraw = Number(await getAffiliateSetting("minimum_withdrawal", "1000")) || 1000;

    return res.json({
      availableBalance: balance.availableBalance,
      minimumWithdrawal: minWithdraw,
      withdrawals: rows || [],
    });
  } catch (e) {
    console.error("[affiliate] withdrawals list:", e);
    return res.status(500).json({ error: "Failed to load withdrawals." });
  }
};

exports.postAffiliateWithdrawal = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const walletId = Number(req.body?.walletId);
    const amount = Number(req.body?.amount);

    if (!Number.isFinite(walletId) || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Valid wallet and amount are required." });
    }

    const minWithdraw = Number(await getAffiliateSetting("minimum_withdrawal", "1000")) || 1000;
    if (amount < minWithdraw) {
      return res.status(400).json({ error: `Minimum withdrawal is ${minWithdraw}.` });
    }

    const [[wallet]] = await pool.query(
      `SELECT id, status FROM affiliate_wallets
       WHERE id = ? AND affiliate_id = ? LIMIT 1`,
      [walletId, affiliate.id]
    );
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found." });
    }
    if (!["verified", "inactive"].includes(wallet.status)) {
      return res.status(400).json({ error: "Selected wallet is not active for withdrawal." });
    }

    const balance = await getAffiliateBalanceSummary(affiliate.id);
    if (amount > balance.availableBalance) {
      return res.status(400).json({ error: "Insufficient available balance." });
    }

    const [result] = await pool.query(
      `INSERT INTO affiliate_withdrawals (affiliate_id, wallet_id, amount, status)
       VALUES (?, ?, ?, 'pending')`,
      [affiliate.id, walletId, amount]
    );

    return res.status(201).json({ withdrawalId: result.insertId });
  } catch (e) {
    console.error("[affiliate] withdrawal create:", e);
    return res.status(500).json({ error: "Failed to submit withdrawal." });
  }
};

exports.getAffiliateProfile = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    return res.json({
      profile: {
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        country: affiliate.country,
        telegram: affiliate.telegram,
        whatsapp: affiliate.whatsapp,
        username: affiliate.username,
        referralCode: affiliate.referral_code,
        planName: affiliate.plan_name,
        commissionPercent: Number(affiliate.commission_percent || 0),
        commissionMaturityDays: affiliate.commission_maturity_days,
      },
    });
  } catch (e) {
    console.error("[affiliate] profile get:", e);
    return res.status(500).json({ error: "Failed to load profile." });
  }
};

exports.patchAffiliateProfile = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const body = req.body || {};

    const fields = {
      name: body.name != null ? String(body.name).trim().slice(0, 150) : undefined,
      email: body.email != null ? String(body.email).trim().slice(0, 255) : undefined,
      phone: body.phone != null ? String(body.phone).trim().slice(0, 30) : undefined,
      country: body.country != null ? String(body.country).trim().slice(0, 100) : undefined,
      telegram: body.telegram != null ? String(body.telegram).trim().slice(0, 100) : undefined,
      whatsapp: body.whatsapp != null ? String(body.whatsapp).trim().slice(0, 30) : undefined,
    };

    const sets = [];
    const params = [];
    for (const [key, val] of Object.entries(fields)) {
      if (val === undefined) continue;
      sets.push(`${key} = ?`);
      params.push(val || null);
    }

    if (body.newPassword) {
      const pwd = String(body.newPassword);
      if (pwd.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }
      const hash = await bcrypt.hash(pwd, 10);
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, affiliate.user_id]);
    }

    if (sets.length) {
      params.push(affiliate.id);
      await pool.query(
        `UPDATE affiliate_profiles SET ${sets.join(", ")}, updated_at = NOW() WHERE id = ?`,
        params
      );
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("[affiliate] profile patch:", e);
    return res.status(500).json({ error: "Failed to update profile." });
  }
};

const { pool } = require("../../config/database");

async function getAffiliateProfileForUser(userId) {
  const [[row]] = await pool.query(
    `SELECT ap.*, acp.commission_percent, acp.name AS plan_name, u.username
     FROM affiliate_profiles ap
     INNER JOIN affiliate_commission_plans acp ON acp.id = ap.plan_id
     INNER JOIN users u ON u.id = ap.user_id
     WHERE ap.user_id = ?
     LIMIT 1`,
    [userId]
  );
  return row || null;
}

async function requireActiveAffiliate(req, res, next) {
  if (!req.user || req.user.role !== "affiliate") {
    return res.status(403).json({ error: "Forbidden: affiliate role required" });
  }
  try {
    const profile = await getAffiliateProfileForUser(req.user.userId);
    if (!profile) {
      return res.status(404).json({ error: "Affiliate profile not found." });
    }
    if (profile.status === "suspended") {
      return res.status(403).json({ error: "Your affiliate account is suspended." });
    }
    if (profile.status !== "active") {
      return res.status(403).json({ error: "Your affiliate account is not active yet." });
    }
    req.affiliate = profile;
    return next();
  } catch (e) {
    console.error("[affiliate] requireActiveAffiliate:", e);
    return res.status(500).json({ error: "Failed to load affiliate profile." });
  }
}

function isAlphabeticWithSpaces(s) {
  return /^[A-Za-z ]+$/.test(s);
}

function isDigitsOnly(s) {
  return /^[0-9]+$/.test(s);
}

module.exports = {
  getAffiliateProfileForUser,
  requireActiveAffiliate,
  isAlphabeticWithSpaces,
  isDigitsOnly,
};

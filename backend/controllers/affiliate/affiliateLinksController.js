const crypto = require("crypto");
const { pool } = require("../../config/database");
const {
  getShareUrlTemplate,
  buildAffiliateShareUrl,
} = require("../../services/affiliateSettingsService");

function slugifyCampaign(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

exports.getAffiliateLinks = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const template = await getShareUrlTemplate();
    const mainLink = buildAffiliateShareUrl(template, affiliate.referral_code);

    const [campaigns] = await pool.query(
      `SELECT id, campaign_name AS campaignName, campaign_key AS campaignKey,
              referral_code AS referralCode, clicks_count AS clicksCount,
              registrations_count AS registrationsCount, created_at AS createdAt
       FROM affiliate_campaigns
       WHERE affiliate_id = ?
       ORDER BY created_at DESC`,
      [affiliate.id]
    );

    const rows = (campaigns || []).map((c) => ({
      ...c,
      link: buildAffiliateShareUrl(template, affiliate.referral_code, c.campaignKey),
    }));

    return res.json({
      referralCode: affiliate.referral_code,
      mainLink,
      campaigns: rows,
    });
  } catch (e) {
    console.error("[affiliate] links:", e);
    return res.status(500).json({ error: "Failed to load links." });
  }
};

exports.postAffiliateCampaign = async (req, res) => {
  try {
    const affiliate = req.affiliate;
    const campaignName = String(req.body?.campaignName || req.body?.name || "").trim();
    if (!campaignName || campaignName.length < 2) {
      return res.status(400).json({ error: "Campaign name is required." });
    }

    let campaignKey = slugifyCampaign(req.body?.campaignKey || campaignName);
    if (!campaignKey) campaignKey = `campaign-${Date.now()}`;

    const [existing] = await pool.query(
      `SELECT id FROM affiliate_campaigns WHERE affiliate_id = ? AND campaign_key = ? LIMIT 1`,
      [affiliate.id, campaignKey]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Campaign key already exists." });
    }

    const [result] = await pool.query(
      `INSERT INTO affiliate_campaigns
        (affiliate_id, campaign_name, referral_code, campaign_key)
       VALUES (?, ?, ?, ?)`,
      [affiliate.id, campaignName, affiliate.referral_code, campaignKey]
    );

    const template = await getShareUrlTemplate();
    const link = buildAffiliateShareUrl(template, affiliate.referral_code, campaignKey);

    return res.status(201).json({
      id: result.insertId,
      campaignName,
      campaignKey,
      link,
    });
  } catch (e) {
    console.error("[affiliate] campaign:", e);
    return res.status(500).json({ error: "Failed to create campaign link." });
  }
};

/** Public click tracking — no auth */
exports.trackAffiliateClick = async (req, res) => {
  try {
    const referralCode = String(req.query.ref || req.body?.ref || "").trim();
    const campaignKey = String(req.query.campaign || req.body?.campaign || "").trim();
    const landingUrl = String(req.query.landingUrl || req.body?.landingUrl || "").trim().slice(0, 1000);
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);

    if (!referralCode) {
      return res.status(400).json({ error: "ref is required." });
    }

    const [[affiliate]] = await pool.query(
      `SELECT id, referral_code, status FROM affiliate_profiles
       WHERE referral_code = ? AND status = 'active' LIMIT 1`,
      [referralCode]
    );
    if (!affiliate) {
      return res.status(404).json({ error: "Invalid referral code." });
    }

    let campaignId = null;
    if (campaignKey) {
      const [[camp]] = await pool.query(
        `SELECT id FROM affiliate_campaigns
         WHERE affiliate_id = ? AND campaign_key = ? LIMIT 1`,
        [affiliate.id, campaignKey]
      );
      campaignId = camp?.id ?? null;
    }

    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "";
    const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;

    await pool.query(
      `INSERT INTO affiliate_clicks
        (affiliate_id, campaign_id, referral_code, ip_hash, user_agent, landing_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [affiliate.id, campaignId, referralCode, ipHash, userAgent || null, landingUrl || null]
    );

    if (campaignId) {
      await pool.query(
        `UPDATE affiliate_campaigns SET clicks_count = clicks_count + 1 WHERE id = ?`,
        [campaignId]
      );
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("[affiliate] track click:", e);
    return res.status(500).json({ error: "Failed to track click." });
  }
};

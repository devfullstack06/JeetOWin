const { pool } = require("../config/database");

const DEFAULTS = {
  minimum_withdrawal: "1000",
  cookie_days: "30",
  self_referral_allowed: "0",
  commission_delay_days: "30",
  default_commission_plan_id: "1",
  wallet_verification_required: "1",
  support_telegram: "",
  support_whatsapp: "",
  support_email: "",
};

async function getAffiliateSettingsMap() {
  const [rows] = await pool.query("SELECT setting_key, setting_value FROM affiliate_settings");
  const map = { ...DEFAULTS };
  for (const row of rows || []) {
    map[row.setting_key] = row.setting_value;
  }
  return map;
}

async function getAffiliateSetting(key, fallback = null) {
  const map = await getAffiliateSettingsMap();
  if (map[key] != null) return map[key];
  return fallback ?? DEFAULTS[key] ?? null;
}

async function getShareUrlTemplate() {
  const [[row]] = await pool.query(
    "SELECT share_url_template FROM referral_program_settings WHERE id = 1 LIMIT 1"
  );
  return row?.share_url_template || "https://www.jeetowin.com/signup?ref={code}";
}

function buildAffiliateShareUrl(template, referralCode, campaignKey = null) {
  let url = String(template || "").replace(/\{code\}/gi, encodeURIComponent(referralCode || ""));
  if (campaignKey) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}campaign=${encodeURIComponent(campaignKey)}`;
  }
  return url;
}

async function patchAffiliateSettings(updates = {}) {
  const allowed = Object.keys(DEFAULTS);
  for (const key of allowed) {
    if (updates[key] == null) continue;
    await pool.query(
      `INSERT INTO affiliate_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, String(updates[key])]
    );
  }
  return getAffiliateSettingsMap();
}

module.exports = {
  getAffiliateSettingsMap,
  getAffiliateSetting,
  getShareUrlTemplate,
  buildAffiliateShareUrl,
  patchAffiliateSettings,
  DEFAULTS,
};

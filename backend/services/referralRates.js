/**
 * Tier rate resolution for referral accruals.
 */

const { pool } = require("../config/database");

const TIER_KEYS = ["tier1_rate", "tier2_rate", "tier3_rate"];
const OVERRIDE_KEYS = ["referrer_tier1_rate", "referrer_tier2_rate", "referrer_tier3_rate"];

async function getProgramSettings() {
  const [[row]] = await pool.query(
    "SELECT * FROM referral_program_settings WHERE id = 1 LIMIT 1"
  );
  return row || null;
}

/**
 * @param {object} settings - referral_program_settings row
 * @param {object} earnerClient - clients row for earner
 * @param {1|2|3} tier
 */
function resolveTierRate(settings, earnerClient, tier) {
  const idx = tier - 1;
  const override = earnerClient?.[OVERRIDE_KEYS[idx]];
  if (override != null && Number.isFinite(Number(override))) {
    return Number(override);
  }
  const globalKey = TIER_KEYS[idx];
  const global = settings?.[globalKey];
  return Number(global ?? 0);
}

/**
 * Effective rates for display (earner overrides or global).
 */
function effectiveRatesForEarner(settings, earnerClient) {
  return {
    tier1: resolveTierRate(settings, earnerClient, 1),
    tier2: resolveTierRate(settings, earnerClient, 2),
    tier3: resolveTierRate(settings, earnerClient, 3),
  };
}

module.exports = {
  getProgramSettings,
  resolveTierRate,
  effectiveRatesForEarner,
};

/**
 * Generate unique client referral codes (JW-{USERNAME} with collision suffix).
 */

const { pool } = require("../config/database");

function sanitizeUsernameForCode(username) {
  const clean = String(username || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
  return clean || "USER";
}

function baseReferralCodeFromUsername(username) {
  return `JW-${sanitizeUsernameForCode(username)}`;
}

async function referralCodeExists(code, excludeClientId = null) {
  const params = [code];
  let sql = "SELECT id FROM clients WHERE referral_code = ? LIMIT 1";
  if (excludeClientId != null) {
    sql = "SELECT id FROM clients WHERE referral_code = ? AND id <> ? LIMIT 1";
    params.push(excludeClientId);
  }
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

/**
 * @param {import('mysql2/promise').PoolConnection} [connection]
 */
async function generateUniqueReferralCode(username, connection = null, excludeClientId = null) {
  const q = connection ? connection.query.bind(connection) : pool.query.bind(pool);
  const base = baseReferralCodeFromUsername(username);
  if (!(await referralCodeExists(base, excludeClientId))) return base;

  for (let n = 2; n < 10000; n += 1) {
    const candidate = `${base}${n}`;
    const params = excludeClientId != null ? [candidate, excludeClientId] : [candidate];
    const sql =
      excludeClientId != null
        ? "SELECT id FROM clients WHERE referral_code = ? AND id <> ? LIMIT 1"
        : "SELECT id FROM clients WHERE referral_code = ? LIMIT 1";
    const [rows] = await q(sql, params);
    if (rows.length === 0) return candidate;
  }
  throw new Error("Could not generate unique referral code");
}

module.exports = {
  sanitizeUsernameForCode,
  baseReferralCodeFromUsername,
  generateUniqueReferralCode,
};

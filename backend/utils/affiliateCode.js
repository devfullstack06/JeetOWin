/**
 * Generate unique affiliate referral codes (AFF + numeric suffix).
 */

const { pool } = require("../config/database");

async function affiliateCodeExists(code, connection = null) {
  const q = connection ? connection.query.bind(connection) : pool.query.bind(pool);
  const [rows] = await q(
    "SELECT id FROM affiliate_profiles WHERE referral_code = ? LIMIT 1",
    [code]
  );
  return rows.length > 0;
}

/**
 * @param {import('mysql2/promise').PoolConnection} [connection]
 */
async function generateUniqueAffiliateCode(connection = null) {
  const q = connection ? connection.query.bind(connection) : pool.query.bind(pool);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = String(Math.floor(10000 + Math.random() * 90000));
    const candidate = `AFF${suffix}`;
    const [rows] = await q(
      "SELECT id FROM affiliate_profiles WHERE referral_code = ? LIMIT 1",
      [candidate]
    );
    if (rows.length === 0) return candidate;
  }
  throw new Error("Could not generate unique affiliate referral code");
}

module.exports = {
  generateUniqueAffiliateCode,
  affiliateCodeExists,
};

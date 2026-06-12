/**
 * Walk referral upline chain (max 3 tiers).
 */

const { pool } = require("../config/database");

/**
 * @param {number} sourceClientId
 * @param {import('mysql2/promise').PoolConnection} [connection]
 * @returns {Promise<Array<{ tier: number, clientId: number }>>}
 */
async function getUplineEarners(sourceClientId, connection = null) {
  const q = connection ? connection.query.bind(connection) : pool.query.bind(pool);
  const earners = [];
  let currentId = Number(sourceClientId);

  for (let tier = 1; tier <= 3; tier += 1) {
    const [rows] = await q(
      "SELECT referred_by_client_id FROM clients WHERE id = ? LIMIT 1",
      [currentId]
    );
    const referrerId = rows?.[0]?.referred_by_client_id;
    if (!referrerId) break;
    earners.push({ tier, clientId: Number(referrerId) });
    currentId = Number(referrerId);
  }

  return earners;
}

/**
 * Detect cycle if setting referred_by_client_id.
 */
async function wouldCreateReferralCycle(clientId, proposedReferrerId) {
  if (!proposedReferrerId || clientId === proposedReferrerId) return true;
  let walk = Number(proposedReferrerId);
  const seen = new Set([Number(clientId)]);
  for (let i = 0; i < 4; i += 1) {
    if (seen.has(walk)) return true;
    seen.add(walk);
    const [rows] = await pool.query(
      "SELECT referred_by_client_id FROM clients WHERE id = ? LIMIT 1",
      [walk]
    );
    const next = rows?.[0]?.referred_by_client_id;
    if (!next) return false;
    walk = Number(next);
  }
  return false;
}

module.exports = {
  getUplineEarners,
  wouldCreateReferralCycle,
};

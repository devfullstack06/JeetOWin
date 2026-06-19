/**
 * Client referral downline tree (3 tiers max, signup chain only).
 */

const { pool } = require("../config/database");

/**
 * @param {number} earnerClientId
 * @returns {Promise<{ totals: { tier1: number, tier2: number, tier3: number }, direct: object[] }>}
 */
async function buildReferralDownline(earnerClientId) {
  const [directRows] = await pool.query(
    `SELECT c.id AS clientId, u.username
     FROM clients c
     INNER JOIN users u ON u.id = c.user_id
     WHERE c.referred_by_client_id = ?
     ORDER BY u.username ASC, c.id ASC`,
    [earnerClientId]
  );

  const directIds = (directRows || []).map((r) => Number(r.clientId));
  if (!directIds.length) {
    return { totals: { tier1: 0, tier2: 0, tier3: 0 }, direct: [] };
  }

  const [tier2Rows] = await pool.query(
    `SELECT c.id AS clientId, u.username, c.referred_by_client_id AS parentId
     FROM clients c
     INNER JOIN users u ON u.id = c.user_id
     WHERE c.referred_by_client_id IN (?)
     ORDER BY u.username ASC, c.id ASC`,
    [directIds]
  );

  const tier2Ids = (tier2Rows || []).map((r) => Number(r.clientId));
  let tier3Rows = [];
  if (tier2Ids.length) {
    [tier3Rows] = await pool.query(
      `SELECT c.id AS clientId, u.username, c.referred_by_client_id AS parentId
       FROM clients c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.referred_by_client_id IN (?)
       ORDER BY u.username ASC, c.id ASC`,
      [tier2Ids]
    );
  }

  const tier3ByParent = new Map();
  for (const row of tier3Rows || []) {
    const parentId = Number(row.parentId);
    if (!tier3ByParent.has(parentId)) tier3ByParent.set(parentId, []);
    tier3ByParent.get(parentId).push({
      clientId: Number(row.clientId),
      username: row.username,
    });
  }

  const tier2ByDirect = new Map();
  for (const row of tier2Rows || []) {
    const parentId = Number(row.parentId);
    const clientId = Number(row.clientId);
    const tier3 = tier3ByParent.get(clientId) || [];
    const node = {
      clientId,
      username: row.username,
      tier3Count: tier3.length,
      tier3,
    };
    if (!tier2ByDirect.has(parentId)) tier2ByDirect.set(parentId, []);
    tier2ByDirect.get(parentId).push(node);
  }

  const direct = (directRows || []).map((row) => {
    const clientId = Number(row.clientId);
    const tier2 = tier2ByDirect.get(clientId) || [];
    const tier2Count = tier2.length;
    const tier3Count = tier2.reduce((sum, n) => sum + n.tier3Count, 0);
    return {
      clientId,
      username: row.username,
      tier2Count,
      tier3Count,
      tier2,
    };
  });

  return {
    totals: {
      tier1: direct.length,
      tier2: (tier2Rows || []).length,
      tier3: (tier3Rows || []).length,
    },
    direct,
  };
}

module.exports = {
  buildReferralDownline,
};

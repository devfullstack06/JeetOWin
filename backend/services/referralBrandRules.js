/**
 * Brand include/exclude for referral TRI/TRO net (global + per-client, effective_from).
 */

const { pool } = require("../config/database");

/**
 * @param {Date|string} atInstant
 */
function toMysqlDatetime(atInstant) {
  const d = atInstant instanceof Date ? atInstant : new Date(atInstant);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * Load rules effective at or before `at` into maps for fast lookup.
 * @param {Date} at
 */
async function loadBrandRuleMaps(at) {
  const atSql = toMysqlDatetime(at);
  const [rows] = await pool.query(
    `SELECT scope, client_id, brand_id, is_included, effective_from
     FROM referral_brand_rules
     WHERE effective_from <= ?
     ORDER BY effective_from ASC, id ASC`,
    [atSql]
  );

  const globalByBrand = new Map();
  const clientByKey = new Map();

  for (const r of rows || []) {
    if (r.scope === "global") {
      globalByBrand.set(Number(r.brand_id), !!r.is_included);
    } else if (r.client_id != null) {
      const key = `${Number(r.client_id)}:${Number(r.brand_id)}`;
      clientByKey.set(key, !!r.is_included);
    }
  }

  return { globalByBrand, clientByKey };
}

/**
 * @param {number} clientId - source client whose transfers are evaluated
 * @param {number} brandId
 * @param {Date} atTime - transfer approval time
 * @param {{ globalByBrand: Map, clientByKey: Map }} maps
 */
function isBrandIncludedForClient(clientId, brandId, maps) {
  const key = `${Number(clientId)}:${Number(brandId)}`;
  if (maps.clientByKey.has(key)) return maps.clientByKey.get(key);
  if (maps.globalByBrand.has(Number(brandId))) return maps.globalByBrand.get(Number(brandId));
  return true;
}

async function loadAllBrandRules() {
  const [rows] = await pool.query(
    `SELECT scope, client_id, brand_id, is_included, effective_from
     FROM referral_brand_rules
     ORDER BY effective_from ASC, id ASC`
  );
  return rows || [];
}

/**
 * Resolve inclusion at transfer approval instant (latest applicable rules).
 */
function resolveBrandIncludedAt(clientId, brandId, atInstant, allRules) {
  const at = atInstant instanceof Date ? atInstant : new Date(atInstant);
  let clientRule = null;
  let globalRule = null;

  for (const r of allRules) {
    const eff = new Date(r.effective_from);
    if (Number.isNaN(eff.getTime()) || eff > at) continue;
    if (r.scope === "client" && Number(r.client_id) === Number(clientId) && Number(r.brand_id) === Number(brandId)) {
      clientRule = r;
    }
    if (r.scope === "global" && Number(r.brand_id) === Number(brandId)) {
      globalRule = r;
    }
  }

  if (clientRule) return !!clientRule.is_included;
  if (globalRule) return !!globalRule.is_included;
  return true;
}

module.exports = {
  toMysqlDatetime,
  loadBrandRuleMaps,
  isBrandIncludedForClient,
  loadAllBrandRules,
  resolveBrandIncludedAt,
};

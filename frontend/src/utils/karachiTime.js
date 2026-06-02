const PK_OFFSET_MS = 5 * 60 * 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Roll hour 24+ into valid MySQL DATETIME (e.g. 2026-06-03 24:45:00 → 2026-06-04 00:45:00). */
export function normalizeMysqlWallDatetimeRollOverflow(sql) {
  if (sql == null || sql === "") return null;
  const s = String(sql).trim().replace("T", " ");
  const full = s.length === 16 ? `${s}:00` : s.slice(0, 19);
  const m = full.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return sql;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const H = parseInt(m[4], 10);
  const M = parseInt(m[5], 10);
  const S = parseInt(m[6], 10);
  if (![y, mo, d, H, M, S].every((n) => Number.isFinite(n))) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || M < 0 || M > 59 || S < 0 || S > 59 || H < 0) return null;
  const pad = (n) => String(n).padStart(2, "0");
  let secTotal = H * 3600 + M * 60 + S;
  if (secTotal < 86400) {
    return `${y}-${pad(mo)}-${pad(d)} ${pad(H)}:${pad(M)}:${pad(S)}`;
  }
  const dayCarry = Math.floor(secTotal / 86400);
  secTotal %= 86400;
  const nh = Math.floor(secTotal / 3600);
  const nm = Math.floor((secTotal % 3600) / 60);
  const ns = secTotal % 60;
  const t = Date.UTC(y, mo - 1, d + dayCarry);
  const ud = new Date(t);
  return `${ud.getUTCFullYear()}-${pad(ud.getUTCMonth() + 1)}-${pad(ud.getUTCDate())} ${pad(nh)}:${pad(nm)}:${pad(ns)}`;
}

/** Wall-clock YYYY-MM-DD HH:mm:ss in Asia/Karachi (UTC+5, matches server promotions logic). */
export function formatInstantToKarachiSql(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const k = new Date(d.getTime() + PK_OFFSET_MS);
  return `${k.getUTCFullYear()}-${pad2(k.getUTCMonth() + 1)}-${pad2(k.getUTCDate())} ${pad2(k.getUTCHours())}:${pad2(k.getUTCMinutes())}:${pad2(k.getUTCSeconds())}`;
}

const PK_OFFSET = "+05:00";

/** DB/API naive datetime stored as Asia/Karachi wall time → value for `datetime-local` in the browser. */
export function karachiSqlToDatetimeLocalValue(sql) {
  if (!sql) return "";
  const s = String(sql).trim().slice(0, 19);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return String(sql).slice(0, 16).replace(" ", "T");
  }
  const d = new Date(s.replace(" ", "T") + PK_OFFSET);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

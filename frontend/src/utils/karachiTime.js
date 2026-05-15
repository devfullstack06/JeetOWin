/** Wall-clock YYYY-MM-DD HH:mm:ss in Asia/Karachi for a given instant (matches server promotions logic). */
export function formatInstantToKarachiSql(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(d);
  const obj = {};
  for (const p of parts) obj[p.type] = p.value;
  return `${obj.year}-${obj.month}-${obj.day} ${obj.hour}:${obj.minute}:${obj.second}`;
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

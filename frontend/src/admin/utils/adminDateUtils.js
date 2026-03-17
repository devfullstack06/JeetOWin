/**
 * Global admin-side date/time format: DD-MM-YY HH:MM AM/PM
 * Use only on admin frontend; do not use on client side.
 */

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Format a date/time value for display on admin side.
 * @param {string|Date|number} value - ISO string, Date, or timestamp
 * @returns {string} "DD-MM-YY HH:MM AM/PM" or "—" if invalid
 */
export function formatAdminDateTime(value) {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(typeof value === "string" && value.includes(" ") ? value.replace(" ", "T") : value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = String(d.getFullYear()).slice(-2);
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";
  const mins = pad2(d.getMinutes());
  return `${day}-${month}-${year} ${pad2(h12)}:${mins} ${ampm}`;
}

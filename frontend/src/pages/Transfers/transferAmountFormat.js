/** Match client header balance grouping (LoggedInLayout uses en-PK). */

export function formatTransferAmountPk(value) {
  if (value == null || value === "") return "-";
  const n = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

/** Strip to digits only (for parsing pasted/formatted text). */
export function digitsOnlyFromInput(value) {
  return String(value || "").replace(/\D/g, "");
}

/** Formatted string for amount text input while typing (digits-only state). */
export function formatDigitsPkForInput(digitsOnly) {
  const d = digitsOnlyFromInput(digitsOnly);
  if (!d) return "";
  const n = Number(d);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

/** Client-facing: your linked account username only (no brand-company / master credentials). */
export function formatTransferClientAccountUsername(ticket) {
  const s = String((ticket || {}).clientAccountUsername || "").trim();
  return s || "—";
}

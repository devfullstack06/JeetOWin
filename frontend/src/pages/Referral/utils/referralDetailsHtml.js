function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Normalize stored details body for client modal (HTML from admin editor, or legacy plain text).
 */
export function referralDetailsHtml(body) {
  const s = String(body || "").trim();
  if (!s) return "";
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  return `<p>${escapeHtml(s).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
}

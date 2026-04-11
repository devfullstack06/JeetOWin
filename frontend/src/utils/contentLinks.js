/** True when admin/client saved a real navigation target (not empty or placeholder). */
export function isNavigableContentUrl(value) {
  const s = String(value ?? "").trim();
  if (!s || s === "#") return false;
  return s.startsWith("/") || /^https?:\/\//i.test(s);
}

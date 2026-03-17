/**
 * Resolve wallet company icon URL for <img src={...} />.
 * Priority: iconPath (file path) -> iconKey (legacy) -> iconSvg (data URL fallback).
 * When API is on another origin, prepend that origin so /uploads/... loads from backend.
 */

/**
 * Origin of the API server (e.g. "http://localhost:3000"). Empty string when not set (use relative URLs + Vite proxy).
 */
export function getApiOrigin() {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase) return "";
  try {
    return new URL(apiBase).origin;
  } catch {
    return "";
  }
}

function getUploadsBase() {
  return getApiOrigin();
}

/**
 * @param {{ iconPath?: string, iconKey?: string, iconSvg?: string }} row - Company or wallet row
 * @returns {string|null} URL for img src, or null if no icon
 */
export function getWalletIconUrl(row) {
  if (!row) return null;
  const base = getUploadsBase();
  if (row.iconPath && String(row.iconPath).trim()) {
    return `${base}${row.iconPath.startsWith("/") ? row.iconPath : `/${row.iconPath}`}`;
  }
  if (row.iconKey && String(row.iconKey).trim()) {
    return `${base}/uploads/wallets/${row.iconKey}`;
  }
  if (row.iconSvg && String(row.iconSvg).trim()) {
    try {
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(row.iconSvg)))}`;
    } catch {
      return null;
    }
  }
  return null;
}

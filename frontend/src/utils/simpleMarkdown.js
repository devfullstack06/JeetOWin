function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, "<u>$1</u>");
}

function closeList(out, listKind) {
  if (listKind === "ul") out.push("</ul>");
  if (listKind === "ol") out.push("</ol>");
  return null;
}

export function markdownToHtml(markdown) {
  const src = escapeHtml(markdown).replace(/\r\n?/g, "\n");
  const lines = src.split("\n");
  const out = [];
  /** @type {null | 'ul' | 'ol'} */
  let listKind = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      listKind = closeList(out, listKind);
      continue;
    }
    const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      listKind = closeList(out, listKind);
      const level = hMatch[1].length;
      out.push(`<h${level}>${formatInline(hMatch[2])}</h${level}>`);
      continue;
    }
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listKind !== "ol") {
        listKind = closeList(out, listKind);
        out.push("<ol>");
        listKind = "ol";
      }
      out.push(`<li>${formatInline(olMatch[1])}</li>`);
      continue;
    }
    const liMatch = line.match(/^[-*]\s+(.+)$/);
    if (liMatch) {
      if (listKind !== "ul") {
        listKind = closeList(out, listKind);
        out.push("<ul>");
        listKind = "ul";
      }
      out.push(`<li>${formatInline(liMatch[1])}</li>`);
      continue;
    }
    listKind = closeList(out, listKind);
    out.push(`<p>${formatInline(line)}</p>`);
  }
  closeList(out, listKind);
  return out.join("");
}

/**
 * Replace `{username}` in announcement HTML with the viewer's display name (HTML-escaped).
 * Run after markdownToHtml so the value is not parsed as markdown.
 */
export function personalizeAnnouncementHtml(html, { username = "" } = {}) {
  const safe = escapeHtml(String(username || "").trim() || "User");
  return String(html || "").replace(/\{username\}/gi, safe);
}


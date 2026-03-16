/**
 * Sanitize SVG for safe storage: reject script, embedded JS, malformed markup.
 * Requires a valid <svg> root element.
 * @param {string|Buffer} input - Raw SVG content
 * @returns {{ ok: boolean, data?: string, error?: string }}
 */
function sanitizeSvg(input) {
  const raw = Buffer.isBuffer(input) ? input.toString("utf8") : String(input || "");
  const lower = raw.toLowerCase();

  // Reject script tags (any case)
  if (/<script\b/i.test(raw)) {
    return { ok: false, error: "SVG must not contain script tags." };
  }
  // Reject javascript: and data: with script-like content
  if (/javascript\s*:/i.test(raw)) {
    return { ok: false, error: "SVG must not contain javascript: URIs." };
  }
  if (/\bdata:\s*text\/html\s*,/i.test(raw)) {
    return { ok: false, error: "SVG must not contain embedded HTML." };
  }
  // Reject event handlers (onclick=, onload=, etc.)
  if (/\bon\w+\s*=/i.test(raw)) {
    return { ok: false, error: "SVG must not contain event handlers." };
  }
  // Require valid <svg root
  const svgOpen = raw.match(/<\s*svg\s([^>]*>|>)/i);
  if (!svgOpen) {
    return { ok: false, error: "SVG must have a valid <svg> root element." };
  }

  return { ok: true, data: raw };
}

module.exports = { sanitizeSvg };

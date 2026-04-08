const { pool } = require("../../config/database");

const DEFAULT_SETTINGS = {
  provider: "none",
  scriptSrc: "",
  enabled: false,
  startMinimized: true,
  hideOnAdmin: true,
  hideOnAuth: true,
};

async function ensureChatWidgetSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_widget_settings (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      provider VARCHAR(20) NOT NULL DEFAULT 'none',
      script_src VARCHAR(500) NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      start_minimized TINYINT(1) NOT NULL DEFAULT 1,
      hide_on_admin TINYINT(1) NOT NULL DEFAULT 1,
      hide_on_auth TINYINT(1) NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await pool.query(
    `INSERT IGNORE INTO chat_widget_settings
      (id, provider, script_src, enabled, start_minimized, hide_on_admin, hide_on_auth)
     VALUES (1, 'none', NULL, 0, 1, 1, 1)`
  );
}

function parseProvider(raw) {
  const v = String(raw || "").trim().toLowerCase();
  return ["none", "tawk", "textcom"].includes(v) ? v : null;
}

function parseBool(raw, fallback) {
  if (raw === undefined || raw === null) return fallback;
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  const v = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

function mapRow(row) {
  return {
    provider: row?.provider || "none",
    scriptSrc: row?.script_src ? String(row.script_src) : "",
    enabled: !!row?.enabled,
    startMinimized: !!row?.start_minimized,
    hideOnAdmin: !!row?.hide_on_admin,
    hideOnAuth: !!row?.hide_on_auth,
    updatedAt: row?.updated_at || null,
  };
}

async function getCurrentSettings() {
  await ensureChatWidgetSettingsTable();
  const [rows] = await pool.query(
    `SELECT provider, script_src, enabled, start_minimized, hide_on_admin, hide_on_auth, updated_at
     FROM chat_widget_settings WHERE id = 1 LIMIT 1`
  );
  return mapRow(rows?.[0]);
}

/**
 * Public settings for client app.
 * GET /api/chat-widget/settings
 */
exports.getPublicChatWidgetSettings = async (req, res) => {
  try {
    const s = await getCurrentSettings();
    return res.status(200).json(s);
  } catch (err) {
    console.error("getPublicChatWidgetSettings error:", err);
    return res.status(200).json({ ...DEFAULT_SETTINGS, updatedAt: null });
  }
};

/**
 * Admin settings read.
 * GET /api/admin/chat-widget-settings
 */
exports.getAdminChatWidgetSettings = async (req, res) => {
  try {
    const s = await getCurrentSettings();
    return res.status(200).json(s);
  } catch (err) {
    console.error("getAdminChatWidgetSettings error:", err);
    return res.status(500).json({ message: "Failed to load chat settings." });
  }
};

/**
 * Admin settings update.
 * PATCH /api/admin/chat-widget-settings
 */
exports.patchAdminChatWidgetSettings = async (req, res) => {
  try {
    const current = await getCurrentSettings();
    const provider = req.body?.provider !== undefined ? parseProvider(req.body.provider) : current.provider;
    if (!provider) return res.status(400).json({ message: "Invalid provider." });

    const scriptSrcRaw =
      req.body?.scriptSrc !== undefined ? String(req.body.scriptSrc || "").trim() : current.scriptSrc;

    if (provider !== "none" && !scriptSrcRaw) {
      return res.status(400).json({ message: "Script source is required unless provider is none." });
    }

    const enabled = parseBool(req.body?.enabled, current.enabled);
    const startMinimized = parseBool(req.body?.startMinimized, current.startMinimized);
    const hideOnAdmin = parseBool(req.body?.hideOnAdmin, current.hideOnAdmin);
    const hideOnAuth = parseBool(req.body?.hideOnAuth, current.hideOnAuth);

    await pool.query(
      `UPDATE chat_widget_settings
       SET provider = ?, script_src = ?, enabled = ?, start_minimized = ?, hide_on_admin = ?, hide_on_auth = ?
       WHERE id = 1`,
      [
        provider,
        scriptSrcRaw || null,
        enabled ? 1 : 0,
        startMinimized ? 1 : 0,
        hideOnAdmin ? 1 : 0,
        hideOnAuth ? 1 : 0,
      ]
    );

    const updated = await getCurrentSettings();
    return res.status(200).json({ message: "Chat settings updated.", settings: updated });
  } catch (err) {
    console.error("patchAdminChatWidgetSettings error:", err);
    return res.status(500).json({ message: "Failed to update chat settings." });
  }
};

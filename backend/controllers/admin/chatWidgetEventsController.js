const crypto = require("crypto");
const { pool } = require("../../config/database");

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseDatePart(v) {
  const s = String(v || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  return s;
}

function getSecret() {
  return String(process.env.CHAT_WIDGET_WEBHOOK_SECRET || "").trim();
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

async function ensureEventsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_widget_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      provider VARCHAR(20) NOT NULL DEFAULT 'unknown',
      event_name VARCHAR(80) NOT NULL DEFAULT 'unknown',
      external_event_id VARCHAR(120) NULL,
      conversation_id VARCHAR(120) NULL,
      visitor_id VARCHAR(120) NULL,
      visitor_name VARCHAR(120) NULL,
      visitor_email VARCHAR(190) NULL,
      page_url VARCHAR(500) NULL,
      event_at DATETIME NULL,
      payload_json LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_chat_widget_events_created_at (created_at),
      KEY idx_chat_widget_events_event_name (event_name),
      KEY idx_chat_widget_events_provider (provider),
      KEY idx_chat_widget_events_conversation_id (conversation_id),
      UNIQUE KEY uq_chat_widget_events_external_event_id (external_event_id)
    )
  `);
}

function extractEvent(body) {
  const provider = String(body?.provider || body?.source || "unknown").trim().toLowerCase() || "unknown";
  const eventName =
    String(body?.event || body?.eventName || body?.type || "unknown").trim().toLowerCase() || "unknown";
  const externalEventId = String(body?.eventId || body?.id || "").trim() || null;
  const conversationId =
    String(body?.conversationId || body?.chatId || body?.chat_id || body?.conversation_id || "").trim() || null;
  const visitorId = String(body?.visitorId || body?.visitor?.id || body?.visitor_id || "").trim() || null;
  const visitorName = String(body?.visitorName || body?.visitor?.name || "").trim() || null;
  const visitorEmail = String(body?.visitorEmail || body?.visitor?.email || "").trim() || null;
  const pageUrl = String(body?.pageUrl || body?.url || body?.page?.url || "").trim() || null;
  const rawWhen = body?.eventAt || body?.timestamp || body?.createdAt || null;
  const dt = rawWhen ? new Date(rawWhen) : null;
  const eventAt = dt && !Number.isNaN(dt.getTime()) ? dt : null;
  return {
    provider,
    eventName,
    externalEventId,
    conversationId,
    visitorId,
    visitorName,
    visitorEmail,
    pageUrl,
    eventAt,
    payloadJson: JSON.stringify(body || {}),
  };
}

/**
 * POST /api/chat-widget/webhook
 */
exports.captureChatWidgetWebhook = async (req, res) => {
  try {
    const expected = getSecret();
    if (!expected) return res.status(503).json({ message: "Webhook secret is not configured." });

    const token =
      req.headers["x-chat-webhook-secret"] ||
      req.query.secret ||
      req.body?.secret ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!safeEqual(token, expected)) return res.status(401).json({ message: "Unauthorized webhook." });

    await ensureEventsTable();
    const e = extractEvent(req.body || {});
    await pool.query(
      `INSERT INTO chat_widget_events
      (provider, event_name, external_event_id, conversation_id, visitor_id, visitor_name, visitor_email, page_url, event_at, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.provider,
        e.eventName,
        e.externalEventId,
        e.conversationId,
        e.visitorId,
        e.visitorName,
        e.visitorEmail,
        e.pageUrl,
        e.eventAt,
        e.payloadJson,
      ]
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") return res.status(200).json({ ok: true, deduped: true });
    console.error("captureChatWidgetWebhook error:", err);
    return res.status(500).json({ message: "Failed to store webhook event." });
  }
};

/**
 * GET /api/admin/chat-widget-events
 */
exports.getAdminChatWidgetEvents = async (req, res) => {
  try {
    await ensureEventsTable();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = Math.min(normalizePositiveInt(req.query.pageSize, 25), 200);
    const provider = String(req.query.provider || "").trim().toLowerCase();
    const eventName = String(req.query.eventName || "").trim().toLowerCase();
    const dateFrom = parseDatePart(req.query.dateFrom);
    const dateTo = parseDatePart(req.query.dateTo);

    const where = ["1=1"];
    const params = [];
    if (provider) {
      where.push("provider = ?");
      params.push(provider);
    }
    if (eventName) {
      where.push("event_name = ?");
      params.push(eventName);
    }
    if (dateFrom) {
      where.push("created_at >= ?");
      params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      where.push("created_at <= ?");
      params.push(`${dateTo} 23:59:59`);
    }
    const whereSql = where.join(" AND ");
    const [[c]] = await pool.query(`SELECT COUNT(*) AS total FROM chat_widget_events WHERE ${whereSql}`, params);
    const total = Number(c?.total || 0);
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, provider, event_name, external_event_id, conversation_id, visitor_name, visitor_email, page_url, event_at, created_at
       FROM chat_widget_events
       WHERE ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const items = (rows || []).map((r) => ({
      id: Number(r.id),
      provider: r.provider || "",
      eventName: r.event_name || "",
      externalEventId: r.external_event_id || null,
      conversationId: r.conversation_id || null,
      visitorName: r.visitor_name || null,
      visitorEmail: r.visitor_email || null,
      pageUrl: r.page_url || null,
      eventAt: r.event_at || null,
      createdAt: r.created_at || null,
    }));
    return res.status(200).json({ items, total, page, pageSize });
  } catch (err) {
    console.error("getAdminChatWidgetEvents error:", err);
    return res.status(500).json({ message: "Failed to load chat events.", items: [], total: 0, page: 1, pageSize: 25 });
  }
};

/**
 * GET /api/admin/chat-widget-events/summary
 */
exports.getAdminChatWidgetEventsSummary = async (req, res) => {
  try {
    await ensureEventsTable();
    const days = Math.min(normalizePositiveInt(req.query.days, 7), 90);
    const [[tot]] = await pool.query(
      `SELECT COUNT(*) AS c
       FROM chat_widget_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
    const [[uniqVisitors]] = await pool.query(
      `SELECT COUNT(DISTINCT COALESCE(visitor_email, visitor_id, conversation_id, external_event_id)) AS c
       FROM chat_widget_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
    const [[byProviderTop]] = await pool.query(
      `SELECT provider, COUNT(*) AS c
       FROM chat_widget_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY provider
       ORDER BY c DESC
       LIMIT 1`,
      [days]
    );
    return res.status(200).json({
      days,
      totalEvents: Number(tot?.c || 0),
      uniqueVisitors: Number(uniqVisitors?.c || 0),
      topProvider: byProviderTop?.provider || null,
      topProviderEvents: Number(byProviderTop?.c || 0),
    });
  } catch (err) {
    console.error("getAdminChatWidgetEventsSummary error:", err);
    return res.status(500).json({ message: "Failed to load chat event summary." });
  }
};

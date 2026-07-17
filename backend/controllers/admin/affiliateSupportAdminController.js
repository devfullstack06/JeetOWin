const { pool } = require("../../config/database");

function mapSupportRow(r) {
  return {
    id: r.id,
    affiliateId: r.affiliate_id,
    userId: r.user_id,
    affiliateName: r.affiliate_name || "",
    username: r.username || "",
    message: r.message || "",
    status: r.status,
    adminReply: r.admin_reply || null,
    repliedAt: r.replied_at || null,
    repliedByUsername: r.replied_by_username || null,
    inboxMessageId: r.inbox_message_id || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

exports.getAdminAffiliateSupportMessages = async (req, res) => {
  try {
    const status = String(req.query.status || "").trim().toLowerCase();
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));

    const where = [];
    const params = [];
    if (status === "open" || status === "replied" || status === "closed") {
      where.push("m.status = ?");
      params.push(status);
    }
    if (search) {
      where.push("(LOWER(u.username) LIKE ? OR LOWER(ap.name) LIKE ? OR m.message LIKE ?)");
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, `%${search}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM affiliate_support_messages m
       INNER JOIN affiliate_profiles ap ON ap.id = m.affiliate_id
       INNER JOIN users u ON u.id = m.user_id
       ${whereSql}`,
      params
    );
    const total = Number(countRow?.total || 0);
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.query(
      `SELECT m.*, ap.name AS affiliate_name, u.username,
              ru.username AS replied_by_username
       FROM affiliate_support_messages m
       INNER JOIN affiliate_profiles ap ON ap.id = m.affiliate_id
       INNER JOIN users u ON u.id = m.user_id
       LEFT JOIN users ru ON ru.id = m.replied_by_user_id
       ${whereSql}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return res.json({
      total,
      page,
      pageSize,
      messages: (rows || []).map(mapSupportRow),
    });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "Support messages table missing. Run migration_affiliate_support_messages.sql",
        messages: [],
        total: 0,
      });
    }
    console.error("[admin affiliate support] list:", e);
    return res.status(500).json({ message: "Failed to load support messages." });
  }
};

exports.getAdminAffiliateSupportMessage = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid message id." });
    }
    const [[row]] = await pool.query(
      `SELECT m.*, ap.name AS affiliate_name, u.username,
              ru.username AS replied_by_username
       FROM affiliate_support_messages m
       INNER JOIN affiliate_profiles ap ON ap.id = m.affiliate_id
       INNER JOIN users u ON u.id = m.user_id
       LEFT JOIN users ru ON ru.id = m.replied_by_user_id
       WHERE m.id = ?
       LIMIT 1`,
      [id]
    );
    if (!row) return res.status(404).json({ message: "Message not found." });
    return res.json({ message: mapSupportRow(row) });
  } catch (e) {
    console.error("[admin affiliate support] get:", e);
    return res.status(500).json({ message: "Failed to load support message." });
  }
};

exports.replyAdminAffiliateSupportMessage = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const reply = String(req.body?.reply || "").trim();
    const close = req.body?.close === true || req.body?.status === "closed";
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid message id." });
    }
    if (!reply || reply.length < 2) {
      return res.status(400).json({ message: "Reply is required." });
    }

    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT m.*, ap.name AS affiliate_name, u.username
       FROM affiliate_support_messages m
       INNER JOIN affiliate_profiles ap ON ap.id = m.affiliate_id
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.id = ?
       FOR UPDATE`,
      [id]
    );
    if (!row) {
      await conn.rollback();
      return res.status(404).json({ message: "Message not found." });
    }

    const adminUserId = req.user?.userId || null;
    const status = close ? "closed" : "replied";
    let inboxMessageId = row.inbox_message_id || null;

    // Deliver reply as an affiliate inbox message so it shows in portal notifications
    const crypto = require("crypto");
    const publicId = crypto.randomBytes(8).toString("hex");
    const title = `Support reply (#${id})`;
    const body = reply;
    const [ins] = await conn.query(
      `INSERT INTO inbox_messages
        (public_id, title, body_markdown, audience_mode, status, timezone, scheduled_at_utc, sent_at, audience_count, created_by_user_id)
       VALUES (?, ?, ?, 'affiliates', 'sent', 'Asia/Karachi', NULL, UTC_TIMESTAMP(), 1, ?)`,
      [publicId, title, body, adminUserId]
    );
    inboxMessageId = ins.insertId;
    await conn.query(
      `INSERT INTO inbox_recipients (inbox_message_id, user_id) VALUES (?, ?)`,
      [inboxMessageId, row.user_id]
    );

    await conn.query(
      `UPDATE affiliate_support_messages
       SET admin_reply = ?, status = ?, replied_by_user_id = ?, replied_at = UTC_TIMESTAMP(),
           inbox_message_id = ?
       WHERE id = ?`,
      [reply, status, adminUserId, inboxMessageId, id]
    );

    await conn.commit();

    const [[updated]] = await pool.query(
      `SELECT m.*, ap.name AS affiliate_name, u.username,
              ru.username AS replied_by_username
       FROM affiliate_support_messages m
       INNER JOIN affiliate_profiles ap ON ap.id = m.affiliate_id
       INNER JOIN users u ON u.id = m.user_id
       LEFT JOIN users ru ON ru.id = m.replied_by_user_id
       WHERE m.id = ?`,
      [id]
    );

    return res.json({ ok: true, message: mapSupportRow(updated) });
  } catch (e) {
    try { await conn.rollback(); } catch { /* ignore */ }
    console.error("[admin affiliate support] reply:", e);
    return res.status(500).json({ message: "Failed to send reply." });
  } finally {
    conn.release();
  }
};

exports.patchAdminAffiliateSupportMessageStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "").trim().toLowerCase();
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid message id." });
    }
    if (!["open", "replied", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    const [result] = await pool.query(
      `UPDATE affiliate_support_messages SET status = ? WHERE id = ?`,
      [status, id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Message not found." });
    }
    return res.json({ ok: true, status });
  } catch (e) {
    console.error("[admin affiliate support] status:", e);
    return res.status(500).json({ message: "Failed to update status." });
  }
};

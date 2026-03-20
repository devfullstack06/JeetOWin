const { pool } = require("../../config/database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function buildItem(row) {
  return {
    id: row.id,
    ticketId: row.id,
    clientId: row.client_id,
    clientUsername: row.client_username != null ? String(row.client_username) : "",
    suggestedUsername: row.suggested_username != null ? String(row.suggested_username) : "",
    brand: row.brand || "",
    status: row.status || "pending",
    reason: row.reason != null ? String(row.reason) : "",
    notes: row.notes != null ? String(row.notes) : "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/admin/account-tickets
 * List Pending and Rejected tickets. Filters: ticketId, client, brand, state (pending|rejected), dateFrom, dateTo.
 * Overdue is computed on frontend (pending + created_at older than 10 mins).
 */
exports.getAdminAccountTickets = async (req, res) => {
  try {
    const ticketId = req.query.ticketId != null ? String(req.query.ticketId).trim() : "";
    const client = String(req.query.client || "").trim();
    const brand = String(req.query.brand || "").trim();
    const state = String(req.query.state || "pending").trim().toLowerCase();
    const dateFrom = String(req.query.dateFrom || req.query.startDate || "").trim();
    const dateTo = String(req.query.dateTo || req.query.endDate || "").trim();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);

    const where = ["1=1"];
    const params = [];

    if (ticketId) {
      const tid = Number(ticketId);
      if (Number.isFinite(tid)) {
        where.push("at.id = ?");
        params.push(tid);
      } else {
        where.push("at.id = 0");
      }
    }
    if (client) {
      where.push("u.username LIKE ?");
      params.push(`%${client}%`);
    }
    if (brand) {
      where.push("at.brand LIKE ?");
      params.push(`%${brand}%`);
    }
    if (state === "rejected") {
      where.push("at.status = 'rejected'");
    } else {
      where.push("at.status = 'pending'");
    }
    if (dateFrom) {
      where.push("at.created_at >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("at.created_at <= ?");
      params.push(dateTo + " 23:59:59");
    }

    const whereSql = where.join(" AND ");
    const joinUsers = " LEFT JOIN users u ON u.id = at.client_id ";

    let total = 0;
    let rows = [];

    try {
      const [[c]] = await pool.query(
        `SELECT COUNT(*) AS total FROM account_tickets at ${joinUsers} WHERE ${whereSql}`,
        params
      );
      total = Number(c?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      throw e;
    }

    const offset = (page - 1) * pageSize;
    try {
      [rows] = await pool.query(
        `SELECT at.id, at.client_id, at.brand, at.suggested_username, at.status, at.reason, at.notes, at.created_at, at.updated_at,
                u.username AS client_username
         FROM account_tickets at ${joinUsers}
         WHERE ${whereSql}
         ORDER BY at.created_at DESC, at.id DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE" || e.code === "ER_BAD_FIELD_ERROR") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      throw e;
    }

    const items = (rows || []).map((r) => buildItem(r));
    return res.status(200).json({ items, total, page, pageSize });
  } catch (err) {
    console.error("getAdminAccountTickets error:", err);
    return res.status(500).json({ message: "Failed to load tickets.", items: [], total: 0, page: 1, pageSize: 25 });
  }
};

/**
 * POST /api/admin/account-tickets/:id/approve
 * Create client_accounts from ticket then delete ticket.
 * Body: masterId (brand_company_id), username, notes (optional)
 */
exports.approveAdminAccountTicket = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const masterId = body.masterId != null && Number.isFinite(Number(body.masterId)) ? Number(body.masterId) : null;
    const username = String(body.username || "").trim();
    const notes = body.notes != null ? String(body.notes || "").trim() : null;

    const [ticketRows] = await pool.query(
      "SELECT id, client_id, brand, suggested_username FROM account_tickets WHERE id = ? LIMIT 1",
      [id]
    );
    if (!ticketRows.length) return res.status(404).json({ message: "Ticket not found." });
    const ticket = ticketRows[0];

    const finalUsername = username || ticket.suggested_username || "";
    if (!finalUsername) return res.status(400).json({ message: "Username is required." });

    let brandId = null;
    const [bRows] = await pool.query("SELECT id, name FROM brands WHERE name = ? LIMIT 1", [ticket.brand]);
    if (bRows.length) brandId = bRows[0].id;

    const randomPassword = crypto.randomBytes(12).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const suggestedUsername = ticket.suggested_username != null ? String(ticket.suggested_username).trim() : null;
    await pool.query(
      `INSERT INTO client_accounts (username, suggested_username, password_hash, client_id, brand, brand_id, brand_company_id, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
      [finalUsername, suggestedUsername || null, passwordHash, ticket.client_id, ticket.brand, brandId, masterId, notes || null]
    );

    await pool.query("DELETE FROM account_tickets WHERE id = ?", [id]);

    return res.status(200).json({ message: "Approved. Account created.", ticketId: id });
  } catch (err) {
    console.error("approveAdminAccountTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to approve ticket." });
  }
};

/**
 * PATCH /api/admin/account-tickets/:id
 * Update notes only. Allowed only when ticket status is rejected.
 * Body: notes (optional)
 */
exports.patchAdminAccountTicket = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const notes = body.notes != null ? String(body.notes || "").trim() : null;

    const [existing] = await pool.query("SELECT id, status FROM account_tickets WHERE id = ? LIMIT 1", [id]);
    if (!existing.length) return res.status(404).json({ message: "Ticket not found." });
    if (existing[0].status !== "rejected") return res.status(400).json({ message: "Only rejected tickets can be updated." });

    await pool.query("UPDATE account_tickets SET notes = ?, updated_at = NOW() WHERE id = ?", [notes || null, id]);
    return res.status(200).json({ message: "Updated.", ticketId: id });
  } catch (err) {
    console.error("patchAdminAccountTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to update ticket." });
  }
};

/**
 * PATCH /api/admin/account-tickets/:id/reject
 * Set status=rejected, reason, notes.
 */
exports.rejectAdminAccountTicket = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const reason = body.reason != null ? String(body.reason || "").trim() : null;
    const notes = body.notes != null ? String(body.notes || "").trim() : null;

    const [existing] = await pool.query("SELECT id FROM account_tickets WHERE id = ? LIMIT 1", [id]);
    if (!existing.length) return res.status(404).json({ message: "Ticket not found." });

    const updates = ["status = 'rejected'", "updated_at = NOW()"];
    const params = [];
    if (reason !== null) {
      updates.push("reason = ?");
      params.push(reason);
    }
    if (notes !== null) {
      updates.push("notes = ?");
      params.push(notes);
    }
    params.push(id);
    await pool.query(`UPDATE account_tickets SET ${updates.join(", ")} WHERE id = ?`, params);

    return res.status(200).json({ message: "Rejected.", ticketId: id });
  } catch (err) {
    console.error("rejectAdminAccountTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to reject ticket." });
  }
};

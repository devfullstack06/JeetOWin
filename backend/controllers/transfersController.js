const { pool } = require("../config/database");

/**
 * Ensure client role
 */
function requireClient(req, res) {
  if (!req.user || req.user.role !== "client") {
    res.status(403).json({ error: "Forbidden: client role required" });
    return false;
  }
  return true;
}

function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

// GET /api/transfers/history?limit=10
async function getTransferHistory(req, res) {
  if (!requireClient(req, res)) return;

  const limit = Math.min(Math.max(toInt(req.query.limit, 10), 1), 50);

  try {
    const [rows] = await pool.query(
      `
      SELECT id, brand, username, direction, amount, status, created_at
      FROM transfer_tickets
      WHERE client_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [req.user.userId, limit]
    );

    return res.json({
      transfers: rows.map((r) => ({
        id: r.id,
        brand: r.brand,
        username: r.username,
        direction: r.direction,
        amount: String(r.amount),
        status: r.status,
        createdAt: r.created_at
          ? new Date(r.created_at).toISOString()
          : null,
      })),
    });
  } catch (e) {
    console.error("[transfers] GET /history error:", e);
    return res.status(500).json({ error: "Failed to fetch transfer history" });
  }
}

// POST /api/transfers/tickets
// body: { brand, username, direction, amount }
async function createTransferTicket(req, res) {
  if (!requireClient(req, res)) return;

  const brand = String(req.body?.brand || "").trim();
  const username = String(req.body?.username || "").trim();
  const direction = String(req.body?.direction || "").trim().toUpperCase();
  const amountRaw = String(req.body?.amount || "").trim();

  if (!brand) return res.status(400).json({ error: "brand is required" });
  if (!username) return res.status(400).json({ error: "username is required" });
  if (!["IN", "OUT"].includes(direction)) {
    return res.status(400).json({ error: "direction must be IN or OUT" });
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  try {
    const [result] = await pool.query(
      `
      INSERT INTO transfer_tickets
        (client_id, brand, username, direction, amount, status, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, 'pending', NOW(), NOW())
      `,
      [req.user.userId, brand, username, direction, amount]
    );

    return res.status(201).json({ ticketId: result.insertId });
  } catch (e) {
    console.error("[transfers] POST /tickets error:", e);
    return res.status(500).json({ error: "Failed to create transfer ticket" });
  }
}

// GET /api/transfers/tickets/:ticketId
async function getTransferTicketStatus(req, res) {
  if (!requireClient(req, res)) return;

  const ticketId = toInt(req.params.ticketId, 0);
  if (!ticketId) return res.status(400).json({ error: "invalid ticketId" });

  try {
    const [rows] = await pool.query(
      `
      SELECT id, client_id, brand, username, direction, amount, status, admin_note, created_at
      FROM transfer_tickets
      WHERE id = ?
      LIMIT 1
      `,
      [ticketId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Ticket not found" });

    const t = rows[0];
    if (t.client_id !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // match Accounts API style: status + reason (if rejected)
    if (t.status === "rejected") {
      return res.json({ status: "rejected", reason: t.admin_note || "" });
    }

    if (t.status === "approved") {
      return res.json({
        status: "approved",
        transfer: {
          id: t.id,
          brand: t.brand,
          username: t.username,
          direction: t.direction,
          amount: String(t.amount),
          createdAt: t.created_at
            ? new Date(t.created_at).toISOString()
            : null,
        },
      });
    }

    return res.json({ status: "pending" });
  } catch (e) {
    console.error("[transfers] GET /tickets/:ticketId error:", e);
    return res.status(500).json({ error: "Failed to fetch ticket status" });
  }
}

// GET /api/transfers/brands
// Reuse same brands table as Accounts (fallback safe)
async function getTransferBrands(req, res) {
  if (!requireClient(req, res)) return;

  try {
    const [rows] = await pool.query(
      "SELECT name FROM brands WHERE is_active = 1 ORDER BY name ASC"
    );
    return res.json({ brands: rows.map((r) => r.name) });
  } catch (e) {
    console.error("[transfers] /brands error:", e);
    return res.json({ brands: ["Betpro", "BrandX", "BrandY", "BrandZ"] });
  }
}

// GET /api/transfers/accounts?brand=Betpro
async function getTransferAccountsByBrand(req, res) {
  if (!requireClient(req, res)) return;

  const brand = String(req.query.brand || "").trim();
  if (!brand) return res.status(400).json({ error: "brand is required" });

  try {
    const [rows] = await pool.query(
      `
      SELECT id, brand, username, created_at
      FROM client_accounts
      WHERE client_id = ? AND brand = ?
      ORDER BY created_at DESC
      `,
      [req.user.userId, brand]
    );

    return res.json({
      accounts: rows.map((r) => ({
        id: r.id,
        brand: r.brand,
        username: r.username,
      })),
    });
  } catch (e) {
    console.error("[transfers] GET /accounts error:", e);
    return res.json({ accounts: [] });
  }
}

module.exports = {
  getTransferHistory,
  createTransferTicket,
  getTransferTicketStatus,
  getTransferBrands,
  getTransferAccountsByBrand,
};

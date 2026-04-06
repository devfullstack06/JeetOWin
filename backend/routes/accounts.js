// backend/routes/accounts.js
const express = require("express");
const authenticateToken = require("../middleware/auth");
const { pool } = require("../config/database");

const router = express.Router();

/**
 * Ensure client role
 */
function requireClient(req, res, next) {
  if (!req.user || req.user.role !== "client") {
    return res.status(403).json({ error: "Forbidden: client role required" });
  }
  next();
}

/**
 * GET /api/accounts/brands
 * Returns available brands. (Admin can manage later.)
 */
router.get("/brands", authenticateToken, requireClient, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, icon_path FROM brands WHERE available_accounts = 1 ORDER BY sort_order ASC, name ASC"
    );
    const brands = (rows || []).map((r) => ({
      id: r.id,
      name: r.name,
      iconPath: r.icon_path != null ? String(r.icon_path) : null,
    }));
    return res.json({ brands });
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR" || e.code === "ER_NO_SUCH_TABLE") {
      try {
        const [rowsLegacy] = await pool.query(
          "SELECT name FROM brands WHERE is_active = 1 ORDER BY name ASC"
        );
        const brands = (rowsLegacy || []).map((r, i) => ({ id: `legacy-${i}`, name: r.name, iconPath: null }));
        return res.json({ brands });
      } catch (_) {
        return res.json({ brands: [] });
      }
    }
    console.error("[accounts] /brands error:", e);
    return res.status(500).json({ message: "Failed to load brands.", brands: [] });
  }
});

/**
 * GET /api/accounts
 * Returns client's created accounts (approved ones).
 */
router.get("/", authenticateToken, requireClient, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ca.id, ca.brand, ca.username, ca.created_at, ca.initial_password,
              bc.website_url AS brand_website_url
       FROM client_accounts ca
       LEFT JOIN brand_companies bc ON bc.id = ca.brand_company_id
       WHERE ca.client_id = ?
       ORDER BY ca.created_at DESC`,
      [req.user.userId]
    );

    const accounts = rows.map((r) => ({
      id: r.id,
      brand: r.brand,
      username: r.username,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      initialPassword:
        r.initial_password != null && String(r.initial_password).trim() !== ""
          ? String(r.initial_password)
          : null,
      websiteUrl:
        r.brand_website_url != null && String(r.brand_website_url).trim() !== ""
          ? String(r.brand_website_url).trim()
          : null,
    }));

    return res.json({ accounts });
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR" && String(e.sqlMessage || "").includes("initial_password")) {
      try {
        const [rows] = await pool.query(
          `SELECT ca.id, ca.brand, ca.username, ca.created_at,
                  bc.website_url AS brand_website_url
           FROM client_accounts ca
           LEFT JOIN brand_companies bc ON bc.id = ca.brand_company_id
           WHERE ca.client_id = ?
           ORDER BY ca.created_at DESC`,
          [req.user.userId]
        );
        const accounts = rows.map((r) => ({
          id: r.id,
          brand: r.brand,
          username: r.username,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
          initialPassword: null,
          websiteUrl:
            r.brand_website_url != null && String(r.brand_website_url).trim() !== ""
              ? String(r.brand_website_url).trim()
              : null,
        }));
        return res.json({ accounts });
      } catch (e2) {
        console.error("[accounts] GET / error:", e2);
        return res.json({ accounts: [] });
      }
    }
    console.error("[accounts] GET / error:", e);
    return res.json({ accounts: [] });
  }
});

/**
 * POST /api/accounts/tickets
 * Creates a new ticket. Status starts as 'pending'.
 */
router.post("/tickets", authenticateToken, requireClient, async (req, res) => {
  const { brand, suggestedUsername } = req.body || {};

  if (!brand) {
    return res.status(400).json({ error: "brand is required" });
  }

  // suggestedUsername optional, but enforce safe format if present
  if (suggestedUsername && !/^[a-z0-9]+$/.test(String(suggestedUsername))) {
    return res.status(400).json({ error: "Invalid suggestedUsername format" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO account_tickets
        (client_id, brand, suggested_username, status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
      [req.user.userId, brand, suggestedUsername || null]
    );

    const id = result.insertId;
    const [[row]] = await pool.query(
      `SELECT id, brand, suggested_username, status, created_at
       FROM account_tickets WHERE id = ? LIMIT 1`,
      [id]
    );
    return res.json({
      ticketId: id,
      createdAt: row?.created_at ?? null,
      brand: row?.brand ?? brand,
      username: row?.suggested_username ?? suggestedUsername ?? null,
      status: row?.status ?? "pending",
    });
  } catch (e) {
    console.error("[accounts] POST /tickets error:", e);
    return res.status(500).json({ error: "Failed to create ticket" });
  }
});

/**
 * GET /api/accounts/tickets/pending-count
 * Number of pending account tickets for the logged-in client.
 */
router.get("/tickets/pending-count", authenticateToken, requireClient, async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS c
       FROM account_tickets
       WHERE client_id = ? AND status = 'pending'`,
      [req.user.userId]
    );
    return res.json({ pendingCount: Number(row?.c ?? 0) });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.json({ pendingCount: 0 });
    }
    console.error("[accounts] GET /tickets/pending-count error:", e);
    return res.json({ pendingCount: 0 });
  }
});

/**
 * GET /api/accounts/tickets
 * Pending tickets only (for client list). Rejected rows are never returned.
 */
router.get("/tickets", authenticateToken, requireClient, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, brand, suggested_username, status, created_at
       FROM account_tickets
       WHERE client_id = ? AND status = 'pending'
       ORDER BY created_at DESC`,
      [req.user.userId]
    );
    const tickets = (rows || []).map((r) => ({
      id: r.id,
      brand: r.brand != null ? String(r.brand) : "",
      suggestedUsername: r.suggested_username != null ? String(r.suggested_username) : "",
      status: r.status != null ? String(r.status) : "pending",
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));
    return res.json({ tickets });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return res.json({ tickets: [] });
    }
    console.error("[accounts] GET /tickets error:", e);
    return res.json({ tickets: [] });
  }
});

/**
 * GET /api/accounts/tickets/:id
 * Returns ticket status. When admin exists, it will set approved/rejected and
 * optionally attach created account credentials.
 */
router.get("/tickets/:id", authenticateToken, requireClient, async (req, res) => {
  const ticketId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT id, client_id, brand, status, reason, created_account_id
       FROM account_tickets
       WHERE id = ? LIMIT 1`,
      [ticketId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const t = rows[0];
    if (t.client_id !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // If approved, try to load created account
    if (t.status === "approved" && t.created_account_id) {
      const [accRows] = await pool.query(
        `SELECT id, brand, username
         FROM client_accounts
         WHERE id = ? AND client_id = ?
         LIMIT 1`,
        [t.created_account_id, req.user.userId]
      );

      const acc = accRows[0];
      return res.json({
        status: "approved",
        account: acc
          ? { id: acc.id, brand: acc.brand, username: acc.username }
          : null,
      });
    }

    if (t.status === "rejected") {
      return res.json({ status: "rejected", reason: t.reason || "" });
    }

    return res.json({ status: "pending" });
  } catch (e) {
    console.error("[accounts] GET /tickets/:id error:", e);
    return res.status(500).json({ error: "Failed to fetch ticket status" });
  }
});

/**
 * OPTIONAL DEV-ONLY endpoint to simulate approval/rejection without admin UI.
 * PATCH /api/accounts/tickets/:id/mock?status=approved|rejected
 * Guarded: only works when NODE_ENV !== 'production'
 */
router.patch("/tickets/:id/mock", authenticateToken, requireClient, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const ticketId = req.params.id;
  const status = String(req.query.status || "").toLowerCase();

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be approved or rejected" });
  }

  try {
    // Ensure ticket belongs to the user
    const [rows] = await pool.query(
      "SELECT id, client_id, brand FROM account_tickets WHERE id = ? LIMIT 1",
      [ticketId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Ticket not found" });
    if (rows[0].client_id !== req.user.userId) return res.status(403).json({ error: "Forbidden" });

    if (status === "rejected") {
      await pool.query(
        "UPDATE account_tickets SET status='rejected', reason='Rejected (dev mock)', updated_at=NOW() WHERE id=?",
        [ticketId]
      );
      return res.json({ ok: true });
    }

    // approved mock: create a dummy account row
    const dummyUsername = `jw${req.user.userId}${ticketId}`.slice(0, 16);
    const dummyInitialPw = `dev${req.user.userId}${ticketId}`.slice(0, 24);
    let accResult;
    try {
      [accResult] = await pool.query(
        `INSERT INTO client_accounts (client_id, brand, username, initial_password, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [req.user.userId, rows[0].brand, dummyUsername, dummyInitialPw]
      );
    } catch (insErr) {
      if (insErr.code === "ER_BAD_FIELD_ERROR" && String(insErr.sqlMessage || "").includes("initial_password")) {
        [accResult] = await pool.query(
          `INSERT INTO client_accounts (client_id, brand, username, created_at)
           VALUES (?, ?, ?, NOW())`,
          [req.user.userId, rows[0].brand, dummyUsername]
        );
      } else {
        throw insErr;
      }
    }

    await pool.query(
      `UPDATE account_tickets
       SET status='approved', created_account_id=?, updated_at=NOW()
       WHERE id=?`,
      [accResult.insertId, ticketId]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("[accounts] PATCH /tickets/:id/mock error:", e);
    return res.status(500).json({ error: "Mock update failed" });
  }
});

module.exports = router;
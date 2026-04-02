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

async function resolveBrandCompanyIdForAccount(conn, clientUserId, accountId) {
  const [rows] = await conn.query(
    `
    SELECT ca.id,
           COALESCE(ca.brand_company_id, bc.id) AS resolved_bc_id
    FROM client_accounts ca
    INNER JOIN brands b ON b.name = ca.brand AND b.is_active = 1
    LEFT JOIN brand_companies bc
      ON bc.brand_id = b.id
      AND bc.username = ca.username
      AND bc.is_active = 1
    WHERE ca.id = ?
      AND ca.client_id = ?
      AND (ca.status IS NULL OR ca.status = 'active')
    LIMIT 1
    `,
    [accountId, clientUserId]
  );
  if (!rows.length) return null;
  const rid = rows[0].resolved_bc_id;
  return rid != null ? Number(rid) : null;
}

// GET /api/transfers/history?limit=10
async function getTransferHistory(req, res) {
  if (!requireClient(req, res)) return;

  const limit = Math.min(Math.max(toInt(req.query.limit, 10), 1), 50);

  try {
    const [rows] = await pool.query(
      `
      SELECT tt.id,
             ca.username AS client_account_username,
             b.name AS brand, tt.direction, tt.amount, tt.status, tt.created_at
      FROM transfer_tickets tt
      INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
      INNER JOIN brands b ON b.id = bc.brand_id
      LEFT JOIN client_accounts ca ON ca.id = tt.client_account_id AND ca.client_id = tt.client_id
      WHERE tt.client_id = ?
      ORDER BY tt.created_at DESC
      LIMIT ?
      `,
      [req.user.userId, limit]
    );

    return res.json({
      transfers: rows.map((r) => ({
        id: r.id,
        clientAccountUsername:
          r.client_account_username != null ? String(r.client_account_username) : null,
        brand: r.brand,
        direction: r.direction,
        amount: String(r.amount),
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      })),
    });
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE" || e.code === "ER_BAD_FIELD_ERROR") {
      return res.json({ transfers: [] });
    }
    console.error("[transfers] GET /history error:", e);
    return res.status(500).json({ error: "Failed to fetch transfer history" });
  }
}

// POST /api/transfers/tickets
// body: { accountId, brand, username, direction, amount } — brand/username kept for UX; accountId required for resolution
async function createTransferTicket(req, res) {
  if (!requireClient(req, res)) return;

  const accountId = toInt(req.body?.accountId, 0);
  const direction = String(req.body?.direction || "").trim().toUpperCase();
  const amountRaw = String(req.body?.amount || "").trim();

  if (!accountId) return res.status(400).json({ error: "accountId is required" });
  if (!["IN", "OUT"].includes(direction)) {
    return res.status(400).json({ error: "direction must be IN or OUT" });
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const bcId = await resolveBrandCompanyIdForAccount(conn, req.user.userId, accountId);
    if (!bcId) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: "Could not resolve brand company for this account. Check Accounts setup.",
      });
    }

    if (direction === "IN") {
      const [clientRows] = await conn.query(
        "SELECT user_id, balance FROM clients WHERE user_id = ? LIMIT 1 FOR UPDATE",
        [req.user.userId]
      );
      if (!clientRows.length) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: "Client profile not found." });
      }
      const currentBalance = Number(clientRows[0].balance || 0);
      if (currentBalance < amount) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: "Insufficient balance." });
      }
      await conn.query("UPDATE clients SET balance = ? WHERE user_id = ?", [
        currentBalance - amount,
        req.user.userId,
      ]);
    }

    const [result] = await conn.query(
      `
      INSERT INTO transfer_tickets
        (client_id, client_account_id, brand_companies_id, direction, amount, status, created_by_user_id, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
      `,
      [req.user.userId, accountId, bcId, direction, amount, req.user.userId]
    );

    await conn.commit();
    conn.release();

    return res.status(201).json({ ticketId: result.insertId });
  } catch (e) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
      try {
        conn.release();
      } catch (_) {}
    }
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
      SELECT tt.id, tt.client_id,
             ca.username AS client_account_username,
             b.name AS brand, tt.direction, tt.amount, tt.status, tt.reason, tt.created_at
      FROM transfer_tickets tt
      INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
      INNER JOIN brands b ON b.id = bc.brand_id
      LEFT JOIN client_accounts ca ON ca.id = tt.client_account_id AND ca.client_id = tt.client_id
      WHERE tt.id = ?
      LIMIT 1
      `,
      [ticketId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Ticket not found" });

    const t = rows[0];
    if (t.client_id !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (t.status === "rejected") {
      return res.json({ status: "rejected", reason: t.reason || "" });
    }

    if (t.status === "approved") {
      return res.json({
        status: "approved",
        transfer: {
          id: t.id,
          clientAccountUsername:
            t.client_account_username != null
              ? String(t.client_account_username)
              : null,
          brand: t.brand,
          direction: t.direction,
          amount: String(t.amount),
          createdAt: t.created_at ? new Date(t.created_at).toISOString() : null,
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
async function getTransferBrands(req, res) {
  if (!requireClient(req, res)) return;

  try {
    const [rows] = await pool.query(
      `SELECT name, icon_path,
        COALESCE(in_process_minutes, 15) AS in_process_minutes,
        COALESCE(out_process_minutes, 15) AS out_process_minutes
       FROM brands WHERE is_active = 1 ORDER BY name ASC`
    );
    return res.json({
      brands: rows.map((r) => ({
        name: r.name,
        iconPath: r.icon_path != null ? String(r.icon_path) : null,
        inProcessMinutes: Number(r.in_process_minutes) || 15,
        outProcessMinutes: Number(r.out_process_minutes) || 15,
      })),
    });
  } catch (e) {
    console.error("[transfers] /brands error:", e);
    return res.json({ brands: [] });
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

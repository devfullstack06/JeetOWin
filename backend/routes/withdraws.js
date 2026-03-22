const express = require("express");
const authenticateToken = require("../middleware/auth");
const { pool } = require("../config/database");

const router = express.Router();

function requireClient(req, res, next) {
  if (!req.user || req.user.role !== "client") {
    return res.status(403).json({ error: "Forbidden: client role required" });
  }
  next();
}

/**
 * Build ticket object for API response (shared by POST and GET)
 */
function buildTicketRow(r) {
  const status = (r.status || "pending").toLowerCase();
  const statusUpper =
    status === "approved" ? "APPROVED" : status === "rejected" ? "REJECTED" : "PROCESSING";
  return {
    id: r.id,
    type: "WITHDRAW",
    status: statusUpper,
    createdAt: r.created_at,
    updatedAt: r.updated_at || null,
    walletCompanyName: r.wallet_company_name || "-",
    accountTitle: r.account_title || r.accountTitle || "-",
    accountNumber: r.account_number || r.accountNumber || "-",
    amount: r.amount != null ? Number(r.amount) : 0,
    approvedAt: status === "approved" ? (r.updated_at || null) : null,
    rejectedAt: status === "rejected" ? (r.updated_at || null) : null,
    reason: r.reason || null,
    createdByUsername: r.created_by_username != null ? String(r.created_by_username) : null,
  };
}

/**
 * POST /api/withdraws
 * Client creates a withdraw ticket. Body: { clientWalletId, amount }
 * On submit: deducts amount from client balance (hold). Balance is added back on reject.
 */
router.post("/", authenticateToken, requireClient, async (req, res) => {
  let conn;
  try {
    const body = req.body || {};
    const clientWalletId =
      body.clientWalletId != null && body.clientWalletId !== ""
        ? Number(body.clientWalletId)
        : null;
    const amount = body.amount != null ? Number(body.amount) : NaN;

    if (!clientWalletId || !Number.isFinite(clientWalletId)) {
      return res.status(400).json({ error: "Valid wallet is required." });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required." });
    }

    const clientId = req.user.userId;

    conn = await pool.getConnection();

    const [cwRows] = await conn.query(
      `SELECT cw.id, cw.client_id, cw.wallet_company_id, cw.account_title, cw.account_number,
              wc.name AS wallet_company_name,
              COALESCE(wc.min_withdraw, 500) AS min_withdraw
       FROM client_wallets cw
       JOIN wallet_companies wc ON wc.id = cw.wallet_company_id AND wc.available_for_withdraw = 1
       WHERE cw.id = ? AND cw.client_id = ? AND cw.is_active = 1
       LIMIT 1`,
      [clientWalletId, clientId]
    );
    if (!cwRows.length) {
      conn.release();
      return res.status(400).json({ error: "Wallet not found or not yours." });
    }
    const cw = cwRows[0];
    const minWithdraw = Number(cw.min_withdraw || 500);
    if (amount < minWithdraw) {
      conn.release();
      return res.status(400).json({
        error: `Minimum withdraw is Rs. ${Math.floor(minWithdraw).toLocaleString()}.`,
      });
    }

    const [clientRows] = await conn.query(
      "SELECT user_id, balance FROM clients WHERE user_id = ? LIMIT 1 FOR UPDATE",
      [clientId]
    );
    if (!clientRows.length) {
      conn.release();
      return res.status(400).json({ error: "Client profile not found." });
    }
    const currentBalance = Number(clientRows[0].balance || 0);
    if (currentBalance < amount) {
      conn.release();
      return res.status(400).json({ error: "Insufficient balance." });
    }

    await conn.beginTransaction();
    try {
      const newBalance = currentBalance - amount;
      await conn.query(
        "UPDATE clients SET balance = ? WHERE user_id = ?",
        [newBalance, clientId]
      );
      const [result] = await conn.query(
        `INSERT INTO withdraw_tickets
          (client_id, created_by_user_id, client_wallet_id, amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [clientId, clientId, clientWalletId, amount]
      );
      const id = result.insertId;

      const [[row]] = await conn.query(
        `SELECT wt.id, wt.amount, wt.status, wt.created_at, wt.updated_at,
                cw.account_title, cw.account_number,
                wc.name AS wallet_company_name,
                creator.username AS created_by_username
         FROM withdraw_tickets wt
         JOIN client_wallets cw ON cw.id = wt.client_wallet_id
         JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
         LEFT JOIN users creator ON creator.id = wt.created_by_user_id
         WHERE wt.id = ? LIMIT 1`,
        [id]
      );

      await conn.commit();
      conn.release();

      const ticket = buildTicketRow({
        ...row,
        account_title: row.account_title,
        accountTitle: row.account_title,
        account_number: row.account_number,
        accountNumber: row.account_number,
      });

      return res.status(201).json({
        ticketId: id,
        ticket,
      });
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }
  } catch (e) {
    if (conn) {
      try {
        conn.release();
      } catch (_) {}
    }
    console.error("[withdraws] POST / error:", e);
    return res.status(500).json({ error: "Failed to create withdraw ticket." });
  }
});

/**
 * GET /api/withdraws/:id
 * Client polls ticket status. Returns ticket object. 404 if not found.
 */
router.get("/:id", authenticateToken, requireClient, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid ticket id." });
    }

    const [rows] = await pool.query(
      `SELECT wt.id, wt.client_id, wt.amount, wt.status, wt.reason, wt.created_at, wt.updated_at,
              cw.account_title, cw.account_number,
              wc.name AS wallet_company_name,
              COALESCE(wc.withdraw_process_minutes, 15) AS withdraw_process_minutes,
              creator.username AS created_by_username
       FROM withdraw_tickets wt
       JOIN client_wallets cw ON cw.id = wt.client_wallet_id
       JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
       LEFT JOIN users creator ON creator.id = wt.created_by_user_id
       WHERE wt.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Ticket not found." });
    }
    const r = rows[0];
    if (Number(r.client_id) !== Number(req.user.userId)) {
      return res.status(403).json({ error: "Forbidden." });
    }

    const ticket = buildTicketRow({
      ...r,
      account_title: r.account_title,
      accountTitle: r.account_title,
      account_number: r.account_number,
      accountNumber: r.account_number,
    });
    ticket.withdrawProcessMinutes =
      r.withdraw_process_minutes != null
        ? Number(r.withdraw_process_minutes)
        : 15;

    return res.json({ ticket });
  } catch (e) {
    console.error("[withdraws] GET /:id error:", e);
    return res.status(500).json({ error: "Failed to fetch ticket." });
  }
});

module.exports = router;

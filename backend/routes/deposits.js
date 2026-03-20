const express = require("express");
const authenticateToken = require("../middleware/auth");
const { pool } = require("../config/database");
const { optionalDepositFilesUpload, getRelativeSlipPath } = require("../middleware/uploadDepositFiles");

const router = express.Router();

function requireClient(req, res, next) {
  if (!req.user || req.user.role !== "client") {
    return res.status(403).json({ error: "Forbidden: client role required" });
  }
  next();
}

/**
 * POST /api/deposits
 * Client creates a deposit ticket. Multipart: walletCompanyId, paymentWalletId, amount; optional slip (file).
 */
router.post("/", authenticateToken, requireClient, optionalDepositFilesUpload, async (req, res) => {
  try {
    const body = req.body || {};
    const walletCompanyId = body.walletCompanyId != null && Number(body.walletCompanyId) ? Number(body.walletCompanyId) : null;
    const paymentWalletId = body.paymentWalletId != null && Number(body.paymentWalletId) ? Number(body.paymentWalletId) : null;
    const amount = body.amount != null ? Number(body.amount) : NaN;

    if (!walletCompanyId) return res.status(400).json({ error: "Company is required." });
    if (!paymentWalletId) return res.status(400).json({ error: "Wallet is required." });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Valid amount is required." });

    const [pwRows] = await pool.query(
      "SELECT id, wallet_company_id, min_deposit, max_deposit FROM payment_wallets WHERE id = ? LIMIT 1",
      [paymentWalletId]
    );
    if (!pwRows.length) return res.status(400).json({ error: "Invalid wallet." });
    const pw = pwRows[0];
    if (Number(pw.wallet_company_id) !== Number(walletCompanyId)) {
      return res.status(400).json({ error: "Wallet does not belong to selected company." });
    }
    const minD = Number(pw.min_deposit || 0);
    const maxD = Number(pw.max_deposit || 0);
    if (amount < minD) return res.status(400).json({ error: `Minimum deposit is Rs. ${Math.floor(minD)}.` });
    if (maxD > 0 && amount > maxD) return res.status(400).json({ error: `Maximum deposit is Rs. ${Math.floor(maxD)}.` });

    let slipPath = null;
    if (req.files && req.files.slip && req.files.slip[0]) {
      slipPath = getRelativeSlipPath(req.files.slip[0]);
    }

    const clientId = req.user.userId;
    const [result] = await pool.query(
      `INSERT INTO deposit_tickets
        (client_id, created_by_user_id, client_account_id, wallet_company_id, payment_wallet_id, amount, status, slip_path, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
      [clientId, clientId, walletCompanyId, paymentWalletId, amount, slipPath]
    );
    const id = result.insertId;
    const [[row]] = await pool.query(
      `SELECT dt.id, dt.wallet_company_id, dt.payment_wallet_id, dt.amount, dt.status, dt.slip_path, dt.created_at, dt.updated_at,
              creator.username AS created_by_username
       FROM deposit_tickets dt
       LEFT JOIN users creator ON creator.id = dt.created_by_user_id
       WHERE dt.id = ? LIMIT 1`,
      [id]
    );
    return res.status(201).json({
      ticketId: id,
      createdAt: row?.created_at ?? null,
      amount: row?.amount ?? amount,
      status: row?.status ?? "pending",
      slipPath: row?.slip_path ?? slipPath,
      createdByUsername: row?.created_by_username != null ? String(row.created_by_username) : null,
    });
  } catch (e) {
    console.error("[deposits] POST / error:", e);
    return res.status(500).json({ error: "Failed to create deposit ticket." });
  }
});

/**
 * GET /api/deposits/:id
 * Client polls ticket status. Returns pending | approved | rejected; when approved/rejected includes updatedAt, reason, trxId (if approved).
 */
router.get("/:id", authenticateToken, requireClient, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid ticket id." });

    const [rows] = await pool.query(
      `SELECT dt.id, dt.client_id, dt.status, dt.trx_id, dt.reason, dt.slip_path, dt.created_at, dt.updated_at,
              creator.username AS created_by_username
       FROM deposit_tickets dt
       LEFT JOIN users creator ON creator.id = dt.created_by_user_id
       WHERE dt.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Ticket not found." });
    const r = rows[0];
    if (Number(r.client_id) !== Number(req.user.userId)) {
      return res.status(403).json({ error: "Forbidden." });
    }
    const status = (r.status || "pending").toLowerCase();
    return res.json({
      ticketId: r.id,
      status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      trxId: r.trx_id || null,
      reason: r.reason || null,
      slipPath: r.slip_path || null,
      createdByUsername: r.created_by_username != null ? String(r.created_by_username) : null,
    });
  } catch (e) {
    console.error("[deposits] GET /:id error:", e);
    return res.status(500).json({ error: "Failed to fetch ticket." });
  }
});

module.exports = router;

// backend/routes/wallets.js
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

// Validation helpers
function isAlphabeticWithSpaces(s) {
  return /^[A-Za-z ]+$/.test(s);
}
function isDigitsOnly(s) {
  return /^[0-9]+$/.test(s);
}

/**
 * GET /api/wallets/companies
 * Active companies for dropdown/tiles.
 */
router.get("/companies", authenticateToken, requireClient, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, code, icon_key AS iconKey
       FROM wallet_companies
       WHERE is_active = 1
       ORDER BY sort_order ASC, name ASC`
    );
    return res.json({ companies: rows });
  } catch (e) {
    console.error("[wallets] GET /companies error:", e);
    return res.status(500).json({ error: "Failed to load wallet companies" });
  }
});

/**
 * GET /api/wallets
 * Client wallets list (active).
 * Optional filter: ?companyId=123
 */
router.get("/", authenticateToken, requireClient, async (req, res) => {
  const companyId = req.query.companyId ? Number(req.query.companyId) : null;

  try {
    const params = [req.user.userId];
    let where = "w.client_id = ? AND w.is_active = 1";

    if (companyId && Number.isFinite(companyId)) {
      where += " AND w.wallet_company_id = ?";
      params.push(companyId);
    }

    const [rows] = await pool.query(
      `SELECT
         w.id,
         w.account_title AS accountTitle,
         w.account_number AS accountNumber,
         w.wallet_company_id AS walletCompanyId,
         c.name AS companyName,
         c.code AS companyCode,
         c.icon_key AS iconKey,
         w.created_at
       FROM client_wallets w
       JOIN wallet_companies c ON c.id = w.wallet_company_id
       WHERE ${where}
       ORDER BY w.created_at DESC`,
      params
    );

    return res.json({ wallets: rows });
  } catch (e) {
    console.error("[wallets] GET / error:", e);
    return res.status(500).json({ error: "Failed to load wallets" });
  }
});

/**
 * POST /api/wallets
 * Auto-approve: directly insert into client_wallets
 * Body: { walletCompanyId, accountTitle, accountNumber }
 */
router.post("/", authenticateToken, requireClient, async (req, res) => {
  const { walletCompanyId, accountTitle, accountNumber } = req.body || {};

  const title = String(accountTitle || "").trim();
  const number = String(accountNumber || "").trim();
  const companyId = Number(walletCompanyId);

  // ✅ Validations you requested
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return res.status(400).json({ error: "walletCompanyId is required" });
  }

  // alphabetic only + spaces allowed, 4-50
  if (title.length < 4 || title.length > 50 || !isAlphabeticWithSpaces(title)) {
    return res.status(400).json({
      error: "Account Title must be alphabetic only and 4-50 characters.",
    });
  }

  // digits only, 6-24
  if (number.length < 6 || number.length > 24 || !isDigitsOnly(number)) {
    return res.status(400).json({
      error: "Account Number must be integers only and 6-24 digits.",
    });
  }

  try {
    // Ensure company exists & active
    const [cRows] = await pool.query(
      "SELECT id FROM wallet_companies WHERE id = ? AND is_active = 1 LIMIT 1",
      [companyId]
    );
    if (cRows.length === 0) {
      return res.status(400).json({ error: "Selected company is not available." });
    }

    // Prevent duplicates (unique key also protects)
    const [dup] = await pool.query(
      `SELECT id FROM client_wallets
       WHERE client_id = ? AND wallet_company_id = ? AND account_number = ?
       LIMIT 1`,
      [req.user.userId, companyId, number]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: "This wallet number already exists." });
    }

    const [result] = await pool.query(
      `INSERT INTO client_wallets
        (client_id, wallet_company_id, account_title, account_number, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [req.user.userId, companyId, title, number]
    );

    return res.json({ walletId: result.insertId });
  } catch (e) {
    // Handle unique constraint race
    if (String(e?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This wallet number already exists." });
    }
    console.error("[wallets] POST / error:", e);
    return res.status(500).json({ error: "Failed to add wallet" });
  }
});

module.exports = router;

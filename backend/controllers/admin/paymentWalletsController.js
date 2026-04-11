const fs = require("fs");
const path = require("path");
const { pool } = require("../../config/database");
const { ADMIN_LEDGER_ACCOUNT_ID } = require("../../constants/ledgerAccounts");
const {
  allocateGeneralEntryTransactionNumber,
  GE_TXN_SERIES,
} = require("../../utils/generalEntryTransactionNumber");
const { insertGeneralEntry } = require("../../utils/generalEntryPersistence");

const QR_UPLOAD_DIR = path.resolve(__dirname, "../../uploads/qr");

function ensureQrDir() {
  try {
    fs.mkdirSync(QR_UPLOAD_DIR, { recursive: true });
    return true;
  } catch (e) {
    console.error("ensureQrDir:", e.message);
    return false;
  }
}

function normalizeSortDir(value) {
  return String(value || "").toLowerCase() === "desc" ? "DESC" : "ASC";
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseDecimal(value, defaultVal = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.max(0, n);
}

const SORT_MAP = {
  name: "p.name",
  number: "p.number",
  company: "c.name",
  status: "p.status",
  balance: "p.balance",
  sortOrder: "p.sort_order",
};

/**
 * GET /api/admin/payment-wallets
 * List with filters: name, number, status, companyId, availability (deposit | withdraw). Pagination, sort.
 */
exports.getAdminPaymentWallets = async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    const number = String(req.query.number || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);
    const sortKey = SORT_MAP[req.query.sortKey] ? req.query.sortKey : "name";
    const sortColumn = SORT_MAP[sortKey];
    const sortDir = normalizeSortDir(req.query.sortDir);

    const where = [];
    const params = [];
    if (name) {
      where.push("p.name LIKE ?");
      params.push(`%${name}%`);
    }
    if (number) {
      where.push("p.number LIKE ?");
      params.push(`%${number}%`);
    }
    if (status === "active" || status === "inactive") {
      where.push("p.status = ?");
      params.push(status);
    }
    const companyId = req.query.companyId != null && Number.isFinite(Number(req.query.companyId)) ? Number(req.query.companyId) : null;
    if (companyId != null) {
      where.push("p.wallet_company_id = ?");
      params.push(companyId);
    }
    const availability = String(req.query.availability || "").trim().toLowerCase();
    if (availability === "deposit") {
      where.push("p.available_for_deposit = 1");
    } else if (availability === "withdraw") {
      where.push("p.available_for_withdraw = 1");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let total = 0;
    try {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM payment_wallets p ${whereSql}`,
        params
      );
      total = Number(countRows?.[0]?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({
          items: [],
          total: 0,
          page: 1,
          pageSize,
          sortKey: "name",
          sortDir: "asc",
          availabilityStats: { forDeposit: 0, forWithdraw: 0 },
        });
      }
      throw e;
    }

    let availabilityStats = { forDeposit: 0, forWithdraw: 0 };
    try {
      const [[statsRow]] = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN available_for_deposit = 1 THEN 1 ELSE 0 END), 0) AS for_deposit,
          COALESCE(SUM(CASE WHEN available_for_withdraw = 1 THEN 1 ELSE 0 END), 0) AS for_withdraw
         FROM payment_wallets`
      );
      availabilityStats = {
        forDeposit: Number(statsRow?.for_deposit || 0),
        forWithdraw: Number(statsRow?.for_withdraw || 0),
      };
    } catch (e) {
      if (e.code !== "ER_NO_SUCH_TABLE") throw e;
    }

    const offset = (page - 1) * pageSize;
    let rows = [];
    try {
      const [dataRows] = await pool.query(
        `SELECT p.id, p.name, p.number, p.wallet_company_id, p.status, p.balance,
                p.min_deposit, p.min_withdraw, p.max_deposit, p.max_withdraw,
                p.qr_image_path, p.available_for_deposit, p.available_for_withdraw,
                p.sort_order, p.created_at,
                c.name AS company_name
         FROM payment_wallets p
         LEFT JOIN wallet_companies c ON c.id = p.wallet_company_id
         ${whereSql}
         ORDER BY ${sortColumn} ${sortDir}, p.id ASC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      rows = dataRows;
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({
          items: [],
          total: 0,
          page: 1,
          pageSize,
          sortKey: "name",
          sortDir: "asc",
          availabilityStats,
        });
      }
      throw e;
    }

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name || "",
      number: r.number || "",
      walletCompanyId: r.wallet_company_id,
      companyName: r.company_name || "",
      status: r.status === "active" ? "Active" : "Inactive",
      statusRaw: r.status || "active",
      balance: Number(r.balance) || 0,
      minDeposit: Number(r.min_deposit) || 0,
      minWithdraw: Number(r.min_withdraw) || 0,
      maxDeposit: Number(r.max_deposit) || 0,
      maxWithdraw: Number(r.max_withdraw) || 0,
      qrImagePath: r.qr_image_path || "",
      availableForDeposit: !!r.available_for_deposit,
      availableForWithdraw: !!r.available_for_withdraw,
      sortOrder: r.sort_order != null ? r.sort_order : 0,
      createdAt: r.created_at,
    }));

    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
      sortKey,
      sortDir: sortDir.toLowerCase(),
      availabilityStats,
    });
  } catch (err) {
    console.error("getAdminPaymentWallets error:", err);
    return res.status(500).json({ message: "Failed to load payment wallets." });
  }
};

/**
 * POST /api/admin/payment-wallets
 * Create. Body: name, number, walletCompanyId, status?, minDeposit, minWithdraw, maxDeposit, maxWithdraw, qrImageBase64?, availableForDeposit, availableForWithdraw, sortOrder?
 */
exports.createAdminPaymentWallet = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const number = String(req.body?.number || "").trim();
    const walletCompanyId = Number(req.body?.walletCompanyId);
    const minDeposit = parseDecimal(req.body?.minDeposit, 0);
    const minWithdraw = parseDecimal(req.body?.minWithdraw, 0);
    const maxDeposit = parseDecimal(req.body?.maxDeposit, 0);
    const maxWithdraw = parseDecimal(req.body?.maxWithdraw, 0);
    const availableForDeposit = req.body?.availableForDeposit !== undefined ? (req.body.availableForDeposit === true || req.body.availableForDeposit === "yes" || req.body.availableForDeposit === "1") ? 1 : 0 : 1;
    const availableForWithdraw = req.body?.availableForWithdraw !== undefined ? (req.body.availableForWithdraw === true || req.body.availableForWithdraw === "yes" || req.body.availableForWithdraw === "1") ? 1 : 0 : 1;
    let sortOrder = Number(req.body?.sortOrder);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      const [[r]] = await pool.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM payment_wallets");
      sortOrder = Number(r?.n) || 1;
    } else {
      sortOrder = Math.floor(sortOrder);
    }
    const qrImageBase64 = req.body?.qrImageBase64;

    if (!name) return res.status(400).json({ message: "Name is required." });
    if (!/^[A-Za-z ]+$/.test(name)) return res.status(400).json({ message: "Name must contain only alphabets (and spaces)." });
    if (name.length > 20) return res.status(400).json({ message: "Name must not exceed 20 characters." });
    if (!number) return res.status(400).json({ message: "Number is required." });
    if (!/^[A-Za-z0-9 ]+$/.test(number)) return res.status(400).json({ message: "Number must be alphanumeric." });
    if (number.length > 30) return res.status(400).json({ message: "Number must not exceed 30 characters." });
    if (!Number.isFinite(walletCompanyId) || walletCompanyId <= 0) return res.status(400).json({ message: "Wallet company is required." });

    const [companyRows] = await pool.query("SELECT id FROM wallet_companies WHERE id = ? AND is_active = 1", [walletCompanyId]);
    if (!companyRows?.length) return res.status(400).json({ message: "Selected wallet company is not active or not found." });

    const [result] = await pool.query(
      `INSERT INTO payment_wallets (name, number, wallet_company_id, status, balance, min_deposit, min_withdraw, max_deposit, max_withdraw, qr_image_path, available_for_deposit, available_for_withdraw, sort_order)
       VALUES (?, ?, ?, 'active', 0, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      [name, number, walletCompanyId, minDeposit, minWithdraw, maxDeposit, maxWithdraw, availableForDeposit, availableForWithdraw, sortOrder]
    );
    const id = result.insertId;

    await pool.query(
      "INSERT INTO accounts (name, type, reference_id) VALUES (?, 'payment_wallet', ?)",
      [`${name} (${number})`, id]
    ).catch((e) => { if (e.code !== "ER_NO_SUCH_TABLE" && e.code !== "ER_DUP_ENTRY") throw e; });
    if (qrImageBase64 && typeof qrImageBase64 === "string" && qrImageBase64.length > 0) {
      const filename = saveQrImage(id, qrImageBase64);
      if (filename) await pool.query("UPDATE payment_wallets SET qr_image_path = ? WHERE id = ?", [filename, id]);
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.number, p.wallet_company_id, p.status, p.balance, p.min_deposit, p.min_withdraw, p.max_deposit, p.max_withdraw, p.qr_image_path, p.available_for_deposit, p.available_for_withdraw, p.sort_order, p.created_at, c.name AS company_name
       FROM payment_wallets p LEFT JOIN wallet_companies c ON c.id = p.wallet_company_id WHERE p.id = ?`,
      [id]
    );
    const r = rows[0];
    const item = r ? {
      id: r.id,
      name: r.name || "",
      number: r.number || "",
      walletCompanyId: r.wallet_company_id,
      companyName: r.company_name || "",
      status: r.status === "active" ? "Active" : "Inactive",
      statusRaw: r.status,
      balance: Number(r.balance) || 0,
      minDeposit: Number(r.min_deposit) || 0,
      minWithdraw: Number(r.min_withdraw) || 0,
      maxDeposit: Number(r.max_deposit) || 0,
      maxWithdraw: Number(r.max_withdraw) || 0,
      qrImagePath: r.qr_image_path || "",
      availableForDeposit: !!r.available_for_deposit,
      availableForWithdraw: !!r.available_for_withdraw,
      sortOrder: r.sort_order != null ? r.sort_order : 0,
      createdAt: r.created_at,
    } : null;

    return res.status(201).json({ message: "Payment wallet created.", item });
  } catch (err) {
    console.error("createAdminPaymentWallet error:", err);
    return res.status(500).json({ message: "Failed to create payment wallet." });
  }
};

function saveQrImage(id, base64) {
  if (!ensureQrDir()) return null;
  const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
  const ext = match ? (match[1] === "jpeg" ? "jpg" : match[1]) : "png";
  const data = match ? Buffer.from(match[2], "base64") : Buffer.from(base64, "base64");
  const filename = `pw-${id}.${ext}`;
  const filepath = path.join(QR_UPLOAD_DIR, filename);
  try {
    fs.writeFileSync(filepath, data);
    return filename;
  } catch (e) {
    console.error("saveQrImage error:", e.message);
    return null;
  }
}

/**
 * PATCH /api/admin/payment-wallets/:id
 */
exports.updateAdminPaymentWallet = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    const body = req.body || {};
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const [existing] = await pool.query("SELECT id FROM payment_wallets WHERE id = ?", [id]);
    if (!existing?.length) return res.status(404).json({ message: "Payment wallet not found." });

    const updates = [];
    const params = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return res.status(400).json({ message: "Name cannot be empty." });
      if (!/^[A-Za-z ]+$/.test(name)) return res.status(400).json({ message: "Name must contain only alphabets." });
      if (name.length > 20) return res.status(400).json({ message: "Name must not exceed 20 characters." });
      updates.push("name = ?");
      params.push(name);
    }
    if (body.number !== undefined) {
      const number = String(body.number).trim();
      if (!number) return res.status(400).json({ message: "Number cannot be empty." });
      if (!/^[A-Za-z0-9 ]+$/.test(number)) return res.status(400).json({ message: "Number must be alphanumeric." });
      if (number.length > 30) return res.status(400).json({ message: "Number must not exceed 30 characters." });
      updates.push("number = ?");
      params.push(number);
    }
    if (body.status !== undefined) {
      const s = String(body.status).toLowerCase();
      if (s !== "active" && s !== "inactive") return res.status(400).json({ message: "Status must be Active or Inactive." });
      updates.push("status = ?");
      params.push(s);
    }
    if (body.minDeposit !== undefined) { updates.push("min_deposit = ?"); params.push(parseDecimal(body.minDeposit, 0)); }
    if (body.minWithdraw !== undefined) { updates.push("min_withdraw = ?"); params.push(parseDecimal(body.minWithdraw, 0)); }
    if (body.maxDeposit !== undefined) { updates.push("max_deposit = ?"); params.push(parseDecimal(body.maxDeposit, 0)); }
    if (body.maxWithdraw !== undefined) { updates.push("max_withdraw = ?"); params.push(parseDecimal(body.maxWithdraw, 0)); }
    if (body.availableForDeposit !== undefined) {
      updates.push("available_for_deposit = ?");
      params.push(body.availableForDeposit === true || body.availableForDeposit === "yes" || body.availableForDeposit === "1" ? 1 : 0);
    }
    if (body.availableForWithdraw !== undefined) {
      updates.push("available_for_withdraw = ?");
      params.push(body.availableForWithdraw === true || body.availableForWithdraw === "yes" || body.availableForWithdraw === "1" ? 1 : 0);
    }
    if (body.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
      updates.push("sort_order = ?");
      params.push(Math.floor(Number(body.sortOrder)));
    }
    if (body.qrImageBase64 !== undefined && body.qrImageBase64) {
      const filename = saveQrImage(id, body.qrImageBase64);
      if (filename) {
        updates.push("qr_image_path = ?");
        params.push(filename);
      }
    }

    if (updates.length === 0) {
      const [rows0] = await pool.query(
        `SELECT p.id, p.name, p.number, p.wallet_company_id, p.status, p.balance, p.min_deposit, p.min_withdraw, p.max_deposit, p.max_withdraw, p.qr_image_path, p.available_for_deposit, p.available_for_withdraw, p.sort_order, p.created_at, c.name AS company_name
         FROM payment_wallets p LEFT JOIN wallet_companies c ON c.id = p.wallet_company_id WHERE p.id = ?`,
        [id]
      );
      const r0 = rows0[0];
      const item0 = r0 ? { id: r0.id, name: r0.name || "", number: r0.number || "", walletCompanyId: r0.wallet_company_id, companyName: r0.company_name || "", status: r0.status === "active" ? "Active" : "Inactive", statusRaw: r0.status, balance: Number(r0.balance) || 0, minDeposit: Number(r0.min_deposit) || 0, minWithdraw: Number(r0.min_withdraw) || 0, maxDeposit: Number(r0.max_deposit) || 0, maxWithdraw: Number(r0.max_withdraw) || 0, qrImagePath: r0.qr_image_path || "", availableForDeposit: !!r0.available_for_deposit, availableForWithdraw: !!r0.available_for_withdraw, sortOrder: r0.sort_order != null ? r0.sort_order : 0, createdAt: r0.created_at } : null;
      return res.status(200).json({ message: "No changes.", item: item0 });
    }

    params.push(id);
    await pool.query(`UPDATE payment_wallets SET ${updates.join(", ")} WHERE id = ?`, params);

    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.number, p.wallet_company_id, p.status, p.balance, p.min_deposit, p.min_withdraw, p.max_deposit, p.max_withdraw, p.qr_image_path, p.available_for_deposit, p.available_for_withdraw, p.sort_order, p.created_at, c.name AS company_name
       FROM payment_wallets p LEFT JOIN wallet_companies c ON c.id = p.wallet_company_id WHERE p.id = ?`,
      [id]
    );
    const r = rows[0];
    const item = r ? {
      id: r.id,
      name: r.name || "",
      number: r.number || "",
      walletCompanyId: r.wallet_company_id,
      companyName: r.company_name || "",
      status: r.status === "active" ? "Active" : "Inactive",
      statusRaw: r.status,
      balance: Number(r.balance) || 0,
      minDeposit: Number(r.min_deposit) || 0,
      minWithdraw: Number(r.min_withdraw) || 0,
      maxDeposit: Number(r.max_deposit) || 0,
      maxWithdraw: Number(r.max_withdraw) || 0,
      qrImagePath: r.qr_image_path || "",
      availableForDeposit: !!r.available_for_deposit,
      availableForWithdraw: !!r.available_for_withdraw,
      sortOrder: r.sort_order != null ? r.sort_order : 0,
      createdAt: r.created_at,
    } : null;

    return res.status(200).json({ message: "Payment wallet updated.", item });
  } catch (err) {
    console.error("updateAdminPaymentWallet error:", err);
    return res.status(500).json({ message: "Failed to update payment wallet." });
  }
};

const ADMIN_ACCOUNT_ID = ADMIN_LEDGER_ACCOUNT_ID;

async function getOrCreatePaymentWalletAccountId(pwId, name, number, db = pool) {
  const [rows] = await db.query(
    "SELECT id FROM accounts WHERE type = 'payment_wallet' AND reference_id = ? LIMIT 1",
    [pwId]
  );
  if (rows?.length) return rows[0].id;
  const displayName = `${(name || "").trim()} (${(number || "").trim()})`.trim() || `Payment Wallet #${pwId}`;
  const [ins] = await db.query(
    "INSERT INTO accounts (name, type, reference_id) VALUES (?, 'payment_wallet', ?)",
    [displayName, pwId]
  );
  return ins.insertId;
}

/**
 * POST /api/admin/payment-wallets/:id/topup
 * Body: { amount, notes? } - add to balance, optional notes stored in general_entries
 */
exports.topUpAdminPaymentWallet = async (req, res) => {
  let conn;
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    const amount = parseDecimal(req.body?.amount, 0);
    const notes = req.body?.notes != null ? String(req.body.notes).trim() : "";
    if (!id) return res.status(400).json({ message: "Invalid id." });
    if (amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0." });

    const [rows] = await pool.query(
      "SELECT id, balance, name, number FROM payment_wallets WHERE id = ?",
      [id]
    );
    if (!rows?.length) return res.status(404).json({ message: "Payment wallet not found." });
    const r = rows[0];
    const newBalance = Number(r.balance) + amount;
    const toAccountDisplay = `${r.name || ""} (${r.number || ""})`.trim() || `Payment Wallet #${id}`;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const transactionNumber = await allocateGeneralEntryTransactionNumber(conn, GE_TXN_SERIES.TOPUP);
    await conn.query("UPDATE payment_wallets SET balance = ? WHERE id = ?", [newBalance, id]);

    let toAccountId = null;
    try {
      toAccountId = await getOrCreatePaymentWalletAccountId(id, r.name, r.number, conn);
    } catch (e) {
      if (e.code !== "ER_NO_SUCH_TABLE" && e.code !== "ER_BAD_FIELD_ERROR") throw e;
    }
    await insertGeneralEntry(conn, {
      transactionNumber,
      fromAccount: "Admin Account",
      fromAccountId: ADMIN_ACCOUNT_ID,
      toAccount: toAccountDisplay,
      toAccountId,
      amount,
      narration: notes || null,
    });

    await conn.query(
      "UPDATE admin_account_balance SET balance = balance - ? WHERE id = 1",
      [amount]
    ).catch((e) => { if (e.code !== "ER_NO_SUCH_TABLE") throw e; });

    await conn.commit();
    return res.status(200).json({ message: "Top-up successful.", balance: newBalance });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    console.error("topUpAdminPaymentWallet error:", err);
    return res.status(500).json({ message: "Failed to top up." });
  } finally {
    if (conn) conn.release();
  }
};

/**
 * POST /api/admin/payment-wallets/:id/deduct
 * Body: { amount, notes? } - subtract from balance, optional notes stored in general_entries
 */
exports.deductAdminPaymentWallet = async (req, res) => {
  let conn;
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    const amount = parseDecimal(req.body?.amount, 0);
    const notes = req.body?.notes != null ? String(req.body.notes).trim() : "";
    if (!id) return res.status(400).json({ message: "Invalid id." });
    if (amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0." });

    const [rows] = await pool.query(
      "SELECT id, balance, name, number FROM payment_wallets WHERE id = ?",
      [id]
    );
    if (!rows?.length) return res.status(404).json({ message: "Payment wallet not found." });
    const r = rows[0];
    const currentBalance = Number(r.balance) || 0;
    const newBalance = currentBalance - amount;
    if (newBalance < 0) {
      return res.status(400).json({ message: "Insufficient balance. Payment wallet cannot go negative." });
    }
    const fromAccountDisplay = `${r.name || ""} (${r.number || ""})`.trim() || `Payment Wallet #${id}`;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const transactionNumber = await allocateGeneralEntryTransactionNumber(conn, GE_TXN_SERIES.DEDUCT);
    await conn.query("UPDATE payment_wallets SET balance = ? WHERE id = ?", [newBalance, id]);

    let fromAccountId = null;
    try {
      fromAccountId = await getOrCreatePaymentWalletAccountId(id, r.name, r.number, conn);
    } catch (e) {
      if (e.code !== "ER_NO_SUCH_TABLE" && e.code !== "ER_BAD_FIELD_ERROR") throw e;
    }
    await insertGeneralEntry(conn, {
      transactionNumber,
      fromAccount: fromAccountDisplay,
      fromAccountId,
      toAccount: "Admin Account",
      toAccountId: ADMIN_ACCOUNT_ID,
      amount,
      narration: notes || null,
    });

    await conn.query(
      "UPDATE admin_account_balance SET balance = balance + ? WHERE id = 1",
      [amount]
    ).catch((e) => {
      if (e.code !== "ER_NO_SUCH_TABLE") throw e;
    });

    await conn.commit();
    return res.status(200).json({ message: "Deduction successful.", balance: newBalance });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    console.error("deductAdminPaymentWallet error:", err);
    return res.status(500).json({ message: "Failed to deduct." });
  } finally {
    if (conn) conn.release();
  }
};

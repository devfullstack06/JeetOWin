const { pool } = require("../../config/database");
const {
  optionalDepositFilesUpload,
  getRelativeSlipPath,
  getRelativeEvidencePath,
} = require("../../middleware/uploadDepositFiles");
const {
  allocateGeneralEntryTransactionNumber,
  GE_TXN_SERIES,
} = require("../../utils/generalEntryTransactionNumber");
const { insertGeneralEntry } = require("../../utils/generalEntryPersistence");

async function getOrCreatePaymentWalletAccountId(conn, pwId, name, number) {
  const [rows] = await conn.query(
    "SELECT id FROM accounts WHERE type = 'payment_wallet' AND reference_id = ? LIMIT 1",
    [pwId]
  );
  if (rows?.length) return rows[0].id;
  const displayName = `${(name || "").trim()} (${(number || "").trim()})`.trim() || `Payment Wallet #${pwId}`;
  const [ins] = await conn.query(
    "INSERT INTO accounts (name, type, reference_id) VALUES (?, 'payment_wallet', ?)",
    [displayName, pwId]
  );
  return ins.insertId;
}

async function getOrCreateClientAccountId(conn, userId, username) {
  const [rows] = await conn.query(
    "SELECT id FROM accounts WHERE type = 'client' AND reference_id = ? LIMIT 1",
    [userId]
  );
  if (rows?.length) return rows[0].id;
  const displayName = `${(username || "").trim() || `#${userId}`}`;
  const [ins] = await conn.query(
    "INSERT INTO accounts (name, type, reference_id) VALUES (?, 'client', ?)",
    [displayName, userId]
  );
  return ins.insertId;
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseDecimal(value, defaultVal = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultVal;
  return n;
}

/** Normalize trx_id: alphanumeric, max 30, lowercase */
function normalizeTrxId(value) {
  if (value == null) return null;
  const s = String(value).replace(/[^a-zA-Z0-9]/g, "").slice(0, 30).toLowerCase();
  return s || null;
}

function buildItem(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    createdByUserId: r.created_by_user_id != null ? Number(r.created_by_user_id) : null,
    createdByUsername: r.created_by_username != null ? String(r.created_by_username) : "",
    username: r.username != null ? String(r.username) : "",
    walletCompanyId: r.wallet_company_id,
    walletCompanyName: r.wallet_company_name != null ? String(r.wallet_company_name) : "",
    paymentWalletId: r.payment_wallet_id,
    paymentWalletName: r.payment_wallet_name != null ? String(r.payment_wallet_name) : "",
    amount: r.amount != null ? Number(r.amount) : 0,
    status: (r.status || "pending").toLowerCase(),
    trxId: r.trx_id != null ? String(r.trx_id) : null,
    ledgerTransactionNumber:
      r.ledger_transaction_number != null ? String(r.ledger_transaction_number) : null,
    slipPath: r.slip_path != null ? String(r.slip_path) : null,
    evidencePath: r.evidence_path != null ? String(r.evidence_path) : null,
    reason: r.reason != null ? String(r.reason) : null,
    notes: r.notes != null ? String(r.notes) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * GET /api/admin/deposit-tickets
 * List with filters: ticket (id), username, company, wallet, status, trxId, dateFrom, dateTo. Default status=pending.
 */
exports.getAdminDepositTickets = async (req, res) => {
  try {
    const ticketId = req.query.ticket != null ? String(req.query.ticket).trim() : "";
    const username = String(req.query.username || "").trim();
    const company = req.query.company != null && Number.isFinite(Number(req.query.company)) ? Number(req.query.company) : null;
    const wallet = req.query.wallet != null && Number.isFinite(Number(req.query.wallet)) ? Number(req.query.wallet) : null;
    let status = String(req.query.status || "pending").trim().toLowerCase();
    if (!["pending", "approved", "rejected"].includes(status)) status = "pending";
    const trxId = String(req.query.trxId || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const dateFrom = String(req.query.dateFrom || req.query.startDate || "").trim();
    const dateTo = String(req.query.dateTo || req.query.endDate || "").trim();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);

    const where = ["1=1"];
    const params = [];

    if (ticketId) {
      const tid = Number(ticketId);
      if (Number.isFinite(tid)) {
        where.push("dt.id = ?");
        params.push(tid);
      } else {
        where.push("dt.id = 0");
      }
    }
    if (username) {
      where.push("u.username LIKE ?");
      params.push(`%${username}%`);
    }
    if (company != null) {
      where.push("dt.wallet_company_id = ?");
      params.push(company);
    }
    if (wallet != null) {
      where.push("dt.payment_wallet_id = ?");
      params.push(wallet);
    }
    where.push("dt.status = ?");
    params.push(status);
    if (trxId) {
      where.push("dt.trx_id LIKE ?");
      params.push(`%${trxId}%`);
    }
    if (dateFrom) {
      where.push("dt.created_at >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("dt.created_at <= ?");
      params.push(dateTo + " 23:59:59");
    }

    const whereSql = where.join(" AND ");
    const joinSql = `
      LEFT JOIN users u ON u.id = dt.client_id
      LEFT JOIN users creator ON creator.id = dt.created_by_user_id
      LEFT JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
      LEFT JOIN payment_wallets pw ON pw.id = dt.payment_wallet_id
    `;
    const selectList = `
      dt.id, dt.client_id, dt.created_by_user_id, dt.wallet_company_id, dt.payment_wallet_id,
      dt.amount, dt.status, dt.trx_id, dt.ledger_transaction_number, dt.slip_path, dt.evidence_path, dt.reason, dt.notes,
      dt.created_at, dt.updated_at,
      u.username AS username,
      creator.username AS created_by_username,
      wc.name AS wallet_company_name,
      CONCAT(pw.name, ' (', pw.number, ')') AS payment_wallet_name
    `;

    let total = 0;
    let rows = [];
    try {
      const [[c]] = await pool.query(
        `SELECT COUNT(*) AS total FROM deposit_tickets dt ${joinSql} WHERE ${whereSql}`,
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
        `SELECT ${selectList}
         FROM deposit_tickets dt ${joinSql}
         WHERE ${whereSql}
         ORDER BY dt.created_at DESC, dt.id DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      throw e;
    }

    const items = (rows || []).map((r) => buildItem(r));
    return res.status(200).json({ items, total, page, pageSize });
  } catch (err) {
    console.error("getAdminDepositTickets error:", err);
    return res.status(500).json({ message: "Failed to load tickets.", items: [], total: 0, page: 1, pageSize: 25 });
  }
};

/**
 * GET /api/admin/deposit-tickets/:id
 * Single ticket for Edit/View (with wallet balance, min/max for payment_wallet).
 */
exports.getAdminDepositTicketById = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const [rows] = await pool.query(
      `SELECT dt.id, dt.client_id, dt.created_by_user_id, dt.wallet_company_id, dt.payment_wallet_id,
              dt.amount, dt.status, dt.trx_id, dt.ledger_transaction_number, dt.slip_path, dt.evidence_path, dt.reason, dt.notes,
              dt.created_at, dt.updated_at,
              u.username AS username,
              creator.username AS created_by_username,
              wc.name AS wallet_company_name,
              pw.name AS payment_wallet_name, pw.number AS payment_wallet_number,
              pw.balance, pw.min_deposit, pw.max_deposit
       FROM deposit_tickets dt
       LEFT JOIN users u ON u.id = dt.client_id
       LEFT JOIN users creator ON creator.id = dt.created_by_user_id
       LEFT JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
       LEFT JOIN payment_wallets pw ON pw.id = dt.payment_wallet_id
       WHERE dt.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Ticket not found." });

    const r = rows[0];
    const item = buildItem(r);
    item.paymentWalletBalance = r.balance != null ? Number(r.balance) : 0;
    item.paymentWalletMinDeposit = r.min_deposit != null ? Number(r.min_deposit) : 0;
    item.paymentWalletMaxDeposit = r.max_deposit != null ? Number(r.max_deposit) : 0;
    item.paymentWalletNumber = r.payment_wallet_number != null ? String(r.payment_wallet_number) : "";
    return res.status(200).json(item);
  } catch (err) {
    console.error("getAdminDepositTicketById error:", err);
    return res.status(500).json({ message: "Failed to load ticket." });
  }
};

/**
 * POST /api/admin/deposit-tickets (Create)
 * Body (JSON or form): clientId (user id, client from users table role_id=1), walletCompanyId, paymentWalletId, amount, trxId, notes?
 * Optional file field: slip
 */
exports.createAdminDepositTicket = async (req, res) => {
  try {
    const body = req.body || {};
    const clientIdParam = body.clientId != null && Number.isFinite(Number(body.clientId)) ? Number(body.clientId) : null;
    const walletCompanyId = body.walletCompanyId != null && Number(body.walletCompanyId) ? Number(body.walletCompanyId) : null;
    const paymentWalletId = body.paymentWalletId != null && Number(body.paymentWalletId) ? Number(body.paymentWalletId) : null;
    const amount = parseDecimal(body.amount, 0);
    const trxId = normalizeTrxId(body.trxId);
    const notes = body.notes != null ? String(body.notes).trim() : null;

    if (!clientIdParam) return res.status(400).json({ message: "Client is required." });
    if (!walletCompanyId) return res.status(400).json({ message: "Company is required." });
    if (!paymentWalletId) return res.status(400).json({ message: "Wallet is required." });
    if (!trxId) return res.status(400).json({ message: "Trx ID is required." });

    const [userRows] = await pool.query(
      "SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND r.name = 'client' LIMIT 1",
      [clientIdParam]
    );
    if (!userRows.length) return res.status(400).json({ message: "Invalid or non-client user." });
    const clientId = userRows[0].id;

    const [pwRows] = await pool.query(
      "SELECT id, wallet_company_id, min_deposit, max_deposit FROM payment_wallets WHERE id = ? LIMIT 1",
      [paymentWalletId]
    );
    if (!pwRows.length) return res.status(400).json({ message: "Invalid wallet." });
    const pw = pwRows[0];
    if (Number(pw.wallet_company_id) !== Number(walletCompanyId)) {
      return res.status(400).json({ message: "Wallet does not belong to selected company." });
    }
    const minD = Number(pw.min_deposit || 0);
    const maxD = Number(pw.max_deposit || 0);
    if (amount < minD || (maxD > 0 && amount > maxD)) {
      return res.status(400).json({ message: `Amount must be between ${Math.floor(minD)} and ${maxD ? Math.floor(maxD) : "unlimited"}.` });
    }

    let slipPath = null;
    if (req.files && req.files.slip && req.files.slip[0]) {
      slipPath = getRelativeSlipPath(req.files.slip[0]);
    }

    const adminCreatorId =
      req.authUser?.id != null ? Number(req.authUser.id) : NaN;
    if (!Number.isFinite(adminCreatorId) || adminCreatorId <= 0) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    await pool.query(
      `INSERT INTO deposit_tickets
        (client_id, created_by_user_id, wallet_company_id, payment_wallet_id, amount, status, trx_id, slip_path, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())`,
      [clientId, adminCreatorId, walletCompanyId, paymentWalletId, amount, trxId, slipPath, notes]
    );
    const [insertResult] = await pool.query("SELECT LAST_INSERT_ID() AS id");
    const id = insertResult[0].id;
    const [rows] = await pool.query(
      `SELECT dt.id, dt.client_id, dt.created_by_user_id, dt.wallet_company_id, dt.payment_wallet_id,
              dt.amount, dt.status, dt.trx_id, dt.ledger_transaction_number, dt.slip_path, dt.evidence_path, dt.reason, dt.notes,
              dt.created_at, dt.updated_at,
              u.username AS username,
              creator.username AS created_by_username,
              wc.name AS wallet_company_name,
              CONCAT(pw.name, ' (', pw.number, ')') AS payment_wallet_name
       FROM deposit_tickets dt
       LEFT JOIN users u ON u.id = dt.client_id
       LEFT JOIN users creator ON creator.id = dt.created_by_user_id
       LEFT JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
       LEFT JOIN payment_wallets pw ON pw.id = dt.payment_wallet_id
       WHERE dt.id = ? LIMIT 1`,
      [id]
    );
    const ticket = buildItem(rows[0]);
    return res.status(201).json(ticket);
  } catch (err) {
    console.error("createAdminDepositTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to create ticket." });
  }
};

/**
 * POST /api/admin/deposit-tickets/:id/approve
 * Multipart: walletCompanyId?, paymentWalletId?, amount?, trxId, notes?; optional files: slip, evidence
 */
exports.approveAdminDepositTicket = async (req, res) => {
  let conn;
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const walletCompanyId = body.walletCompanyId != null && Number(body.walletCompanyId) ? Number(body.walletCompanyId) : null;
    const paymentWalletId = body.paymentWalletId != null && Number(body.paymentWalletId) ? Number(body.paymentWalletId) : null;
    const amount = body.amount != null ? parseDecimal(body.amount, null) : null;
    const notes = body.notes != null ? String(body.notes).trim() : null;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query(
      `SELECT id, client_id, status, slip_path, evidence_path, wallet_company_id, payment_wallet_id, amount, trx_id
       FROM deposit_tickets
       WHERE id = ? LIMIT 1 FOR UPDATE`,
      [id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Ticket not found." });
    }
    if (existing[0].status !== "pending") {
      await conn.rollback();
      return res.status(400).json({ message: "Ticket is not pending." });
    }

    const rawTrxForApprove =
      Object.prototype.hasOwnProperty.call(body, "trxId") && body.trxId !== undefined
        ? body.trxId
        : existing[0].trx_id;
    const finalTrxId = normalizeTrxId(rawTrxForApprove);
    if (!finalTrxId) {
      await conn.rollback();
      return res.status(400).json({ message: "Trx ID is required." });
    }

    let slipPath = existing[0].slip_path;
    if (req.files && req.files.slip && req.files.slip[0]) {
      slipPath = getRelativeSlipPath(req.files.slip[0]);
    }
    let evidencePath = existing[0].evidence_path;
    if (req.files && req.files.evidence && req.files.evidence[0]) {
      evidencePath = getRelativeEvidencePath(req.files.evidence[0]);
    }

    const finalCompanyId = walletCompanyId != null ? walletCompanyId : existing[0].wallet_company_id;
    const finalWalletId = paymentWalletId != null ? paymentWalletId : existing[0].payment_wallet_id;
    let finalAmount = amount != null ? amount : Number(existing[0].amount);

    const [pw] = await conn.query(
      "SELECT id, wallet_company_id, min_deposit, max_deposit, balance, name, number FROM payment_wallets WHERE id = ? LIMIT 1 FOR UPDATE",
      [finalWalletId]
    );
    if (!pw.length) {
      await conn.rollback();
      return res.status(400).json({ message: "Invalid wallet." });
    }
    const wallet = pw[0];
    if (Number(wallet.wallet_company_id) !== Number(finalCompanyId)) {
      await conn.rollback();
      return res.status(400).json({ message: "Wallet does not belong to selected company." });
    }
    const minD = Number(wallet.min_deposit || 0);
    const maxD = Number(wallet.max_deposit || 0);
    if (finalAmount < minD || (maxD > 0 && finalAmount > maxD)) {
      await conn.rollback();
      return res.status(400).json({ message: `Amount must be between ${Math.floor(minD)} and ${maxD ? Math.floor(maxD) : "unlimited"}.` });
    }
    const currentWalletBalance = Number(wallet.balance || 0);
    if (currentWalletBalance < Number(finalAmount)) {
      await conn.rollback();
      return res.status(400).json({ message: "Insufficient wallet balance." });
    }

    const [clientRows] = await conn.query(
      `SELECT u.id AS user_id, u.username, c.user_id AS client_user_id, c.balance
       FROM users u
       INNER JOIN clients c ON c.user_id = u.id
       WHERE u.id = ? LIMIT 1 FOR UPDATE`,
      [existing[0].client_id]
    );
    if (!clientRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: "Client profile not found." });
    }
    const client = clientRows[0];

    const transactionNumber = await allocateGeneralEntryTransactionNumber(conn, GE_TXN_SERIES.DEPOSIT);

    const setParts = [
      "status = 'approved'",
      "updated_at = NOW()",
      "reason = NULL",
      "wallet_company_id = ?",
      "payment_wallet_id = ?",
      "amount = ?",
      "trx_id = ?",
      "slip_path = ?",
      "evidence_path = ?",
      "notes = ?",
      "ledger_transaction_number = ?",
    ];
    const params = [
      finalCompanyId,
      finalWalletId,
      finalAmount,
      finalTrxId,
      slipPath,
      evidencePath,
      notes,
      transactionNumber,
    ];
    params.push(id);
    await conn.query(`UPDATE deposit_tickets SET ${setParts.join(", ")} WHERE id = ?`, params);

    const newWalletBalance = currentWalletBalance - Number(finalAmount);
    await conn.query("UPDATE payment_wallets SET balance = ? WHERE id = ?", [newWalletBalance, finalWalletId]);

    const currentClientBalance = Number(client.balance || 0);
    const newClientBalance = currentClientBalance + Number(finalAmount);
    await conn.query("UPDATE clients SET balance = ? WHERE user_id = ?", [newClientBalance, client.user_id]);
    const fromAccountDisplay = `${wallet.name || ""} (${wallet.number || ""})`.trim() || `Payment Wallet #${finalWalletId}`;
    const toAccountDisplay = `${(client.username || "").trim() || `#${client.user_id}`}`;
    const narration = notes || "";
    const fromAccountId = await getOrCreatePaymentWalletAccountId(conn, finalWalletId, wallet.name, wallet.number);
    const toAccountId = await getOrCreateClientAccountId(conn, client.user_id, client.username);
    await insertGeneralEntry(conn, {
      transactionNumber,
      fromAccount: fromAccountDisplay,
      fromAccountId,
      toAccount: toAccountDisplay,
      toAccountId,
      amount: finalAmount,
      narration,
    });

    await conn.commit();

    const [rows] = await pool.query(
      `SELECT dt.id, dt.client_id, dt.created_by_user_id, dt.wallet_company_id, dt.payment_wallet_id,
              dt.amount, dt.status, dt.trx_id, dt.ledger_transaction_number, dt.slip_path, dt.evidence_path, dt.reason, dt.notes,
              dt.created_at, dt.updated_at,
              u.username AS username,
              creator.username AS created_by_username,
              wc.name AS wallet_company_name,
              CONCAT(pw.name, ' (', pw.number, ')') AS payment_wallet_name
       FROM deposit_tickets dt
       LEFT JOIN users u ON u.id = dt.client_id
       LEFT JOIN users creator ON creator.id = dt.created_by_user_id
       LEFT JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
       LEFT JOIN payment_wallets pw ON pw.id = dt.payment_wallet_id
       WHERE dt.id = ? LIMIT 1`,
      [id]
    );
    return res.status(200).json({ message: "Approved.", ticket: buildItem(rows[0]) });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    console.error("approveAdminDepositTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to approve." });
  } finally {
    if (conn) conn.release();
  }
};

/**
 * PATCH /api/admin/deposit-tickets/:id/reject
 * Body (JSON or multipart): reason, notes?; optional file field: evidence
 */
exports.rejectAdminDepositTicket = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const reason = body.reason != null ? String(body.reason).trim() : null;
    const notes = body.notes != null ? String(body.notes).trim() : null;

    const [existing] = await pool.query(
      "SELECT id, status, evidence_path FROM deposit_tickets WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existing.length) return res.status(404).json({ message: "Ticket not found." });
    if (existing[0].status !== "pending") return res.status(400).json({ message: "Ticket is not pending." });

    let evidencePath = existing[0].evidence_path;
    if (req.files && req.files.evidence && req.files.evidence[0]) {
      evidencePath = getRelativeEvidencePath(req.files.evidence[0]);
    }

    if (evidencePath != null && evidencePath !== existing[0].evidence_path) {
      await pool.query(
        "UPDATE deposit_tickets SET status = 'rejected', reason = ?, notes = ?, evidence_path = ?, updated_at = NOW() WHERE id = ?",
        [reason, notes, evidencePath, id]
      );
    } else {
      await pool.query(
        "UPDATE deposit_tickets SET status = 'rejected', reason = ?, notes = ?, updated_at = NOW() WHERE id = ?",
        [reason, notes, id]
      );
    }
    return res.status(200).json({ message: "Rejected.", ticketId: id });
  } catch (err) {
    console.error("rejectAdminDepositTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to reject." });
  }
};

/**
 * PATCH /api/admin/deposit-tickets/:id
 * Update notes only (for View form). Allowed for approved/rejected.
 */
exports.patchAdminDepositTicket = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const notes = body.notes != null ? String(body.notes).trim() : null;

    const [existing] = await pool.query("SELECT id, status FROM deposit_tickets WHERE id = ? LIMIT 1", [id]);
    if (!existing.length) return res.status(404).json({ message: "Ticket not found." });
    const status = (existing[0].status || "").toLowerCase();
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ message: "Only approved or rejected tickets can be updated." });
    }

    await pool.query("UPDATE deposit_tickets SET notes = ?, updated_at = NOW() WHERE id = ?", [notes, id]);
    return res.status(200).json({ message: "Updated.", ticketId: id });
  } catch (err) {
    console.error("patchAdminDepositTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to update." });
  }
};

/**
 * GET /api/admin/deposit-tickets/readiness
 * Quick health check for deposit approval accounting dependencies.
 */
exports.getAdminDepositTicketsReadiness = async (_req, res) => {
  try {
    const [dbRows] = await pool.query("SELECT DATABASE() AS db");
    const dbName = dbRows?.[0]?.db;
    if (!dbName) {
      return res.status(500).json({ ok: false, message: "No active database selected." });
    }

    async function tableExists(tableName) {
      const [rows] = await pool.query(
        `SELECT 1
         FROM information_schema.tables
         WHERE table_schema = ? AND table_name = ?
         LIMIT 1`,
        [dbName, tableName]
      );
      return !!rows.length;
    }

    async function columnExists(tableName, columnName) {
      const [rows] = await pool.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ? AND column_name = ?
         LIMIT 1`,
        [dbName, tableName, columnName]
      );
      return !!rows.length;
    }

    async function accountsTypeHasClient() {
      const [rows] = await pool.query(
        `SELECT column_type
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = 'accounts' AND column_name = 'type'
         LIMIT 1`,
        [dbName]
      );
      const ct = String(rows?.[0]?.column_type || "").toLowerCase();
      return ct.includes("'client'");
    }

    const requiredTables = [
      "deposit_tickets",
      "payment_wallets",
      "clients",
      "accounts",
      "general_entries",
    ];

    const requiredColumns = [
      ["deposit_tickets", "client_id"],
      ["deposit_tickets", "payment_wallet_id"],
      ["deposit_tickets", "amount"],
      ["payment_wallets", "balance"],
      ["clients", "user_id"],
      ["clients", "balance"],
      ["accounts", "type"],
      ["accounts", "reference_id"],
      ["general_entries", "from_account"],
      ["general_entries", "to_account"],
      ["general_entries", "amount"],
    ];

    const optionalColumns = [
      ["general_entries", "from_account_id"],
      ["general_entries", "to_account_id"],
      ["deposit_tickets", "ledger_transaction_number"],
      ["deposit_tickets", "created_by_user_id"],
    ];

    const checks = { tables: {}, columns: {}, accountTypeClient: false, optional: {} };
    const missing = [];
    const warnings = [];

    for (const t of requiredTables) {
      const ok = await tableExists(t);
      checks.tables[t] = ok;
      if (!ok) missing.push(`table:${t}`);
    }

    for (const [t, c] of requiredColumns) {
      const key = `${t}.${c}`;
      const ok = await columnExists(t, c);
      checks.columns[key] = ok;
      if (!ok) missing.push(`column:${key}`);
    }

    if (checks.tables.general_entries) {
      const hasTxnNum = await columnExists("general_entries", "transaction_number");
      const hasTrxId = await columnExists("general_entries", "trx_id");
      checks.columns["general_entries.transaction_number"] = hasTxnNum;
      checks.columns["general_entries.trx_id"] = hasTrxId;
      if (!hasTxnNum && !hasTrxId) {
        missing.push("column:general_entries.transaction_number (or legacy trx_id)");
      }
    }

    if (checks.tables.accounts && checks.columns["accounts.type"]) {
      checks.accountTypeClient = await accountsTypeHasClient();
      if (!checks.accountTypeClient) missing.push("accounts.type enum missing 'client'");
    }

    for (const [t, c] of optionalColumns) {
      const key = `${t}.${c}`;
      const ok = await columnExists(t, c);
      checks.optional[key] = ok;
      if (!ok) warnings.push(`optional column missing: ${key} (fallback to text-only general_entries)`);
    }

    const seqTable = "general_entry_sequences";
    checks.optional[`table:${seqTable}`] = await tableExists(seqTable);
    if (!checks.optional[`table:${seqTable}`]) {
      warnings.push(`optional table missing: ${seqTable} (required for PWT/PWD/DP transaction numbers)`);
    }

    return res.status(200).json({
      ok: missing.length === 0,
      database: dbName,
      checks,
      missing,
      warnings,
    });
  } catch (err) {
    console.error("getAdminDepositTicketsReadiness error:", err);
    return res.status(500).json({ ok: false, message: err.message || "Readiness check failed." });
  }
};

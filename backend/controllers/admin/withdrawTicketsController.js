const { pool } = require("../../config/database");
const {
  allocateGeneralEntryTransactionNumber,
  GE_TXN_SERIES,
} = require("../../utils/generalEntryTransactionNumber");
const { insertGeneralEntry } = require("../../utils/generalEntryPersistence");
const {
  getRelativeEvidencePath,
  getRelativeSlipPath,
} = require("../../middleware/uploadWithdrawEvidence");

async function getOrCreatePaymentWalletAccountId(conn, pwId, name, number) {
  const [rows] = await conn.query(
    "SELECT id FROM accounts WHERE type = 'payment_wallet' AND reference_id = ? LIMIT 1",
    [pwId]
  );
  if (rows?.length) return rows[0].id;
  const displayName =
    `${(name || "").trim()} (${(number || "").trim()})`.trim() ||
    `Payment Wallet #${pwId}`;
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
  const s = String(value)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 30)
    .toLowerCase();
  return s || null;
}

function buildItem(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    createdByUserId:
      r.created_by_user_id != null ? Number(r.created_by_user_id) : null,
    createdByUsername:
      r.created_by_username != null ? String(r.created_by_username) : "",
    username: r.username != null ? String(r.username) : "",
    walletCompanyId: r.wallet_company_id,
    walletCompanyName:
      r.wallet_company_name != null ? String(r.wallet_company_name) : "",
    clientWalletId: r.client_wallet_id != null ? Number(r.client_wallet_id) : null,
    accountTitle: r.account_title != null ? String(r.account_title) : "",
    accountNumber: r.account_number != null ? String(r.account_number) : "",
    paymentWalletId:
      r.payment_wallet_id != null ? Number(r.payment_wallet_id) : null,
    paymentWalletName:
      r.payment_wallet_name != null ? String(r.payment_wallet_name) : "",
    amount: r.amount != null ? Number(r.amount) : 0,
    status: (r.status || "pending").toLowerCase(),
    trxId: r.trx_id != null ? String(r.trx_id) : null,
    ledgerTransactionNumber:
      r.ledger_transaction_number != null
        ? String(r.ledger_transaction_number)
        : null,
    reason: r.reason != null ? String(r.reason) : null,
    slipPath: r.slip_path != null ? String(r.slip_path) : null,
    evidencePath: r.evidence_path != null ? String(r.evidence_path) : null,
    notes: r.notes != null ? String(r.notes) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    withdrawProcessMinutes:
      r.withdraw_process_minutes != null
        ? Number(r.withdraw_process_minutes)
        : 15,
  };
}

/**
 * GET /api/admin/withdraw-tickets
 * List with filters: ticket (id), username, company, status, trxId, dateFrom, dateTo. Default status=pending.
 */
exports.getAdminWithdrawTickets = async (req, res) => {
  try {
    const ticketId = req.query.ticket != null ? String(req.query.ticket).trim() : "";
    const username = String(req.query.username || "").trim();
    const company =
      req.query.company != null && Number.isFinite(Number(req.query.company))
        ? Number(req.query.company)
        : null;
    let status = String(req.query.status || "pending").trim().toLowerCase();
    if (!["pending", "approved", "rejected"].includes(status)) status = "pending";
    const trxId = String(req.query.trxId || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const dateFrom = String(req.query.dateFrom || req.query.startDate || "").trim();
    const dateTo = String(req.query.dateTo || req.query.endDate || "").trim();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);

    const where = ["1=1"];
    const params = [];

    if (ticketId) {
      const tid = Number(ticketId);
      if (Number.isFinite(tid)) {
        where.push("wt.id = ?");
        params.push(tid);
      } else {
        where.push("wt.id = 0");
      }
    }
    if (username) {
      where.push("u.username LIKE ?");
      params.push(`%${username}%`);
    }
    if (company != null) {
      where.push("cw.wallet_company_id = ?");
      params.push(company);
    }
    where.push("wt.status = ?");
    params.push(status);
    if (trxId) {
      where.push("wt.trx_id LIKE ?");
      params.push(`%${trxId}%`);
    }
    if (dateFrom) {
      where.push("wt.created_at >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("wt.created_at <= ?");
      params.push(dateTo + " 23:59:59");
    }

    const whereSql = where.join(" AND ");
    const joinSql = `
      LEFT JOIN users u ON u.id = wt.client_id
      LEFT JOIN users creator ON creator.id = wt.created_by_user_id
      LEFT JOIN client_wallets cw ON cw.id = wt.client_wallet_id
      LEFT JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
      LEFT JOIN payment_wallets pw ON pw.id = wt.payment_wallet_id
    `;
    const selectList = `
      wt.id, wt.client_id, wt.created_by_user_id, wt.client_wallet_id, wt.payment_wallet_id,
      wt.amount, wt.status, wt.trx_id, wt.ledger_transaction_number, wt.reason, wt.slip_path, wt.evidence_path, wt.notes,
      wt.created_at, wt.updated_at,
      u.username AS username,
      creator.username AS created_by_username,
      wc.id AS wallet_company_id,
      wc.name AS wallet_company_name,
      COALESCE(wc.withdraw_process_minutes, 15) AS withdraw_process_minutes,
      cw.account_title, cw.account_number,
      CONCAT(pw.name, ' (', pw.number, ')') AS payment_wallet_name
    `;

    let total = 0;
    let rows = [];
    try {
      const [[c]] = await pool.query(
        `SELECT COUNT(*) AS total FROM withdraw_tickets wt ${joinSql} WHERE ${whereSql}`,
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
         FROM withdraw_tickets wt ${joinSql}
         WHERE ${whereSql}
         ORDER BY wt.created_at DESC, wt.id DESC
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
    console.error("getAdminWithdrawTickets error:", err);
    return res.status(500).json({
      message: "Failed to load tickets.",
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
  }
};

/**
 * GET /api/admin/withdraw-tickets/:id
 * Single ticket for Edit/View. Includes payment wallets (available_for_withdraw) for the company.
 */
exports.getAdminWithdrawTicketById = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const [rows] = await pool.query(
      `SELECT wt.id, wt.client_id, wt.created_by_user_id, wt.client_wallet_id, wt.payment_wallet_id,
              wt.amount, wt.status, wt.trx_id, wt.ledger_transaction_number, wt.reason, wt.slip_path, wt.evidence_path, wt.notes,
              wt.created_at, wt.updated_at,
              u.username AS username,
              creator.username AS created_by_username,
              cw.wallet_company_id, cw.account_title, cw.account_number,
              wc.name AS wallet_company_name,
              COALESCE(wc.withdraw_process_minutes, 15) AS withdraw_process_minutes,
              CONCAT(pw_approve.name, ' (', pw_approve.number, ')') AS payment_wallet_name
       FROM withdraw_tickets wt
       LEFT JOIN users u ON u.id = wt.client_id
       LEFT JOIN users creator ON creator.id = wt.created_by_user_id
       LEFT JOIN client_wallets cw ON cw.id = wt.client_wallet_id
       LEFT JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
       LEFT JOIN payment_wallets pw_approve ON pw_approve.id = wt.payment_wallet_id
       WHERE wt.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Ticket not found." });

    const r = rows[0];
    const item = buildItem(r);

    const [clientRows] = await pool.query(
      "SELECT balance FROM clients WHERE user_id = ? LIMIT 1",
      [r.client_id]
    );
    item.clientBalance = clientRows.length
      ? Number(clientRows[0].balance || 0)
      : 0;

    const [pwRows] = await pool.query(
      `SELECT id, name, number, balance, min_withdraw, max_withdraw
       FROM payment_wallets
       WHERE wallet_company_id = ? AND status = 'active' AND available_for_withdraw = 1
       ORDER BY sort_order ASC, id ASC`,
      [r.wallet_company_id]
    );
    item.paymentWallets = (pwRows || []).map((pw) => ({
      id: pw.id,
      name: pw.name,
      number: pw.number,
      displayName: `${pw.name || ""} (${pw.number || ""})`.trim(),
      balance: Number(pw.balance || 0),
      minWithdraw: Number(pw.min_withdraw || 0),
      maxWithdraw: Number(pw.max_withdraw || 0),
    }));

    return res.status(200).json(item);
  } catch (err) {
    console.error("getAdminWithdrawTicketById error:", err);
    return res.status(500).json({ message: "Failed to load ticket." });
  }
};

/**
 * GET /api/admin/client-wallets
 * List client's wallets for admin Create modal. Query: clientId, companyId (optional).
 */
exports.getAdminClientWallets = async (req, res) => {
  try {
    const clientId =
      req.query.clientId != null && Number.isFinite(Number(req.query.clientId))
        ? Number(req.query.clientId)
        : null;
    const companyId =
      req.query.companyId != null && Number.isFinite(Number(req.query.companyId))
        ? Number(req.query.companyId)
        : null;

    if (!clientId) {
      return res.status(200).json({ items: [] });
    }

    let where = "cw.client_id = ? AND cw.is_active = 1";
    const params = [clientId];
    if (companyId != null) {
      where += " AND cw.wallet_company_id = ?";
      params.push(companyId);
    }

    const [rows] = await pool.query(
      `SELECT cw.id, cw.client_id, cw.wallet_company_id, cw.account_title, cw.account_number,
              wc.name AS wallet_company_name
       FROM client_wallets cw
       JOIN wallet_companies wc ON wc.id = cw.wallet_company_id AND wc.available_for_withdraw = 1
       WHERE ${where}
       ORDER BY wc.name, cw.account_title`,
      params
    );

    const items = (rows || []).map((r) => ({
      id: r.id,
      clientId: r.client_id,
      walletCompanyId: r.wallet_company_id,
      walletCompanyName: r.wallet_company_name || "",
      accountTitle: r.account_title || "",
      accountNumber: r.account_number || "",
    }));

    return res.status(200).json({ items });
  } catch (err) {
    console.error("getAdminClientWallets error:", err);
    return res.status(500).json({ message: "Failed to load client wallets." });
  }
};

/**
 * POST /api/admin/withdraw-tickets (Create)
 * Body: clientId (user id), clientWalletId, amount, notes?
 * Deducts balance (hold), inserts ticket.
 */
exports.createAdminWithdrawTicket = async (req, res) => {
  let conn;
  try {
    const body = req.body || {};
    const clientIdParam =
      body.clientId != null && Number.isFinite(Number(body.clientId))
        ? Number(body.clientId)
        : null;
    const clientWalletId =
      body.clientWalletId != null && body.clientWalletId !== ""
        ? Number(body.clientWalletId)
        : null;
    const amount = parseDecimal(body.amount, 0);
    const notes = body.notes != null ? String(body.notes).trim() : null;

    if (!clientIdParam) return res.status(400).json({ message: "Client is required." });
    if (!clientWalletId) return res.status(400).json({ message: "Wallet is required." });
    if (amount <= 0) return res.status(400).json({ message: "Valid amount is required." });

    const [userRows] = await pool.query(
      "SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND r.name = 'client' LIMIT 1",
      [clientIdParam]
    );
    if (!userRows.length)
      return res.status(400).json({ message: "Invalid or non-client user." });
    const clientId = userRows[0].id;

    conn = await pool.getConnection();

    const [cwRows] = await conn.query(
      `SELECT cw.id, cw.client_id, cw.wallet_company_id, cw.account_title, cw.account_number,
              COALESCE(wc.min_withdraw, 500) AS min_withdraw
       FROM client_wallets cw
       JOIN wallet_companies wc ON wc.id = cw.wallet_company_id AND wc.available_for_withdraw = 1
       WHERE cw.id = ? AND cw.client_id = ? AND cw.is_active = 1
       LIMIT 1`,
      [clientWalletId, clientId]
    );
    if (!cwRows.length) {
      conn.release();
      return res.status(400).json({ message: "Wallet not found or not yours." });
    }
    const minWithdraw = Number(cwRows[0].min_withdraw || 500);
    if (amount < minWithdraw) {
      conn.release();
      return res.status(400).json({
        message: `Minimum withdraw is Rs. ${Math.floor(minWithdraw).toLocaleString()}.`,
      });
    }

    const [clientRows] = await conn.query(
      "SELECT user_id, balance FROM clients WHERE user_id = ? LIMIT 1 FOR UPDATE",
      [clientId]
    );
    if (!clientRows.length) {
      conn.release();
      return res.status(400).json({ message: "Client profile not found." });
    }
    const currentBalance = Number(clientRows[0].balance || 0);
    if (currentBalance < amount) {
      conn.release();
      return res.status(400).json({ message: "Insufficient balance." });
    }

    const adminCreatorId = req.authUser?.id != null ? Number(req.authUser.id) : NaN;
    if (!Number.isFinite(adminCreatorId) || adminCreatorId <= 0) {
      conn.release();
      return res.status(401).json({ message: "Unauthorized." });
    }

    await conn.beginTransaction();
    try {
      const newBalance = currentBalance - amount;
      await conn.query(
        "UPDATE clients SET balance = ? WHERE user_id = ?",
        [newBalance, clientId]
      );
      await conn.query(
        `INSERT INTO withdraw_tickets
          (client_id, created_by_user_id, client_wallet_id, amount, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
        [clientId, adminCreatorId, clientWalletId, amount, notes]
      );
      const [insertResult] = await conn.query("SELECT LAST_INSERT_ID() AS id");
      const id = insertResult[0].id;

      await conn.commit();
      conn.release();

      const [rows] = await pool.query(
        `SELECT wt.id, wt.client_id, wt.created_by_user_id, wt.client_wallet_id, wt.payment_wallet_id,
                wt.amount, wt.status, wt.trx_id, wt.ledger_transaction_number, wt.reason, wt.notes,
                wt.created_at, wt.updated_at,
                u.username AS username,
                creator.username AS created_by_username,
                wc.name AS wallet_company_name,
                cw.account_title, cw.account_number,
                CONCAT(pw.name, ' (', pw.number, ')') AS payment_wallet_name
         FROM withdraw_tickets wt
         LEFT JOIN users u ON u.id = wt.client_id
         LEFT JOIN users creator ON creator.id = wt.created_by_user_id
         LEFT JOIN client_wallets cw ON cw.id = wt.client_wallet_id
         LEFT JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
         LEFT JOIN payment_wallets pw ON pw.id = wt.payment_wallet_id
         WHERE wt.id = ? LIMIT 1`,
        [id]
      );
      const ticket = buildItem(rows[0]);
      return res.status(201).json(ticket);
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }
  } catch (err) {
    if (conn) {
      try {
        conn.release();
      } catch (_) {}
    }
    console.error("createAdminWithdrawTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to create ticket." });
  }
};

/**
 * POST /api/admin/withdraw-tickets/:id/approve
 * Body (JSON or multipart): paymentWalletId, trxId, amount?, notes?
 * Files: slip (optional), evidence (required).
 * Creates GE (client -> payment wallet). Client balance unchanged (already deducted at submit).
 * Payment wallet balance is increased (matches GE: credit to payment wallet account).
 */
exports.approveAdminWithdrawTicket = async (req, res) => {
  let conn;
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const paymentWalletId =
      body.paymentWalletId != null && body.paymentWalletId !== ""
        ? Number(body.paymentWalletId)
        : null;
    const trxId = normalizeTrxId(body.trxId);
    const amount = body.amount != null ? parseDecimal(body.amount, null) : null;
    const notes = body.notes != null ? String(body.notes).trim() : null;

    if (!paymentWalletId) return res.status(400).json({ message: "Payment wallet is required." });
    if (!trxId) return res.status(400).json({ message: "Trx ID is required." });

    let slipPath = null;
    let evidencePath = null;
    if (req.files) {
      if (req.files.slip && req.files.slip[0]) {
        slipPath = getRelativeSlipPath(req.files.slip[0]);
      }
      if (req.files.evidence && req.files.evidence[0]) {
        evidencePath = getRelativeEvidencePath(req.files.evidence[0]);
      }
    }
    if (!evidencePath) {
      return res.status(400).json({ message: "Evidence image is required for approve." });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query(
      `SELECT wt.id, wt.client_id, wt.client_wallet_id, wt.amount,
              cw.wallet_company_id
       FROM withdraw_tickets wt
       JOIN client_wallets cw ON cw.id = wt.client_wallet_id
       WHERE wt.id = ? LIMIT 1 FOR UPDATE`,
      [id]
    );
    if (!existing.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Ticket not found." });
    }
    const ticket = existing[0];
    const [statusRows] = await conn.query(
      "SELECT status FROM withdraw_tickets WHERE id = ? LIMIT 1",
      [id]
    );
    if (statusRows[0].status !== "pending") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Ticket is not pending." });
    }

    const [dupTrx] = await conn.query(
      `SELECT id FROM withdraw_tickets
       WHERE status = 'approved' AND trx_id IS NOT NULL AND trx_id != '' AND trx_id = ?
       LIMIT 1`,
      [trxId]
    );
    if (dupTrx.length) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({
        message: "This Trx ID is already used on another approved withdraw.",
      });
    }

    const [pwRows] = await conn.query(
      `SELECT id, wallet_company_id, name, number, balance, min_withdraw, max_withdraw
       FROM payment_wallets
       WHERE id = ? AND available_for_withdraw = 1 LIMIT 1 FOR UPDATE`,
      [paymentWalletId]
    );
    if (!pwRows.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Invalid payment wallet." });
    }
    const pw = pwRows[0];
    if (Number(pw.wallet_company_id) !== Number(ticket.wallet_company_id)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        message: "Payment wallet does not belong to the ticket's company.",
      });
    }

    const finalAmount = amount != null ? amount : Number(ticket.amount);
    const minW = Number(pw.min_withdraw || 0);
    const maxW = Number(pw.max_withdraw || 0);
    if (finalAmount < minW) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        message: `Amount must be at least Rs. ${Math.floor(minW).toLocaleString()} for this payment wallet.`,
      });
    }
    if (maxW > 0 && finalAmount > maxW) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        message: `Amount must not exceed Rs. ${Math.floor(maxW).toLocaleString()} for this payment wallet.`,
      });
    }

    const currentWalletBalance = Number(pw.balance || 0);

    const [clientRows] = await conn.query(
      "SELECT u.id, u.username FROM users u WHERE u.id = ? LIMIT 1",
      [ticket.client_id]
    );
    if (!clientRows.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Client not found." });
    }
    const client = clientRows[0];

    const transactionNumber = await allocateGeneralEntryTransactionNumber(
      conn,
      GE_TXN_SERIES.WITHDRAW
    );

    await conn.query(
      `UPDATE withdraw_tickets
       SET status = 'approved', payment_wallet_id = ?, trx_id = ?, amount = ?, notes = ?,
           slip_path = ?, evidence_path = ?,
           ledger_transaction_number = ?, updated_at = NOW()
       WHERE id = ?`,
      [paymentWalletId, trxId, finalAmount, notes, slipPath, evidencePath, transactionNumber, id]
    );

    const fromAccountDisplay = `${(client.username || "").trim() || `#${client.id}`}`;
    const toAccountDisplay =
      `${(pw.name || "").trim()} (${(pw.number || "").trim()})`.trim() ||
      `Payment Wallet #${paymentWalletId}`;
    const narration = notes || "";
    const fromAccountId = await getOrCreateClientAccountId(
      conn,
      client.id,
      client.username
    );
    const toAccountId = await getOrCreatePaymentWalletAccountId(
      conn,
      paymentWalletId,
      pw.name,
      pw.number
    );
    await insertGeneralEntry(conn, {
      transactionNumber,
      fromAccount: fromAccountDisplay,
      fromAccountId,
      toAccount: toAccountDisplay,
      toAccountId,
      amount: finalAmount,
      narration,
    });

    const newWalletBalance = currentWalletBalance + Number(finalAmount);
    await conn.query("UPDATE payment_wallets SET balance = ? WHERE id = ?", [
      newWalletBalance,
      paymentWalletId,
    ]);

    await conn.commit();
    conn.release();

    const [rows] = await pool.query(
      `SELECT wt.id, wt.client_id, wt.created_by_user_id, wt.client_wallet_id, wt.payment_wallet_id,
              wt.amount, wt.status, wt.trx_id, wt.ledger_transaction_number, wt.reason, wt.slip_path, wt.evidence_path, wt.notes,
              wt.created_at, wt.updated_at,
              u.username AS username,
              creator.username AS created_by_username,
              wc.name AS wallet_company_name,
              cw.account_title, cw.account_number,
              CONCAT(pw.name, ' (', pw.number, ')') AS payment_wallet_name
       FROM withdraw_tickets wt
       LEFT JOIN users u ON u.id = wt.client_id
       LEFT JOIN users creator ON creator.id = wt.created_by_user_id
       LEFT JOIN client_wallets cw ON cw.id = wt.client_wallet_id
       LEFT JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
       LEFT JOIN payment_wallets pw ON pw.id = wt.payment_wallet_id
       WHERE wt.id = ? LIMIT 1`,
      [id]
    );
    return res.status(200).json({
      message: "Approved.",
      ticket: buildItem(rows[0]),
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
    }
    if (conn) conn.release();
    console.error("approveAdminWithdrawTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to approve." });
  }
};

/**
 * PATCH /api/admin/withdraw-tickets/:id/reject
 * Body (JSON or multipart): reason, notes?; optional file: evidence
 * Adds amount back to client balance, updates status.
 */
exports.rejectAdminWithdrawTicket = async (req, res) => {
  let conn;
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const reason = body.reason != null ? String(body.reason).trim() : null;
    const notes = body.notes != null ? String(body.notes).trim() : null;

    let evidencePath = null;
    if (req.file && req.file.filename) {
      evidencePath = getRelativeEvidencePath(req.file);
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT id, client_id, amount, status FROM withdraw_tickets WHERE id = ? LIMIT 1 FOR UPDATE",
      [id]
    );
    if (!existing.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Ticket not found." });
    }
    if (existing[0].status !== "pending") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Ticket is not pending." });
    }

    const amount = Number(existing[0].amount || 0);
    const clientId = existing[0].client_id;

    const [clientRows] = await conn.query(
      "SELECT user_id, balance FROM clients WHERE user_id = ? LIMIT 1 FOR UPDATE",
      [clientId]
    );
    if (clientRows.length) {
      const newBalance = Number(clientRows[0].balance || 0) + amount;
      await conn.query("UPDATE clients SET balance = ? WHERE user_id = ?", [
        newBalance,
        clientId,
      ]);
    }

    const updateParts = ["status = 'rejected'", "reason = ?", "notes = ?", "updated_at = NOW()"];
    const updateParams = [reason, notes];
    if (evidencePath != null) {
      updateParts.push("evidence_path = ?");
      updateParams.push(evidencePath);
    }
    updateParams.push(id);
    await conn.query(
      `UPDATE withdraw_tickets SET ${updateParts.join(", ")} WHERE id = ?`,
      updateParams
    );

    await conn.commit();
    conn.release();

    return res.status(200).json({ message: "Rejected.", ticketId: id });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
    }
    if (conn) conn.release();
    console.error("rejectAdminWithdrawTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to reject." });
  }
};

/**
 * PATCH /api/admin/withdraw-tickets/:id
 * Update notes only (for View form). Allowed for approved/rejected.
 */
exports.patchAdminWithdrawTicket = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const notes = body.notes != null ? String(body.notes).trim() : null;

    const [existing] = await pool.query(
      "SELECT id, status FROM withdraw_tickets WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existing.length) return res.status(404).json({ message: "Ticket not found." });
    const status = (existing[0].status || "").toLowerCase();
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({
        message: "Only approved or rejected tickets can be updated.",
      });
    }

    await pool.query(
      "UPDATE withdraw_tickets SET notes = ?, updated_at = NOW() WHERE id = ?",
      [notes, id]
    );
    return res.status(200).json({ message: "Updated.", ticketId: id });
  } catch (err) {
    console.error("patchAdminWithdrawTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to update." });
  }
};

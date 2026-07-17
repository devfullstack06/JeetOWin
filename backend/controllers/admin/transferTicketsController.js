const { pool } = require("../../config/database");
const {
  allocateGeneralEntryTransactionNumber,
  GE_TXN_SERIES,
} = require("../../utils/generalEntryTransactionNumber");
const { insertGeneralEntry } = require("../../utils/generalEntryPersistence");
const { getRelativeEvidencePath } = require("../../middleware/uploadTransferEvidence");

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

async function getOrCreateBrandCompanyAccountId(conn, bcId, displayName, bcTypeRaw) {
  const normalizedType = String(bcTypeRaw || "master").trim().toLowerCase();
  const accountType = normalizedType === "affiliate" ? "affiliate" : "master";

  // Prefer account already stored with resolved type.
  const [typedRows] = await conn.query(
    "SELECT id FROM accounts WHERE type = ? AND reference_id = ? LIMIT 1",
    [accountType, bcId]
  );
  if (typedRows?.length) return typedRows[0].id;

  // Legacy fallback: an older row may exist as type='brand_company'.
  const [legacyRows] = await conn.query(
    "SELECT id FROM accounts WHERE type = 'brand_company' AND reference_id = ? LIMIT 1",
    [bcId]
  );
  if (legacyRows?.length) {
    await conn.query("UPDATE accounts SET type = ?, name = ? WHERE id = ?", [
      accountType,
      (displayName || "").trim() || `Brand company #${bcId}`,
      legacyRows[0].id,
    ]);
    return legacyRows[0].id;
  }

  const name = (displayName || "").trim() || `Brand company #${bcId}`;
  const [ins] = await conn.query(
    "INSERT INTO accounts (name, type, reference_id) VALUES (?, ?, ?)",
    [name, accountType, bcId]
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

/** @admin80-Master style label for brand_company row. */
function masterDisplayLabelFromRow(bcUsername, bcType) {
  const u = bcUsername != null ? String(bcUsername).trim() : "";
  if (!u) return "";
  const raw = (bcType != null ? String(bcType) : "master").trim().toLowerCase();
  const cap = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Master";
  return `@${u}-${cap}`;
}

/**
 * In SELECT lists: bc username/type + account username (ticket link, else first matching client account).
 */
const SQL_TICKET_MASTER_AND_ACCOUNT_USERNAME = `
      bc.username AS bc_username,
      bc.type AS bc_type,
      COALESCE(
        ca.username,
        (SELECT ca2.username FROM client_accounts ca2
         WHERE ca2.client_id = tt.client_id
           AND ca2.brand_company_id = tt.brand_companies_id
           AND (ca2.status IS NULL OR ca2.status = 'active')
         ORDER BY ca2.id ASC
         LIMIT 1)
      ) AS client_account_username`;

function buildItem(r) {
  const dir = (r.direction || "").toString().toUpperCase();
  const processMinutes =
    dir === "OUT"
      ? r.out_process_minutes != null
        ? Number(r.out_process_minutes)
        : 15
      : r.in_process_minutes != null
        ? Number(r.in_process_minutes)
        : 15;
  return {
    id: r.id,
    clientId: r.client_id,
    clientAccountId:
      r.client_account_id != null ? Number(r.client_account_id) : null,
    brandId: r.brand_id,
    brandName: r.brand_name != null ? String(r.brand_name) : "",
    brandCompanyId: r.brand_companies_id,
    brandCompanyUsername: r.bc_username != null ? String(r.bc_username) : "",
    brandCompanyType: r.bc_type != null ? String(r.bc_type) : "",
    masterDisplayLabel: masterDisplayLabelFromRow(r.bc_username, r.bc_type),
    clientAccountUsername:
      r.client_account_username != null ? String(r.client_account_username) : "",
    direction: dir,
    amount: r.amount != null ? Number(r.amount) : 0,
    status: (r.status || "pending").toLowerCase(),
    ledgerTransactionNumber:
      r.ledger_transaction_number != null ? String(r.ledger_transaction_number) : null,
    reason: r.reason != null ? String(r.reason) : null,
    evidencePath: r.evidence_path != null ? String(r.evidence_path) : null,
    notes: r.notes != null ? String(r.notes) : null,
    createdByUserId:
      r.created_by_user_id != null ? Number(r.created_by_user_id) : null,
    createdByUsername:
      r.created_by_username != null ? String(r.created_by_username) : "",
    updatedByUserId:
      r.updated_by_user_id != null ? Number(r.updated_by_user_id) : null,
    updatedByUsername:
      r.updated_by_username != null ? String(r.updated_by_username) : "",
    username: r.username != null ? String(r.username) : "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    transferProcessMinutes: processMinutes,
  };
}

/**
 * GET /api/admin/transfer-tickets/brand-companies?brandId=
 * Returns active brand companies for a brand. Display as @{username}-{type}.
 */
exports.getAdminTransferBrandCompaniesForBrand = async (req, res) => {
  try {
    const brandId =
      req.query.brandId != null && Number.isFinite(Number(req.query.brandId))
        ? Number(req.query.brandId)
        : null;
    if (!brandId) {
      return res.status(200).json({ items: [] });
    }
    const [rows] = await pool.query(
      `SELECT bc.id, bc.username, bc.type, bc.brand_id, b.name AS brand_name
       FROM brand_companies bc
       INNER JOIN brands b ON b.id = bc.brand_id
       WHERE bc.brand_id = ? AND bc.is_active = 1
       ORDER BY bc.username ASC`,
      [brandId]
    );
    const items = (rows || []).map((x) => {
      const uname = x.username || "";
      const t = (x.type || "master").toString();
      const label = uname ? `@${uname}-${t.charAt(0).toUpperCase() + t.slice(1)}` : "";
      return {
        id: x.id,
        username: uname,
        type: t,
        brandId: x.brand_id,
        brandName: x.brand_name || "",
        displayLabel: label,
      };
    });
    return res.status(200).json({ items });
  } catch (err) {
    console.error("getAdminTransferBrandCompaniesForBrand error:", err);
    return res.status(500).json({ message: "Failed to load companies." });
  }
};

/**
 * GET /api/admin/transfer-tickets/client-accounts?clientId=
 * Returns client_accounts for a client (for Create Transfer Account picker).
 * Each item has brand_id, brand_company_id for auto-fill when selected.
 */
exports.getAdminTransferClientAccountsForClient = async (req, res) => {
  try {
    const clientId =
      req.query.clientId != null && Number.isFinite(Number(req.query.clientId))
        ? Number(req.query.clientId)
        : null;
    if (!clientId) {
      return res.status(200).json({ items: [] });
    }
    const [rows] = await pool.query(
      `SELECT ca.id, ca.username, ca.brand_id, ca.brand_company_id,
              b.name AS brand_name,
              bc.username AS bc_username, bc.type AS bc_type
       FROM client_accounts ca
       LEFT JOIN brands b ON b.id = ca.brand_id
       LEFT JOIN brand_companies bc ON bc.id = ca.brand_company_id AND bc.is_active = 1
       WHERE ca.client_id = ? AND (ca.status IS NULL OR ca.status = 'active')
       ORDER BY ca.username ASC`,
      [clientId]
    );
    const items = (rows || []).map((x) => {
      const bcUsername = x.bc_username || "";
      const bcType = (x.bc_type || "master").toString();
      const masterLabel = bcUsername
        ? `@${bcUsername}-${bcType.charAt(0).toUpperCase() + bcType.slice(1)}`
        : "";
      return {
        id: x.id,
        username: x.username || "",
        brandId: x.brand_id,
        brandCompanyId: x.brand_company_id,
        brandName: x.brand_name || "",
        masterLabel,
      };
    });
    return res.status(200).json({ items });
  } catch (err) {
    console.error("getAdminTransferClientAccountsForClient error:", err);
    return res.status(500).json({ message: "Failed to load client accounts." });
  }
};

/**
 * GET /api/admin/transfer-tickets
 */
exports.getAdminTransferTickets = async (req, res) => {
  try {
    const ticketId = req.query.ticket != null ? String(req.query.ticket).trim() : "";
    const username = String(req.query.username || "").trim();
    const brandId =
      req.query.brand != null && Number.isFinite(Number(req.query.brand))
        ? Number(req.query.brand)
        : null;
    const brandCompanyId =
      req.query.brandCompany != null && Number.isFinite(Number(req.query.brandCompany))
        ? Number(req.query.brandCompany)
        : null;
    const accountUsername = String(req.query.accountUsername || "").trim();
    const direction = String(req.query.direction || "")
      .trim()
      .toUpperCase();
    let status = String(req.query.status || "pending").trim().toLowerCase();
    if (!["pending", "approved", "rejected"].includes(status)) status = "pending";
    const dateFrom = String(req.query.dateFrom || req.query.startDate || "").trim();
    const dateTo = String(req.query.dateTo || req.query.endDate || "").trim();
    const amountMin =
      req.query.amountMin != null && req.query.amountMin !== ""
        ? parseDecimal(req.query.amountMin, NaN)
        : null;
    const amountMax =
      req.query.amountMax != null && req.query.amountMax !== ""
        ? parseDecimal(req.query.amountMax, NaN)
        : null;
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = normalizePositiveInt(req.query.pageSize, 25);

    const where = ["1=1"];
    const params = [];

    if (ticketId) {
      const tid = Number(ticketId);
      if (Number.isFinite(tid)) {
        where.push("tt.id = ?");
        params.push(tid);
      } else {
        where.push("tt.id = 0");
      }
    }
    if (username) {
      where.push("u.username LIKE ?");
      params.push(`%${username}%`);
    }
    if (brandId != null) {
      where.push("b.id = ?");
      params.push(brandId);
    }
    if (brandCompanyId != null) {
      where.push("tt.brand_companies_id = ?");
      params.push(brandCompanyId);
    }
    if (accountUsername) {
      where.push("bc.username LIKE ?");
      params.push(`%${accountUsername}%`);
    }
    if (direction === "IN" || direction === "OUT") {
      where.push("tt.direction = ?");
      params.push(direction);
    }
    where.push("tt.status = ?");
    params.push(status);
    if (dateFrom) {
      where.push("tt.created_at >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("tt.created_at <= ?");
      params.push(dateTo + " 23:59:59");
    }
    if (amountMin != null && Number.isFinite(amountMin)) {
      where.push("tt.amount >= ?");
      params.push(amountMin);
    }
    if (amountMax != null && Number.isFinite(amountMax)) {
      where.push("tt.amount <= ?");
      params.push(amountMax);
    }

    const whereSql = where.join(" AND ");
    const joinSql = `
      INNER JOIN users u ON u.id = tt.client_id
      LEFT JOIN users creator ON creator.id = tt.created_by_user_id
      LEFT JOIN client_accounts ca ON ca.id = tt.client_account_id AND ca.client_id = tt.client_id
      INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
      INNER JOIN brands b ON b.id = bc.brand_id
    `;
    const selectList = `
      tt.id, tt.client_id, tt.client_account_id, tt.brand_companies_id, tt.direction, tt.amount, tt.status,
      tt.ledger_transaction_number, tt.reason, tt.evidence_path, tt.notes,
      tt.created_by_user_id, tt.updated_by_user_id, tt.created_at, tt.updated_at,
      u.username AS username,
      COALESCE(creator.username, u.username) AS created_by_username,
      b.id AS brand_id, b.name AS brand_name,
      ${SQL_TICKET_MASTER_AND_ACCOUNT_USERNAME.trim()}
      ,
      COALESCE(b.in_process_minutes, 15) AS in_process_minutes,
      COALESCE(b.out_process_minutes, 15) AS out_process_minutes
    `;

    let total = 0;
    let rows = [];
    try {
      const [[c]] = await pool.query(
        `SELECT COUNT(*) AS total FROM transfer_tickets tt ${joinSql} WHERE ${whereSql}`,
        params
      );
      total = Number(c?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE" || e.code === "ER_BAD_FIELD_ERROR") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      throw e;
    }

    const offset = (page - 1) * pageSize;
    try {
      [rows] = await pool.query(
        `SELECT ${selectList}
         FROM transfer_tickets tt ${joinSql}
         WHERE ${whereSql}
         ORDER BY tt.created_at DESC, tt.id DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE" || e.code === "ER_BAD_FIELD_ERROR") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      throw e;
    }

    return res.status(200).json({
      items: (rows || []).map((r) => buildItem(r)),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("getAdminTransferTickets error:", err);
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
 * GET /api/admin/transfer-tickets/:id
 */
exports.getAdminTransferTicketById = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const [rows] = await pool.query(
      `SELECT tt.id, tt.client_id, tt.client_account_id, tt.brand_companies_id, tt.direction, tt.amount, tt.status,
              tt.ledger_transaction_number, tt.reason, tt.evidence_path, tt.notes,
              tt.created_by_user_id, tt.updated_by_user_id, tt.created_at, tt.updated_at,
              u.username AS username,
              COALESCE(creator.username, u.username) AS created_by_username,
              updater.username AS updated_by_username,
              b.id AS brand_id, b.name AS brand_name,
              ${SQL_TICKET_MASTER_AND_ACCOUNT_USERNAME.trim()}
              ,
              COALESCE(b.in_process_minutes, 15) AS in_process_minutes,
              COALESCE(b.out_process_minutes, 15) AS out_process_minutes
       FROM transfer_tickets tt
       INNER JOIN users u ON u.id = tt.client_id
       LEFT JOIN users creator ON creator.id = tt.created_by_user_id
       LEFT JOIN users updater ON updater.id = tt.updated_by_user_id
       LEFT JOIN client_accounts ca ON ca.id = tt.client_account_id AND ca.client_id = tt.client_id
       INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
       INNER JOIN brands b ON b.id = bc.brand_id
       WHERE tt.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Ticket not found." });

    const r = rows[0];
    const item = buildItem(r);

    const [clientRows] = await pool.query(
      "SELECT balance FROM clients WHERE user_id = ? LIMIT 1",
      [r.client_id]
    );
    item.clientBalance = clientRows.length ? Number(clientRows[0].balance || 0) : 0;

    const [bcRows] = await pool.query(
      `SELECT bc.id, bc.username, bc.brand_id, b.name AS brand_name
       FROM brand_companies bc
       INNER JOIN brands b ON b.id = bc.brand_id
       WHERE bc.brand_id = ? AND bc.is_active = 1
       ORDER BY bc.username ASC`,
      [r.brand_id]
    );
    item.brandCompanies = (bcRows || []).map((x) => ({
      id: x.id,
      username: x.username || "",
      brandId: x.brand_id,
      brandName: x.brand_name || "",
    }));

    const [brandRows] = await pool.query(
      "SELECT id, name FROM brands WHERE is_active = 1 ORDER BY name ASC"
    );
    item.brands = (brandRows || []).map((b) => ({
      id: b.id,
      name: b.name || "",
    }));

    return res.status(200).json(item);
  } catch (err) {
    console.error("getAdminTransferTicketById error:", err);
    return res.status(500).json({ message: "Failed to load ticket." });
  }
};

/**
 * POST /api/admin/transfer-tickets
 * Body: clientId, clientAccountId, direction (IN|OUT), amount, notes?
 * Account is required; brand/master are resolved from client_accounts.
 */
exports.createAdminTransferTicket = async (req, res) => {
  let conn;
  try {
    const body = req.body || {};
    const clientIdParam =
      body.clientId != null && Number.isFinite(Number(body.clientId))
        ? Number(body.clientId)
        : null;
    const clientAccountIdParam =
      body.clientAccountId != null && Number.isFinite(Number(body.clientAccountId))
        ? Number(body.clientAccountId)
        : null;
    const direction = String(body.direction || "")
      .trim()
      .toUpperCase();
    const amount = parseDecimal(body.amount, 0);
    const notes = body.notes != null ? String(body.notes).trim() : null;

    if (!clientIdParam) return res.status(400).json({ message: "Client is required." });
    if (!clientAccountIdParam) {
      return res.status(400).json({ message: "Account is required." });
    }
    if (!["IN", "OUT"].includes(direction)) {
      return res.status(400).json({ message: "Direction must be IN or OUT." });
    }
    if (amount <= 0) return res.status(400).json({ message: "Valid amount is required." });

    const [userRows] = await pool.query(
      "SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND r.name = 'client' LIMIT 1",
      [clientIdParam]
    );
    if (!userRows.length)
      return res.status(400).json({ message: "Invalid or non-client user." });
    const clientId = userRows[0].id;

    let resolvedBrandCompanyId = null;
    let resolvedClientAccountId = null;

    const [caRows] = await pool.query(
      `SELECT ca.id, ca.brand_id, ca.brand_company_id FROM client_accounts ca
       WHERE ca.id = ? AND ca.client_id = ? AND (ca.status IS NULL OR ca.status = 'active') LIMIT 1`,
      [clientAccountIdParam, clientId]
    );
    if (!caRows.length) {
      return res.status(400).json({ message: "Invalid or inaccessible client account." });
    }
    const ca = caRows[0];
    if (!ca.brand_company_id) {
      return res.status(400).json({ message: "Client account has no linked brand company." });
    }
    resolvedBrandCompanyId = Number(ca.brand_company_id);
    resolvedClientAccountId = Number(ca.id);

    const [bcRows] = await pool.query(
      `SELECT bc.id, bc.brand_id FROM brand_companies bc
       WHERE bc.id = ? AND bc.is_active = 1 LIMIT 1`,
      [resolvedBrandCompanyId]
    );
    if (!bcRows.length) {
      return res.status(400).json({ message: "Brand company not found or inactive." });
    }

    /**
     * Client history shows Account from client_account_id. Admin "Brand + Master" create
     * used to leave it NULL. If exactly one active client_account matches this client +
     * brand company, link it so the client app can show the username.
     */
    if (resolvedClientAccountId == null) {
      const [singleMatch] = await pool.query(
        `SELECT id FROM client_accounts
         WHERE client_id = ? AND brand_company_id = ?
           AND (status IS NULL OR status = 'active')
         ORDER BY id ASC
         LIMIT 2`,
        [clientId, resolvedBrandCompanyId]
      );
      if (singleMatch.length === 1) {
        resolvedClientAccountId = Number(singleMatch[0].id);
      }
    }

    const adminCreatorId = req.authUser?.id != null ? Number(req.authUser.id) : NaN;
    if (!Number.isFinite(adminCreatorId) || adminCreatorId <= 0) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    if (direction === "IN") {
      const [clientRows] = await conn.query(
        "SELECT user_id, balance FROM clients WHERE user_id = ? LIMIT 1 FOR UPDATE",
        [clientId]
      );
      if (!clientRows.length) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Client profile not found." });
      }
      const currentBalance = Number(clientRows[0].balance || 0);
      if (currentBalance < amount) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Insufficient balance." });
      }
      await conn.query("UPDATE clients SET balance = ? WHERE user_id = ?", [
        currentBalance - amount,
        clientId,
      ]);
    }

    const [insHeader] = await conn.query(
      `INSERT INTO transfer_tickets
        (client_id, client_account_id, brand_companies_id, direction, amount, status, notes, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())`,
      [clientId, resolvedClientAccountId, resolvedBrandCompanyId, direction, amount, notes, adminCreatorId]
    );
    const newId = insHeader.insertId;

    await conn.commit();
    conn.release();

    const [out] = await pool.query(
      `SELECT tt.id, tt.client_id, tt.client_account_id, tt.brand_companies_id, tt.direction, tt.amount, tt.status,
              tt.ledger_transaction_number, tt.reason, tt.evidence_path, tt.notes,
              tt.created_by_user_id, tt.updated_by_user_id, tt.created_at, tt.updated_at,
              u.username AS username,
              COALESCE(creator.username, u.username) AS created_by_username,
              b.id AS brand_id, b.name AS brand_name,
              ${SQL_TICKET_MASTER_AND_ACCOUNT_USERNAME.trim()}
              ,
              COALESCE(b.in_process_minutes, 15) AS in_process_minutes,
              COALESCE(b.out_process_minutes, 15) AS out_process_minutes
       FROM transfer_tickets tt
       INNER JOIN users u ON u.id = tt.client_id
       LEFT JOIN users creator ON creator.id = tt.created_by_user_id
       LEFT JOIN client_accounts ca ON ca.id = tt.client_account_id AND ca.client_id = tt.client_id
       INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
       INNER JOIN brands b ON b.id = bc.brand_id
       WHERE tt.id = ? LIMIT 1`,
      [newId]
    );
    return res.status(201).json(buildItem(out[0]));
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
      try {
        conn.release();
      } catch (_) {}
    }
    console.error("createAdminTransferTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to create ticket." });
  }
};

/**
 * POST /api/admin/transfer-tickets/:id/approve
 * Multipart: brandId, brandCompanyId, clientAccountId, direction, amount?, notes?, evidence (required)
 */
exports.approveAdminTransferTicket = async (req, res) => {
  let conn;
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const brandId =
      body.brandId != null && Number.isFinite(Number(body.brandId))
        ? Number(body.brandId)
        : null;
    const brandCompanyId =
      body.brandCompanyId != null && Number.isFinite(Number(body.brandCompanyId))
        ? Number(body.brandCompanyId)
        : null;
    const clientAccountIdParam =
      body.clientAccountId != null && Number.isFinite(Number(body.clientAccountId))
        ? Number(body.clientAccountId)
        : null;
    const directionParam = String(body.direction || "")
      .trim()
      .toUpperCase();
    const amountOverride = body.amount != null ? parseDecimal(body.amount, null) : null;
    const notes = body.notes != null ? String(body.notes).trim() : null;

    let evidencePath = null;
    if (req.file && req.file.filename) {
      evidencePath = getRelativeEvidencePath(req.file);
    }
    if (!evidencePath) {
      return res.status(400).json({ message: "Evidence image is required for approve." });
    }
    if (!brandId || !brandCompanyId) {
      return res.status(400).json({ message: "Brand and brand company are required." });
    }
    if (!clientAccountIdParam) {
      return res.status(400).json({ message: "Account is required." });
    }
    if (!["IN", "OUT"].includes(directionParam)) {
      return res.status(400).json({ message: "Direction must be IN or OUT." });
    }
    if (amountOverride != null && (!Number.isFinite(amountOverride) || amountOverride <= 0)) {
      return res.status(400).json({ message: "Amount must be a positive number." });
    }

    const adminId = req.authUser?.id != null ? Number(req.authUser.id) : NaN;
    if (!Number.isFinite(adminId) || adminId <= 0) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [bcCheck] = await conn.query(
      `SELECT bc.id, bc.username, bc.type AS bc_type, bc.brand_id, b.name AS brand_name
       FROM brand_companies bc
       INNER JOIN brands b ON b.id = bc.brand_id
       WHERE bc.id = ? AND bc.brand_id = ? AND bc.is_active = 1 LIMIT 1`,
      [brandCompanyId, brandId]
    );
    if (!bcCheck.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Invalid brand company for selected brand." });
    }
    const bcRow = bcCheck[0];

    const [existing] = await conn.query(
      `SELECT tt.id, tt.client_id, tt.client_account_id, tt.brand_companies_id, tt.direction, tt.amount, tt.status
       FROM transfer_tickets tt WHERE tt.id = ? LIMIT 1 FOR UPDATE`,
      [id]
    );
    if (!existing.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Ticket not found." });
    }
    const t = existing[0];
    if ((t.status || "").toLowerCase() !== "pending") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Ticket is not pending." });
    }

    const [caRows] = await conn.query(
      `SELECT id, client_id, brand_company_id
       FROM client_accounts
       WHERE id = ? AND client_id = ? AND (status IS NULL OR status = 'active')
       LIMIT 1`,
      [clientAccountIdParam, t.client_id]
    );
    if (!caRows.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Invalid or inaccessible client account." });
    }
    if (Number(caRows[0].brand_company_id || 0) !== Number(brandCompanyId)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Selected Account does not belong to selected Master." });
    }

    const heldAmount = Number(t.amount || 0);
    const finalAmount = amountOverride != null ? amountOverride : heldAmount;
    if (finalAmount <= 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Invalid amount." });
    }

    const dir = directionParam;

    const [clientUserRows] = await conn.query(
      "SELECT u.id, u.username FROM users u WHERE u.id = ? LIMIT 1",
      [t.client_id]
    );
    if (!clientUserRows.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Client not found." });
    }
    const clientUser = clientUserRows[0];

    const bcDisplay =
      `${(bcRow.brand_name || "").trim()} / @${(bcRow.username || "").trim()}`.trim() ||
      `Brand company #${brandCompanyId}`;
    const clientDisplay = `${(clientUser.username || "").trim() || `#${clientUser.id}`}`;

    /** @type {string} */
    let transactionNumber;

    if (dir === "IN") {
      transactionNumber = await allocateGeneralEntryTransactionNumber(
        conn,
        GE_TXN_SERIES.TRANSFER_IN
      );
      const delta = finalAmount - heldAmount;
      const [cRows] = await conn.query(
        "SELECT balance FROM clients WHERE user_id = ? LIMIT 1 FOR UPDATE",
        [t.client_id]
      );
      if (!cRows.length) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Client profile not found." });
      }
      const bal = Number(cRows[0].balance || 0);
      if (delta > 0 && bal < delta) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Insufficient balance for adjusted amount." });
      }
      let newBal = bal;
      if (delta > 0) newBal -= delta;
      if (delta < 0) newBal += -delta;
      await conn.query("UPDATE clients SET balance = ? WHERE user_id = ?", [newBal, t.client_id]);

      const [bcBalRows] = await conn.query(
        "SELECT balance FROM brand_companies WHERE id = ? LIMIT 1 FOR UPDATE",
        [brandCompanyId]
      );
      const bcBal = bcBalRows.length ? Number(bcBalRows[0].balance || 0) : 0;
      await conn.query("UPDATE brand_companies SET balance = ? WHERE id = ?", [
        bcBal + finalAmount,
        brandCompanyId,
      ]);

      const fromAccountId = await getOrCreateClientAccountId(
        conn,
        clientUser.id,
        clientUser.username
      );
      const toAccountId = await getOrCreateBrandCompanyAccountId(
        conn,
        brandCompanyId,
        bcDisplay,
        bcRow.bc_type
      );
      await insertGeneralEntry(conn, {
        transactionNumber,
        fromAccount: clientDisplay,
        fromAccountId,
        toAccount: bcDisplay,
        toAccountId,
        amount: finalAmount,
        // narration: notes || `Transfer IN #${id}`,
        narration: notes || "",
      });
    } else if (dir === "OUT") {
      transactionNumber = await allocateGeneralEntryTransactionNumber(
        conn,
        GE_TXN_SERIES.TRANSFER_OUT
      );
      const [bcBalRows] = await conn.query(
        "SELECT balance FROM brand_companies WHERE id = ? LIMIT 1 FOR UPDATE",
        [brandCompanyId]
      );
      const bcBal = bcBalRows.length ? Number(bcBalRows[0].balance || 0) : 0;
      await conn.query("UPDATE brand_companies SET balance = ? WHERE id = ?", [
        bcBal - finalAmount,
        brandCompanyId,
      ]);

      const [cRows] = await conn.query(
        "SELECT balance FROM clients WHERE user_id = ? LIMIT 1 FOR UPDATE",
        [t.client_id]
      );
      if (!cRows.length) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Client profile not found." });
      }
      const bal = Number(cRows[0].balance || 0);
      await conn.query("UPDATE clients SET balance = ? WHERE user_id = ?", [
        bal + finalAmount,
        t.client_id,
      ]);

      const fromAccountId = await getOrCreateBrandCompanyAccountId(
        conn,
        brandCompanyId,
        bcDisplay,
        bcRow.bc_type
      );
      const toAccountId = await getOrCreateClientAccountId(
        conn,
        clientUser.id,
        clientUser.username
      );
      await insertGeneralEntry(conn, {
        transactionNumber,
        fromAccount: bcDisplay,
        fromAccountId,
        toAccount: clientDisplay,
        toAccountId,
        amount: finalAmount,
        narration: notes || `Transfer OUT #${id}`,
      });
    } else {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Invalid ticket direction." });
    }

    await conn.query(
      `UPDATE transfer_tickets SET
        status = 'approved',
        client_account_id = ?,
        brand_companies_id = ?,
        direction = ?,
        amount = ?,
        notes = ?,
        evidence_path = ?,
        ledger_transaction_number = ?,
        updated_by_user_id = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [clientAccountIdParam, brandCompanyId, dir, finalAmount, notes, evidencePath, transactionNumber, adminId, id]
    );

    await conn.commit();
    conn.release();

    try {
      const { recalculateReferralAccrualsAfterTransferApproval } = require("../../services/referralAccrualService");
      await recalculateReferralAccrualsAfterTransferApproval(t.client_id, new Date());
    } catch (referralErr) {
      console.error("[referral] accrual after transfer approve:", referralErr);
    }

    try {
      const { recalculateAffiliateCommissionAfterTransferApproval } = require("../../services/affiliateCommissionService");
      await recalculateAffiliateCommissionAfterTransferApproval(t.client_id, new Date());
    } catch (affiliateErr) {
      console.error("[affiliate] commission after transfer approve:", affiliateErr);
    }

    const [rows] = await pool.query(
      `SELECT tt.id, tt.client_id, tt.client_account_id, tt.brand_companies_id, tt.direction, tt.amount, tt.status,
              tt.ledger_transaction_number, tt.reason, tt.evidence_path, tt.notes,
              tt.created_by_user_id, tt.updated_by_user_id, tt.created_at, tt.updated_at,
              u.username AS username,
              COALESCE(creator.username, u.username) AS created_by_username,
              b.id AS brand_id, b.name AS brand_name,
              ${SQL_TICKET_MASTER_AND_ACCOUNT_USERNAME.trim()}
              ,
              COALESCE(b.in_process_minutes, 15) AS in_process_minutes,
              COALESCE(b.out_process_minutes, 15) AS out_process_minutes
       FROM transfer_tickets tt
       INNER JOIN users u ON u.id = tt.client_id
       LEFT JOIN users creator ON creator.id = tt.created_by_user_id
       LEFT JOIN client_accounts ca ON ca.id = tt.client_account_id AND ca.client_id = tt.client_id
       INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
       INNER JOIN brands b ON b.id = bc.brand_id
       WHERE tt.id = ? LIMIT 1`,
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
      try {
        conn.release();
      } catch (_) {}
    }
    console.error("approveAdminTransferTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to approve." });
  }
};

/**
 * PATCH /api/admin/transfer-tickets/:id/reject
 */
exports.rejectAdminTransferTicket = async (req, res) => {
  let conn;
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const reason = body.reason != null ? String(body.reason).trim() : "";
    const notes = body.notes != null ? String(body.notes).trim() : null;

    if (!reason) {
      return res.status(400).json({ message: "Reason is required for reject." });
    }

    let evidencePath = null;
    if (req.file && req.file.filename) {
      evidencePath = getRelativeEvidencePath(req.file);
    }

    const adminId = req.authUser?.id != null ? Number(req.authUser.id) : NaN;
    if (!Number.isFinite(adminId) || adminId <= 0) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query(
      `SELECT id, client_id, amount, direction, status FROM transfer_tickets WHERE id = ? LIMIT 1 FOR UPDATE`,
      [id]
    );
    if (!existing.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Ticket not found." });
    }
    if ((existing[0].status || "").toLowerCase() !== "pending") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Ticket is not pending." });
    }

    const amount = Number(existing[0].amount || 0);
    const clientId = existing[0].client_id;
    const dir = String(existing[0].direction || "").toUpperCase();

    if (dir === "IN") {
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
    }

    const setParts = ["status = 'rejected'", "reason = ?", "notes = ?"];
    const updateParams = [reason, notes];
    if (evidencePath != null) {
      setParts.push("evidence_path = ?");
      updateParams.push(evidencePath);
    }
    setParts.push("updated_by_user_id = ?", "updated_at = NOW()");
    updateParams.push(adminId);
    updateParams.push(id);
    await conn.query(
      `UPDATE transfer_tickets SET ${setParts.join(", ")} WHERE id = ?`,
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
      try {
        conn.release();
      } catch (_) {}
    }
    console.error("rejectAdminTransferTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to reject." });
  }
};

/**
 * PATCH /api/admin/transfer-tickets/:id — notes only (approved/rejected)
 */
exports.patchAdminTransferTicket = async (req, res) => {
  try {
    const id = normalizePositiveInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "Invalid id." });

    const body = req.body || {};
    const notes = body.notes != null ? String(body.notes).trim() : null;
    const adminId = req.authUser?.id != null ? Number(req.authUser.id) : null;

    const [existing] = await pool.query(
      "SELECT id, status FROM transfer_tickets WHERE id = ? LIMIT 1",
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
      "UPDATE transfer_tickets SET notes = ?, updated_by_user_id = ?, updated_at = NOW() WHERE id = ?",
      [notes, adminId, id]
    );
    return res.status(200).json({ message: "Updated.", ticketId: id });
  } catch (err) {
    console.error("patchAdminTransferTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to update." });
  }
};

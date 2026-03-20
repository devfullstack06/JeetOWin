const { pool } = require("../../config/database");
const { ADMIN_LEDGER_ACCOUNT_ID } = require("../../constants/ledgerAccounts");
const {
  resolveGeneralEntryLedgerColumn,
  resolveGeHasAccountIdColumns,
} = require("../../utils/generalEntryPersistence");

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parseDecimal(value, defaultVal = null) {
  if (value === undefined || value === null || value === "") return defaultVal;
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultVal;
  return n;
}

const ACCOUNT_TYPES = new Set(["admin", "payment_wallet", "client"]);

function normalizeAccountTypeFilter(value) {
  const s = String(value || "").trim().toLowerCase();
  return ACCOUNT_TYPES.has(s) ? s : null;
}

const GE_FROM_WITH_ACCOUNTS =
  "FROM general_entries ge LEFT JOIN accounts fa ON fa.id = ge.from_account_id LEFT JOIN accounts ta ON ta.id = ge.to_account_id";
const GE_FROM_SIMPLE = "FROM general_entries ge";

/**
 * GET /api/admin/general-entries/account-types
 * Distinct account types from accounts table (for filter dropdowns).
 */
exports.getAdminGeneralEntryAccountTypes = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT type FROM accounts WHERE type IS NOT NULL ORDER BY type ASC"
    );
    const types = (rows || []).map((r) => r.type).filter(Boolean);
    return res.status(200).json({ types });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_FIELD_ERROR") {
      return res.status(200).json({ types: [] });
    }
    console.error("getAdminGeneralEntryAccountTypes error:", err);
    return res.status(500).json({ message: "Failed to load account types.", types: [] });
  }
};

/**
 * GET /api/admin/general-entries
 * List with filters: from, to, fromType, toType, fromAccountId, toAccountId, minAmount, maxAmount, dateFrom, dateTo, transactionNumber (alias trxId). Pagination.
 */
exports.getAdminGeneralEntries = async (req, res) => {
  try {
    const ledgerCol = await resolveGeneralEntryLedgerColumn();
    const useAccountJoins = await resolveGeHasAccountIdColumns();
    const geFrom = useAccountJoins ? GE_FROM_WITH_ACCOUNTS : GE_FROM_SIMPLE;
    const typeSelect = useAccountJoins
      ? "fa.type AS fromAccountType, ta.type AS toAccountType"
      : "NULL AS fromAccountType, NULL AS toAccountType";

    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const fromType = useAccountJoins ? normalizeAccountTypeFilter(req.query.fromType) : null;
    const toType = useAccountJoins ? normalizeAccountTypeFilter(req.query.toType) : null;
    const fromAccountId =
      useAccountJoins && req.query.fromAccountId ? Number(req.query.fromAccountId) : null;
    const toAccountId = useAccountJoins && req.query.toAccountId ? Number(req.query.toAccountId) : null;
    const minAmount = parseDecimal(req.query.minAmount);
    const maxAmount = parseDecimal(req.query.maxAmount);
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();
    const transactionNumberFilter = String(
      req.query.transactionNumber || req.query.trxId || ""
    ).trim();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = Math.min(normalizePositiveInt(req.query.pageSize, 25), 100);

    const where = [];
    const params = [];

    if (from) {
      where.push("ge.from_account LIKE ?");
      params.push(`%${from}%`);
    }
    if (to) {
      where.push("ge.to_account LIKE ?");
      params.push(`%${to}%`);
    }
    if (fromType) {
      where.push("fa.type = ?");
      params.push(fromType);
    }
    if (toType) {
      where.push("ta.type = ?");
      params.push(toType);
    }
    if (fromAccountId != null && Number.isFinite(fromAccountId)) {
      where.push("ge.from_account_id = ?");
      params.push(fromAccountId);
    }
    if (toAccountId != null && Number.isFinite(toAccountId)) {
      where.push("ge.to_account_id = ?");
      params.push(toAccountId);
    }
    if (minAmount != null) {
      where.push("ge.amount >= ?");
      params.push(minAmount);
    }
    if (maxAmount != null) {
      where.push("ge.amount <= ?");
      params.push(maxAmount);
    }
    if (dateFrom) {
      where.push("DATE(ge.created_at) >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("DATE(ge.created_at) <= ?");
      params.push(dateTo);
    }
    if (transactionNumberFilter) {
      where.push(`ge.${ledgerCol} LIKE ?`);
      params.push(`%${transactionNumberFilter}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let total = 0;
    try {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total ${geFrom} ${whereSql}`,
        params
      );
      total = Number(countRows?.[0]?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      if (e.code === "ER_BAD_FIELD_ERROR") {
        console.error("getAdminGeneralEntries COUNT:", e.sqlMessage || e.message);
        return res.status(500).json({
          message: e.sqlMessage || "General entries query failed (check DB migrations).",
        });
      }
      throw e;
    }

    const offset = (page - 1) * pageSize;
    let rows = [];
    try {
      const [dataRows] = await pool.query(
        `SELECT ge.id, ge.${ledgerCol} AS transactionNumber, ge.from_account AS fromAccount, ge.to_account AS toAccount,
                ${typeSelect},
                ge.amount, ge.narration, ge.created_at AS createdAt
         ${geFrom}
         ${whereSql}
         ORDER BY ge.created_at DESC, ge.id DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      rows = dataRows;
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      if (e.code === "ER_BAD_FIELD_ERROR") {
        console.error("getAdminGeneralEntries SELECT:", e.sqlMessage || e.message);
        return res.status(500).json({
          message: e.sqlMessage || "General entries query failed (check DB migrations).",
        });
      }
      throw e;
    }

    const items = rows.map((r) => ({
      id: r.id,
      transactionNumber: r.transactionNumber != null ? String(r.transactionNumber) : "",
      fromAccount: r.fromAccount || "",
      toAccount: r.toAccount || "",
      fromAccountType: r.fromAccountType != null ? String(r.fromAccountType) : null,
      toAccountType: r.toAccountType != null ? String(r.toAccountType) : null,
      amount: Number(r.amount) || 0,
      narration: r.narration || "",
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("getAdminGeneralEntries error:", err);
    return res.status(500).json({
      message: err.sqlMessage || err.message || "Failed to load general entries.",
    });
  }
};

/**
 * GET /api/admin/general-entries/:id
 * Get single entry by id.
 */
exports.getAdminGeneralEntryById = async (req, res) => {
  try {
    const ledgerCol = await resolveGeneralEntryLedgerColumn();
    const useAccountJoins = await resolveGeHasAccountIdColumns();
    const typeSelect = useAccountJoins
      ? "fa.type AS fromAccountType, ta.type AS toAccountType"
      : "NULL AS fromAccountType, NULL AS toAccountType";
    const geFrom = useAccountJoins ? GE_FROM_WITH_ACCOUNTS : GE_FROM_SIMPLE;

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid id." });
    }
    const [rows] = await pool.query(
      `SELECT ge.id, ge.${ledgerCol} AS transactionNumber, ge.from_account AS fromAccount, ge.to_account AS toAccount,
              ${typeSelect},
              ge.amount, ge.narration, ge.created_at AS createdAt, ge.updated_at AS updatedAt
       ${geFrom}
       WHERE ge.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Entry not found." });
    }
    const r = rows[0];
    return res.status(200).json({
      id: r.id,
      transactionNumber: r.transactionNumber != null ? String(r.transactionNumber) : "",
      fromAccount: r.fromAccount || "",
      toAccount: r.toAccount || "",
      fromAccountType: r.fromAccountType != null ? String(r.fromAccountType) : null,
      toAccountType: r.toAccountType != null ? String(r.toAccountType) : null,
      amount: Number(r.amount) || 0,
      narration: r.narration || "",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(404).json({ message: "Entry not found." });
    }
    console.error("getAdminGeneralEntryById error:", err);
    return res.status(500).json({
      message: err.sqlMessage || err.message || "Failed to load entry.",
    });
  }
};

/**
 * PATCH /api/admin/general-entries/:id
 * Update narration only.
 */
exports.updateAdminGeneralEntryNarration = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid id." });
    }
    const narration = req.body && typeof req.body.narration === "string" ? req.body.narration : null;

    const [result] = await pool.query(
      "UPDATE general_entries SET narration = ?, updated_at = NOW() WHERE id = ?",
      [narration || "", id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Entry not found." });
    }
    return res.status(200).json({ message: "Updated.", id });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(404).json({ message: "Entry not found." });
    }
    console.error("updateAdminGeneralEntryNarration error:", err);
    return res.status(500).json({ message: "Failed to update." });
  }
};

const ADMIN_ACCOUNT_ID = ADMIN_LEDGER_ACCOUNT_ID;

/**
 * GET /api/admin/admin-account-balance
 * Returns the Admin Account balance (stored in admin_account_balance table).
 * Falls back to calculating from general_entries if table does not exist.
 */
exports.getAdminAccountBalance = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT balance FROM admin_account_balance WHERE id = 1 LIMIT 1"
    );
    if (rows?.length) {
      return res.status(200).json({ balance: Number(rows[0].balance) || 0 });
    }
    const [calcRows] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN to_account = 'Admin Account' THEN amount ELSE 0 END), 0) -
              COALESCE(SUM(CASE WHEN from_account = 'Admin Account' THEN amount ELSE 0 END), 0) AS balance
       FROM general_entries`
    );
    const balance = Number(calcRows?.[0]?.balance ?? 0);
    return res.status(200).json({ balance });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      try {
        try {
          const [rows] = await pool.query(
            `SELECT COALESCE(SUM(CASE WHEN to_account_id = ? THEN amount ELSE 0 END), 0) -
                    COALESCE(SUM(CASE WHEN from_account_id = ? THEN amount ELSE 0 END), 0) AS balance
             FROM general_entries`,
            [ADMIN_ACCOUNT_ID, ADMIN_ACCOUNT_ID]
          );
          if (rows?.length) return res.status(200).json({ balance: Number(rows[0].balance ?? 0) });
        } catch (_) { /* columns may not exist */ }
        const [rows2] = await pool.query(
          `SELECT COALESCE(SUM(CASE WHEN to_account = 'Admin Account' THEN amount ELSE 0 END), 0) -
                  COALESCE(SUM(CASE WHEN from_account = 'Admin Account' THEN amount ELSE 0 END), 0) AS balance
           FROM general_entries`
        );
        return res.status(200).json({ balance: Number(rows2?.[0]?.balance ?? 0) });
      } catch (e2) {
        return res.status(200).json({ balance: 0 });
      }
    }
    console.error("getAdminAccountBalance error:", err);
    return res.status(500).json({ message: "Failed to load balance.", balance: 0 });
  }
};

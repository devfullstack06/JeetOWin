const { pool } = require("../../config/database");

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

/**
 * GET /api/admin/general-entries
 * List with filters: from, to, fromAccountId, toAccountId, minAmount, maxAmount, dateFrom, dateTo, trxId. Pagination.
 */
exports.getAdminGeneralEntries = async (req, res) => {
  try {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const fromAccountId = req.query.fromAccountId ? Number(req.query.fromAccountId) : null;
    const toAccountId = req.query.toAccountId ? Number(req.query.toAccountId) : null;
    const minAmount = parseDecimal(req.query.minAmount);
    const maxAmount = parseDecimal(req.query.maxAmount);
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();
    const trxId = String(req.query.trxId || "").trim();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = Math.min(normalizePositiveInt(req.query.pageSize, 25), 100);

    const where = [];
    const params = [];

    if (from) {
      where.push("from_account LIKE ?");
      params.push(`%${from}%`);
    }
    if (to) {
      where.push("to_account LIKE ?");
      params.push(`%${to}%`);
    }
    if (fromAccountId != null && Number.isFinite(fromAccountId)) {
      where.push("from_account_id = ?");
      params.push(fromAccountId);
    }
    if (toAccountId != null && Number.isFinite(toAccountId)) {
      where.push("to_account_id = ?");
      params.push(toAccountId);
    }
    if (minAmount != null) {
      where.push("amount >= ?");
      params.push(minAmount);
    }
    if (maxAmount != null) {
      where.push("amount <= ?");
      params.push(maxAmount);
    }
    if (dateFrom) {
      where.push("DATE(created_at) >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("DATE(created_at) <= ?");
      params.push(dateTo);
    }
    if (trxId) {
      where.push("trx_id LIKE ?");
      params.push(`%${trxId}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let total = 0;
    try {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM general_entries ${whereSql}`,
        params
      );
      total = Number(countRows?.[0]?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      throw e;
    }

    const offset = (page - 1) * pageSize;
    let rows = [];
    try {
      const [dataRows] = await pool.query(
        `SELECT id, trx_id AS trxId, from_account AS fromAccount, to_account AS toAccount,
                amount, narration, created_at AS createdAt
         FROM general_entries
         ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      rows = dataRows;
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({ items: [], total: 0, page: 1, pageSize });
      }
      throw e;
    }

    const items = rows.map((r) => ({
      id: r.id,
      trxId: r.trxId || "",
      fromAccount: r.fromAccount || "",
      toAccount: r.toAccount || "",
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
    return res.status(500).json({ message: "Failed to load general entries." });
  }
};

/**
 * GET /api/admin/general-entries/:id
 * Get single entry by id.
 */
exports.getAdminGeneralEntryById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid id." });
    }
    const [rows] = await pool.query(
      `SELECT id, trx_id AS trxId, from_account AS fromAccount, to_account AS toAccount,
              amount, narration, created_at AS createdAt, updated_at AS updatedAt
       FROM general_entries WHERE id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Entry not found." });
    }
    const r = rows[0];
    return res.status(200).json({
      id: r.id,
      trxId: r.trxId || "",
      fromAccount: r.fromAccount || "",
      toAccount: r.toAccount || "",
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
    return res.status(500).json({ message: "Failed to load entry." });
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

const ADMIN_ACCOUNT_ID = 1;

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

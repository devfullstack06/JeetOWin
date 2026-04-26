const { pool } = require("../../config/database");
const {
  resolveGeneralEntryLedgerColumn,
  resolveGeHasAccountIdColumns,
} = require("../../utils/generalEntryPersistence");

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function counterpartyLabel(r, accountId) {
  const aid = Number(accountId);
  const fromId = r.fromAccountId != null ? Number(r.fromAccountId) : NaN;
  const isFrom = fromId === aid;
  if (isFrom) {
    return {
      counterpartyAccountId: r.toAccountId != null ? Number(r.toAccountId) : null,
      counterpartyName: r.joinToAccountName || r.toAccount || "—",
      counterpartyType: r.joinToAccountType != null ? String(r.joinToAccountType) : null,
    };
  }
  return {
    counterpartyAccountId: r.fromAccountId != null ? Number(r.fromAccountId) : null,
    counterpartyName: r.joinFromAccountName || r.fromAccount || "—",
    counterpartyType: r.joinFromAccountType != null ? String(r.joinFromAccountType) : null,
  };
}

/**
 * GET /api/admin/reports/general-ledger/accounts
 * All ledger accounts (every row in accounts).
 */
exports.getAdminGeneralLedgerAccounts = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, type, reference_id AS referenceId FROM accounts ORDER BY type ASC, name ASC"
    );
    const items = (rows || []).map((r) => ({
      id: r.id,
      name: r.name || "",
      type: r.type != null ? String(r.type) : "",
      referenceId: r.referenceId != null ? Number(r.referenceId) : null,
    }));
    return res.status(200).json({ items });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(200).json({ items: [] });
    }
    console.error("getAdminGeneralLedgerAccounts error:", err);
    return res.status(500).json({ message: "Failed to load accounts.", items: [] });
  }
};

/**
 * GET /api/admin/reports/general-ledger/statement
 * Account statement from general_entries (only rows with both account ids set).
 * Debit = money out (from selected account), credit = money in (to selected account).
 * openingBalance = net movements strictly before dateFrom (credit − debit); 0 if dateFrom omitted.
 */
exports.getAdminGeneralLedgerStatement = async (req, res) => {
  try {
    const ledgerCol = await resolveGeneralEntryLedgerColumn();
    if (ledgerCol == null) {
      return res.status(200).json({
        items: [],
        total: 0,
        page: 1,
        pageSize: 25,
        openingBalance: 0,
        warning:
          "Database: general_entries has no transaction_number or trx_id column. Run migrations (see database/DEPLOY_LIVE.md).",
      });
    }

    const useAccountIds = await resolveGeHasAccountIdColumns();
    if (!useAccountIds) {
      return res.status(200).json({
        items: [],
        total: 0,
        page: normalizePositiveInt(req.query.page, 1),
        pageSize: Math.min(normalizePositiveInt(req.query.pageSize, 25), 100),
        openingBalance: 0,
        warning:
          "Database: general_entries has no from_account_id / to_account_id columns. Run migration_accounts / migration_general_entries_add_account_ids.sql.",
      });
    }

    const accountId = Number(req.query.accountId);
    if (!Number.isFinite(accountId) || accountId <= 0) {
      return res.status(400).json({ message: "accountId is required and must be a positive integer." });
    }

    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();
    const page = normalizePositiveInt(req.query.page, 1);
    const pageSize = Math.min(normalizePositiveInt(req.query.pageSize, 25), 100);
    const offset = (page - 1) * pageSize;

    const baseWhere = [
      "ge.from_account_id IS NOT NULL",
      "ge.to_account_id IS NOT NULL",
      "(ge.from_account_id = ? OR ge.to_account_id = ?)",
    ];
    const baseParams = [accountId, accountId];

    if (dateFrom) {
      baseWhere.push("DATE(ge.created_at) >= ?");
      baseParams.push(dateFrom);
    }
    if (dateTo) {
      baseWhere.push("DATE(ge.created_at) <= ?");
      baseParams.push(dateTo);
    }

    const whereSql = `WHERE ${baseWhere.join(" AND ")}`;

    let openingBalance = 0;
    if (dateFrom) {
      const openWhere = [
        "ge.from_account_id IS NOT NULL",
        "ge.to_account_id IS NOT NULL",
        "(ge.from_account_id = ? OR ge.to_account_id = ?)",
        "DATE(ge.created_at) < ?",
      ];
      const [openRows] = await pool.query(
        `SELECT COALESCE(SUM(
            CASE
              WHEN ge.to_account_id = ? THEN ge.amount
              WHEN ge.from_account_id = ? THEN -ge.amount
              ELSE 0
            END
          ), 0) AS ob
         FROM general_entries ge
         WHERE ${openWhere.join(" AND ")}`,
        [accountId, accountId, accountId, accountId, dateFrom]
      );
      openingBalance = Number(openRows?.[0]?.ob) || 0;
    }

    let total = 0;
    try {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM general_entries ge ${whereSql}`,
        baseParams
      );
      total = Number(countRows?.[0]?.total || 0);
    } catch (e) {
      if (e.code === "ER_NO_SUCH_TABLE") {
        return res.status(200).json({
          items: [],
          total: 0,
          page,
          pageSize,
          openingBalance,
        });
      }
      throw e;
    }

    const netExpr = `CASE WHEN ge.to_account_id = ? THEN ge.amount WHEN ge.from_account_id = ? THEN -ge.amount ELSE 0 END`;

    const dataParams = [
      accountId,
      accountId,
      openingBalance,
      accountId,
      accountId,
      ...baseParams,
      pageSize,
      offset,
    ];

    const [dataRows] = await pool.query(
      `SELECT * FROM (
        SELECT
          ge.id,
          ge.created_at AS createdAt,
          ge.${ledgerCol} AS transactionNumber,
          ge.narration,
          ge.amount,
          ge.from_account_id AS fromAccountId,
          ge.to_account_id AS toAccountId,
          ge.from_account AS fromAccount,
          ge.to_account AS toAccount,
          fa.name AS joinFromAccountName,
          fa.type AS joinFromAccountType,
          ta.name AS joinToAccountName,
          ta.type AS joinToAccountType,
          CASE WHEN ge.from_account_id = ? THEN ge.amount ELSE 0 END AS debit,
          CASE WHEN ge.to_account_id = ? THEN ge.amount ELSE 0 END AS credit,
          ? + SUM(${netExpr}) OVER (ORDER BY ge.created_at ASC, ge.id ASC) AS balanceAfter
        FROM general_entries ge
        LEFT JOIN accounts fa ON fa.id = ge.from_account_id
        LEFT JOIN accounts ta ON ta.id = ge.to_account_id
        ${whereSql}
      ) ranked
      LIMIT ? OFFSET ?`,
      dataParams
    );

    const items = (dataRows || []).map((r) => {
      const cp = counterpartyLabel(r, accountId);
      return {
        id: r.id,
        createdAt: r.createdAt,
        transactionNumber: r.transactionNumber != null ? String(r.transactionNumber) : "",
        narration: r.narration || "",
        debit: Number(r.debit) || 0,
        credit: Number(r.credit) || 0,
        balanceAfter: Number(r.balanceAfter) || 0,
        counterpartyAccountId: cp.counterpartyAccountId,
        counterpartyName: cp.counterpartyName,
        counterpartyType: cp.counterpartyType,
      };
    });

    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
      openingBalance,
    });
  } catch (err) {
    console.error("getAdminGeneralLedgerStatement error:", err);
    return res.status(500).json({
      message: err.sqlMessage || err.message || "Failed to load general ledger statement.",
    });
  }
};

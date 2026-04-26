const { pool } = require("../../config/database");
const { ADMIN_LEDGER_ACCOUNT_ID } = require("../../constants/ledgerAccounts");
const { resolveGeHasAccountIdColumns } = require("../../utils/generalEntryPersistence");

/**
 * GET /api/admin/reports/balance-sheet?dateFrom=&dateTo=
 * Net balance per account from general_entries only (both account ids set).
 * Net = sum(credits to account) − sum(debits from account), same convention as general ledger.
 * Optional inclusive date range on entry DATE(created_at); omit both for all-time.
 *
 * adminReconciliation: compares stored admin_account_balance (id=1) vs computed net for admin ledger account.
 */
exports.getAdminBalanceSheet = async (req, res) => {
  try {
    const useAccountIds = await resolveGeHasAccountIdColumns();
    if (!useAccountIds) {
      return res.status(200).json({
        items: [],
        warning:
          "Database: general_entries has no from_account_id / to_account_id columns. Run migration_accounts / migration_general_entries_add_account_ids.sql.",
        adminReconciliation: null,
      });
    }

    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();

    let dateOnSql = "";
    const dateParams = [];
    if (dateFrom) {
      dateOnSql += " AND DATE(ge.created_at) >= ?";
      dateParams.push(dateFrom);
    }
    if (dateTo) {
      dateOnSql += " AND DATE(ge.created_at) <= ?";
      dateParams.push(dateTo);
    }

    const [rows] = await pool.query(
      `SELECT a.id, a.name, a.type, a.reference_id AS referenceId,
        COALESCE(SUM(
          CASE
            WHEN ge.id IS NOT NULL AND ge.to_account_id = a.id THEN ge.amount
            WHEN ge.id IS NOT NULL AND ge.from_account_id = a.id THEN -ge.amount
            ELSE 0
          END
        ), 0) AS netBalance
       FROM accounts a
       LEFT JOIN general_entries ge ON (
         ge.from_account_id IS NOT NULL
         AND ge.to_account_id IS NOT NULL
         AND (ge.to_account_id = a.id OR ge.from_account_id = a.id)
         ${dateOnSql}
       )
       GROUP BY a.id, a.name, a.type, a.reference_id
       ORDER BY a.type ASC, a.name ASC`,
      dateParams
    );

    const items = (rows || []).map((r) => ({
      id: r.id,
      name: r.name || "",
      type: r.type != null ? String(r.type) : "",
      referenceId: r.referenceId != null ? Number(r.referenceId) : null,
      netBalance: Number(r.netBalance) || 0,
    }));

    const adminRow = items.find((x) => Number(x.id) === ADMIN_LEDGER_ACCOUNT_ID);
    const computedFromEntries = adminRow ? Number(adminRow.netBalance) || 0 : 0;

    let storedBalance = null;
    try {
      const [balRows] = await pool.query(
        "SELECT balance FROM admin_account_balance WHERE id = 1 LIMIT 1"
      );
      if (balRows?.length) {
        storedBalance = Number(balRows[0].balance) || 0;
      }
    } catch {
      storedBalance = null;
    }

    const adminReconciliation =
      storedBalance === null
        ? {
            computedFromGeneralEntries: computedFromEntries,
            storedBalance: null,
            difference: null,
            inSync: null,
            note: "Table admin_account_balance not found or empty — stored balance unavailable.",
          }
        : {
            computedFromGeneralEntries: computedFromEntries,
            storedBalance: storedBalance,
            difference: Number((storedBalance - computedFromEntries).toFixed(6)),
            inSync: Math.abs(storedBalance - computedFromEntries) < 0.000001,
            note: null,
          };

    return res.status(200).json({
      items,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      adminReconciliation,
    });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(200).json({
        items: [],
        adminReconciliation: null,
        warning: "Missing accounts or general_entries table.",
      });
    }
    console.error("getAdminBalanceSheet error:", err);
    return res.status(500).json({
      message: err.sqlMessage || err.message || "Failed to load balance sheet.",
    });
  }
};

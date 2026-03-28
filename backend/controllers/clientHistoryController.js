const { pool } = require("../config/database");
const {
  resolveGeneralEntryLedgerColumn,
  resolveGeHasAccountIdColumns,
} = require("../utils/generalEntryPersistence");

const HISTORY_LIMIT = 1000;

function kindFromTxn(txn) {
  const s = String(txn || "");
  if (s.startsWith("DP")) return "deposit";
  if (s.startsWith("WD")) return "withdraw";
  if (s.startsWith("TRI")) return "transfer_in";
  if (s.startsWith("TRO")) return "transfer_out";
  return "other";
}

function typeCodeFromKind(kind) {
  if (kind === "deposit") return "DP";
  if (kind === "withdraw") return "WD";
  if (kind === "transfer_in") return "IN";
  if (kind === "transfer_out") return "OUT";
  return "";
}

/**
 * GET /api/client/history
 * Approved client ledger lines from general_entries (DP, WD, TRI, TRO) with brand labels.
 */
async function getClientHistory(req, res) {
  const userId = req.user?.userId;
  if (userId == null) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const ledgerCol = await resolveGeneralEntryLedgerColumn();
    if (!ledgerCol) {
      return res.status(200).json({
        items: [],
        brandOptions: [],
        currentBalance: 0,
        truncated: false,
        warning: "Ledger is not configured (general_entries).",
      });
    }

    const hasAccountIds = await resolveGeHasAccountIdColumns();
    if (!hasAccountIds) {
      return res.status(200).json({
        items: [],
        brandOptions: [],
        currentBalance: 0,
        truncated: false,
        warning: "Account links on general_entries are missing.",
      });
    }

    const [[clientRow]] = await pool.query(
      "SELECT balance FROM clients WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const currentBalance = clientRow
      ? Math.round(Number(clientRow.balance || 0))
      : 0;

    const geWhere = `(
        (ge.to_account_id = ca.id AND ge.${ledgerCol} LIKE 'DP%')
        OR (ge.from_account_id = ca.id AND ge.${ledgerCol} LIKE 'WD%')
        OR (ge.from_account_id = ca.id AND ge.${ledgerCol} LIKE 'TRI%')
        OR (ge.to_account_id = ca.id AND ge.${ledgerCol} LIKE 'TRO%')
      )`;

    const joinFrom = `
      FROM general_entries ge
      INNER JOIN clients cl ON cl.user_id = ?
      INNER JOIN accounts ca ON ca.type = 'client' AND ca.reference_id = cl.user_id
    `;

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS cnt ${joinFrom} WHERE ${geWhere}`,
      [userId]
    );
    const total = Number(countRow?.cnt || 0);
    const truncated = total > HISTORY_LIMIT;

    const [rows] = await pool.query(
      `
      SELECT
        ge.id,
        ge.${ledgerCol} AS ledger_transaction_number,
        ge.amount,
        ge.updated_at AS updated_at,
        COALESCE(NULLIF(TRIM(wc_dp.name), ''), NULLIF(TRIM(wc_wd.name), ''), NULLIF(TRIM(b.name), ''), '') AS brand_label
      ${joinFrom}
      LEFT JOIN deposit_tickets dt
        ON dt.ledger_transaction_number = ge.${ledgerCol} AND dt.client_id = cl.user_id
      LEFT JOIN wallet_companies wc_dp ON wc_dp.id = dt.wallet_company_id
      LEFT JOIN withdraw_tickets wt
        ON wt.ledger_transaction_number = ge.${ledgerCol} AND wt.client_id = cl.user_id
      LEFT JOIN client_wallets cw_wd ON cw_wd.id = wt.client_wallet_id
      LEFT JOIN wallet_companies wc_wd ON wc_wd.id = cw_wd.wallet_company_id
      LEFT JOIN transfer_tickets tt
        ON tt.ledger_transaction_number = ge.${ledgerCol} AND tt.client_id = cl.user_id
      LEFT JOIN brand_companies bc ON bc.id = tt.brand_companies_id
      LEFT JOIN brands b ON b.id = bc.brand_id
      WHERE ${geWhere}
      ORDER BY ge.updated_at DESC, ge.id DESC
      LIMIT ${HISTORY_LIMIT}
      `,
      [userId]
    );

    const itemsDesc = (rows || []).map((r) => {
      const txn = r.ledger_transaction_number != null ? String(r.ledger_transaction_number) : "";
      const kind = kindFromTxn(txn);
      return {
        id: r.id,
        ledgerTransactionNumber: txn,
        kind,
        typeCode: typeCodeFromKind(kind),
        amount: Math.round(Number(r.amount || 0)),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
        brandLabel: r.brand_label != null ? String(r.brand_label) : "",
      };
    });

    const items = itemsDesc.slice().reverse();

    const [brandRows] = await pool.query(
      `
      SELECT name FROM (
        SELECT DISTINCT wc.name AS name
        FROM deposit_tickets dt
        INNER JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
        WHERE dt.client_id = ? AND dt.status = 'approved' AND wc.name IS NOT NULL AND TRIM(wc.name) != ''
        UNION
        SELECT DISTINCT wc2.name AS name
        FROM withdraw_tickets wt
        INNER JOIN client_wallets cw ON cw.id = wt.client_wallet_id
        INNER JOIN wallet_companies wc2 ON wc2.id = cw.wallet_company_id
        WHERE wt.client_id = ? AND wt.status = 'approved' AND wc2.name IS NOT NULL AND TRIM(wc2.name) != ''
        UNION
        SELECT DISTINCT b.name AS name
        FROM transfer_tickets tt
        INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
        INNER JOIN brands b ON b.id = bc.brand_id
        WHERE tt.client_id = ? AND tt.status = 'approved' AND b.name IS NOT NULL AND TRIM(b.name) != ''
      ) x
      ORDER BY name ASC
      `,
      [userId, userId, userId]
    );

    const brandOptions = (brandRows || [])
      .map((r) => String(r.name || "").trim())
      .filter(Boolean);

    return res.status(200).json({
      items,
      brandOptions,
      currentBalance,
      truncated,
      totalCount: total,
    });
  } catch (e) {
    console.error("[client] GET /history error:", e);
    return res.status(500).json({ error: "Failed to load history." });
  }
}

module.exports = { getClientHistory };

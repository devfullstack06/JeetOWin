const { pool } = require("../config/database");

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

function parsePageParams(query) {
  const page = Math.max(1, parseInt(String(query.page || "1"), 10) || 1);
  let pageSize = parseInt(String(query.pageSize || "25"), 10) || 25;
  if (!ALLOWED_PAGE_SIZES.includes(pageSize)) pageSize = 25;
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function normalizeTab(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (s === "deposits" || s === "withdraws" || s === "transfers") return s;
  return null;
}

function iso(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(d).toISOString();
}

function mapDeposit(r, userId) {
  const st = String(r.status || "pending").toLowerCase();
  return {
    kind: "deposit",
    id: r.id,
    status: st,
    amount: Math.round(Number(r.amount || 0)),
    brandLabel: r.wallet_company_name != null ? String(r.wallet_company_name) : "",
    walletName: r.payment_wallet_name_only != null ? String(r.payment_wallet_name_only).trim() : "",
    trxId: r.trx_id != null ? String(r.trx_id) : null,
    ledgerTransactionNumber:
      r.ledger_transaction_number != null ? String(r.ledger_transaction_number) : null,
    slipPath: r.slip_path != null ? String(r.slip_path) : null,
    reason: r.reason != null ? String(r.reason) : null,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at) || iso(r.created_at),
    createdBySelf:
      r.created_by_user_id != null && Number(r.created_by_user_id) === Number(userId),
    processMinutes:
      r.deposit_process_minutes != null ? Number(r.deposit_process_minutes) : 15,
  };
}

function mapWithdraw(r, userId) {
  const st = String(r.status || "pending").toLowerCase();
  return {
    kind: "withdraw",
    id: r.id,
    status: st,
    amount: Math.round(Number(r.amount || 0)),
    brandLabel: r.wallet_company_name != null ? String(r.wallet_company_name) : "",
    walletName:
      r.client_wallet_account_title != null ? String(r.client_wallet_account_title).trim() : "",
    trxId: r.trx_id != null ? String(r.trx_id) : null,
    ledgerTransactionNumber:
      r.ledger_transaction_number != null ? String(r.ledger_transaction_number) : null,
    slipPath: r.slip_path != null ? String(r.slip_path) : null,
    reason: r.reason != null ? String(r.reason) : null,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at) || iso(r.created_at),
    createdBySelf:
      r.created_by_user_id != null && Number(r.created_by_user_id) === Number(userId),
    processMinutes:
      r.withdraw_process_minutes != null ? Number(r.withdraw_process_minutes) : 15,
  };
}

function mapTransfer(r, userId) {
  const st = String(r.status || "pending").toLowerCase();
  const dir = String(r.direction || "").toUpperCase();
  const pm =
    dir === "OUT"
      ? r.out_process_minutes != null
        ? Number(r.out_process_minutes)
        : 15
      : r.in_process_minutes != null
        ? Number(r.in_process_minutes)
        : 15;
  return {
    kind: "transfer",
    id: r.id,
    status: st,
    direction: dir,
    amount: Math.round(Number(r.amount || 0)),
    brandLabel: r.brand_name != null ? String(r.brand_name) : "",
    clientAccountBrandName:
      r.client_account_brand_name != null ? String(r.client_account_brand_name) : "",
    clientAccountUsername:
      r.client_account_username != null ? String(r.client_account_username) : "",
    ledgerTransactionNumber:
      r.ledger_transaction_number != null ? String(r.ledger_transaction_number) : null,
    reason: r.reason != null ? String(r.reason) : null,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at) || iso(r.created_at),
    createdBySelf:
      r.created_by_user_id != null && Number(r.created_by_user_id) === Number(userId),
    processMinutes: pm,
  };
}

function pushDateRange(where, params, alias, from, to) {
  const fromS = String(from || "").trim();
  const toS = String(to || "").trim();
  const col = `COALESCE(${alias}.updated_at, ${alias}.created_at)`;
  if (fromS && toS) {
    where.push(`DATE(${col}) BETWEEN ? AND ?`);
    params.push(fromS, toS);
  } else if (fromS) {
    where.push(`DATE(${col}) >= ?`);
    params.push(fromS);
  } else if (toS) {
    where.push(`DATE(${col}) <= ?`);
    params.push(toS);
  }
}

/**
 * GET /api/client/history/tickets?tab=deposits|withdraws|transfers&from=&to=&brand=&trx=&page=&pageSize=
 */
async function getClientHistoryTickets(req, res) {
  const userId = req.user?.userId;
  if (userId == null) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const tab = normalizeTab(req.query.tab);
  if (!tab) {
    return res.status(400).json({ error: "Invalid tab." });
  }

  const { page, pageSize, offset } = parsePageParams(req.query);

  const from = String(req.query.from || "").trim();
  const to = String(req.query.to || "").trim();
  const brand = String(req.query.brand || "").trim();
  const trxRaw = String(req.query.trx || "").trim().toLowerCase();
  const trxLike = trxRaw ? `%${trxRaw.replace(/%/g, "\\%")}%` : "";

  const jsonMeta = (items, total, brandOptions) => ({
    items,
    brandOptions,
    truncated: false,
    totalCount: total,
    page,
    pageSize,
  });

  try {
    if (tab === "deposits") {
      const where = ["dt.client_id = ?"];
      const params = [userId];
      pushDateRange(where, params, "dt", from, to);
      if (brand) {
        where.push("wc.name = ?");
        params.push(brand);
      }
      if (trxLike) {
        where.push(
          "(LOWER(COALESCE(dt.ledger_transaction_number, '')) LIKE ? OR LOWER(COALESCE(dt.trx_id, '')) LIKE ?)"
        );
        params.push(trxLike, trxLike);
      }
      const whereSql = where.join(" AND ");

      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM deposit_tickets dt
         LEFT JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
         WHERE ${whereSql}`,
        params
      );
      const total = Number(countRow?.cnt || 0);

      const listParams = [...params, pageSize, offset];
      const [rows] = await pool.query(
        `SELECT dt.id, dt.status, dt.amount, dt.trx_id, dt.ledger_transaction_number,
                dt.slip_path, dt.reason, dt.created_by_user_id, dt.created_at, dt.updated_at,
                wc.name AS wallet_company_name,
                COALESCE(wc.deposit_process_minutes, 15) AS deposit_process_minutes,
                pw.name AS payment_wallet_name_only
         FROM deposit_tickets dt
         LEFT JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
         LEFT JOIN payment_wallets pw ON pw.id = dt.payment_wallet_id
         WHERE ${whereSql}
         ORDER BY COALESCE(dt.updated_at, dt.created_at) DESC, dt.id DESC
         LIMIT ? OFFSET ?`,
        listParams
      );

      const [brandRows] = await pool.query(
        `SELECT DISTINCT wc.name AS name
         FROM deposit_tickets dt
         INNER JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
         WHERE dt.client_id = ? AND wc.name IS NOT NULL AND TRIM(wc.name) != ''
         ORDER BY wc.name ASC`,
        [userId]
      );
      const brandOptions = (brandRows || [])
        .map((x) => String(x.name || "").trim())
        .filter(Boolean);

      const items = (rows || []).map((r) => mapDeposit(r, userId));
      return res.status(200).json(jsonMeta(items, total, brandOptions));
    }

    if (tab === "withdraws") {
      const where = ["wt.client_id = ?"];
      const params = [userId];
      pushDateRange(where, params, "wt", from, to);
      if (brand) {
        where.push("wc.name = ?");
        params.push(brand);
      }
      if (trxLike) {
        where.push(
          "(LOWER(COALESCE(wt.ledger_transaction_number, '')) LIKE ? OR LOWER(COALESCE(wt.trx_id, '')) LIKE ?)"
        );
        params.push(trxLike, trxLike);
      }
      const whereSql = where.join(" AND ");

      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM withdraw_tickets wt
         LEFT JOIN client_wallets cw ON cw.id = wt.client_wallet_id
         LEFT JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
         WHERE ${whereSql}`,
        params
      );
      const total = Number(countRow?.cnt || 0);

      const listParams = [...params, pageSize, offset];
      const [rows] = await pool.query(
        `SELECT wt.id, wt.status, wt.amount, wt.trx_id, wt.ledger_transaction_number,
                wt.slip_path, wt.reason, wt.created_by_user_id, wt.created_at, wt.updated_at,
                wc.name AS wallet_company_name,
                cw.account_title AS client_wallet_account_title,
                COALESCE(wc.withdraw_process_minutes, 15) AS withdraw_process_minutes
         FROM withdraw_tickets wt
         LEFT JOIN client_wallets cw ON cw.id = wt.client_wallet_id
         LEFT JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
         WHERE ${whereSql}
         ORDER BY COALESCE(wt.updated_at, wt.created_at) DESC, wt.id DESC
         LIMIT ? OFFSET ?`,
        listParams
      );

      const [brandRows] = await pool.query(
        `SELECT DISTINCT wc.name AS name
         FROM withdraw_tickets wt
         INNER JOIN client_wallets cw ON cw.id = wt.client_wallet_id
         INNER JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
         WHERE wt.client_id = ? AND wc.name IS NOT NULL AND TRIM(wc.name) != ''
         ORDER BY wc.name ASC`,
        [userId]
      );
      const brandOptions = (brandRows || [])
        .map((x) => String(x.name || "").trim())
        .filter(Boolean);

      const items = (rows || []).map((r) => mapWithdraw(r, userId));
      return res.status(200).json(jsonMeta(items, total, brandOptions));
    }

    // transfers
    const where = ["tt.client_id = ?"];
    const params = [userId];
    pushDateRange(where, params, "tt", from, to);
    if (brand) {
      where.push("b.name = ?");
      params.push(brand);
    }
    if (trxLike) {
      where.push("LOWER(COALESCE(tt.ledger_transaction_number, '')) LIKE ?");
      params.push(trxLike);
    }
    const whereSql = where.join(" AND ");

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM transfer_tickets tt
       INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
       INNER JOIN brands b ON b.id = bc.brand_id
       WHERE ${whereSql}`,
      params
    );
    const total = Number(countRow?.cnt || 0);

    const listParams = [...params, pageSize, offset];
    const [rows] = await pool.query(
      `SELECT tt.id, tt.status, tt.amount, tt.direction, tt.ledger_transaction_number,
              tt.reason, tt.created_by_user_id, tt.created_at, tt.updated_at,
              b.name AS brand_name,
              b.out_process_minutes, b.in_process_minutes,
              ca.username AS client_account_username,
              b_ca.name AS client_account_brand_name
       FROM transfer_tickets tt
       INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
       INNER JOIN brands b ON b.id = bc.brand_id
       LEFT JOIN client_accounts ca ON ca.id = tt.client_account_id AND ca.client_id = tt.client_id
       LEFT JOIN brands b_ca ON b_ca.id = ca.brand_id
       WHERE ${whereSql}
       ORDER BY COALESCE(tt.updated_at, tt.created_at) DESC, tt.id DESC
       LIMIT ? OFFSET ?`,
      listParams
    );

    const [brandRows] = await pool.query(
      `SELECT DISTINCT b.name AS name
       FROM transfer_tickets tt
       INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
       INNER JOIN brands b ON b.id = bc.brand_id
       WHERE tt.client_id = ? AND b.name IS NOT NULL AND TRIM(b.name) != ''
       ORDER BY b.name ASC`,
      [userId]
    );
    const brandOptions = (brandRows || [])
      .map((x) => String(x.name || "").trim())
      .filter(Boolean);

    const items = (rows || []).map((r) => mapTransfer(r, userId));
    return res.status(200).json(jsonMeta(items, total, brandOptions));
  } catch (e) {
    console.error("[client] GET /history/tickets error:", e);
    return res.status(500).json({ error: "Failed to load ticket history." });
  }
}

module.exports = { getClientHistoryTickets };

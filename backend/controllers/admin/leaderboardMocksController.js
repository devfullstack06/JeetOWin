const { pool } = require("../../config/database");

let cachedMockRoleId;
async function getMockRoleId(conn) {
  if (cachedMockRoleId) return cachedMockRoleId;
  const c = conn || pool;
  const [r] = await c.query("SELECT id FROM roles WHERE name = 'mock' LIMIT 1");
  if (!r.length) throw new Error("Role 'mock' not found. Run migration_mock_users_and_leaderboard_entries.sql.");
  cachedMockRoleId = r[0].id;
  return cachedMockRoleId;
}

function normalizeInt(v, fallback, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

function parseAmount(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Display labels for admin UI; DB still stores deposit | transfer_out */
function entryTypeDisplayLabel(entryType) {
  return entryType === "transfer_out" ? "Transfer OUT" : "Deposit";
}

async function getClientBalance(conn, userId) {
  const c = conn || pool;
  const [[row]] = await c.query(
    "SELECT balance FROM clients WHERE user_id = ? LIMIT 1",
    [userId]
  );
  if (!row) return 0;
  return Math.round(Number(row.balance || 0) * 100) / 100;
}

/** Mock leaderboard row → API (Mock column = Yes; ignores legacy is_mock on entry) */
function toMockEntryItem(r) {
  const entryDate = r.entry_date ? String(r.entry_date).slice(0, 10) : "";
  return {
    id: `m-${r.id}`,
    source: "mock",
    mockUserId: r.mock_user_id,
    userId: null,
    username: r.username != null ? String(r.username) : "",
    isMock: true,
    entryType: r.entry_type === "transfer_out" ? "transfer_out" : "deposit",
    typeLabel: entryTypeDisplayLabel(r.entry_type),
    amount: r.amount != null ? Number(r.amount) : 0,
    balanceAfter: r.balance_after != null ? Number(r.balance_after) : 0,
    entryDate,
    displayDate: entryDate,
    trxNo: null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    aggregated: false,
  };
}

function toFlatItem(r) {
  return toMockEntryItem(r);
}

function toAggItemMock(r) {
  return {
    id: `agg-m-${r.mock_user_id}`,
    source: "mock_agg",
    mockUserId: r.mock_user_id,
    userId: null,
    username: r.username != null ? String(r.username) : "",
    isMock: true,
    typeLabel: "Sum",
    netAmount: r.net_amount != null ? Number(r.net_amount) : 0,
    aggregated: true,
  };
}

function toAggItemReal(r) {
  return {
    id: `agg-u-${r.user_id}`,
    source: "real_agg",
    mockUserId: null,
    userId: r.user_id,
    username: r.username != null ? String(r.username) : "",
    isMock: false,
    typeLabel: "Sum",
    netAmount: r.net_amount != null ? Number(r.net_amount) : 0,
    aggregated: true,
  };
}

async function usernameExistsInUsers(conn, username) {
  const [rows] = await conn.query(
    "SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) LIMIT 1",
    [username]
  );
  return rows.length > 0;
}

async function findMockUserByUsername(conn, username) {
  const [rows] = await conn.query(
    "SELECT id, username, is_active FROM mock_users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) LIMIT 1",
    [username]
  );
  return rows.length ? rows[0] : null;
}

async function recalculateBalancesForMockUser(conn, mockUserId) {
  const [rows] = await conn.query(
    `SELECT id, entry_type, amount FROM leaderboard_mock_entries
     WHERE mock_user_id = ? ORDER BY entry_date ASC, id ASC`,
    [mockUserId]
  );
  let running = 0;
  for (const row of rows) {
    const delta =
      row.entry_type === "deposit"
        ? Number(row.amount || 0)
        : -Number(row.amount || 0);
    running = Math.round((running + delta) * 100) / 100;
    await conn.query("UPDATE leaderboard_mock_entries SET balance_after = ? WHERE id = ?", [
      running,
      row.id,
    ]);
  }
}

async function getGlobalBalanceForMockUser(conn, mockUserId) {
  const [rows] = await conn.query(
    `SELECT balance_after FROM leaderboard_mock_entries
     WHERE mock_user_id = ? ORDER BY entry_date DESC, id DESC LIMIT 1`,
    [mockUserId]
  );
  if (!rows.length) return 0;
  return Number(rows[0].balance_after || 0);
}

/**
 * GET /api/admin/leaderboard-mocks/check-username?username=
 */
exports.checkLeaderboardMockUsername = async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();
    if (!username) {
      return res.status(400).json({ ok: false, message: "Username is required." });
    }
    if (username.length < 3) {
      return res.status(400).json({
        ok: false,
        status: "invalid",
        message: "Username must be at least 3 characters.",
      });
    }

    if (await usernameExistsInUsers(pool, username)) {
      return res.status(200).json({
        ok: false,
        status: "real_user",
        message: "change username as real user already exist for this username",
      });
    }

    const mock = await findMockUserByUsername(pool, username);
    if (mock) {
      return res.status(200).json({
        ok: true,
        status: "mock_user",
        mockUserId: mock.id,
      });
    }

    return res.status(200).json({
      ok: true,
      status: "new_mock",
    });
  } catch (err) {
    console.error("checkLeaderboardMockUsername:", err);
    return res.status(500).json({ message: err.message || "Failed to check username." });
  }
};

/**
 * GET /api/admin/leaderboard-mocks/preview-balance?username=&entryType=&amount=&entryDate=
 */
exports.previewLeaderboardMockBalance = async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();
    const entryType = String(req.query.entryType || "deposit").toLowerCase();
    const amount = parseAmount(req.query.amount);
    const entryDate = String(req.query.entryDate || "").trim();

    if (!username) return res.status(400).json({ message: "Username is required." });
    if (!entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return res.status(400).json({ message: "Valid entryDate (YYYY-MM-DD) is required." });
    }
    if (amount == null) return res.status(400).json({ message: "Valid amount is required." });
    if (!["deposit", "transfer_out"].includes(entryType)) {
      return res.status(400).json({
        message: "Type must be deposit (Deposit) or transfer_out (Transfer OUT).",
      });
    }

    const mock = await findMockUserByUsername(pool, username);
    let running = 0;
    if (mock) {
      const [rows] = await pool.query(
        `SELECT id, entry_type, amount FROM leaderboard_mock_entries
         WHERE mock_user_id = ? ORDER BY entry_date ASC, id ASC`,
        [mock.id]
      );
      for (const row of rows) {
        const d =
          row.entry_type === "deposit"
            ? Number(row.amount || 0)
            : -Number(row.amount || 0);
        running = Math.round((running + d) * 100) / 100;
      }
    }

    const delta = entryType === "deposit" ? amount : -amount;
    const balanceAfter = Math.round((running + delta) * 100) / 100;

    return res.status(200).json({ balanceAfter, priorBalance: running });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Tables missing. Run migration." });
    }
    console.error("previewLeaderboardMockBalance:", err);
    return res.status(500).json({ message: err.message || "Failed to preview balance." });
  }
};

/**
 * GET /api/admin/leaderboard-mocks/mock-usernames
 */
exports.getLeaderboardMockUsernames = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT username FROM mock_users ORDER BY username ASC`
    );
    return res.status(200).json({ usernames: (rows || []).map((r) => String(r.username)) });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(200).json({ usernames: [] });
    }
    console.error("getLeaderboardMockUsernames:", err);
    return res.status(500).json({ message: err.message || "Failed to load usernames." });
  }
};

/**
 * GET /api/admin/leaderboard-mocks/detail-view
 * Mock: mockUserId + optional entryId (aggregated: omit entryId)
 * Real deposit: depositTicketId
 * Real transfer OUT: transferTicketId
 * Real aggregated: userId + realAggregated=1
 */
exports.getLeaderboardMockDetailView = async (req, res) => {
  try {
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();
    const depositTicketId = Number(req.query.depositTicketId);
    const transferTicketId = Number(req.query.transferTicketId);
    const realAggregated = String(req.query.realAggregated || "").trim() === "1";
    const userIdParam = Number(req.query.userId);

    const realDateCond = (alias) => {
      const w = [];
      const p = [];
      if (dateFrom) {
        w.push(`DATE(${alias}.updated_at) >= ?`);
        p.push(dateFrom);
      }
      if (dateTo) {
        w.push(`DATE(${alias}.updated_at) <= ?`);
        p.push(dateTo);
      }
      return { sql: w.length ? `AND ${w.join(" AND ")}` : "", params: p };
    };

    if (Number.isFinite(depositTicketId) && depositTicketId > 0) {
      const [rows] = await pool.query(
        `SELECT dt.*, u.username AS u_username
         FROM deposit_tickets dt
         INNER JOIN users u ON u.id = dt.client_id
         WHERE dt.id = ? AND dt.status = 'approved' LIMIT 1`,
        [depositTicketId]
      );
      if (!rows.length) return res.status(404).json({ message: "Deposit ticket not found." });
      const dt = rows[0];
      const globalBalance = await getClientBalance(pool, dt.client_id);
      const displayDate = dt.updated_at
        ? String(dt.updated_at).slice(0, 10)
        : "";
      const trxNo = dt.ledger_transaction_number || dt.trx_id || null;
      const clickedEntry = {
        typeLabel: "Deposit",
        amount: Number(dt.amount || 0),
        displayDate,
        trxNo,
        isMock: false,
      };
      const rd = realDateCond("dt2");
      const [histDep] = await pool.query(
        `SELECT DATE(dt2.updated_at) AS d, dt2.amount, dt2.ledger_transaction_number, dt2.trx_id
         FROM deposit_tickets dt2
         WHERE dt2.client_id = ? AND dt2.status = 'approved' ${rd.sql}
         ORDER BY dt2.updated_at ASC, dt2.id ASC`,
        [dt.client_id, ...rd.params]
      );
      const rd2 = realDateCond("tt");
      const [histTro] = await pool.query(
        `SELECT DATE(tt.updated_at) AS d, tt.amount, tt.ledger_transaction_number
         FROM transfer_tickets tt
         WHERE tt.client_id = ? AND tt.status = 'approved' AND tt.direction = 'OUT' ${rd2.sql}
         ORDER BY tt.updated_at ASC, tt.id ASC`,
        [dt.client_id, ...rd2.params]
      );
      const history = [];
      for (const h of histDep || []) {
        history.push({
          entryDate: h.d ? String(h.d).slice(0, 10) : "",
          typeLabel: "Deposit",
          amount: Number(h.amount || 0),
          balanceAfter: null,
          trxNo: h.ledger_transaction_number || h.trx_id || null,
        });
      }
      for (const h of histTro || []) {
        history.push({
          entryDate: h.d ? String(h.d).slice(0, 10) : "",
          typeLabel: "Transfer OUT",
          amount: Number(h.amount || 0),
          balanceAfter: null,
          trxNo: h.ledger_transaction_number || null,
        });
      }
      history.sort((a, b) => String(a.entryDate).localeCompare(String(b.entryDate)));

      return res.status(200).json({
        isMock: false,
        mockUser: null,
        realUser: { id: dt.client_id, username: dt.u_username },
        globalBalance,
        clickedEntry,
        history,
      });
    }

    if (Number.isFinite(transferTicketId) && transferTicketId > 0) {
      const [rows] = await pool.query(
        `SELECT tt.*, u.username AS u_username
         FROM transfer_tickets tt
         INNER JOIN users u ON u.id = tt.client_id
         WHERE tt.id = ? AND tt.status = 'approved' AND tt.direction = 'OUT' LIMIT 1`,
        [transferTicketId]
      );
      if (!rows.length) return res.status(404).json({ message: "Transfer ticket not found." });
      const tt = rows[0];
      const globalBalance = await getClientBalance(pool, tt.client_id);
      const displayDate = tt.updated_at ? String(tt.updated_at).slice(0, 10) : "";
      const clickedEntry = {
        typeLabel: "Transfer OUT",
        amount: Number(tt.amount || 0),
        displayDate,
        trxNo: tt.ledger_transaction_number || null,
        isMock: false,
      };
      const rd = realDateCond("dt2");
      const [histDep] = await pool.query(
        `SELECT DATE(dt2.updated_at) AS d, dt2.amount, dt2.ledger_transaction_number, dt2.trx_id
         FROM deposit_tickets dt2
         WHERE dt2.client_id = ? AND dt2.status = 'approved' ${rd.sql}
         ORDER BY dt2.updated_at ASC, dt2.id ASC`,
        [tt.client_id, ...rd.params]
      );
      const rd2 = realDateCond("tt2");
      const [histTro] = await pool.query(
        `SELECT DATE(tt2.updated_at) AS d, tt2.amount, tt2.ledger_transaction_number
         FROM transfer_tickets tt2
         WHERE tt2.client_id = ? AND tt2.status = 'approved' AND tt2.direction = 'OUT' ${rd2.sql}
         ORDER BY tt2.updated_at ASC, tt2.id ASC`,
        [tt.client_id, ...rd2.params]
      );
      const history = [];
      for (const h of histDep || []) {
        history.push({
          entryDate: h.d ? String(h.d).slice(0, 10) : "",
          typeLabel: "Deposit",
          amount: Number(h.amount || 0),
          balanceAfter: null,
          trxNo: h.ledger_transaction_number || h.trx_id || null,
        });
      }
      for (const h of histTro || []) {
        history.push({
          entryDate: h.d ? String(h.d).slice(0, 10) : "",
          typeLabel: "Transfer OUT",
          amount: Number(h.amount || 0),
          balanceAfter: null,
          trxNo: h.ledger_transaction_number || null,
        });
      }
      history.sort((a, b) => String(a.entryDate).localeCompare(String(b.entryDate)));

      return res.status(200).json({
        isMock: false,
        mockUser: null,
        realUser: { id: tt.client_id, username: tt.u_username },
        globalBalance,
        clickedEntry,
        history,
      });
    }

    if (realAggregated && Number.isFinite(userIdParam) && userIdParam > 0) {
      const [[u]] = await pool.query("SELECT id, username FROM users WHERE id = ? LIMIT 1", [
        userIdParam,
      ]);
      if (!u) return res.status(404).json({ message: "User not found." });
      const globalBalance = await getClientBalance(pool, userIdParam);

      const depCond = realDateCond("dt");
      const troCond = realDateCond("tt");
      const [[netRow]] = await pool.query(
        `SELECT
           COALESCE((SELECT SUM(dt.amount) FROM deposit_tickets dt
             WHERE dt.client_id = ? AND dt.status = 'approved' ${depCond.sql}), 0)
         - COALESCE((SELECT SUM(tt.amount) FROM transfer_tickets tt
             WHERE tt.client_id = ? AND tt.status = 'approved' AND tt.direction = 'OUT' ${troCond.sql}), 0) AS net`,
        [userIdParam, ...depCond.params, userIdParam, ...troCond.params]
      );
      const net = Math.round(Number(netRow?.net || 0) * 100) / 100;
      const clickedEntry = {
        typeLabel: "Sum",
        amount: net,
        displayDate: "—",
        trxNo: null,
        isMock: false,
      };

      const rd = realDateCond("dt2");
      const [histDep] = await pool.query(
        `SELECT DATE(dt2.updated_at) AS d, dt2.amount, dt2.ledger_transaction_number, dt2.trx_id
         FROM deposit_tickets dt2
         WHERE dt2.client_id = ? AND dt2.status = 'approved' ${rd.sql}
         ORDER BY dt2.updated_at ASC, dt2.id ASC`,
        [userIdParam, ...rd.params]
      );
      const rd2 = realDateCond("tt2");
      const [histTro] = await pool.query(
        `SELECT DATE(tt2.updated_at) AS d, tt2.amount, tt2.ledger_transaction_number
         FROM transfer_tickets tt2
         WHERE tt2.client_id = ? AND tt2.status = 'approved' AND tt2.direction = 'OUT' ${rd2.sql}
         ORDER BY tt2.updated_at ASC, tt2.id ASC`,
        [userIdParam, ...rd2.params]
      );
      const history = [];
      for (const h of histDep || []) {
        history.push({
          entryDate: h.d ? String(h.d).slice(0, 10) : "",
          typeLabel: "Deposit",
          amount: Number(h.amount || 0),
          balanceAfter: null,
          trxNo: h.ledger_transaction_number || h.trx_id || null,
        });
      }
      for (const h of histTro || []) {
        history.push({
          entryDate: h.d ? String(h.d).slice(0, 10) : "",
          typeLabel: "Transfer OUT",
          amount: Number(h.amount || 0),
          balanceAfter: null,
          trxNo: h.ledger_transaction_number || null,
        });
      }
      history.sort((a, b) => String(a.entryDate).localeCompare(String(b.entryDate)));

      return res.status(200).json({
        isMock: false,
        mockUser: null,
        realUser: { id: u.id, username: u.username },
        globalBalance,
        clickedEntry,
        history,
      });
    }

    const mockUserId = Number(req.query.mockUserId);
    const entryId =
      req.query.entryId != null && req.query.entryId !== ""
        ? Number(req.query.entryId)
        : null;

    if (!Number.isFinite(mockUserId) || mockUserId <= 0) {
      return res.status(400).json({ message: "mockUserId, depositTicketId, transferTicketId, or userId is required." });
    }

    const [[mu]] = await pool.query(
      "SELECT id, username, is_active FROM mock_users WHERE id = ? LIMIT 1",
      [mockUserId]
    );
    if (!mu) return res.status(404).json({ message: "Mock user not found." });

    const globalBalance = await getGlobalBalanceForMockUser(pool, mockUserId);

    let clickedEntry = null;
    if (entryId != null && Number.isFinite(entryId) && entryId > 0) {
      const [er] = await pool.query(
        `SELECT e.id, e.mock_user_id, e.entry_type, e.amount, e.balance_after, e.entry_date, mu.username
         FROM leaderboard_mock_entries e
         INNER JOIN mock_users mu ON mu.id = e.mock_user_id
         WHERE e.id = ? AND e.mock_user_id = ? LIMIT 1`,
        [entryId, mockUserId]
      );
      if (er.length) {
        const row = toMockEntryItem({ ...er[0], username: er[0].username });
        clickedEntry = {
          typeLabel: row.typeLabel,
          amount: row.amount,
          displayDate: row.displayDate,
          trxNo: null,
          isMock: true,
        };
      }
    }

    const hWhere = ["e.mock_user_id = ?"];
    const hParams = [mockUserId];
    if (dateFrom) {
      hWhere.push("e.entry_date >= ?");
      hParams.push(dateFrom);
    }
    if (dateTo) {
      hWhere.push("e.entry_date <= ?");
      hParams.push(dateTo);
    }

    const [hist] = await pool.query(
      `SELECT e.entry_date, e.entry_type, e.amount, e.balance_after
       FROM leaderboard_mock_entries e
       WHERE ${hWhere.join(" AND ")}
       ORDER BY e.entry_date ASC, e.id ASC`,
      hParams
    );

    const history = (hist || []).map((h) => ({
      entryDate: h.entry_date ? String(h.entry_date).slice(0, 10) : "",
      typeLabel: entryTypeDisplayLabel(h.entry_type),
      amount: Number(h.amount || 0),
      balanceAfter: Number(h.balance_after || 0),
      trxNo: null,
    }));

    return res.status(200).json({
      isMock: true,
      mockUser: {
        id: mu.id,
        username: mu.username,
        isActive: !!mu.is_active,
      },
      realUser: null,
      globalBalance,
      clickedEntry,
      history,
    });
  } catch (err) {
    console.error("getLeaderboardMockDetailView:", err);
    return res.status(500).json({ message: err.message || "Failed to load detail." });
  }
};

function mapUnifiedFlatRow(r) {
  const displayDate = r.display_date
    ? String(r.display_date).slice(0, 10)
    : "";
  if (r.source === "mock") {
    return {
      id: r.list_id,
      source: "mock",
      mockUserId: r.mock_user_id,
      userId: null,
      username: r.username != null ? String(r.username) : "",
      isMock: true,
      entryType: r.entry_type_raw === "transfer_out" ? "transfer_out" : "deposit",
      typeLabel: entryTypeDisplayLabel(r.entry_type_raw),
      amount: r.amount != null ? Number(r.amount) : 0,
      displayDate,
      entryDate: displayDate,
      trxNo: null,
      aggregated: false,
    };
  }
  if (r.source === "deposit") {
    return {
      id: r.list_id,
      source: "deposit",
      mockUserId: null,
      userId: r.user_id,
      username: r.username != null ? String(r.username) : "",
      isMock: false,
      entryType: "deposit",
      typeLabel: "Deposit",
      amount: r.amount != null ? Number(r.amount) : 0,
      displayDate,
      entryDate: displayDate,
      trxNo: r.trx_no != null && String(r.trx_no).trim() !== "" ? String(r.trx_no) : null,
      aggregated: false,
    };
  }
  return {
    id: r.list_id,
    source: "transfer_out",
    mockUserId: null,
    userId: r.user_id,
    username: r.username != null ? String(r.username) : "",
    isMock: false,
    entryType: "transfer_out",
    typeLabel: "Transfer OUT",
    amount: r.amount != null ? Number(r.amount) : 0,
    displayDate,
    entryDate: displayDate,
    trxNo: r.trx_no != null && String(r.trx_no).trim() !== "" ? String(r.trx_no) : null,
    aggregated: false,
  };
}

/**
 * GET /api/admin/leaderboard-mocks
 * aggregated=yes|no (default no)
 * dateFrom, dateTo (YYYY-MM-DD): mock filters entry_date; real filters DATE(updated_at) at approval
 */
exports.getAdminLeaderboardMocks = async (req, res) => {
  try {
    const page = normalizeInt(req.query.page, 1, 1e6);
    const pageSize = normalizeInt(req.query.pageSize, 25, 100);
    const username = String(req.query.username || "").trim();
    const typeFilter = String(req.query.type || "").trim().toLowerCase();
    const mockFilter = String(req.query.mock || "").trim().toLowerCase();
    const aggregated = String(req.query.aggregated || "no").toLowerCase() === "yes";
    const dateFrom = String(req.query.dateFrom || "").trim();
    const dateTo = String(req.query.dateTo || "").trim();

    if (!aggregated) {
      const incMock = mockFilter !== "no";
      const incReal = mockFilter !== "yes";
      const rows = [];

      if (incMock) {
        const w = ["1=1"];
        const p = [];
        if (username) {
          w.push("mu.username LIKE ?");
          p.push(`%${username}%`);
        }
        if (typeFilter === "deposit") w.push("e.entry_type = 'deposit'");
        else if (typeFilter === "transfer_out" || typeFilter === "win") {
          w.push("e.entry_type = 'transfer_out'");
        }
        if (dateFrom) {
          w.push("e.entry_date >= ?");
          p.push(dateFrom);
        }
        if (dateTo) {
          w.push("e.entry_date <= ?");
          p.push(dateTo);
        }
        const [mr] = await pool.query(
          `SELECT
             CONCAT('m-', e.id) AS list_id,
             'mock' AS source,
             COALESCE(e.updated_at, TIMESTAMP(e.entry_date)) AS sort_ts,
             e.mock_user_id,
             NULL AS user_id,
             mu.username,
             e.entry_type AS entry_type_raw,
             e.amount,
             e.entry_date AS display_date,
             NULL AS trx_no
           FROM leaderboard_mock_entries e
           INNER JOIN mock_users mu ON mu.id = e.mock_user_id
           WHERE ${w.join(" AND ")}`,
          p
        );
        rows.push(...(mr || []));
      }

      if (incReal && typeFilter !== "transfer_out" && typeFilter !== "win") {
        const w = ["dt.status = 'approved'"];
        const p = [];
        if (username) {
          w.push("u.username LIKE ?");
          p.push(`%${username}%`);
        }
        if (dateFrom) {
          w.push("DATE(dt.updated_at) >= ?");
          p.push(dateFrom);
        }
        if (dateTo) {
          w.push("DATE(dt.updated_at) <= ?");
          p.push(dateTo);
        }
        const [dr] = await pool.query(
          `SELECT
             CONCAT('d-', dt.id) AS list_id,
             'deposit' AS source,
             dt.updated_at AS sort_ts,
             NULL AS mock_user_id,
             dt.client_id AS user_id,
             u.username,
             'deposit' AS entry_type_raw,
             dt.amount,
             DATE(dt.updated_at) AS display_date,
             COALESCE(dt.ledger_transaction_number, dt.trx_id) AS trx_no
           FROM deposit_tickets dt
           INNER JOIN users u ON u.id = dt.client_id
           WHERE ${w.join(" AND ")}`,
          p
        );
        rows.push(...(dr || []));
      }

      if (incReal && typeFilter !== "deposit") {
        const w = ["tt.status = 'approved'", "tt.direction = 'OUT'"];
        const p = [];
        if (username) {
          w.push("u.username LIKE ?");
          p.push(`%${username}%`);
        }
        if (dateFrom) {
          w.push("DATE(tt.updated_at) >= ?");
          p.push(dateFrom);
        }
        if (dateTo) {
          w.push("DATE(tt.updated_at) <= ?");
          p.push(dateTo);
        }
        const [tr] = await pool.query(
          `SELECT
             CONCAT('t-', tt.id) AS list_id,
             'transfer_out' AS source,
             tt.updated_at AS sort_ts,
             NULL AS mock_user_id,
             tt.client_id AS user_id,
             u.username,
             'transfer_out' AS entry_type_raw,
             tt.amount,
             DATE(tt.updated_at) AS display_date,
             tt.ledger_transaction_number AS trx_no
           FROM transfer_tickets tt
           INNER JOIN users u ON u.id = tt.client_id
           WHERE ${w.join(" AND ")}`,
          p
        );
        rows.push(...(tr || []));
      }

      rows.sort((a, b) => {
        const ta = new Date(a.sort_ts || 0).getTime();
        const tb = new Date(b.sort_ts || 0).getTime();
        if (tb !== ta) return tb - ta;
        return String(b.list_id || "").localeCompare(String(a.list_id || ""));
      });

      const total = rows.length;
      const offset = (page - 1) * pageSize;
      const paged = rows.slice(offset, offset + pageSize);

      return res.status(200).json({
        items: paged.map((r) => mapUnifiedFlatRow(r)),
        total,
        page,
        pageSize,
        aggregated: false,
      });
    }

    const incMockAgg = mockFilter !== "no";
    const incRealAgg = mockFilter !== "yes";

    const mockRows = [];
    if (incMockAgg) {
      const w = ["1=1"];
      const p = [];
      if (username) {
        w.push("mu.username LIKE ?");
        p.push(`%${username}%`);
      }
      if (dateFrom) {
        w.push("e.entry_date >= ?");
        p.push(dateFrom);
      }
      if (dateTo) {
        w.push("e.entry_date <= ?");
        p.push(dateTo);
      }
      const having = [];
      if (typeFilter === "deposit") {
        having.push("SUM(CASE WHEN e.entry_type = 'deposit' THEN 1 ELSE 0 END) > 0");
      } else if (typeFilter === "transfer_out" || typeFilter === "win") {
        having.push("SUM(CASE WHEN e.entry_type = 'transfer_out' THEN 1 ELSE 0 END) > 0");
      }
      const havingSql = having.length ? `HAVING ${having.join(" AND ")}` : "";

      const [mr] = await pool.query(
        `SELECT mu.id AS mock_user_id, mu.username,
           SUM(CASE WHEN e.entry_type = 'deposit' THEN e.amount ELSE 0 END) AS sum_dep,
           SUM(CASE WHEN e.entry_type = 'transfer_out' THEN e.amount ELSE 0 END) AS sum_out
         FROM leaderboard_mock_entries e
         INNER JOIN mock_users mu ON mu.id = e.mock_user_id
         WHERE ${w.join(" AND ")}
         GROUP BY mu.id, mu.username, mu.is_active
         ${havingSql}
         ORDER BY mu.username ASC`,
        p
      );
      for (const row of mr || []) {
        const sumDep = Number(row.sum_dep || 0);
        const sumOut = Number(row.sum_out || 0);
        const net = Math.round((sumDep - sumOut) * 100) / 100;
        mockRows.push(
          toAggItemMock({
            mock_user_id: row.mock_user_id,
            username: row.username,
            net_amount: net,
          })
        );
      }
    }

    const realRows = [];
    if (incRealAgg) {
      const dParts = [];
      const dParams = [];
      if (dateFrom) {
        dParts.push("DATE(dt.updated_at) >= ?");
        dParams.push(dateFrom);
      }
      if (dateTo) {
        dParts.push("DATE(dt.updated_at) <= ?");
        dParams.push(dateTo);
      }
      const dExtra = dParts.length ? `AND ${dParts.join(" AND ")}` : "";

      const tParts = [];
      const tParams = [];
      if (dateFrom) {
        tParts.push("DATE(tt.updated_at) >= ?");
        tParams.push(dateFrom);
      }
      if (dateTo) {
        tParts.push("DATE(tt.updated_at) <= ?");
        tParams.push(dateTo);
      }
      const tExtra = tParts.length ? `AND ${tParts.join(" AND ")}` : "";

      let sql = `
        SELECT u.id AS user_id, u.username,
          (SELECT COALESCE(SUM(dt.amount), 0) FROM deposit_tickets dt
           WHERE dt.client_id = u.id AND dt.status = 'approved' ${dExtra}) AS sum_dep,
          (SELECT COALESCE(SUM(tt.amount), 0) FROM transfer_tickets tt
           WHERE tt.client_id = u.id AND tt.status = 'approved' AND tt.direction = 'OUT' ${tExtra}) AS sum_out
        FROM users u
        WHERE (
          EXISTS (
            SELECT 1 FROM deposit_tickets dt
            WHERE dt.client_id = u.id AND dt.status = 'approved' ${dExtra}
          )
          OR EXISTS (
            SELECT 1 FROM transfer_tickets tt
            WHERE tt.client_id = u.id AND tt.status = 'approved' AND tt.direction = 'OUT' ${tExtra}
          )
        )`;
      const qParams = [...dParams, ...tParams, ...dParams, ...tParams];
      if (username) {
        sql += " AND u.username LIKE ?";
        qParams.push(`%${username}%`);
      }
      sql += " ORDER BY u.username ASC";

      const [rr2] = await pool.query(sql, qParams);

      for (const row of rr2 || []) {
        const sumDep = Number(row.sum_dep || 0);
        const sumOut = Number(row.sum_out || 0);
        if (typeFilter === "deposit" && sumDep <= 0) continue;
        if ((typeFilter === "transfer_out" || typeFilter === "win") && sumOut <= 0) continue;
        const net = Math.round((sumDep - sumOut) * 100) / 100;
        realRows.push(
          toAggItemReal({
            user_id: row.user_id,
            username: row.username,
            net_amount: net,
          })
        );
      }
    }

    const merged = [...mockRows, ...realRows].sort((a, b) =>
      String(a.username).localeCompare(String(b.username))
    );
    const total = merged.length;
    const offset = (page - 1) * pageSize;
    const paged = merged.slice(offset, offset + pageSize);

    return res.status(200).json({
      items: paged,
      total,
      page,
      pageSize,
      aggregated: true,
    });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({
        message: "Tables missing. Run migration_mock_users_and_leaderboard_entries.sql.",
        items: [],
        total: 0,
        page: 1,
        pageSize: 25,
        aggregated: false,
      });
    }
    console.error("getAdminLeaderboardMocks:", err);
    return res.status(500).json({ message: err.message || "Failed to load leaderboard mocks." });
  }
};

/**
 * GET /api/admin/leaderboard-mocks/:id
 */
exports.getAdminLeaderboardMockById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "Invalid id." });

    const [rows] = await pool.query(
      `SELECT e.id, e.mock_user_id, e.is_mock, e.entry_type, e.amount, e.balance_after, e.entry_date,
              e.created_at, e.updated_at, mu.username
       FROM leaderboard_mock_entries e
       INNER JOIN mock_users mu ON mu.id = e.mock_user_id
       WHERE e.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Entry not found." });
    return res.status(200).json({ item: toMockEntryItem(rows[0]) });
  } catch (err) {
    console.error("getAdminLeaderboardMockById:", err);
    return res.status(500).json({ message: err.message || "Failed to load entry." });
  }
};

/**
 * POST /api/admin/leaderboard-mocks
 */
exports.createAdminLeaderboardMock = async (req, res) => {
  let conn;
  try {
    const username = String(req.body?.username || "").trim();
    const entryType = String(req.body?.entryType || "").trim().toLowerCase();
    const amount = parseAmount(req.body?.amount);
    const entryDate = String(req.body?.entryDate || "").trim();

    if (!username) return res.status(400).json({ message: "Username is required." });
    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters." });
    }
    if (!["deposit", "transfer_out"].includes(entryType)) {
      return res.status(400).json({
        message: "Type must be deposit (Deposit) or transfer_out (Transfer OUT).",
      });
    }
    if (amount == null) return res.status(400).json({ message: "Valid amount is required." });
    if (!entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return res.status(400).json({ message: "Valid entryDate (YYYY-MM-DD) is required." });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    if (await usernameExistsInUsers(conn, username)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        message: "change username as real user already exist for this username",
      });
    }

    const roleId = await getMockRoleId(conn);
    let mockUser = await findMockUserByUsername(conn, username);
    if (!mockUser) {
      const [insMu] = await conn.query(
        `INSERT INTO mock_users (username, role_id, is_active) VALUES (?, ?, 1)`,
        [username, roleId]
      );
      mockUser = { id: insMu.insertId };
    }

    const [insResult] = await conn.query(
      `INSERT INTO leaderboard_mock_entries
        (mock_user_id, is_mock, entry_type, amount, balance_after, entry_date)
       VALUES (?, 1, ?, ?, 0, ?)`,
      [mockUser.id, entryType, amount, entryDate]
    );
    const newId = insResult.insertId;

    await recalculateBalancesForMockUser(conn, mockUser.id);
    await conn.commit();
    conn.release();
    conn = null;

    const [rows] = await pool.query(
      `SELECT e.id, e.mock_user_id, e.is_mock, e.entry_type, e.amount, e.balance_after, e.entry_date,
              e.created_at, e.updated_at, mu.username
       FROM leaderboard_mock_entries e
       INNER JOIN mock_users mu ON mu.id = e.mock_user_id
       WHERE e.id = ? LIMIT 1`,
      [newId]
    );
    if (!rows.length) return res.status(500).json({ message: "Created but could not reload entry." });
    return res.status(201).json({ item: toMockEntryItem(rows[0]) });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
      try {
        conn.release();
      } catch (_) {}
    }
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Username already taken for mock user." });
    }
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(503).json({ message: "Tables missing. Run migration." });
    }
    console.error("createAdminLeaderboardMock:", err);
    return res.status(500).json({ message: err.message || "Failed to create entry." });
  }
};

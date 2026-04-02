const { pool } = require("../config/database");

function periodBounds(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const mk = (dt) => dt.toISOString().slice(0, 10);
  let from;
  let to;

  if (period === "last7") {
    const a = new Date(y, m, d - 6);
    from = mk(a);
    to = mk(new Date(y, m, d));
  } else if (period === "thisMonth") {
    from = mk(new Date(y, m, 1));
    to = mk(new Date(y, m + 1, 0));
  } else if (period === "lastMonth") {
    from = mk(new Date(y, m - 1, 1));
    to = mk(new Date(y, m, 0));
  } else {
    from = mk(new Date(y, m, d));
    to = mk(new Date(y, m, d));
  }

  return { from, to };
}

function maskUsername(u) {
  const s = String(u || "").trim();
  if (!s) return "***";
  const first = s.slice(0, 3);
  const last = s.length > 3 ? s.slice(-2) : "";
  return `${first}***${last}`;
}

function mergeSums(rowsA, rowsB, limit, periodLabel) {
  const map = new Map();
  const add = (u, n) => {
    const key = String(u || "").trim();
    if (!key) return;
    const prev = Number(map.get(key) || 0);
    map.set(key, Math.round((prev + Number(n || 0)) * 100) / 100);
  };
  for (const r of rowsA || []) add(r.username, r.total_amount);
  for (const r of rowsB || []) add(r.username, r.total_amount);

  return Array.from(map.entries())
    .map(([username, amount], idx) => ({
      id: `lb-${idx}-${username}`,
      user: maskUsername(username),
      duration: periodLabel,
      amount: Number(amount || 0).toLocaleString("en-PK"),
      rawAmount: Number(amount || 0),
    }))
    .sort((a, b) => b.rawAmount - a.rawAmount || a.user.localeCompare(b.user))
    .slice(0, limit)
    .map(({ rawAmount, ...rest }) => rest);
}

/**
 * GET /api/leaderboard/public?period=today|last7|thisMonth|lastMonth&limit=14
 * Public endpoint: masked usernames + aggregated amounts only.
 */
exports.getPublicLeaderboard = async (req, res) => {
  try {
    const period = String(req.query.period || "today").trim();
    const limitN = Number(req.query.limit);
    const limit = Number.isFinite(limitN) && limitN > 0 ? Math.min(Math.floor(limitN), 50) : 14;
    const valid = new Set(["today", "last7", "thisMonth", "lastMonth"]);
    const p = valid.has(period) ? period : "today";
    const labels = {
      today: "Today",
      last7: "Last 7 Days",
      thisMonth: "This Month",
      lastMonth: "Last Month",
    };
    const periodLabel = labels[p];
    const { from, to } = periodBounds(p);

    const [mockDeposits] = await pool.query(
      `SELECT mu.username, SUM(e.amount) AS total_amount
       FROM leaderboard_mock_entries e
       INNER JOIN mock_users mu ON mu.id = e.mock_user_id
       WHERE e.entry_type = 'deposit' AND e.entry_date >= ? AND e.entry_date <= ?
       GROUP BY mu.username`,
      [from, to]
    );
    const [realDeposits] = await pool.query(
      `SELECT u.username, SUM(dt.amount) AS total_amount
       FROM deposit_tickets dt
       INNER JOIN users u ON u.id = dt.client_id
       WHERE dt.status = 'approved' AND DATE(dt.updated_at) >= ? AND DATE(dt.updated_at) <= ?
       GROUP BY u.username`,
      [from, to]
    );

    const [mockOut] = await pool.query(
      `SELECT mu.username, SUM(e.amount) AS total_amount
       FROM leaderboard_mock_entries e
       INNER JOIN mock_users mu ON mu.id = e.mock_user_id
       WHERE e.entry_type = 'transfer_out' AND e.entry_date >= ? AND e.entry_date <= ?
       GROUP BY mu.username`,
      [from, to]
    );
    const [realOut] = await pool.query(
      `SELECT u.username, SUM(tt.amount) AS total_amount
       FROM transfer_tickets tt
       INNER JOIN users u ON u.id = tt.client_id
       WHERE tt.status = 'approved' AND tt.direction = 'OUT'
         AND DATE(tt.updated_at) >= ? AND DATE(tt.updated_at) <= ?
       GROUP BY u.username`,
      [from, to]
    );

    const depositors = mergeSums(mockDeposits, realDeposits, limit, periodLabel);
    const winners = mergeSums(mockOut, realOut, limit, periodLabel);

    return res.status(200).json({
      period: p,
      periodLabel,
      depositors,
      winners,
    });
  } catch (err) {
    console.error("getPublicLeaderboard:", err);
    return res.status(500).json({ message: "Failed to load leaderboard." });
  }
};

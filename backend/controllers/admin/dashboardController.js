const { pool } = require("../../config/database");
const { getPktOverviewPeriodBounds } = require("../../utils/pakistanTime");

const PERIOD_KEYS = ["today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth"];

async function scalarCount(sql, params = []) {
  try {
    const [[row]] = await pool.query(sql, params);
    return Number(row?.c ?? 0);
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE" || e.code === "ER_BAD_FIELD_ERROR") return 0;
    console.error("[admin dashboard] count query:", e.message);
    return 0;
  }
}

async function scalarSum(sql, params = []) {
  try {
    const [[row]] = await pool.query(sql, params);
    const v = row?.s;
    if (v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE" || e.code === "ER_BAD_FIELD_ERROR") return 0;
    console.error("[admin dashboard] sum query:", e.message);
    return 0;
  }
}

function emptyBusinessSlice() {
  return {
    newClients: 0,
    newClientAccounts: 0,
    transfersCreated: 0,
    transfersApproved: 0,
    depositsCreated: 0,
    depositsApproved: 0,
    withdrawsCreated: 0,
    withdrawsApproved: 0,
  };
}

function emptyBusinessPeriods() {
  const o = {};
  for (const k of PERIOD_KEYS) o[k] = emptyBusinessSlice();
  return { periods: o };
}

function emptyAmountsSlice() {
  return {
    depositsApprovedAmount: 0,
    withdrawsApprovedAmount: 0,
    transfersInApprovedAmount: 0,
    transfersOutApprovedAmount: 0,
  };
}

function emptyAmountsPeriods() {
  const o = {};
  for (const k of PERIOD_KEYS) o[k] = emptyAmountsSlice();
  return { periods: o };
}

async function businessSlice(rangeStart, rangeEnd) {
  const b = emptyBusinessSlice();
  const [c1, c2, c3, c4, c5, c6, c7, c8] = await Promise.all([
    scalarCount(
      `SELECT COUNT(*) AS c FROM clients WHERE created_at >= ? AND created_at <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarCount(
      `SELECT COUNT(*) AS c FROM client_accounts WHERE created_at >= ? AND created_at <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarCount(
      `SELECT COUNT(*) AS c FROM transfer_tickets WHERE created_at >= ? AND created_at <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarCount(
      `SELECT COUNT(*) AS c FROM transfer_tickets
       WHERE status = 'approved' AND COALESCE(updated_at, created_at) >= ? AND COALESCE(updated_at, created_at) <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarCount(
      `SELECT COUNT(*) AS c FROM deposit_tickets WHERE created_at >= ? AND created_at <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarCount(
      `SELECT COUNT(*) AS c FROM deposit_tickets
       WHERE LOWER(TRIM(status)) = 'approved' AND COALESCE(updated_at, created_at) >= ? AND COALESCE(updated_at, created_at) <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarCount(
      `SELECT COUNT(*) AS c FROM withdraw_tickets WHERE created_at >= ? AND created_at <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarCount(
      `SELECT COUNT(*) AS c FROM withdraw_tickets
       WHERE LOWER(TRIM(status)) = 'approved' AND COALESCE(updated_at, created_at) >= ? AND COALESCE(updated_at, created_at) <= ?`,
      [rangeStart, rangeEnd]
    ),
  ]);
  b.newClients = c1;
  b.newClientAccounts = c2;
  b.transfersCreated = c3;
  b.transfersApproved = c4;
  b.depositsCreated = c5;
  b.depositsApproved = c6;
  b.withdrawsCreated = c7;
  b.withdrawsApproved = c8;
  return b;
}

async function businessAmountsSlice(rangeStart, rangeEnd) {
  const a = emptyAmountsSlice();
  const [d, w, tin, tout] = await Promise.all([
    scalarSum(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM deposit_tickets
       WHERE LOWER(TRIM(status)) = 'approved' AND COALESCE(updated_at, created_at) >= ? AND COALESCE(updated_at, created_at) <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarSum(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM withdraw_tickets
       WHERE LOWER(TRIM(status)) = 'approved' AND COALESCE(updated_at, created_at) >= ? AND COALESCE(updated_at, created_at) <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarSum(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM transfer_tickets
       WHERE status = 'approved' AND direction = 'IN'
         AND COALESCE(updated_at, created_at) >= ? AND COALESCE(updated_at, created_at) <= ?`,
      [rangeStart, rangeEnd]
    ),
    scalarSum(
      `SELECT COALESCE(SUM(amount), 0) AS s FROM transfer_tickets
       WHERE status = 'approved' AND direction = 'OUT'
         AND COALESCE(updated_at, created_at) >= ? AND COALESCE(updated_at, created_at) <= ?`,
      [rangeStart, rangeEnd]
    ),
  ]);
  a.depositsApprovedAmount = d;
  a.withdrawsApprovedAmount = w;
  a.transfersInApprovedAmount = tin;
  a.transfersOutApprovedAmount = tout;
  return a;
}

async function loadBrandsAccountsNoActiveMaster() {
  try {
    const [[row]] = await pool.query(
      `
      SELECT COUNT(*) AS c
      FROM brands b
      WHERE b.available_accounts = 1
        AND NOT EXISTS (
          SELECT 1 FROM brand_companies bc
          WHERE bc.brand_id = b.id
            AND LOWER(TRIM(COALESCE(bc.type, ''))) = 'master'
            AND bc.is_active = 1
        )
      `
    );
    return Number(row?.c ?? 0);
  } catch (e) {
    if (e.code === "ER_BAD_FIELD_ERROR" || e.code === "ER_NO_SUCH_TABLE") return 0;
    console.error("[admin dashboard] brands quality:", e.message);
    return 0;
  }
}

/**
 * GET /api/admin/dashboard
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const pb = getPktOverviewPeriodBounds();

    const [
      accountTicketsPending,
      accountTicketsOverdue,
      transferTicketsPending,
      depositTicketsPending,
      withdrawTicketsPending,
      transferTicketsOverdue,
      depositTicketsOverdue,
      withdrawTicketsOverdue,
      ...bizAmtBrand
    ] = await Promise.all([
      scalarCount(
        `SELECT COUNT(*) AS c FROM account_tickets WHERE LOWER(TRIM(status)) = 'pending'`
      ),
      /* Overdue = pending and past account SLA (10 min), same rule as admin Accounts tickets UI */
      scalarCount(
        `SELECT COUNT(*) AS c FROM account_tickets
         WHERE LOWER(TRIM(status)) = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
      ),
      scalarCount(`SELECT COUNT(*) AS c FROM transfer_tickets WHERE status = 'pending'`),
      scalarCount(
        `SELECT COUNT(*) AS c FROM deposit_tickets WHERE LOWER(TRIM(status)) = 'pending'`
      ),
      scalarCount(
        `SELECT COUNT(*) AS c FROM withdraw_tickets WHERE LOWER(TRIM(status)) = 'pending'`
      ),
      /* Per direction: brand in/out process minutes (default 15), same as TransfersTab */
      scalarCount(
        `SELECT COUNT(*) AS c FROM transfer_tickets tt
         INNER JOIN brand_companies bc ON bc.id = tt.brand_companies_id
         INNER JOIN brands b ON b.id = bc.brand_id
         WHERE tt.status = 'pending'
           AND tt.created_at < DATE_SUB(
             NOW(),
             INTERVAL CASE
               WHEN tt.direction = 'OUT' THEN COALESCE(b.out_process_minutes, 15)
               ELSE COALESCE(b.in_process_minutes, 15)
             END MINUTE
           )`
      ),
      scalarCount(
        `SELECT COUNT(*) AS c FROM deposit_tickets dt
         LEFT JOIN wallet_companies wc ON wc.id = dt.wallet_company_id
         WHERE LOWER(TRIM(dt.status)) = 'pending'
           AND dt.created_at < DATE_SUB(
             NOW(),
             INTERVAL COALESCE(wc.deposit_process_minutes, 15) MINUTE
           )`
      ),
      scalarCount(
        `SELECT COUNT(*) AS c FROM withdraw_tickets wt
         LEFT JOIN client_wallets cw ON cw.id = wt.client_wallet_id
         LEFT JOIN wallet_companies wc ON wc.id = cw.wallet_company_id
         WHERE LOWER(TRIM(wt.status)) = 'pending'
           AND wt.created_at < DATE_SUB(
             NOW(),
             INTERVAL COALESCE(wc.withdraw_process_minutes, 15) MINUTE
           )`
      ),
      ...PERIOD_KEYS.map((k) => businessSlice(pb[k].start, pb[k].end)),
      ...PERIOD_KEYS.map((k) => businessAmountsSlice(pb[k].start, pb[k].end)),
      loadBrandsAccountsNoActiveMaster(),
    ]);

    const bizSlices = bizAmtBrand.slice(0, PERIOD_KEYS.length);
    const amtSlices = bizAmtBrand.slice(PERIOD_KEYS.length, PERIOD_KEYS.length * 2);
    const brandsAccountsNoActiveMaster = bizAmtBrand[PERIOD_KEYS.length * 2];

    const businessOverview = { periods: {} };
    const amountsOverview = { periods: {} };
    PERIOD_KEYS.forEach((k, i) => {
      businessOverview.periods[k] = bizSlices[i];
      amountsOverview.periods[k] = amtSlices[i];
    });

    return res.json({
      timezone: pb.timezone,
      todayYmd: pb.todayYmd,
      yesterdayYmd: pb.yesterdayYmd,
      asOf: new Date().toISOString(),
      queues: {
        accountTicketsPending,
        accountTicketsOverdue,
        transferTicketsPending,
        depositTicketsPending,
        withdrawTicketsPending,
        transferTicketsOverdue,
        depositTicketsOverdue,
        withdrawTicketsOverdue,
      },
      businessOverview,
      amountsOverview,
      dataQuality: {
        brandsAccountsNoActiveMaster,
      },
    });
  } catch (e) {
    console.error("[admin dashboard] error:", e);
    return res.status(500).json({
      message: "Failed to load dashboard.",
      timezone: "Asia/Karachi",
      todayYmd: null,
      yesterdayYmd: null,
      asOf: new Date().toISOString(),
      queues: {
        accountTicketsPending: 0,
        accountTicketsOverdue: 0,
        transferTicketsPending: 0,
        depositTicketsPending: 0,
        withdrawTicketsPending: 0,
        transferTicketsOverdue: 0,
        depositTicketsOverdue: 0,
        withdrawTicketsOverdue: 0,
      },
      businessOverview: emptyBusinessPeriods(),
      amountsOverview: emptyAmountsPeriods(),
      dataQuality: { brandsAccountsNoActiveMaster: 0 },
    });
  }
};

/**
 * GET /api/admin/notifications/pending-tickets
 * Lightweight pending-queue counts for admin header (same definitions as dashboard queues).
 */
exports.getAdminPendingTicketNotifications = async (req, res) => {
  try {
    const [accountsPending, transfersPending, depositsPending, withdrawsPending] =
      await Promise.all([
        scalarCount(
          `SELECT COUNT(*) AS c FROM account_tickets WHERE LOWER(TRIM(status)) = 'pending'`
        ),
        scalarCount(`SELECT COUNT(*) AS c FROM transfer_tickets WHERE status = 'pending'`),
        scalarCount(
          `SELECT COUNT(*) AS c FROM deposit_tickets WHERE LOWER(TRIM(status)) = 'pending'`
        ),
        scalarCount(
          `SELECT COUNT(*) AS c FROM withdraw_tickets WHERE LOWER(TRIM(status)) = 'pending'`
        ),
      ]);
    const totalPending =
      accountsPending + transfersPending + depositsPending + withdrawsPending;
    return res.json({
      accountsPending,
      transfersPending,
      depositsPending,
      withdrawsPending,
      totalPending,
    });
  } catch (e) {
    console.error("[admin pending notifications] error:", e);
    return res.status(500).json({ message: "Failed to load pending ticket counts." });
  }
};

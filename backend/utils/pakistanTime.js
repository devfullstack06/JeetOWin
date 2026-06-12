/**
 * Pakistan (Asia/Karachi, UTC+5, no DST) calendar boundaries as UTC Date instances
 * for SQL range filters on TIMESTAMP/DATETIME columns.
 */

const TZ = "Asia/Karachi";

/**
 * @returns {string} YYYY-MM-DD in Asia/Karachi for the given instant (default: now).
 */
function pktYmdForInstant(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Add calendar days in Karachi (safe around noon PKT).
 * @param {string} ymd - YYYY-MM-DD (Karachi calendar)
 * @param {number} deltaDays
 * @returns {string} YYYY-MM-DD in Karachi
 */
function pktCalendarAddDays(ymd, deltaDays) {
  const noon = new Date(`${ymd}T12:00:00+05:00`);
  noon.setTime(noon.getTime() + deltaDays * 86400000);
  return pktYmdForInstant(noon);
}

/**
 * Inclusive start/end of a Karachi calendar day as UTC Date objects.
 * @param {string} ymd - YYYY-MM-DD
 * @returns {{ start: Date, end: Date }}
 */
function pktDayBoundsUtc(ymd) {
  const start = new Date(`${ymd}T00:00:00+05:00`);
  const end = new Date(`${ymd}T23:59:59.999+05:00`);
  return { start, end };
}

/**
 * @returns {{
 *   timezone: string,
 *   todayYmd: string,
 *   todayStart: Date,
 *   todayEnd: Date,
 *   sevenDayStartYmd: string,
 *   rangeStart: Date,
 *   rangeEnd: Date,
 * }}
 */
function getPktDashboardBounds() {
  const todayYmd = pktYmdForInstant();
  const sevenDayStartYmd = pktCalendarAddDays(todayYmd, -6);
  const { start: todayStart, end: todayEnd } = pktDayBoundsUtc(todayYmd);
  const { start: rangeStart } = pktDayBoundsUtc(sevenDayStartYmd);
  return {
    timezone: TZ,
    todayYmd,
    todayStart,
    todayEnd,
    sevenDayStartYmd,
    rangeStart,
    rangeEnd: todayEnd,
  };
}

/**
 * Monday = start of week (PKT). Days to subtract from ymd to reach Monday of that week.
 * @param {string} ymd
 */
function pktMondayOffsetFromYmd(ymd) {
  const d = new Date(`${ymd}T12:00:00+05:00`);
  const short = d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" });
  const sun0 = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[short] ?? 0;
  return sun0 === 0 ? 6 : sun0 - 1;
}

/**
 * Bounds for dashboard business/amounts columns (PKT calendar).
 * - thisWeek: Monday 00:00 PKT through end of today
 * - lastWeek: full previous Mon–Sun (PKT)
 * - thisMonth: 1st 00:00 PKT through end of today
 * - lastMonth: full previous calendar month (PKT)
 */
function getPktOverviewPeriodBounds(date = new Date()) {
  const todayYmd = pktYmdForInstant(date);
  const yesterdayYmd = pktCalendarAddDays(todayYmd, -1);

  const monOff = pktMondayOffsetFromYmd(todayYmd);
  const thisWeekMondayYmd = pktCalendarAddDays(todayYmd, -monOff);
  const lastWeekMondayYmd = pktCalendarAddDays(thisWeekMondayYmd, -7);
  const lastWeekSundayYmd = pktCalendarAddDays(thisWeekMondayYmd, -1);

  const [y, m] = todayYmd.split("-").map(Number);
  const thisMonthFirstYmd = `${y}-${String(m).padStart(2, "0")}-01`;
  let ly = y;
  let lm = m - 1;
  if (lm < 1) {
    lm = 12;
    ly -= 1;
  }
  const lastMonthFirstYmd = `${ly}-${String(lm).padStart(2, "0")}-01`;
  const lastMonthLastYmd = pktCalendarAddDays(thisMonthFirstYmd, -1);

  const { start: todayStart, end: todayEnd } = pktDayBoundsUtc(todayYmd);
  const { start: yesterdayStart, end: yesterdayEnd } = pktDayBoundsUtc(yesterdayYmd);

  const thisWeekStart = pktDayBoundsUtc(thisWeekMondayYmd).start;
  const lastWeekStart = pktDayBoundsUtc(lastWeekMondayYmd).start;
  const lastWeekEnd = pktDayBoundsUtc(lastWeekSundayYmd).end;

  const thisMonthStart = pktDayBoundsUtc(thisMonthFirstYmd).start;
  const lastMonthStart = pktDayBoundsUtc(lastMonthFirstYmd).start;
  const lastMonthEnd = pktDayBoundsUtc(lastMonthLastYmd).end;

  return {
    timezone: TZ,
    todayYmd,
    yesterdayYmd,
    today: { start: todayStart, end: todayEnd },
    yesterday: { start: yesterdayStart, end: yesterdayEnd },
    thisWeek: { start: thisWeekStart, end: todayEnd },
    lastWeek: { start: lastWeekStart, end: lastWeekEnd },
    thisMonth: { start: thisMonthStart, end: todayEnd },
    lastMonth: { start: lastMonthStart, end: lastMonthEnd },
  };
}

/**
 * Last calendar day YYYY-MM-DD for a Karachi month (ym = YYYY-MM).
 * @param {string} ym
 * @returns {string}
 */
function pktLastDayOfMonthYmd(ym) {
  const [y, m] = String(ym).split("-").map(Number);
  const next =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return pktCalendarAddDays(next, -1);
}

/**
 * Inclusive UTC bounds for a full Karachi calendar month.
 * @param {string} ym - YYYY-MM
 * @returns {{ start: Date, end: Date, ym: string }}
 */
function pktMonthBoundsUtc(ym) {
  const firstYmd = `${String(ym).slice(0, 7)}-01`;
  const lastYmd = pktLastDayOfMonthYmd(String(ym).slice(0, 7));
  const { start } = pktDayBoundsUtc(firstYmd);
  const { end } = pktDayBoundsUtc(lastYmd);
  return { start, end, ym: String(ym).slice(0, 7) };
}

/**
 * Previous Karachi calendar month as YYYY-MM.
 * @param {Date} [date]
 * @returns {string}
 */
function pktPreviousMonthYm(date = new Date()) {
  const ymd = pktYmdForInstant(date);
  const [y, m] = ymd.split("-").map(Number);
  let py = y;
  let pm = m - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  return `${py}-${String(pm).padStart(2, "0")}`;
}

/**
 * Format month label like Oct'25 for client UI.
 * @param {string} ym - YYYY-MM
 */
function pktMonthLabel(ym) {
  const [y, m] = String(ym).split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mon = names[m - 1] || String(m);
  return `${mon}'${String(y).slice(-2)}`;
}

module.exports = {
  getPktDashboardBounds,
  getPktOverviewPeriodBounds,
  pktYmdForInstant,
  pktCalendarAddDays,
  pktDayBoundsUtc,
  pktLastDayOfMonthYmd,
  pktMonthBoundsUtc,
  pktPreviousMonthYm,
  pktMonthLabel,
};


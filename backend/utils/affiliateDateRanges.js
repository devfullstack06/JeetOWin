/**
 * Date range presets for affiliate dashboard/reports (Asia/Karachi).
 */

const {
  pktYmdForInstant,
  pktCalendarAddDays,
  pktDayBoundsUtc,
  pktMonthBoundsUtc,
  pktLastDayOfMonthYmd,
} = require("./pakistanTime");

function parseAffiliateDateRange(query = {}) {
  const preset = String(query.preset || query.range || "this_month").trim().toLowerCase();
  const todayYmd = pktYmdForInstant();
  const customStart = String(query.startDate || query.start || "").trim();
  const customEnd = String(query.endDate || query.end || "").trim();

  if (preset === "custom" && customStart && customEnd) {
    const { start } = pktDayBoundsUtc(customStart);
    const { end } = pktDayBoundsUtc(customEnd);
    return {
      preset: "custom",
      startYmd: customStart,
      endYmd: customEnd,
      start,
      end,
    };
  }

  if (preset === "today") {
    const { start, end } = pktDayBoundsUtc(todayYmd);
    return { preset: "today", startYmd: todayYmd, endYmd: todayYmd, start, end };
  }

  if (preset === "yesterday") {
    const ymd = pktCalendarAddDays(todayYmd, -1);
    const { start, end } = pktDayBoundsUtc(ymd);
    return { preset: "yesterday", startYmd: ymd, endYmd: ymd, start, end };
  }

  if (preset === "7days" || preset === "7_days" || preset === "last_7_days") {
    const startYmd = pktCalendarAddDays(todayYmd, -6);
    const { start } = pktDayBoundsUtc(startYmd);
    const { end } = pktDayBoundsUtc(todayYmd);
    return { preset: "7days", startYmd, endYmd: todayYmd, start, end };
  }

  if (preset === "30days" || preset === "30_days" || preset === "last_30_days") {
    const startYmd = pktCalendarAddDays(todayYmd, -29);
    const { start } = pktDayBoundsUtc(startYmd);
    const { end } = pktDayBoundsUtc(todayYmd);
    return { preset: "30days", startYmd, endYmd: todayYmd, start, end };
  }

  const monthYm = todayYmd.slice(0, 7);
  const { start } = pktMonthBoundsUtc(monthYm);
  const endYmd = pktLastDayOfMonthYmd(monthYm);
  const { end } = pktDayBoundsUtc(todayYmd);
  return {
    preset: "this_month",
    startYmd: `${monthYm}-01`,
    endYmd,
    start,
    end,
    monthYm,
  };
}

module.exports = {
  parseAffiliateDateRange,
};

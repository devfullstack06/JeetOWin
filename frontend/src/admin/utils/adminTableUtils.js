export function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }
  
  export function normalizeStr(v) {
    return String(v || "").trim().toLowerCase();
  }
  
  export function inDateRange(isoDateTime, startDate, endDate) {
    // isoDateTime: "YYYY-MM-DD HH:mm:ss" or ISO string
    // startDate/endDate: "YYYY-MM-DD"
    if (!startDate && !endDate) return true;
    const d = isoDateTime ? new Date(isoDateTime.replace(" ", "T")) : null;
    if (!d || Number.isNaN(d.getTime())) return false;
  
    const startOk = startDate ? d >= new Date(startDate + "T00:00:00") : true;
    const endOk = endDate ? d <= new Date(endDate + "T23:59:59") : true;
    return startOk && endOk;
  }
  
  export function applyUsersFilters(rows, filters) {
    const u = normalizeStr(filters.username);
    const c = normalizeStr(filters.contact);
  
    return rows.filter((r) => {
      if (u && !normalizeStr(r.username).includes(u)) return false;
      if (c && !normalizeStr(r.contact).includes(c)) return false;
  
      if (!inDateRange(r.joinDateISO, filters.startDate, filters.endDate)) {
        return false;
      }
      return true;
    });
  }
  
  export function sortRows(rows, sort) {
    if (!sort?.key || !sort?.dir) return rows;
  
    const dirMul = sort.dir === "asc" ? 1 : -1;
    const key = sort.key;
  
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
  
      // numeric
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dirMul;
      }
  
      // date
      if (key === "joinDateISO") {
        const ad = new Date(String(av).replace(" ", "T")).getTime();
        const bd = new Date(String(bv).replace(" ", "T")).getTime();
        return (ad - bd) * dirMul;
      }
  
      // string
      const as = String(av ?? "").toLowerCase();
      const bs = String(bv ?? "").toLowerCase();
      if (as < bs) return -1 * dirMul;
      if (as > bs) return 1 * dirMul;
      return 0;
    });
  
    return copy;
  }
  
  export function paginate(rows, page, pageSize) {
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = clamp(page, 1, totalPages);
  
    const startIdx = (safePage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return {
      total,
      totalPages,
      page: safePage,
      items: rows.slice(startIdx, endIdx),
    };
  }
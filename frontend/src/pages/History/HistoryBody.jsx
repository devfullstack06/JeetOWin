import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Filter, History, ZoomIn, ZoomOut } from "lucide-react";
import { apiFetch } from "../../services/api";
import ClientDateRange from "../../components/ClientDateRange/ClientDateRange";
import { getApiOrigin } from "../../utils/walletIconUrl";
import AdminPagination from "../../admin/components/AdminPagination/AdminPagination";
import "../../admin/components/AdminPagination/adminPagination.css";
import "../../admin/pages/Users/usersPage.css";
import "../Transfers/transfersBody.css";
import "./historyBody.css";

const TAB_ALL = "all";
const TAB_DEPOSITS = "deposits";
const TAB_WITHDRAWS = "withdraws";
const TAB_TRANSFERS = "transfers";

const VALID_TABS = new Set([TAB_ALL, TAB_DEPOSITS, TAB_WITHDRAWS, TAB_TRANSFERS]);

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SLIP_ZOOM_MIN = 50;
const SLIP_ZOOM_MAX = 200;
const SLIP_ZOOM_STEP = 25;

function parsePageFromSearch(searchParams) {
  const p = parseInt(String(searchParams.get("page") || "1"), 10);
  return Number.isFinite(p) && p > 0 ? p : 1;
}

function parsePageSizeFromSearch(searchParams) {
  const n = parseInt(String(searchParams.get("pageSize") || "25"), 10);
  return PAGE_SIZE_OPTIONS.includes(n) ? n : 25;
}

function formatIntPk(n) {
  if (n == null || Number.isNaN(Number(n))) return "0";
  return Math.round(Number(n)).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function formatHistoryDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm} ${hh}:${min}`;
}

function toLocalYmd(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localYmdToday() {
  return toLocalYmd(new Date());
}

function periodLabelFromRange(fromStr, toStr) {
  if (!fromStr && !toStr) return "Today";
  const today = localYmdToday();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const last7From = ymd(new Date(y, m, now.getDate() - 6));
  const monthFrom = ymd(new Date(y, m, 1));
  const monthTo = ymd(new Date(y, m + 1, 0));
  const lastMonthFrom = ymd(new Date(y, m - 1, 1));
  const lastMonthTo = ymd(new Date(y, m, 0));

  if (fromStr === today && toStr === today) return "Today";
  if (fromStr === last7From && toStr === today) return "Last 7 Days";
  if (fromStr === monthFrom && toStr === monthTo) return "This Month";
  if (fromStr === lastMonthFrom && toStr === lastMonthTo) return "Last Month";
  return "Custom Date";
}

function inDateRange(iso, fromStr, toStr) {
  if (!fromStr && !toStr) return true;
  const ymd = toLocalYmd(iso);
  if (!ymd) return false;
  if (fromStr && ymd < fromStr) return false;
  if (toStr && ymd > toStr) return false;
  return true;
}

function signedDelta(kind, amount) {
  const a = Math.round(Number(amount || 0));
  if (kind === "deposit" || kind === "transfer_out") return a;
  if (kind === "withdraw" || kind === "transfer_in") return -a;
  return 0;
}

function attachBalances(items, currentBalance) {
  const sumDelta = items.reduce((s, r) => s + signedDelta(r.kind, r.amount), 0);
  let bal = Math.round(Number(currentBalance || 0)) - sumDelta;
  return items.map((r) => {
    const balanceBefore = bal;
    bal += signedDelta(r.kind, r.amount);
    return { ...r, balanceBefore, balanceAfter: bal };
  });
}

function ticketRemainingSeconds(createdAtIso, processMinutes = 15) {
  if (!createdAtIso) return null;
  const created = new Date(createdAtIso).getTime();
  if (Number.isNaN(created)) return null;
  const end = created + (processMinutes || 15) * 60 * 1000;
  return Math.floor((end - Date.now()) / 1000);
}

function getTicketStatusDisplay(row) {
  const s = (row?.status || "").toLowerCase();
  if (s === "approved") return { label: "Approved", className: "jw-depositState-approved" };
  if (s === "rejected") return { label: "Rejected", className: "jw-depositState-rejected" };
  const pm = row?.processMinutes != null ? Number(row.processMinutes) : 15;
  const sec = ticketRemainingSeconds(row?.createdAt, pm);
  if (sec !== null && sec < 0) return { label: "Overdue", className: "jw-depositState-overdue" };
  return { label: "Pending", className: "jw-depositState-pending" };
}

function modalTitleForKind(kind) {
  if (kind === "deposit") return "Deposit";
  if (kind === "withdraw") return "Withdraw";
  if (kind === "transfer") return "Transfer";
  return "Ticket";
}

function buildTicketsQuery(tab, fromDate, toDate, brand, trx, page, pageSize) {
  const q = new URLSearchParams();
  q.set("tab", tab);
  if (fromDate) q.set("from", fromDate);
  if (toDate) q.set("to", toDate);
  if (brand) q.set("brand", brand);
  const t = trx.trim();
  if (t) q.set("trx", t);
  q.set("page", String(page));
  q.set("pageSize", String(pageSize));
  return q.toString();
}

export default function HistoryBody() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabRaw = (searchParams.get("tab") || TAB_ALL).toLowerCase();
  const tab = VALID_TABS.has(tabRaw) ? tabRaw : TAB_ALL;
  const fromDate = searchParams.get("from") || "";
  const toDate = searchParams.get("to") || "";
  const brand = searchParams.get("brand") || "";
  const trx = searchParams.get("trx") || "";
  const page = parsePageFromSearch(searchParams);
  const pageSize = parsePageSizeFromSearch(searchParams);

  const isTicketTab = tab !== TAB_ALL;

  const setQuery = useCallback(
    (updates) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value == null || value === "") next.delete(key);
            else next.set(key, String(value));
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const onPageChange = useCallback(
    (p) => {
      setQuery({ page: String(p) });
    },
    [setQuery]
  );

  const onPageSizeChange = useCallback(
    (s) => {
      setQuery({ pageSize: String(s), page: "1" });
    },
    [setQuery]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [ticketPayload, setTicketPayload] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);
  const [depositSlipShown, setDepositSlipShown] = useState(false);
  const [slipZoomPct, setSlipZoomPct] = useState(100);
  const [slipImgError, setSlipImgError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const skipDateDefaultRef = useRef(false);
  const filterKeyRef = useRef(null);

  useEffect(() => {
    const key = `${tab}|${fromDate}|${toDate}|${brand}|${trx}`;
    if (filterKeyRef.current === null) {
      filterKeyRef.current = key;
      return;
    }
    if (filterKeyRef.current === key) return;
    filterKeyRef.current = key;
    setSearchParams(
      (prev) => {
        const cur = prev.get("page");
        if (!cur || cur === "1") return prev;
        const next = new URLSearchParams(prev);
        next.set("page", "1");
        return next;
      },
      { replace: true }
    );
  }, [tab, fromDate, toDate, brand, trx, setSearchParams]);

  useEffect(() => {
    setDepositSlipShown(false);
    setSlipZoomPct(100);
    setSlipImgError(false);
  }, [viewTicket?.id, viewTicket?.kind]);

  useLayoutEffect(() => {
    if (skipDateDefaultRef.current) return;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) return;
    const today = localYmdToday();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("from", today);
        next.set("to", today);
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  const onDateRangeChange = useCallback(
    ({ startDate: s, endDate: e }) => {
      if (!s && !e) skipDateDefaultRef.current = true;
      setQuery({ from: s || "", to: e || "" });
    },
    [setQuery]
  );

  useEffect(() => {
    if (isTicketTab) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    apiFetch("/api/client/history")
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load history.");
        setPayload(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isTicketTab]);

  useEffect(() => {
    if (!isTicketTab) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const qs = buildTicketsQuery(tab, fromDate, toDate, brand, trx, page, pageSize);
    apiFetch(`/api/client/history/tickets?${qs}`)
      .then((data) => {
        if (cancelled) return;
        setTicketPayload(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load ticket history.");
        setTicketPayload(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isTicketTab, tab, fromDate, toDate, brand, trx, page, pageSize]);

  const rawItems = payload?.items || [];
  const currentBalance = payload?.currentBalance ?? 0;

  const withBalances = useMemo(
    () => attachBalances(rawItems, currentBalance),
    [rawItems, currentBalance]
  );

  const filtered = useMemo(() => {
    if (tab !== TAB_ALL) return [];
    const trxLower = trx.trim().toLowerCase();
    return withBalances.filter((r) => {
      if (brand && String(r.brandLabel || "") !== brand) return false;
      if (trxLower && !String(r.ledgerTransactionNumber || "").toLowerCase().includes(trxLower)) {
        return false;
      }
      if (!inDateRange(r.updatedAt, fromDate, toDate)) return false;
      return true;
    });
  }, [withBalances, tab, brand, trx, fromDate, toDate]);

  const displayRows = useMemo(() => {
    if (tab !== TAB_ALL || filtered.length === 0) return filtered;
    const first = filtered[0];
    const opening = {
      id: "opening",
      isOpening: true,
      openingBalance: first.balanceBefore,
    };
    return [opening, ...filtered];
  }, [filtered, tab]);

  const pagedAllRows = useMemo(() => {
    if (tab !== TAB_ALL) return [];
    const total = displayRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [tab, displayRows, page, pageSize]);

  const ticketRows = ticketPayload?.items || [];
  const ticketTotalCount = ticketPayload?.totalCount ?? 0;

  const truncated = tab === TAB_ALL ? !!payload?.truncated : false;
  const truncatedShownCount = tab === TAB_ALL ? rawItems.length : ticketTotalCount;

  const brandOptions =
    tab === TAB_ALL ? payload?.brandOptions || [] : ticketPayload?.brandOptions || [];

  const handleClose = () => navigate("/");

  const filterActive = !!(brand || trx.trim()) || filtersOpen;
  const periodLabel = useMemo(() => periodLabelFromRange(fromDate, toDate), [fromDate, toDate]);
  const showingDataText = useMemo(() => {
    const parts = [periodLabel];
    if (brand) parts.push(brand);
    if (trx.trim()) parts.push(`Trx No. ${trx.trim()}`);
    return `Showing data for: ${parts.join(" - ")}`;
  }, [periodLabel, brand, trx]);

  const viewTicketStatus = viewTicket ? getTicketStatusDisplay(viewTicket) : null;
  const viewSlipUrl =
    viewTicket &&
    viewTicket.kind === "deposit" &&
    viewTicket.slipPath &&
    String(viewTicket.slipPath).length
      ? `${getApiOrigin()}${viewTicket.slipPath}`
      : null;
  const viewTicketStatusKey = viewTicket ? String(viewTicket.status || "").toLowerCase() : "";
  const viewKind = viewTicket?.kind;

  return (
    <section className="jw-transfersPage">
      <div className="jw-transfersCard">
        <div className="jw-transfersHeader">
          <div className="jw-transfersHeaderLeft">
            <span className="jw-transfersIcon" aria-hidden>
              <History size={24} />
            </span>
            <h2 className="jw-transfersTitle">History</h2>
          </div>
          <button type="button" className="jw-transfersClose" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="jw-historyTabsRow">
          <div className="jw-historyTabs" role="tablist" aria-label="History category">
            {[
              { id: TAB_ALL, label: "All" },
              { id: TAB_DEPOSITS, label: "Deposits" },
              { id: TAB_WITHDRAWS, label: "Withdraws" },
              { id: TAB_TRANSFERS, label: "Transfers" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`jw-historyTab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setQuery({ tab: t.id === TAB_ALL ? "" : t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="jw-historyFilterBar">
            <div className="jw-historyFilterSummary">{showingDataText}</div>
            <button
              type="button"
              className={`jw-historyFilterToggle ${filterActive || filtersOpen ? "is-active" : ""}`}
              aria-expanded={filtersOpen}
              aria-label="Filters"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="jw-historyFilterPanel">
            <div className="jw-historyFilterGrid">
              <div className="jw-historyFilterField">
                <label htmlFor="jw-history-date">Date range</label>
                <ClientDateRange
                  startDate={fromDate}
                  endDate={toDate}
                  placeholder="Please Select"
                  onChange={onDateRangeChange}
                />
              </div>
              <div className="jw-historyFilterField">
                <label htmlFor="jw-history-brand">Brand</label>
                <select
                  id="jw-history-brand"
                  className="jw-historySelect"
                  value={brand}
                  onChange={(e) => setQuery({ brand: e.target.value })}
                >
                  <option value="">All</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="jw-historyFilterField" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="jw-history-trx">Trx No.</label>
                <input
                  id="jw-history-trx"
                  className="jw-historyTrxInput"
                  type="search"
                  placeholder={isTicketTab ? "Search trx or ledger no." : "Search ledger transaction no."}
                  value={trx}
                  onChange={(e) => setQuery({ trx: e.target.value })}
                />
              </div>
            </div>
          </div>
        ) : null}

        {error ? <div className="jw-historyNotice is-warn">{error}</div> : null}
        {truncated ? (
          <div className="jw-historyNotice is-warn">
            Showing the latest {truncatedShownCount} entries. Older activity is not included in this view.
          </div>
        ) : null}

        <div className="jw-historyBody">
        {loading ? (
          <div className="jw-historyEmpty jw-historyEmpty--fill">Loading…</div>
        ) : isTicketTab ? (
          ticketRows.length === 0 ? (
            <div className="jw-historyEmpty jw-historyEmpty--fill">
              No transactions found within the date range. please change dates in the filters.
            </div>
          ) : (
            <>
              <div className="jw-historyTableScroll">
              <div className="jw-historyTableWrap jw-historyTableWrap--tickets">
                <table className="jw-historyTable jw-historyTable--tickets">
                  <thead>
                    <tr>
                      <th>Ticket id</th>
                      <th>Date</th>
                      <th>Brand</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th className="jw-historyStickyViewCol">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketRows.map((row) => {
                      const st = (row.status || "").toLowerCase();
                      const showTicketId = st === "pending" || st === "rejected";
                      const sd = getTicketStatusDisplay(row);
                      return (
                        <tr key={`${row.kind}-${row.id}`}>
                          <td>{showTicketId ? row.id : "—"}</td>
                          <td>{formatHistoryDate(row.updatedAt)}</td>
                          <td>{row.brandLabel || "—"}</td>
                          <td>{formatIntPk(row.amount)}</td>
                          <td>
                            <span className={sd.className}>{sd.label}</span>
                          </td>
                          <td className="jw-historyStickyViewCol">
                            <button
                              type="button"
                              className="jw-historyViewBtn"
                              title="View"
                              aria-label="View"
                              onClick={() => setViewTicket(row)}
                            >
                              <Eye size={16} strokeWidth={2} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>
              <div className="jw-historyPagination">
                <AdminPagination
                  total={ticketTotalCount}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                />
              </div>
            </>
          )
        ) : displayRows.length === 0 ? (
          <div className="jw-historyEmpty jw-historyEmpty--fill">
            No transactions found within the date range. please change dates in the filters.
          </div>
        ) : (
          <>
            <div className="jw-historyTableScroll">
            <div className="jw-historyTableWrap">
              <table className="jw-historyTable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Brand</th>
                    <th>Amount</th>
                    <th>Balance</th>
                    <th>Trx No.</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAllRows.map((row) => {
                    if (row.isOpening) {
                      return (
                        <tr key={row.id} className="is-opening">
                          <td>—</td>
                          <td>—</td>
                          <td>Opening balance</td>
                          <td>—</td>
                          <td>{formatIntPk(row.openingBalance)}</td>
                          <td>—</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={row.id}>
                        <td>{formatHistoryDate(row.updatedAt)}</td>
                        <td className="jw-historyType">{row.typeCode || "—"}</td>
                        <td>{row.brandLabel || "—"}</td>
                        <td>{formatIntPk(row.amount)}</td>
                        <td>{formatIntPk(row.balanceAfter)}</td>
                        <td>{row.ledgerTransactionNumber || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
            <div className="jw-historyPagination">
              <AdminPagination
                total={displayRows.length}
                page={page}
                pageSize={pageSize}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </div>
          </>
        )}
        </div>

        {viewTicket ? (
          <div
            className="jw-historyTicketModalOverlay"
            role="presentation"
            onClick={() => setViewTicket(null)}
          >
            <div
              className="jw-historyTicketModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="jw-history-ticket-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="jw-historyTicketModal__header">
                <h3 id="jw-history-ticket-modal-title" className="jw-historyTicketModal__title">
                  {modalTitleForKind(viewTicket.kind)}
                </h3>
                <button
                  type="button"
                  className="jw-historyTicketModal__close"
                  aria-label="Close"
                  onClick={() => setViewTicket(null)}
                >
                  ×
                </button>
              </div>
              <div className="jw-historyTicketModal__body">
                {viewTicketStatus ? (
                  <div className="jw-historyTicketModal__statusRow">
                    <span className="jw-historyTicketModal__label">Status:</span>{" "}
                    <span className={viewTicketStatus.className}>{viewTicketStatus.label}</span>
                  </div>
                ) : null}
                <div className="jw-historyTicketModal__info">
                  {(viewTicketStatusKey === "pending" || viewTicketStatusKey === "rejected") && (
                    <div>
                      <span className="jw-historyTicketModal__label">Ticket id:</span> {viewTicket.id}
                    </div>
                  )}
                  <div>
                    <span className="jw-historyTicketModal__label">Amount:</span>{" "}
                    {formatIntPk(viewTicket.amount)}
                  </div>
                  {viewTicketStatusKey === "approved" && (
                    <div>
                      <span className="jw-historyTicketModal__label">Trx No.:</span>{" "}
                      {viewTicket.ledgerTransactionNumber || "—"}
                    </div>
                  )}
                  {viewKind === "deposit" || viewKind === "withdraw" ? (
                    <div>
                      <span className="jw-historyTicketModal__label">Brand:</span>{" "}
                      {viewTicket.brandLabel || "—"}
                    </div>
                  ) : null}
                  <div>
                    <span className="jw-historyTicketModal__label">Created at:</span>{" "}
                    {formatHistoryDate(viewTicket.createdAt)}
                  </div>
                  <div>
                    <span className="jw-historyTicketModal__label">Created by:</span>{" "}
                    {viewTicket.createdBySelf ? "Self" : "System"}
                  </div>
                  {viewKind === "transfer" ? (
                    <>
                      <div>
                        <span className="jw-historyTicketModal__label">Direction:</span>{" "}
                        {viewTicket.direction || "—"}
                      </div>
                      <div>
                        <span className="jw-historyTicketModal__label">Brand:</span>{" "}
                        {viewTicket.clientAccountBrandName ||
                          viewTicket.brandLabel ||
                          "—"}
                      </div>
                      <div>
                        <span className="jw-historyTicketModal__label">Account:</span>{" "}
                        {viewTicket.clientAccountUsername || "—"}
                      </div>
                    </>
                  ) : null}
                  {viewKind === "deposit" || viewKind === "withdraw" ? (
                    <div>
                      <span className="jw-historyTicketModal__label">Wallet:</span>{" "}
                      {viewTicket.walletName || "—"}
                    </div>
                  ) : null}
                  {viewKind === "deposit" ? (
                    <div className="jw-historyTicketModal__slipBlock">
                      <div>
                        <span className="jw-historyTicketModal__label">Slip:</span>{" "}
                        {viewSlipUrl ? (
                          <button
                            type="button"
                            className="jw-historyTicketModal__link"
                            onClick={() => setDepositSlipShown((v) => !v)}
                          >
                            {depositSlipShown ? "Hide" : "View"}
                          </button>
                        ) : (
                          "—"
                        )}
                      </div>
                      {viewSlipUrl && depositSlipShown ? (
                        <div className="jw-historyTicketModal__slipViewer">
                          <div className="jw-historyTicketModal__slipToolbar">
                            <button
                              type="button"
                              className="jw-depositSlipModal__zoomBtn"
                              aria-label="Zoom out"
                              onClick={() =>
                                setSlipZoomPct((z) => Math.max(SLIP_ZOOM_MIN, z - SLIP_ZOOM_STEP))
                              }
                              disabled={slipZoomPct <= SLIP_ZOOM_MIN}
                            >
                              <ZoomOut size={16} />
                            </button>
                            <button
                              type="button"
                              className="jw-depositSlipModal__zoomBtn"
                              aria-label="Zoom in"
                              onClick={() =>
                                setSlipZoomPct((z) => Math.min(SLIP_ZOOM_MAX, z + SLIP_ZOOM_STEP))
                              }
                              disabled={slipZoomPct >= SLIP_ZOOM_MAX}
                            >
                              <ZoomIn size={16} />
                            </button>
                          </div>
                          <div className="jw-historyTicketModal__slipScroll">
                            {slipImgError ? (
                              <div className="jw-depositSlipModal__error">
                                Image could not be loaded.
                              </div>
                            ) : (
                              <img
                                src={viewSlipUrl}
                                alt="Deposit slip"
                                className="jw-depositSlipModal__img"
                                style={{
                                  width: slipZoomPct === 100 ? "auto" : `${slipZoomPct}%`,
                                  maxWidth: slipZoomPct === 100 ? "100%" : "none",
                                  maxHeight:
                                    slipZoomPct === 100 ? "min(48vh, 280px)" : "none",
                                }}
                                onError={() => setSlipImgError(true)}
                              />
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {viewTicketStatusKey === "rejected" ? (
                    <div>
                      <span className="jw-historyTicketModal__label">Reason:</span>{" "}
                      {viewTicket.reason ? String(viewTicket.reason) : "—"}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="jw-historyTicketModal__actions">
                <button type="button" className="jw-historyTicketModal__btn" onClick={() => setViewTicket(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { History, Filter } from "lucide-react";
import { apiFetch } from "../../services/api";
import ClientDateRange from "../../components/ClientDateRange/ClientDateRange";
import "../Transfers/transfersBody.css";
import "./historyBody.css";

const TAB_ALL = "all";
const TAB_DEPOSITS = "deposits";
const TAB_WITHDRAWS = "withdraws";
const TAB_TRANSFERS = "transfers";

const VALID_TABS = new Set([TAB_ALL, TAB_DEPOSITS, TAB_WITHDRAWS, TAB_TRANSFERS]);

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

function tabMatches(kind, tab) {
  if (tab === TAB_ALL) return true;
  if (tab === TAB_DEPOSITS) return kind === "deposit";
  if (tab === TAB_WITHDRAWS) return kind === "withdraw";
  if (tab === TAB_TRANSFERS) return kind === "transfer_in" || kind === "transfer_out";
  return true;
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

export default function HistoryBody() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabRaw = (searchParams.get("tab") || TAB_ALL).toLowerCase();
  const tab = VALID_TABS.has(tabRaw) ? tabRaw : TAB_ALL;
  const fromDate = searchParams.get("from") || "";
  const toDate = searchParams.get("to") || "";
  const brand = searchParams.get("brand") || "";
  const trx = searchParams.get("trx") || "";

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const skipDateDefaultRef = useRef(false);

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
  }, []);

  const rawItems = payload?.items || [];
  const currentBalance = payload?.currentBalance ?? 0;
  const truncated = !!payload?.truncated;
  const brandOptions = payload?.brandOptions || [];

  const withBalances = useMemo(
    () => attachBalances(rawItems, currentBalance),
    [rawItems, currentBalance]
  );

  const filtered = useMemo(() => {
    const trxLower = trx.trim().toLowerCase();
    return withBalances.filter((r) => {
      if (!tabMatches(r.kind, tab)) return false;
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

  const handleClose = () => navigate("/");

  const filterActive = !!(brand || trx.trim()) || filtersOpen;

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
          <button
            type="button"
            className={`jw-historyFilterToggle ${filterActive || filtersOpen ? "is-active" : ""}`}
            aria-expanded={filtersOpen}
            aria-label="Filters"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter size={22} />
          </button>
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
                  placeholder="Search ledger transaction no."
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
            Showing the latest {rawItems.length} entries. Older activity is not included in this view.
          </div>
        ) : null}

        {loading ? (
          <div className="jw-historyEmpty">Loading…</div>
        ) : displayRows.length === 0 ? (
          <div className="jw-historyEmpty">
            No transactions found within the date range. please change dates in the filters.
          </div>
        ) : (
          <div className="jw-historyTableWrap">
            <table className="jw-historyTable">
              <thead>
                <tr>
                  <th>Date</th>
                  {tab === TAB_ALL ? <th>Type</th> : null}
                  <th>Brand</th>
                  <th>Amount</th>
                  {tab === TAB_ALL ? <th>Balance</th> : null}
                  <th>Trx No.</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => {
                  if (row.isOpening) {
                    return (
                      <tr key={row.id} className="is-opening">
                        <td>—</td>
                        {tab === TAB_ALL ? <td>—</td> : null}
                        <td>Opening balance</td>
                        <td>—</td>
                        {tab === TAB_ALL ? <td>{formatIntPk(row.openingBalance)}</td> : null}
                        <td>—</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={row.id}>
                      <td>{formatHistoryDate(row.updatedAt)}</td>
                      {tab === TAB_ALL ? (
                        <td className="jw-historyType">{row.typeCode || "—"}</td>
                      ) : null}
                      <td>{row.brandLabel || "—"}</td>
                      <td>{formatIntPk(row.amount)}</td>
                      {tab === TAB_ALL ? <td>{formatIntPk(row.balanceAfter)}</td> : null}
                      <td>{row.ledgerTransactionNumber || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

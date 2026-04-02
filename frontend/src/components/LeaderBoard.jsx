import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Medal, Filter, Coins, Trophy, Check } from "lucide-react";
import "./leaderBoard.css";

export const LEADERBOARD_PERIODS = [
  { id: "today", label: "Today" },
  { id: "last7", label: "Last 7 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
];

const DEPOSITORS_SAMPLE = Array.from({ length: 14 }).map((_, i) => ({
  id: `dep-${i}`,
  user: "did***y989",
  duration: "30 days",
  amount: "50,000",
}));

const WINNERS_SAMPLE = Array.from({ length: 14 }).map((_, i) => ({
  id: `win-${i}`,
  user: "did***y989",
  duration: "7 days",
  amount: "50,000",
}));

function rowDuration(r) {
  if (r.duration != null && String(r.duration).trim() !== "") return r.duration;
  if (r.time != null && String(r.time).trim() !== "") return r.time;
  return "—";
}

function LeaderBoardTable({ rows, ariaLabel }) {
  return (
      <div className="jw-lbTable">
        <div className="jw-lbRow jw-lbHeaderRow" role="row">
          <div className="jw-lbCell col-user" role="columnheader">
            User
          </div>
          <div className="jw-lbCell col-duration" role="columnheader">
            Duration
          </div>
          <div className="jw-lbCell col-amount" role="columnheader">
            Amount
          </div>
        </div>
        <div className="jw-lbBody" role="rowgroup" aria-label={ariaLabel}>
          {rows.map((r, idx) => (
            <div
              key={r.id}
              className={`jw-lbRow ${idx % 2 === 0 ? "is-even" : "is-odd"}`}
              role="row"
            >
              <div className="jw-lbCell col-user" role="cell">
                {r.user ?? "—"}
              </div>
              <div className="jw-lbCell col-duration" role="cell">
                {rowDuration(r)}
              </div>
              <div className="jw-lbCell col-amount" role="cell">
                {r.amount ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
  );
}

function useIsDesktop(minWidth = 769) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [minWidth]);

  return isDesktop;
}

export default function LeaderBoard({
  title = "Leader Board",
  depositors = DEPOSITORS_SAMPLE,
  winners = WINNERS_SAMPLE,
}) {
  const [tab, setTab] = useState("depositors"); // "depositors" | "winners"
  const [filterOpen, setFilterOpen] = useState(false);
  const [period, setPeriod] = useState("last7");
  const [remoteRows, setRemoteRows] = useState({ depositors: null, winners: null });

  const isDepositors = tab === "depositors";
  const isDesktop = useIsDesktop(769);

  const selectedPeriodLabel = useMemo(() => {
    const found = LEADERBOARD_PERIODS.find((p) => p.id === period);
    return found ? found.label : "Today";
  }, [period]);
  const effectiveDepositors = remoteRows.depositors ?? depositors;
  const effectiveWinners = remoteRows.winners ?? winners;
  const rows = useMemo(() => (isDepositors ? effectiveDepositors : effectiveWinners), [
    isDepositors,
    effectiveDepositors,
    effectiveWinners,
  ]);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/leaderboard/public?period=${encodeURIComponent(period)}&limit=14`)
      .then((r) => r.json())
      .then((data) => {
        if (ignore) return;
        setRemoteRows({
          depositors: Array.isArray(data?.depositors) ? data.depositors : [],
          winners: Array.isArray(data?.winners) ? data.winners : [],
        });
      })
      .catch(() => {
        if (!ignore) setRemoteRows({ depositors: null, winners: null });
      });
    return () => {
      ignore = true;
    };
  }, [period]);

  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filterOpen]);

  useEffect(() => {
    if (!filterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterOpen]);

  const filterModal =
    filterOpen &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="jw-lbFilterOverlay"
        role="presentation"
        onClick={() => setFilterOpen(false)}
      >
        <div
          className="jw-lbFilterModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jw-lb-filter-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="jw-lbFilterModalHead">
            <h2 id="jw-lb-filter-title" className="jw-lbFilterModalTitle">
              Period
            </h2>
            <button
              type="button"
              className="jw-lbFilterModalClose"
              aria-label="Close"
              onClick={() => setFilterOpen(false)}
            >
              ×
            </button>
          </div>
          <ul className="jw-lbFilterList" role="listbox" aria-label="Select period">
            {LEADERBOARD_PERIODS.map((p) => {
              const selected = period === p.id;
              return (
                <li key={p.id} className="jw-lbFilterListItem">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`jw-lbFilterOption ${selected ? "is-selected" : ""}`}
                    onClick={() => {
                      setPeriod(p.id);
                      setFilterOpen(false);
                    }}
                  >
                    <span className="jw-lbFilterOptionLabel">{p.label}</span>
                    {selected ? (
                      <Check size={18} className="jw-lbFilterOptionCheck" aria-hidden />
                    ) : (
                      <span className="jw-lbFilterOptionSpacer" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>,
      document.body
    );

  return (
    <section className="jw-lb" aria-label={title}>
      {filterModal}

      <div className="jw-lbHead">
        <div className="jw-lbTitleWrap">
          <Medal size={18} className="jw-lbIcon" aria-hidden="true" />
          <div className="jw-lbTitle">{title}</div>
        </div>

        <div className="jw-lbFilterWrap">
          <span className="jw-lbSelectedPeriod" aria-live="polite">
            {selectedPeriodLabel}
          </span>
          <button
            type="button"
            className={`jw-lbFilterBtn ${filterOpen ? "is-open" : ""}`}
            aria-label="Filter by period"
            aria-expanded={filterOpen}
            aria-haspopup="dialog"
            onClick={() => setFilterOpen((o) => !o)}
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {isDesktop ? (
        <div className="jw-lbDesktopSplit">
          <div className="jw-lbPanel">
            <div className="jw-lbPanelHead">
              <Coins size={16} aria-hidden="true" className="jw-lbPanelIcon" />
              <h3 className="jw-lbPanelTitle">Top Depositors</h3>
            </div>
            <LeaderBoardTable rows={effectiveDepositors} ariaLabel="Top depositors leaderboard rows" />
          </div>
          <div className="jw-lbPanel">
            <div className="jw-lbPanelHead">
              <Trophy size={16} aria-hidden="true" className="jw-lbPanelIcon" />
              <h3 className="jw-lbPanelTitle">Top Winners</h3>
            </div>
            <LeaderBoardTable rows={effectiveWinners} ariaLabel="Top winners leaderboard rows" />
          </div>
        </div>
      ) : (
        <>
          <div className="jw-lbTabs" role="tablist" aria-label="Leader board tabs">
            <button
              type="button"
              role="tab"
              aria-selected={isDepositors}
              className={`jw-lbTab ${isDepositors ? "is-active" : ""}`}
              onClick={() => setTab("depositors")}
            >
              <span className="jw-lbTabInner">
                <Coins size={16} aria-hidden="true" className="jw-lbPanelIcon" />
                <span>Top Depositors</span>
              </span>
            </button>

            <div className="jw-lbTabDivider" aria-hidden="true" />

            <button
              type="button"
              role="tab"
              aria-selected={!isDepositors}
              className={`jw-lbTab ${!isDepositors ? "is-active" : ""}`}
              onClick={() => setTab("winners")}
            >
              <span className="jw-lbTabInner">
                <Trophy size={16} aria-hidden="true" className="jw-lbPanelIcon" />
                <span>Top Winners</span>
              </span>
            </button>
          </div>

          <LeaderBoardTable
            rows={rows}
            ariaLabel={isDepositors ? "Top depositors leaderboard rows" : "Top winners leaderboard rows"}
          />
        </>
      )}
    </section>
  );
}

import React, { useMemo, useState } from "react";
import { Medal, Filter, Coins, Trophy } from "lucide-react";
import "./leaderBoard.css";

const DEPOSITORS_SAMPLE = Array.from({ length: 14 }).map((_, i) => ({
  id: `dep-${i}`,
  user: "did***y989",
  time: "12-11-25   10:13 AM",
  payment: "JazzCash",
  brand: "BetPro",
  amount: "50,000",
}));

const WINNERS_SAMPLE = Array.from({ length: 14 }).map((_, i) => ({
  id: `win-${i}`,
  user: "did***y989",
  time: "12-11-25   10:13 AM",
  topGame: "Sweet Bonanza",
  brand: "BetPro",
  amount: "50,000",
}));

export default function LeaderBoard({
  title = "Leader Board",
  depositors = DEPOSITORS_SAMPLE,
  winners = WINNERS_SAMPLE,
}) {
  const [tab, setTab] = useState("depositors"); // "depositors" | "winners"

  const isDepositors = tab === "depositors";

  const rows = useMemo(() => (isDepositors ? depositors : winners), [
    isDepositors,
    depositors,
    winners,
  ]);

  return (
    <section className="jw-lb" aria-label={title}>
      {/* Header */}
      <div className="jw-lbHead">
        <div className="jw-lbTitleWrap">
          <Medal size={18} className="jw-lbIcon" aria-hidden="true" />
          <div className="jw-lbTitle">{title}</div>
        </div>

        <button
          type="button"
          className="jw-lbFilterBtn"
          aria-label="Filter"
          onClick={() => {
            // later: open filter/modal
          }}
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="jw-lbTabs" role="tablist" aria-label="Leader board tabs">
        <button
          type="button"
          role="tab"
          aria-selected={isDepositors}
          className={`jw-lbTab ${isDepositors ? "is-active" : ""}`}
          onClick={() => setTab("depositors")}
        >
          <span className="jw-lbTabInner">
            <Coins size={16} aria-hidden="true" />
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
            <Trophy size={16} aria-hidden="true" />
            <span>Top Winners</span>
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="jw-lbTable">
        {/* Table Header (fixed) */}
        <div className="jw-lbRow jw-lbHeaderRow" role="row">
          <div className="jw-lbCell col-user" role="columnheader">
            User
          </div>

          {/* Desktop-only columns */}
          <div className="jw-lbCell col-time is-desktop" role="columnheader">
            Time
          </div>

          {isDepositors ? (
            <div className="jw-lbCell col-mid is-desktop" role="columnheader">
              Payment
            </div>
          ) : (
            <div className="jw-lbCell col-mid is-desktop" role="columnheader">
              Top Game
            </div>
          )}

          <div className="jw-lbCell col-brand" role="columnheader">
            Brand
          </div>

          <div className="jw-lbCell col-amount" role="columnheader">
            Amount
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="jw-lbBody" role="rowgroup" aria-label="Leaderboard rows">
          {rows.map((r, idx) => (
            <div
              key={r.id}
              className={`jw-lbRow ${idx % 2 === 0 ? "is-even" : "is-odd"}`}
              role="row"
            >
              <div className="jw-lbCell col-user" role="cell">
                {r.user}
              </div>

              {/* Desktop-only */}
              <div className="jw-lbCell col-time is-desktop" role="cell">
                {r.time}
              </div>

              {isDepositors ? (
                <div className="jw-lbCell col-mid is-desktop" role="cell">
                  {r.payment}
                </div>
              ) : (
                <div className="jw-lbCell col-mid is-desktop" role="cell">
                  {r.topGame}
                </div>
              )}

              <div className="jw-lbCell col-brand" role="cell">
                {r.brand}
              </div>

              <div className="jw-lbCell col-amount" role="cell">
                {r.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

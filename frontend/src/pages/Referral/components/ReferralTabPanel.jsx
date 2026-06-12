import React from "react";
import { formatReferralAmount } from "../../../services/referralApi";

const TIER_OPTIONS = [
  { value: 1, label: "Direct" },
  { value: 2, label: "Tier 2" },
  { value: 3, label: "Tier 3" },
];

export default function ReferralTabPanel({
  summary = {},
  rows = [],
  monthLabel,
  tierFilter = 1,
  onTierFilterChange,
}) {
  const tiles = [
    { key: "totalReferrals", label: "Total Referrals", value: summary.totalReferrals },
    { key: "totalCommission", label: "Total Commission", value: summary.totalCommission },
    { key: "totalTransferIn", label: "Total Transfer In", value: summary.totalTransferIn },
    { key: "totalTransferOut", label: "Total Transfer Out", value: summary.totalTransferOut },
  ];

  return (
    <div className="jw-refPanelContent">
      <div className="jw-refTierFilters" role="tablist" aria-label="Referral tier filter">
        {TIER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={tierFilter === opt.value}
            className={`jw-refTierFilter ${tierFilter === opt.value ? "is-active" : ""}`}
            onClick={() => onTierFilterChange?.(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="jw-refSectionHead">
        <h3 className="jw-refSectionTitle">Summary</h3>
        <p className="jw-refSectionSub">
          Referral stats for {monthLabel || "this month"}
        </p>
      </div>

      <div className="jw-refStatGrid">
        {tiles.map((tile) => (
          <div key={tile.key} className="jw-refStatTile">
            <div className="jw-refStatTileLabel">{tile.label}</div>
            <div className="jw-refStatTileValue">{formatReferralAmount(tile.value)}</div>
          </div>
        ))}
      </div>

      <div className="jw-refTableWrap">
        <div className="jw-refTableHead jw-refTableHead--5" aria-hidden="true">
          <span>Username</span>
          <span>Transfer In</span>
          <span>Transfer Out</span>
          <span>Net</span>
          <span>Comm.</span>
        </div>

        <div className="jw-refTableRows">
          {rows.length === 0 ? (
            <div className="jw-refTableEmpty">No referral activity for this tier yet.</div>
          ) : null}
          {rows.map((row) => (
            <div key={row.id} className="jw-refTableRow jw-refTableRow--5">
              <span className="jw-refTableCell">{row.username}</span>
              <span className="jw-refTableCell">{formatReferralAmount(row.transferIn)}</span>
              <span className="jw-refTableCell">{formatReferralAmount(row.transferOut)}</span>
              <span className="jw-refTableCell">{formatReferralAmount(row.net)}</span>
              <span className="jw-refTableCell">{formatReferralAmount(row.commission)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

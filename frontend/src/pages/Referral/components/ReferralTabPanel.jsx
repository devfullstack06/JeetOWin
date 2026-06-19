import React, { useState } from "react";
import { formatReferralAmount } from "../../../services/referralApi";
import ReferralNetworkModal from "./ReferralNetworkModal";

const TIER_OPTIONS = [
  { value: 1, label: "Direct" },
  { value: 2, label: "Tier 2" },
  { value: 3, label: "Tier 3" },
];

function ReferralDetailsCounts({ totals }) {
  const t1 = totals?.tier1 ?? 0;
  const t2 = totals?.tier2 ?? 0;
  const t3 = totals?.tier3 ?? 0;
  return (
    <span className="jw-refDetailsBtn__counts">
      <span className="jw-refDetailsBtn__count is-tier1">{t1}</span>
      <span className="jw-refDetailsBtn__sep" aria-hidden>
        |
      </span>
      <span className="jw-refDetailsBtn__count is-tier2">{t2}</span>
      <span className="jw-refDetailsBtn__sep" aria-hidden>
        |
      </span>
      <span className="jw-refDetailsBtn__count is-tier3">{t3}</span>
    </span>
  );
}

export default function ReferralTabPanel({
  summary = {},
  rows = [],
  monthLabel,
  tierFilter = 1,
  onTierFilterChange,
  downline = null,
  showReferralDetails = false,
}) {
  const [networkOpen, setNetworkOpen] = useState(false);

  const tiles = [
    { key: "totalReferrals", label: "Total Referrals", value: summary.totalReferrals },
    { key: "totalCommission", label: "Total Commission", value: summary.totalCommission },
    { key: "totalTransferIn", label: "Total Transfer In", value: summary.totalTransferIn },
    { key: "totalTransferOut", label: "Total Transfer Out", value: summary.totalTransferOut },
  ];

  const totals = downline?.totals || { tier1: 0, tier2: 0, tier3: 0 };

  return (
    <div className="jw-refPanelContent">
      <div className="jw-refTierToolbar">
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

        {showReferralDetails ? (
          <button
            type="button"
            className="jw-refDetailsBtn"
            onClick={() => setNetworkOpen(true)}
          >
            <span className="jw-refDetailsBtn__label">Details</span>
            <ReferralDetailsCounts totals={totals} />
          </button>
        ) : null}
      </div>

      <ReferralNetworkModal
        open={networkOpen}
        totals={totals}
        direct={downline?.direct || []}
        onClose={() => setNetworkOpen(false)}
      />

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

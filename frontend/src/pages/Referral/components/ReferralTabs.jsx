import React from "react";

const TAB_ORDER = ["overview", "referral", "commission"];

function tabIndex(tab) {
  const i = TAB_ORDER.indexOf(tab);
  return i >= 0 ? i : 0;
}

export default function ReferralTabs({ activeTab, onChangeTab }) {
  const indicatorClass = `is-tab-${tabIndex(activeTab)}`;

  return (
    <div className="jw-refTabs jw-refTabs--3" role="tablist" aria-label="Referral program tabs">
      <button
        type="button"
        role="tab"
        className={`jw-refTab ${activeTab === "overview" ? "is-active" : ""}`}
        aria-selected={activeTab === "overview"}
        onClick={() => onChangeTab("overview")}
      >
        Overview
      </button>

      <button
        type="button"
        role="tab"
        className={`jw-refTab ${activeTab === "referral" ? "is-active" : ""}`}
        aria-selected={activeTab === "referral"}
        onClick={() => onChangeTab("referral")}
      >
        Referral
      </button>

      <button
        type="button"
        role="tab"
        className={`jw-refTab ${activeTab === "commission" ? "is-active" : ""}`}
        aria-selected={activeTab === "commission"}
        onClick={() => onChangeTab("commission")}
      >
        Commission
      </button>

      <span className={`jw-refTabIndicator ${indicatorClass}`} aria-hidden="true" />
      <span className="jw-refTabLine" aria-hidden="true" />
    </div>
  );
}

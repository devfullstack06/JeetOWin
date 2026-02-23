import React from "react";

export default function TransactionsTabs({ activeTab, onChangeTab }) {
  return (
    <div className="jw-txTabs" role="tablist" aria-label="Transactions tabs">
      <button
        type="button"
        role="tab"
        className={`jw-txTab is-deposit ${activeTab === "deposit" ? "is-active" : ""}`}
        aria-selected={activeTab === "deposit"}
        onClick={() => onChangeTab("deposit")}
      >
        Deposit
      </button>

      <button
        type="button"
        role="tab"
        className={`jw-txTab is-withdraw ${activeTab === "withdraw" ? "is-active" : ""}`}
        aria-selected={activeTab === "withdraw"}
        onClick={() => onChangeTab("withdraw")}
      >
        Withdraw
      </button>

      {/* underline indicator (like Notifications) */}
      <span
        className={`jw-txTabIndicator ${activeTab === "withdraw" ? "is-right" : "is-left"}`}
        aria-hidden="true"
      />
      <span className="jw-txTabLine" aria-hidden="true" />
    </div>
  );
}

import React from "react";

export default function QuickAmountRow({ amounts = [], onPick }) {
  return (
    <div className="jw-txQuickRow" role="group" aria-label="Quick amounts">
      {amounts.map((a) => (
        <button
          key={a}
          type="button"
          className="jw-txQuickBtn"
          onClick={() => onPick(String(a))}
        >
          {Number(a).toLocaleString()}
        </button>
      ))}
    </div>
  );
}

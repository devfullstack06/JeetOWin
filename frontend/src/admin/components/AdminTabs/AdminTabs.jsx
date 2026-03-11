import React from "react";
import "./adminTabs.css";

export default function AdminTabs({ tabs = [], activeKey, onChange }) {
  return (
    <div className="jw-adminTabs" role="tablist" aria-label="Admin tabs">
      {tabs.map((t) => {
        const isActive = t.key === activeKey;
        return (
          <button
            key={t.key}
            type="button"
            className={`jw-adminTabs__tab ${isActive ? "is-active" : ""}`}
            onClick={() => onChange?.(t.key)}
            role="tab"
            aria-selected={isActive}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
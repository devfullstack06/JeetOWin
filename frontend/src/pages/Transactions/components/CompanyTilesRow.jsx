import React from "react";

function initials(name = "") {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function CompanyTilesRow({ items, selectedId, onSelect }) {
  return (
    <div className="jw-txTilesRow" role="list">
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`jw-txTile ${selectedId === c.id ? "is-active" : ""}`}
          onClick={() => onSelect(c.id)}
          role="listitem"
          aria-label={c.name}
        >
          {/* Replace this later with real icons from admin: c.icon_key */}
          <div className="jw-txTileIcon">{initials(c.name)}</div>
          <div className="jw-txTileLabel">{c.name}</div>
        </button>
      ))}
    </div>
  );
}

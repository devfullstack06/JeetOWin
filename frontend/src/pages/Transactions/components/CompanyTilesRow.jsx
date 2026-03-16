import React, { useState } from "react";
import { getWalletIconUrl } from "../../../utils/walletIconUrl";

function initials(name = "") {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function CompanyTileIcon({ company }) {
  const [imgError, setImgError] = useState(false);
  const iconUrl = getWalletIconUrl(company);
  const showImg = iconUrl && !imgError;

  if (showImg) {
    return (
      <div className="jw-txTileIcon jw-txTileIcon--img">
        <img
          src={iconUrl}
          alt=""
          onError={() => setImgError(true)}
        />
      </div>
    );
  }
  return (
    <div className="jw-txTileIcon">{initials(company.name)}</div>
  );
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
          <CompanyTileIcon company={c} />
          <div className="jw-txTileLabel">{c.name}</div>
        </button>
      ))}
    </div>
  );
}

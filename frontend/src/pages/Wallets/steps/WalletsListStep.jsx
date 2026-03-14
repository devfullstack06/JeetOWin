import React, { useState } from "react";

function initials(name = "") {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
}

function WalletTileIcon({ company }) {
  const [imgError, setImgError] = useState(false);
  const iconUrl = company.iconKey ? `/uploads/wallets/${company.iconKey}` : null;
  const showImg = iconUrl && !imgError;

  if (showImg) {
    return (
      <img
        className="jw-walletTileIcon"
        src={iconUrl}
        alt=""
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="jw-walletTileFallback">
      {initials(company.name)}
    </div>
  );
}

export default function WalletsListStep({
  companies = [],
  wallets = [],
  selectedCompanyId = null,
  onSelectCompany = () => {},
  onAddNew = () => {},
}) {
  const sortedCompanies = React.useMemo(() => {
    return [...companies].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }, [companies]);

  return (
    <div className="jw-walletsListStep">
      {/* ✅ Section between label and list (matches PNG) */}
      <div className="jw-walletsTopBar">
        <div className="jw-walletsTopBarLeft">
          <div className="jw-walletsTopTitle">Wallets</div>
          <div className="jw-walletsTopSub">Select Your Wallet</div>
        </div>

        <button
          type="button"
          className="jw-walletsAddNewBox"
          onClick={onAddNew}
          aria-label="Add New Wallet"
        >
          <div className="jw-walletsAddPlus">+</div>
          <div className="jw-walletsAddText">Add New</div>
        </button>
      </div>

      {/* ✅ Active wallet companies from API */}
      <div className="jw-walletsTilesRow" aria-label="Wallet companies">
        {sortedCompanies.map((c) => {
          const isActive = selectedCompanyId === c.id;

          return (
            <button
              key={c.id}
              type="button"
              className={`jw-walletTile ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectCompany(isActive ? null : c.id)}
              aria-label={c.name}
              title={c.name}
            >
              <WalletTileIcon company={c} />
              <div className="jw-walletTileLabel">{c.name}</div>
            </button>
          );
        })}
      </div>

      {/* ✅ Add center column: Wallet */}
      <div className="jw-walletsListHeader">
        <div>Name</div>
        <div style={{ textAlign: "center" }}>Wallet</div>
        <div style={{ textAlign: "right" }}>Number</div>
      </div>

      <div className="jw-walletsRows">
        {wallets.length === 0 ? (
          <div className="jw-walletEmpty">
            {selectedCompanyId
              ? "No wallets found for this company."
              : "No wallets added yet."}
          </div>
        ) : (
          wallets.map((w) => (
            <div key={w.id} className="jw-walletRow">
              <div className="jw-walletColName">{w.accountTitle}</div>
              <div className="jw-walletColWallet">{w.companyName}</div>
              <div className="jw-walletColNumber">{w.accountNumber}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

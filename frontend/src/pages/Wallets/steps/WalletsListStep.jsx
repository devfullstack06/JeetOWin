import React from "react";

// ✅ Tile SVGs (put these files in: frontend/src/assets/wallets/)
import iconJazzCash from "../../../assets/wallets/JazzCash.svg";
import iconEasyPaisa from "../../../assets/wallets/EasyPaisa.svg";
import iconJazzCashTill from "../../../assets/wallets/JazzCashTill.svg";
import iconBank from "../../../assets/wallets/Bank.svg";

const ICONS = {
  jazzcash: iconJazzCash,
  easypaisa: iconEasyPaisa,
  jazzcash_till: iconJazzCashTill,
  bank: iconBank,
};

export default function WalletsListStep({
  companies = [],
  wallets = [],
  selectedCompanyId = null,
  onSelectCompany = () => {},
  onAddNew = () => {},
}) {
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

      {/* ✅ Company tiles */}
      <div className="jw-walletsTilesRow" aria-label="Wallet companies">
        {companies.map((c) => {
          const key = String(c.iconKey || "").toLowerCase();
          const src = ICONS[key];
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
              {src ? (
                <img className="jw-walletTileIcon" src={src} alt={c.name} />
              ) : (
                <div className="jw-walletTileFallback">
                  {String(c.name || "?").slice(0, 1).toUpperCase()}
                </div>
              )}

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

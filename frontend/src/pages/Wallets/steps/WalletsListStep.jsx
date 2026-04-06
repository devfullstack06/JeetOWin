import React, { useState } from "react";
import { getWalletIconUrl } from "../../../utils/walletIconUrl";

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
  const iconUrl = getWalletIconUrl(company);
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

      <div className="jw-walletsTableScroll">
        <table className="jw-walletsDataTable">
          <colgroup>
            <col className="jw-walletsColName" />
            <col className="jw-walletsColWallet" />
            <col className="jw-walletsColNumber" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col" className="jw-walletsThCenter">
                Wallet
              </th>
              <th scope="col" className="jw-walletsThRight">
                Number
              </th>
            </tr>
          </thead>
          <tbody>
            {wallets.length === 0 ? (
              <tr>
                <td colSpan={3} className="jw-walletEmptyCell">
                  {selectedCompanyId
                    ? "No wallets found for this company."
                    : "No wallets added yet."}
                </td>
              </tr>
            ) : (
              wallets.map((w) => (
                <tr key={w.id}>
                  <td className="jw-walletColName">{w.accountTitle}</td>
                  <td className="jw-walletColWallet">{w.companyName}</td>
                  <td className="jw-walletColNumber">{w.accountNumber}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

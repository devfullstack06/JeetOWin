import React, { useMemo, useState } from "react";
import { getWalletIconUrl } from "../../../utils/walletIconUrl";

function initials(name = "") {
  return (
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function BrandTileIcon({ brand }) {
  const [imgError, setImgError] = useState(false);
  const iconUrl = getWalletIconUrl(brand);
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
      {initials(brand.name)}
    </div>
  );
}

export default function AccountsListStep({
  brands = [],
  accounts = [],
  selectedBrandId = null,
  onSelectBrand = () => {},
  onCreateNew = () => {},
}) {
  const sortedBrands = useMemo(() => {
    return [...brands].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [brands]);

  return (
    <div className="jw-walletsListStep jw-accountsListStep">
      <div className="jw-walletsTopBar">
        <div className="jw-walletsTopBarLeft">
          <div className="jw-walletsTopTitle">Accounts</div>
          <div className="jw-walletsTopSub">Select Your Account</div>
        </div>

        <button
          type="button"
          className="jw-walletsAddNewBox"
          onClick={onCreateNew}
          aria-label="Create New Account"
        >
          <div className="jw-walletsAddPlus">+</div>
          <div className="jw-walletsAddText">Create New</div>
        </button>
      </div>

      {sortedBrands.length > 0 ? (
        <div className="jw-walletsTilesRow" aria-label="Brands available for accounts">
          {sortedBrands.map((b) => {
            const isActive = selectedBrandId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                className={`jw-walletTile ${isActive ? "is-active" : ""}`}
                onClick={() => onSelectBrand(isActive ? null : b.id)}
                aria-label={b.name}
                title={b.name}
              >
                <BrandTileIcon brand={b} />
                <div className="jw-walletTileLabel">{b.name}</div>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="jw-walletsTableScroll">
        <table className="jw-walletsDataTable jw-accountsDataTable">
          <colgroup>
            <col className="jw-accountsColUser" />
            <col className="jw-accountsColCreated" />
            <col className="jw-accountsColBrand" />
            <col className="jw-accountsColAction" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Username</th>
              <th scope="col" className="jw-walletsThCenter">
                Created
              </th>
              <th scope="col" className="jw-walletsThCenter">
                Brand
              </th>
              <th scope="col" className="jw-walletsThRight">
                Password
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="jw-walletEmptyCell">
                  {sortedBrands.length === 0
                    ? "No brands are enabled for accounts. When your administrator enables a brand for accounts, you can create and view them here."
                    : selectedBrandId
                      ? "No accounts found for this brand."
                      : "No Account created yet. Click Create New to add an account."}
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="jw-walletColName">{acc.username}</td>
                  <td className="jw-walletColWallet">{acc.createdAt ?? "—"}</td>
                  <td className="jw-walletColWallet">{acc.brand}</td>
                  <td className="jw-walletColNumber jw-accountsRowAction">
                    <button className="jw-accountsUpdate" type="button">
                      Update
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

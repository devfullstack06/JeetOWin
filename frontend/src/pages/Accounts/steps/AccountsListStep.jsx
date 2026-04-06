import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil } from "lucide-react";
import { getWalletIconUrl } from "../../../utils/walletIconUrl";

/** Display created date as DD-MM-YY (handles YYYY-MM-DD from API without TZ shift). */
function formatCreatedDate(value) {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const [, y, mo, day] = ymd;
    return `${day}-${mo}-${y.slice(-2)}`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${yy}`;
}

function accountWebsiteHref(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

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

  const [detailAccount, setDetailAccount] = useState(null);

  useEffect(() => {
    if (!detailAccount) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setDetailAccount(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [detailAccount]);

  const detailModal =
    detailAccount &&
    createPortal(
      <div
        className="jw-accountsDetailModalOverlay"
        role="presentation"
        onClick={() => setDetailAccount(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="jw-accounts-detail-title"
          className="jw-accountsDetailModal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="jw-accountsDetailModal__header">
            <h2
              id="jw-accounts-detail-title"
              className="jw-accountsDetailModal__title jw-accounts-detail-title"
            >
              Details
            </h2>
            <button
              type="button"
              className="jw-accountsDetailModal__close"
              aria-label="Close"
              onClick={() => setDetailAccount(null)}
            >
              ×
            </button>
          </div>
          <div className="jw-accountsDetailModal__body">
            <dl className="jw-accountsDetailModal__dl">
              <div className="jw-accountsDetailModal__row">
                <dt>Username:</dt>
                <dd>{detailAccount.username ?? "—"}</dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Initial Password:</dt>
                <dd className="jw-accountsDetailModal__mono">
                  {detailAccount.initialPassword != null && String(detailAccount.initialPassword).trim() !== ""
                    ? detailAccount.initialPassword
                    : "—"}
                </dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Brand:</dt>
                <dd>{detailAccount.brand ?? "—"}</dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Website:</dt>
                <dd>
                  {detailAccount.websiteUrl != null && String(detailAccount.websiteUrl).trim() !== "" ? (
                    <a
                      href={accountWebsiteHref(detailAccount.websiteUrl)}
                      className="jw-accountsDetailModal__link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {detailAccount.websiteUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Created at:</dt>
                <dd>{formatCreatedDate(detailAccount.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
    <div className="jw-walletsListStep jw-accountsListStep">
      <div className="jw-walletsTopBar">
        <div className="jw-walletsTopBarLeft">
          <div className="jw-walletsTopTitle">Accounts</div>
          <div className="jw-walletsTopSub">Check your Accounts' details</div>
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
                Actions
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
                  <td className="jw-walletColWallet">{formatCreatedDate(acc.createdAt)}</td>
                  <td className="jw-walletColWallet">{acc.brand}</td>
                  <td className="jw-walletColNumber jw-accountsRowAction">
                    <div className="jw-accountsActionIcons">
                      <button
                        type="button"
                        className="jw-historyViewBtn"
                        aria-label={`View account ${acc.username}`}
                        title="View"
                        onClick={() => setDetailAccount(acc)}
                      >
                        <Eye size={16} strokeWidth={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="jw-historyEditBtn"
                        aria-label={`Edit account ${acc.username}`}
                        title="Edit"
                      >
                        <Pencil size={16} strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    {detailModal}
    </>
  );
}

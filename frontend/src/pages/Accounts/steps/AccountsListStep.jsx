import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Copy, Eye } from "lucide-react";
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

/** Requested at: date + local time */
function formatRequestedAt(value) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatCreatedDate(value);
  const pad = (n) => String(n).padStart(2, "0");
  const datePart = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${String(d.getFullYear()).slice(-2)}`;
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${datePart} ${timePart}`;
}

function formatTicketStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "pending") return "Pending";
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Active / Inactive pill — matches admin `jw-adminStatus` */
function AccountStatusBadge({ status }) {
  const isActive = status !== "Inactive";
  return (
    <span className={`jw-adminStatus ${isActive ? "is-active" : "is-inactive"}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

/** Account ticket status in View modal — same pill system as list + account modal */
function TicketStatusBadge({ status }) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return <span className="jw-accountsDetailModal__statusFallback">—</span>;
  if (s === "pending") {
    return <span className="jw-adminStatus is-pending">Pending</span>;
  }
  if (s === "approved") {
    return <span className="jw-adminStatus is-active">Approved</span>;
  }
  if (s === "rejected") {
    return <span className="jw-adminStatus is-inactive">Rejected</span>;
  }
  return <span className="jw-adminStatus is-inactive">{formatTicketStatus(status)}</span>;
}

function accountWebsiteHref(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

async function copyTextToClipboard(text) {
  const s = text != null ? String(text) : "";
  if (!s) return false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = s;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
  accountsTableRows = [],
  selectedBrandId = null,
  onSelectBrand = () => {},
  onCreateNew = () => {},
  pendingTicketsCount = 0,
}) {
  const sortedBrands = useMemo(() => {
    return [...brands].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [brands]);

  const [detailAccount, setDetailAccount] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [accountCopyFeedback, setAccountCopyFeedback] = useState(null);
  const accountCopyTimerRef = useRef(null);

  const detailOpen = detailAccount || detailTicket;

  const clearAccountCopyTimer = () => {
    if (accountCopyTimerRef.current != null) {
      window.clearTimeout(accountCopyTimerRef.current);
      accountCopyTimerRef.current = null;
    }
  };

  useEffect(() => {
    setAccountCopyFeedback(null);
    clearAccountCopyTimer();
  }, [detailAccount?.id]);

  useEffect(() => () => clearAccountCopyTimer(), []);

  const flashAccountCopyFeedback = (key) => {
    clearAccountCopyTimer();
    setAccountCopyFeedback(key);
    accountCopyTimerRef.current = window.setTimeout(() => {
      setAccountCopyFeedback(null);
      accountCopyTimerRef.current = null;
    }, 2000);
  };

  const closeModals = () => {
    setDetailAccount(null);
    setDetailTicket(null);
  };

  useEffect(() => {
    if (!detailOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeModals();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [detailOpen]);

  const openTicketDetail = (ticket) => {
    setDetailAccount(null);
    setDetailTicket(ticket);
  };

  const accountModal =
    detailAccount &&
    createPortal(
      <div
        className="jw-accountsDetailModalOverlay"
        role="presentation"
        onClick={closeModals}
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
            <button type="button" className="jw-accountsDetailModal__close" aria-label="Close" onClick={closeModals}>
              ×
            </button>
          </div>
          <div className="jw-accountsDetailModal__body">
            <dl className="jw-accountsDetailModal__dl">
              <div className="jw-accountsDetailModal__row">
                <dt>Username:</dt>
                <dd className="jw-accountsDetailModal__ddWithCopy">
                  <span className="jw-accountsDetailModal__ddText">{detailAccount.username ?? "—"}</span>
                  {detailAccount.username != null && String(detailAccount.username).trim() !== "" ? (
                    <button
                      type="button"
                      className={`jw-accountsDetailModal__copyBtn ${accountCopyFeedback === "username" ? "is-copied" : ""}`}
                      aria-label={accountCopyFeedback === "username" ? "Copied" : "Copy username"}
                      title={accountCopyFeedback === "username" ? "Copied" : "Copy"}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await copyTextToClipboard(detailAccount.username);
                        if (ok) flashAccountCopyFeedback("username");
                      }}
                    >
                      {accountCopyFeedback === "username" ? (
                        <span className="jw-accountsDetailModal__copyBtnLabel" aria-live="polite">
                          Copied!
                        </span>
                      ) : (
                        <Copy size={16} strokeWidth={2} aria-hidden />
                      )}
                    </button>
                  ) : null}
                </dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Initial Password:</dt>
                <dd className="jw-accountsDetailModal__ddWithCopy">
                  <span
                    className={`jw-accountsDetailModal__ddText jw-accountsDetailModal__mono ${
                      detailAccount.initialPassword != null && String(detailAccount.initialPassword).trim() !== ""
                        ? ""
                        : "jw-accountsDetailModal__ddText--muted"
                    }`}
                  >
                    {detailAccount.initialPassword != null && String(detailAccount.initialPassword).trim() !== ""
                      ? detailAccount.initialPassword
                      : "—"}
                  </span>
                  {detailAccount.initialPassword != null && String(detailAccount.initialPassword).trim() !== "" ? (
                    <button
                      type="button"
                      className={`jw-accountsDetailModal__copyBtn ${accountCopyFeedback === "password" ? "is-copied" : ""}`}
                      aria-label={accountCopyFeedback === "password" ? "Copied" : "Copy initial password"}
                      title={accountCopyFeedback === "password" ? "Copied" : "Copy"}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await copyTextToClipboard(detailAccount.initialPassword);
                        if (ok) flashAccountCopyFeedback("password");
                      }}
                    >
                      {accountCopyFeedback === "password" ? (
                        <span className="jw-accountsDetailModal__copyBtnLabel" aria-live="polite">
                          Copied!
                        </span>
                      ) : (
                        <Copy size={16} strokeWidth={2} aria-hidden />
                      )}
                    </button>
                  ) : null}
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
                <dt>Status:</dt>
                <dd>
                  <AccountStatusBadge status={detailAccount.status} />
                </dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Created at:</dt>
                <dd>{formatRequestedAt(detailAccount.createdAt)}</dd>
              </div>
            </dl>
            <p className="jw-accountsDetailModal__disclaimer">
              Disclaimer: Change your Password first as you login your account on{" "}
              {detailAccount.brand != null && String(detailAccount.brand).trim() !== ""
                ? detailAccount.brand
                : "—"}
              . Password policy applies. View{" "}
              <Link to="/terms" className="jw-accountsDetailModal__link">
                Terms and Conditions
              </Link>{" "}
              for more details.
            </p>
          </div>
        </div>
      </div>,
      document.body
    );

  const ticketModal =
    detailTicket &&
    createPortal(
      <div
        className="jw-accountsDetailModalOverlay"
        role="presentation"
        onClick={closeModals}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="jw-accounts-ticket-detail-title"
          className="jw-accountsDetailModal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="jw-accountsDetailModal__header">
            <h2 id="jw-accounts-ticket-detail-title" className="jw-accountsDetailModal__title">
              Details
            </h2>
            <button type="button" className="jw-accountsDetailModal__close" aria-label="Close" onClick={closeModals}>
              ×
            </button>
          </div>
          <div className="jw-accountsDetailModal__body">
            <dl className="jw-accountsDetailModal__dl">
              <div className="jw-accountsDetailModal__row">
                <dt>Suggested Username:</dt>
                <dd>
                  {detailTicket.suggestedUsername != null && String(detailTicket.suggestedUsername).trim() !== ""
                    ? detailTicket.suggestedUsername
                    : "—"}
                </dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Brand:</dt>
                <dd>{detailTicket.brand ?? "—"}</dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Requested at:</dt>
                <dd>{formatRequestedAt(detailTicket.createdAt)}</dd>
              </div>
              <div className="jw-accountsDetailModal__row">
                <dt>Status:</dt>
                <dd>
                  <TicketStatusBadge status={detailTicket.status} />
                </dd>
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

        {pendingTicketsCount > 0 ? (
          <div
            className="jw-walletsAddNewBox jw-accountsPendingBox"
            aria-label={`Pending: ${pendingTicketsCount} ticket${pendingTicketsCount === 1 ? "" : "s"}`}
          >
            <div className="jw-walletsAddText">Pending:</div>
            <div className="jw-walletsAddPlus jw-accountsPendingBox__num" aria-hidden>
              {pendingTicketsCount}
            </div>
          </div>
        ) : null}

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
            <col className="jw-accountsColBrand" />
            <col className="jw-accountsColStatus" />
            <col className="jw-accountsColAction" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Username</th>
              <th scope="col" className="jw-walletsThCenter">
                Brand
              </th>
              <th scope="col" className="jw-walletsThCenter">
                Status
              </th>
              <th scope="col" className="jw-walletsThRight">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {accountsTableRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="jw-walletEmptyCell">
                  {sortedBrands.length === 0
                    ? "No brands are enabled for accounts. When your administrator enables a brand for accounts, you can create and view them here."
                    : selectedBrandId
                      ? "No accounts or pending tickets found for this brand."
                      : "No Account created yet. Click Create New to add an account."}
                </td>
              </tr>
            ) : (
              accountsTableRows.map((row) => {
                if (row.rowKind === "pendingTicket") {
                  const t = row.ticket;
                  const suggested = t.suggestedUsername != null && String(t.suggestedUsername).trim() !== ""
                    ? t.suggestedUsername
                    : "—";
                  return (
                    <tr key={row.rowKey}>
                      <td className="jw-walletColName">{suggested}</td>
                      <td className="jw-walletColWallet">{t.brand}</td>
                      <td className="jw-walletColWallet jw-accountsColStatusCell">
                        <span className="jw-adminStatus is-pending">Pending</span>
                      </td>
                      <td className="jw-walletColNumber jw-accountsRowAction">
                        <div className="jw-accountsActionIcons">
                          <button
                            type="button"
                            className="jw-historyViewBtn"
                            aria-label={`View pending ticket for ${suggested}`}
                            title="View"
                            onClick={() => openTicketDetail(t)}
                          >
                            <Eye size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
                      </td>
                    </tr>
                  );
                }
                const acc = row.account;
                return (
                  <tr key={row.rowKey}>
                    <td className="jw-walletColName">{acc.username}</td>
                    <td className="jw-walletColWallet">{acc.brand}</td>
                    <td className="jw-walletColWallet jw-accountsColStatusCell">
                      <AccountStatusBadge status={acc.status} />
                    </td>
                    <td className="jw-walletColNumber jw-accountsRowAction">
                      <div className="jw-accountsActionIcons">
                        <button
                          type="button"
                          className="jw-historyViewBtn"
                          aria-label={`View account ${acc.username}`}
                          title="View"
                          onClick={() => {
                            setDetailTicket(null);
                            setDetailAccount(acc);
                          }}
                        >
                          <Eye size={16} strokeWidth={2} aria-hidden />
                        </button>
          </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
    {accountModal}
    {ticketModal}
    </>
  );
}

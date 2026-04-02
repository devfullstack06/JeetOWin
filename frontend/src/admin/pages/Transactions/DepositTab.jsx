import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, FileText, Plus, ZoomIn, ZoomOut } from "lucide-react";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
  AdminButton,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminAutoRefresh from "../../components/AdminFilterBar/AdminAutoRefresh";
import AdminDateRange from "../../components/AdminDateRange/AdminDateRange";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import { formatAdminDateTime } from "../../utils/adminDateUtils";
import { getApiOrigin } from "../../../utils/walletIconUrl";
import "../Users/usersPage.css";
import "../Wallets/walletsPage.css";
import "../../components/AdminTable/adminTable.css";

// ---------- Part 1: Constants & helpers ----------
const TICKET_TIMER_MINUTES = 15;
const SLIP_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const SLIP_SIZE_ERROR_MSG = "Slip image must be 10MB or smaller.";
const SLIP_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const SLIP_ACCEPT_HINT = "Accepted: JPEG, PNG, GIF, WebP. Max 10MB.";
const EVIDENCE_MAX_BYTES = SLIP_MAX_BYTES;
const EVIDENCE_SIZE_ERROR_MSG = "Evidence image must be 10MB or smaller.";

/** Same as TopUp modal in Wallets: stop wheel / arrow keys from changing number input while scrolling. */
const depositAmountInputNoScrollProps = {
  onWheel: (e) => {
    e.currentTarget.blur();
  },
  onKeyDown: (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
  },
};

function ticketRemainingSeconds(createdAt) {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  const end = created + TICKET_TIMER_MINUTES * 60 * 1000;
  return Math.floor((end - Date.now()) / 1000);
}

function ticketTimerColor(seconds) {
  if (seconds === null) return "#666";
  if (seconds > 7 * 60) return "#159447";
  if (seconds > 4 * 60) return "#2563eb";
  if (seconds > 0) return "#ca8a04";
  return "#dc2626";
}

function formatTimer(seconds) {
  if (seconds === null) return "—";
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const str = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return seconds < 0 ? `-${str}` : str;
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  return search.toString();
}

function getToken() {
  return localStorage.getItem("token") || "";
}

function EditIconSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path
        fill="#15a84b"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
      />
    </svg>
  );
}

/** Normalize trx_id for display: max 30, alphanumeric lowercase */
function normalizeTrxIdInput(value) {
  if (value == null) return "";
  return String(value)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 30)
    .toLowerCase();
}

// ---------- Part 2: Timer & status display ----------
function TicketTimer({ createdAt }) {
  const [seconds, setSeconds] = useState(() => ticketRemainingSeconds(createdAt));
  useEffect(() => {
    setSeconds(ticketRemainingSeconds(createdAt));
    const t = setInterval(() => setSeconds(ticketRemainingSeconds(createdAt)), 1000);
    return () => clearInterval(t);
  }, [createdAt]);
  const color = ticketTimerColor(seconds);
  return (
    <span className="jw-ticketTimer" style={{ color, fontWeight: 600 }}>
      {formatTimer(seconds)}
    </span>
  );
}

function getStatusDisplay(row) {
  const s = (row?.status || "").toLowerCase();
  if (s === "approved") return { label: "Approved", className: "jw-depositState-approved" };
  if (s === "rejected") return { label: "Rejected", className: "jw-depositState-rejected" };
  const sec = ticketRemainingSeconds(row?.createdAt);
  if (sec !== null && sec < 0) return { label: "Overdue", className: "jw-depositState-overdue" };
  return { label: "Pending", className: "jw-depositState-pending" };
}

// ---------- Part 2: Data table ----------
function DepositTable({
  rows,
  loading,
  statusFilter,
  onEdit,
  onView,
  onTrxIdClick,
  onSlipClick,
}) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";
  const showTimer = statusFilter === "pending";
  const showTicketCol = statusFilter === "pending" || statusFilter === "rejected";
  const showCreatedAt = statusFilter === "pending" || statusFilter === "approved";
  const showUpdatedAt = statusFilter === "rejected" || statusFilter === "approved";
  const colCount =
    5 +
    (showTimer ? 1 : 0) +
    (showTicketCol ? 1 : 0) +
    (showCreatedAt ? 1 : 0) +
    (showUpdatedAt ? 1 : 0) +
    1; // + Actions

  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            {showTimer && <th>Timer</th>}
            {showTicketCol && <th>Ticket</th>}
            <th>Username</th>
            <th>Company</th>
            <th>Wallet</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Trx ID</th>
            {showCreatedAt && <th>Created at</th>}
            {showUpdatedAt && <th>Updated at</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td colSpan={colCount}>
                  <div className="jw-adminSkeleton" style={{ height: 20 }} />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={colCount} className="jw-adminEmpty">
                No results found
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const statusDisplay = getStatusDisplay(r);
              const isPending = (r.status || "").toLowerCase() === "pending";
              const isApproved = (r.status || "").toLowerCase() === "approved";
              const isRejected = (r.status || "").toLowerCase() === "rejected";
              return (
                <tr key={r.id}>
                  {showTimer && (
                    <td>
                      <TicketTimer createdAt={r.createdAt} />
                    </td>
                  )}
                  {showTicketCol && <td>{r.id}</td>}
                  <td>{r.username || "—"}</td>
                  <td>{r.walletCompanyName || "—"}</td>
                  <td>{r.paymentWalletName || "—"}</td>
                  <td>{r.amount != null ? Math.floor(Number(r.amount)).toLocaleString() : "—"}</td>
                  <td>
                    <span className={statusDisplay.className}>{statusDisplay.label}</span>
                  </td>
                  <td className="jw-adminTd__actions">
                    <button
                      type="button"
                      className="jw-adminEditBtn jw-adminReportsViewBtn"
                      title="View Trx ID"
                      onClick={() => onTrxIdClick?.(r)}
                      aria-label="View Trx ID"
                    >
                      <FileText size={16} />
                    </button>
                  </td>
                  {showCreatedAt && (
                    <td className="jw-adminTd__date">{formatAdminDateTime(r.createdAt)}</td>
                  )}
                  {showUpdatedAt && (
                    <td className="jw-adminTd__date">{formatAdminDateTime(r.updatedAt)}</td>
                  )}
                  <td className="jw-adminTd__actions">
                    {isPending ? (
                      <button
                        type="button"
                        className="jw-adminEditBtn"
                        title="Edit"
                        onClick={() => onEdit?.(r)}
                      >
                        <EditIconSvg />
                      </button>
                    ) : (isApproved || isRejected) ? (
                      <button
                        type="button"
                        className="jw-adminEditBtn jw-adminReportsViewBtn"
                        title="View"
                        onClick={() => onView?.(r)}
                      >
                        <Eye size={16} />
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Part 3: Create modal ----------
function CreateModal({
  open,
  onClose,
  form,
  companiesForCreate,
  walletsForCreate,
  selectedWalletMeta,
  clients,
  loadingClients,
  onChange,
  onSlipChange,
  slipFile,
  slipSizeError,
  onSubmit,
  saving,
  errorText,
}) {
  const [usernameSearch, setUsernameSearch] = useState("");
  const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const usernameInputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setUsernameSearch("");
      setUsernameDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  }, [open]);

  const clientList = clients || [];
  const filteredClients = useMemo(() => {
    const q = (usernameSearch || "").trim().toLowerCase();
    if (!q) return clientList;
    return clientList.filter((c) => (c.username || "").toLowerCase().includes(q));
  }, [clientList, usernameSearch]);

  const slipFileInputRef = React.useRef(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = React.useState(null);
  React.useEffect(() => {
    if (!slipFile) {
      setSlipPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(slipFile);
    setSlipPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [slipFile]);

  React.useEffect(() => {
    if (!open || !usernameDropdownOpen) {
      setHighlightedIndex(-1);
      return;
    }
    if (filteredClients.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    const selIdx = filteredClients.findIndex((c) => Number(c.id) === Number(form.clientId));
    setHighlightedIndex(selIdx >= 0 ? selIdx : 0);
  }, [open, usernameDropdownOpen, filteredClients, form.clientId]);

  if (!open) return null;

  const walletList = walletsForCreate || [];
  const companyList = companiesForCreate || [];
  const balance = selectedWalletMeta?.balance ?? 0;
  const minD = selectedWalletMeta?.minDeposit ?? 0;
  const maxD = selectedWalletMeta?.maxDeposit ?? 0;
  const selectedClient = form.clientId ? clientList.find((c) => Number(c.id) === Number(form.clientId)) : null;
  const displayUsername = selectedClient ? (selectedClient.username || "") : usernameSearch;

  const handleUsernameInputChange = (e) => {
    const v = e.target.value;
    setUsernameSearch(v);
    onChange("clientId", "");
    setUsernameDropdownOpen(true);
  };

  const handleUsernameSelect = (c) => {
    onChange("clientId", String(c.id));
    setUsernameSearch(c.username || "");
    setUsernameDropdownOpen(false);
  };

  const handleUsernameFocus = () => setUsernameDropdownOpen(true);
  const handleUsernameBlur = () => {
    setTimeout(() => setUsernameDropdownOpen(false), 150);
  };

  const handleUsernameKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setUsernameDropdownOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!usernameDropdownOpen) {
        setUsernameDropdownOpen(true);
        if (filteredClients.length > 0) setHighlightedIndex(0);
        return;
      }
      if (filteredClients.length === 0) return;
      setHighlightedIndex((i) => {
        if (i < 0) return 0;
        return Math.min(i + 1, filteredClients.length - 1);
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!usernameDropdownOpen || filteredClients.length === 0) return;
      setHighlightedIndex((i) => (i <= 0 ? 0 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      if (usernameDropdownOpen && filteredClients.length > 0 && highlightedIndex >= 0) {
        e.preventDefault();
        const row = filteredClients[highlightedIndex];
        if (row) handleUsernameSelect(row);
      }
    }
  };

  const handleSlipFileChange = (e) => {
    const file = e.target.files?.[0];
    onSlipChange?.(file || null);
  };

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create deposit ticket">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Create Deposit Ticket</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label" id="create-deposit-username-label">
              Username<span className="jw-adminRequiredMark" aria-hidden="true">*</span>
            </label>
            <div
              className={`jw-adminUsersModal__inputWrap jw-depositUsernameDropdown${form.clientId ? " jw-depositUsernameDropdown--hasClient" : ""}`}
            >
              <input
                ref={usernameInputRef}
                type="text"
                className="jw-adminInput"
                value={displayUsername}
                onChange={handleUsernameInputChange}
                onFocus={handleUsernameFocus}
                onBlur={handleUsernameBlur}
                onKeyDown={handleUsernameKeyDown}
                placeholder="Search and select client (username)"
                autoComplete="off"
                aria-required="true"
                aria-labelledby="create-deposit-username-label"
              />
              {form.clientId ? (
                <span
                  className="jw-depositUsernameDropdown__selectedTick"
                  aria-hidden="true"
                  title="Client selected"
                >
                  <Check size={18} strokeWidth={2.75} aria-hidden="true" />
                </span>
              ) : null}
              {loadingClients && <span className="jw-adminUsersModal__hint" style={{ marginTop: 4, display: "block" }}>Loading…</span>}
              {usernameDropdownOpen && !loadingClients && (
                <ul className="jw-depositUsernameDropdown__list" role="listbox">
                  {filteredClients.length === 0 ? (
                    <li className="jw-depositUsernameDropdown__item is-empty">No matches</li>
                  ) : (
                    filteredClients.map((c, idx) => (
                      <li
                        key={c.id}
                        className={`jw-depositUsernameDropdown__item${idx === highlightedIndex ? " is-keyboard-focus" : ""}`}
                        role="option"
                        aria-selected={Number(c.id) === Number(form.clientId)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseDown={(e) => { e.preventDefault(); handleUsernameSelect(c); }}
                      >
                        {c.username || "—"}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Company</label>
            <select
              className="jw-adminInput"
              value={String(form.walletCompanyId ?? "")}
              onChange={(e) => onChange("walletCompanyId", e.target.value)}
            >
              <option value="">Select company</option>
              {companyList.filter((c) => c.availableForDeposit).map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Wallet</label>
            <select
              className="jw-adminInput"
              value={String(form.paymentWalletId ?? "")}
              onChange={(e) => onChange("paymentWalletId", e.target.value)}
            >
              <option value="">Select wallet</option>
              {walletList.filter((w) => w.availableForDeposit).map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name} ({w.number})</option>
              ))}
            </select>
          </div>
          <div className="jw-adminUsersModal__field jw-depositWalletMetaBelow">
            <div
              className="jw-adminUsersModal__readOnly jw-adminUsersModal__infoBlock"
              aria-label="Selected wallet balance and limits"
            >
              Balance: {Math.floor(balance).toLocaleString()} | Min: {Math.floor(minD).toLocaleString()} | Max:{" "}
              {maxD > 0 ? Math.floor(maxD).toLocaleString() : "—"}
            </div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Amount</label>
            <input
              type="number"
              className="jw-adminUsersModal__input"
              value={form.amount ?? ""}
              onChange={(e) => onChange("amount", e.target.value)}
              placeholder="Amount"
              min={minD}
              max={maxD > 0 ? maxD : undefined}
              {...depositAmountInputNoScrollProps}
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label" id="create-deposit-trx-label">
              Trx ID<span className="jw-adminRequiredMark" aria-hidden="true">*</span>{" "}
              (alphanumeric, max 30)
            </label>
            <input
              className="jw-adminUsersModal__input"
              value={form.trxId ?? ""}
              onChange={(e) => onChange("trxId", normalizeTrxIdInput(e.target.value))}
              placeholder="Enter transaction ID"
              maxLength={30}
              required
              aria-required="true"
              aria-labelledby="create-deposit-trx-label"
              autoComplete="off"
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Attach slip (optional)</label>
            <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>{SLIP_ACCEPT_HINT}</span>
            <input
              ref={slipFileInputRef}
              type="file"
              accept={SLIP_ACCEPT}
              className="jw-adminUsersModal__input"
              onChange={handleSlipFileChange}
            />
            {slipFile ? <span className="jw-adminCompaniesFileOk">Image selected</span> : null}
            {slipFile ? (
              <div className="jw-adminCompaniesFileInfo">
                {slipPreviewUrl ? <img src={slipPreviewUrl} alt="" className="jw-adminCompaniesFilePreview" /> : null}
                <span className="jw-adminCompaniesFileName">{slipFile.name}</span>
                <span className="jw-adminUsersModal__hint">{(slipFile.size / 1024).toFixed(1)} KB</span>
                {slipSizeError ? <div className="jw-adminUsersModal__error">{SLIP_SIZE_ERROR_MSG}</div> : null}
              </div>
            ) : null}
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Notes (optional)</label>
            <textarea
              className="jw-adminUsersModal__textarea jw-adminUsersModal__input"
              value={form.notes ?? ""}
              onChange={(e) => onChange("notes", e.target.value)}
              rows={2}
            />
          </div>
          {errorText && <div className="jw-adminUsersPage__notice is-error">{errorText}</div>}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onSubmit} disabled={saving || slipSizeError}>{saving ? "Creating…" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Part 4: Edit modal (Pending tickets) ----------
function EditModal({
  open,
  onClose,
  ticket,
  form,
  companiesForCreate,
  walletsForCreate,
  selectedWalletMeta,
  onChange,
  onSlipChange,
  slipFile,
  slipSizeError,
  onEvidenceChange,
  evidenceFile,
  evidenceSizeError,
  onSubmit,
  onOpenSlip,
  saving,
  errorText,
}) {
  const slipReplaceInputRef = React.useRef(null);
  const evidenceInputRef = React.useRef(null);
  const [slipReplacePreviewUrl, setSlipReplacePreviewUrl] = React.useState(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = React.useState(null);
  React.useEffect(() => {
    if (!slipFile) {
      setSlipReplacePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(slipFile);
    setSlipReplacePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [slipFile]);
  React.useEffect(() => {
    if (!evidenceFile) {
      setEvidencePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(evidenceFile);
    setEvidencePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [evidenceFile]);

  const [currentSlipImgError, setCurrentSlipImgError] = React.useState(false);
  React.useEffect(() => {
    setCurrentSlipImgError(false);
  }, [open, ticket?.slipPath]);

  if (!open) return null;
  const statusDisplay = ticket ? getStatusDisplay(ticket) : { label: "—", className: "" };
  const isApprove = form.process === "approve";
  const isReject = form.process === "reject";
  const walletList = walletsForCreate || [];
  const companyList = companiesForCreate || [];
  const balance = selectedWalletMeta?.balance ?? 0;
  const minD = selectedWalletMeta?.minDeposit ?? 0;
  const maxD = selectedWalletMeta?.maxDeposit ?? 0;
  const slipUrl = ticket?.slipPath ? `${getApiOrigin()}${ticket.slipPath}` : null;

  if (!ticket) {
    return (
      <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
        <div className="jw-adminUsersModal" onClick={(e) => e.stopPropagation()} role="dialog">
          <div className="jw-adminUsersModal__body">Loading ticket…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit deposit ticket">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Edit Deposit Ticket</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Information</label>
            <div className="jw-adminUsersModal__readOnly jw-adminUsersModal__infoBlock">
              <div>Timer: <TicketTimer createdAt={ticket?.createdAt} /></div>
              <div>Status: <span className={statusDisplay.className}>{statusDisplay.label}</span></div>
              <div>Ticket id: {ticket.id}</div>
              <div>Created at: {formatAdminDateTime(ticket.createdAt)}</div>
              <div>Created by: {ticket.createdByUsername || "—"}</div>
              <div>Username: {ticket.username || "—"}</div>
              <div>Company: {ticket.walletCompanyName || "—"}</div>
              <div>Wallet: {ticket.paymentWalletName || "—"}</div>
              <div>Amount: {ticket.amount != null ? Math.floor(Number(ticket.amount)).toLocaleString() : "—"}</div>
              <div>Slip: {slipUrl ? <button type="button" className="jw-adminUsersModal__link" onClick={() => onOpenSlip?.(slipUrl)}>View slip</button> : "—"}</div>
            </div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Process</label>
            <select
              className="jw-adminInput"
              value={form.process || ""}
              onChange={(e) => onChange("process", e.target.value)}
            >
              <option value="">Select</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
          </div>
          {isApprove && (
            <>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Company</label>
                <select
                  className="jw-adminInput"
                  value={String(form.walletCompanyId ?? ticket.walletCompanyId ?? "")}
                  onChange={(e) => onChange("walletCompanyId", e.target.value)}
                >
                  <option value="">Select</option>
                  {companyList.filter((c) => c.availableForDeposit).map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Wallet</label>
                <select
                  className="jw-adminInput"
                  value={String(form.paymentWalletId ?? ticket.paymentWalletId ?? "")}
                  onChange={(e) => onChange("paymentWalletId", e.target.value)}
                >
                  <option value="">Select</option>
                  {walletList.filter((w) => w.availableForDeposit).map((w) => (
                    <option key={w.id} value={String(w.id)}>{w.name} ({w.number})</option>
                  ))}
                </select>
              </div>
              <div className="jw-adminUsersModal__field jw-depositWalletMetaBelow">
                <div
                  className="jw-adminUsersModal__readOnly jw-adminUsersModal__infoBlock"
                  aria-label="Selected wallet balance and limits"
                >
                  Balance: {Math.floor(balance).toLocaleString()} | Min: {Math.floor(minD).toLocaleString()} | Max:{" "}
                  {maxD > 0 ? Math.floor(maxD).toLocaleString() : "—"}
                </div>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Amount</label>
                <input
                  type="number"
                  className="jw-adminUsersModal__input"
                  value={form.amount ?? ticket.amount ?? ""}
                  onChange={(e) => onChange("amount", e.target.value)}
                  min={minD}
                  max={maxD > 0 ? maxD : undefined}
                  {...depositAmountInputNoScrollProps}
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label" id="edit-deposit-trx-label">
                  Trx ID<span className="jw-adminRequiredMark" aria-hidden="true">*</span>{" "}
                  (alphanumeric, max 30)
                </label>
                <input
                  className="jw-adminUsersModal__input"
                  value={form.trxId ?? ticket.trxId ?? ""}
                  onChange={(e) => onChange("trxId", normalizeTrxIdInput(e.target.value))}
                  maxLength={30}
                  required
                  aria-required="true"
                  aria-labelledby="edit-deposit-trx-label"
                  autoComplete="off"
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Slip (replace)</label>
                {slipUrl ? (
                  <div className="jw-depositEditSlipCurrent">
                    <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 6 }}>Current slip</span>
                    <div className="jw-adminCompaniesFileInfo">
                      {!currentSlipImgError ? (
                        <button
                          type="button"
                          className="jw-depositEditSlipThumbBtn"
                          onClick={() => onOpenSlip?.(slipUrl)}
                          aria-label="View deposit slip full size"
                        >
                          <img
                            src={slipUrl}
                            alt=""
                            className="jw-adminCompaniesFilePreview"
                            onError={() => setCurrentSlipImgError(true)}
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="jw-adminUsersModal__link"
                          onClick={() => onOpenSlip?.(slipUrl)}
                        >
                          Open slip
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 8 }}>No slip on file.</span>
                )}
                <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>
                  Upload a new image to replace (optional).
                </span>
                <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>{SLIP_ACCEPT_HINT}</span>
                <input
                  ref={slipReplaceInputRef}
                  type="file"
                  accept={SLIP_ACCEPT}
                  className="jw-adminUsersModal__input"
                  onChange={(e) => onSlipChange?.(e.target.files?.[0] || null)}
                />
                {slipFile ? <span className="jw-adminCompaniesFileOk">New image selected</span> : null}
                {slipFile ? (
                  <div className="jw-adminCompaniesFileInfo">
                    {slipReplacePreviewUrl ? <img src={slipReplacePreviewUrl} alt="" className="jw-adminCompaniesFilePreview" /> : null}
                    <span className="jw-adminCompaniesFileName">{slipFile.name}</span>
                    <span className="jw-adminUsersModal__hint">{(slipFile.size / 1024).toFixed(1)} KB</span>
                    {slipSizeError ? <div className="jw-adminUsersModal__error">{SLIP_SIZE_ERROR_MSG}</div> : null}
                  </div>
                ) : null}
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Evidence (optional)</label>
                <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>{SLIP_ACCEPT_HINT}</span>
                <input
                  ref={evidenceInputRef}
                  type="file"
                  accept={SLIP_ACCEPT}
                  className="jw-adminUsersModal__input"
                  onChange={(e) => onEvidenceChange?.(e.target.files?.[0] || null)}
                />
                {evidenceFile ? <span className="jw-adminCompaniesFileOk">Image selected</span> : null}
                {evidenceFile ? (
                  <div className="jw-adminCompaniesFileInfo">
                    {evidencePreviewUrl ? <img src={evidencePreviewUrl} alt="" className="jw-adminCompaniesFilePreview" /> : null}
                    <span className="jw-adminCompaniesFileName">{evidenceFile.name}</span>
                    <span className="jw-adminUsersModal__hint">{(evidenceFile.size / 1024).toFixed(1)} KB</span>
                    {evidenceSizeError ? <div className="jw-adminUsersModal__error">{EVIDENCE_SIZE_ERROR_MSG}</div> : null}
                  </div>
                ) : null}
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Notes (optional)</label>
                <textarea
                  className="jw-adminUsersModal__textarea jw-adminUsersModal__input"
                  value={form.notes ?? ""}
                  onChange={(e) => onChange("notes", e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
          {isReject && (
            <>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Reason</label>
                <input
                  className="jw-adminUsersModal__input"
                  value={form.reason ?? ""}
                  onChange={(e) => onChange("reason", e.target.value)}
                  placeholder="Required for reject"
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Evidence (optional)</label>
                <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>{SLIP_ACCEPT_HINT}</span>
                <input
                  ref={evidenceInputRef}
                  type="file"
                  accept={SLIP_ACCEPT}
                  className="jw-adminUsersModal__input"
                  onChange={(e) => onEvidenceChange?.(e.target.files?.[0] || null)}
                />
                {evidenceFile ? <span className="jw-adminCompaniesFileOk">Image selected</span> : null}
                {evidenceFile ? (
                  <div className="jw-adminCompaniesFileInfo">
                    {evidencePreviewUrl ? <img src={evidencePreviewUrl} alt="" className="jw-adminCompaniesFilePreview" /> : null}
                    <span className="jw-adminCompaniesFileName">{evidenceFile.name}</span>
                    <span className="jw-adminUsersModal__hint">{(evidenceFile.size / 1024).toFixed(1)} KB</span>
                    {evidenceSizeError ? <div className="jw-adminUsersModal__error">{EVIDENCE_SIZE_ERROR_MSG}</div> : null}
                  </div>
                ) : null}
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Notes (optional)</label>
                <textarea
                  className="jw-adminUsersModal__textarea jw-adminUsersModal__input"
                  value={form.notes ?? ""}
                  onChange={(e) => onChange("notes", e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
          {errorText && <div className="jw-adminUsersPage__notice is-error">{errorText}</div>}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="button"
            className="jw-adminUsersModal__btn is-green"
            onClick={onSubmit}
            disabled={
              saving
              || (isApprove && (slipSizeError || evidenceSizeError))
              || (isReject && evidenceSizeError)
            }
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Part 5: View modal, Trx ID modal, Slip modal ----------
function ViewModal({ open, onClose, ticket, notes, onChangeNotes, onSaveNotes, onOpenSlip, saving, errorText }) {
  if (!open) return null;
  if (!ticket) {
    return (
      <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
        <div className="jw-adminUsersModal" onClick={(e) => e.stopPropagation()} role="dialog">
          <div className="jw-adminUsersModal__body">Loading ticket…</div>
        </div>
      </div>
    );
  }
  const statusDisplay = getStatusDisplay(ticket);
  const isApproved = (ticket.status || "").toLowerCase() === "approved";
  const isRejected = (ticket.status || "").toLowerCase() === "rejected";
  let timeTaken = "—";
  if (ticket.updatedAt && ticket.createdAt) {
    const start = new Date(ticket.createdAt).getTime();
    const end = new Date(ticket.updatedAt).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      const sec = Math.floor((end - start) / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      timeTaken = `${m}m ${s}s`;
    }
  }
  const slipUrl = ticket.slipPath ? `${getApiOrigin()}${ticket.slipPath}` : null;
  const evidenceUrl = ticket.evidencePath ? `${getApiOrigin()}${ticket.evidencePath}` : null;

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="View deposit ticket">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">View Deposit Ticket</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Information</label>
            <div className="jw-adminUsersModal__readOnly jw-adminUsersModal__infoBlock">
              <div>Time Taken: {timeTaken}</div>
              <div>Status: <span className={statusDisplay.className}>{statusDisplay.label}</span></div>
              <div>Ticket id: {ticket.id}</div>
              <div>Transaction No.: {isApproved ? ticket.ledgerTransactionNumber || "—" : "—"}</div>
              <div>Created at: {formatAdminDateTime(ticket.createdAt)}</div>
              <div>Updated at: {formatAdminDateTime(ticket.updatedAt)}</div>
              <div>Created by: {ticket.createdByUsername || "—"}</div>
              {isApproved && <div>Trx ID: {ticket.trxId || "—"}</div>}
              <div>Username: {ticket.username || "—"}</div>
              <div>Company: {ticket.walletCompanyName || "—"}</div>
              <div>Wallet: {ticket.paymentWalletName || "—"}</div>
              <div>Amount: {ticket.amount != null ? Math.floor(Number(ticket.amount)).toLocaleString() : "—"}</div>
              <div>Slip: {slipUrl ? <button type="button" className="jw-adminUsersModal__link" onClick={() => onOpenSlip?.(slipUrl)}>View slip</button> : "—"}</div>
              <div>Evidence: {evidenceUrl ? <button type="button" className="jw-adminUsersModal__link" onClick={() => onOpenSlip?.(evidenceUrl)}>View evidence</button> : "—"}</div>
              {isRejected && <div>Reason: {ticket.reason || "—"}</div>}
            </div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Notes (editable)</label>
            <textarea
              className="jw-adminUsersModal__textarea jw-adminUsersModal__input"
              value={notes ?? ""}
              onChange={(e) => onChangeNotes?.(e.target.value)}
              rows={3}
            />
          </div>
          {errorText && <div className="jw-adminUsersPage__notice is-error">{errorText}</div>}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose} disabled={saving}>Close</button>
          <button type="button" className="jw-adminUsersModal__btn is-primary" onClick={onSaveNotes} disabled={saving}>{saving ? "Saving…" : "Save notes"}</button>
        </div>
      </div>
    </div>
  );
}

function TrxIdModal({ open, onClose, trxId }) {
  if (!open) return null;
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div className="jw-adminUsersModal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Trx ID">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Trx ID</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__readOnly">{trxId || "—"}</div>
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const SLIP_ZOOM_MIN = 50;
const SLIP_ZOOM_MAX = 200;
const SLIP_ZOOM_STEP = 25;

function SlipImageModal({ open, onClose, slipUrl }) {
  const [zoomPct, setZoomPct] = useState(100);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (open && slipUrl) {
      setZoomPct(100);
      setImgError(false);
    }
  }, [open, slipUrl]);

  if (!open || !slipUrl) return null;

  const zoomOut = () => setZoomPct((z) => Math.max(SLIP_ZOOM_MIN, z - SLIP_ZOOM_STEP));
  const zoomIn = () => setZoomPct((z) => Math.min(SLIP_ZOOM_MAX, z + SLIP_ZOOM_STEP));

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div
        className="jw-depositSlipModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Deposit slip"
      >
        <div className="jw-depositSlipModal__headerRow">
          <div className="jw-adminUsersModal__title">Deposit Slip</div>
          <div className="jw-depositSlipModal__zoom">
            <button
              type="button"
              className="jw-depositSlipModal__zoomBtn"
              aria-label="Zoom out"
              onClick={zoomOut}
              disabled={zoomPct <= SLIP_ZOOM_MIN}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              className="jw-depositSlipModal__zoomBtn"
              aria-label="Zoom in"
              onClick={zoomIn}
              disabled={zoomPct >= SLIP_ZOOM_MAX}
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
        <div className="jw-depositSlipModal__scroll">
          {imgError ? (
            <div className="jw-depositSlipModal__error">Image could not be loaded.</div>
          ) : (
            <img
              src={slipUrl}
              alt="Deposit slip"
              className="jw-depositSlipModal__img"
              style={{
                width: zoomPct === 100 ? "auto" : `${zoomPct}%`,
                maxWidth: zoomPct === 100 ? "100%" : "none",
                maxHeight: zoomPct === 100 ? "min(72vh, calc(100dvh - 12rem))" : "none",
              }}
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="jw-depositSlipModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Part 1: Main component shell ----------
export default function DepositTab({ title, tabs }) {
  const [filters, setFilters] = useState({
    ticket: "",
    username: "",
    company: "",
    wallet: "",
    status: "pending",
    trxId: "",
    startDate: "",
    endDate: "",
  });
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dropdowns for filters (all companies, all wallets)
  const [companies, setCompanies] = useState([]);
  const [wallets, setWallets] = useState([]);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    clientId: "",
    walletCompanyId: "",
    paymentWalletId: "",
    amount: "",
    trxId: "",
    notes: "",
  });
  const [createSlipFile, setCreateSlipFile] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [walletsForCreate, setWalletsForCreate] = useState([]);

  // Edit modal (Pending)
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editTicket, setEditTicket] = useState(null);
  const [editForm, setEditForm] = useState({
    process: "",
    walletCompanyId: "",
    paymentWalletId: "",
    amount: "",
    trxId: "",
    notes: "",
    reason: "",
  });
  const [editSlipFile, setEditSlipFile] = useState(null);
  const [editEvidenceFile, setEditEvidenceFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [walletsForEdit, setWalletsForEdit] = useState([]);
  const [slipModalUrl, setSlipModalUrl] = useState(null);

  // View modal (Approved/Rejected)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [viewNotes, setViewNotes] = useState("");
  const [viewSaving, setViewSaving] = useState(false);
  const [viewError, setViewError] = useState("");

  // Trx ID modal
  const [trxIdModalOpen, setTrxIdModalOpen] = useState(false);
  const [trxIdModalValue, setTrxIdModalValue] = useState("");

  const fetchTickets = useCallback(() => {
    setLoading(true);
    setError("");
    const q = buildQuery({
      ticket: applied.ticket || undefined,
      username: applied.username || undefined,
      company: applied.company || undefined,
      wallet: applied.wallet || undefined,
      status: applied.status || "pending",
      trxId: applied.trxId ? normalizeTrxIdInput(applied.trxId) : undefined,
      dateFrom: applied.startDate || undefined,
      dateTo: applied.endDate || undefined,
      page,
      pageSize,
    });
    const token = getToken();
    fetch(`/api/admin/deposit-tickets?${q}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        setRows(data.items ?? []);
        setTotal(Number(data.total) ?? 0);
      })
      .catch((e) => {
        setError(e?.message || "Failed to load tickets.");
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [applied, page, pageSize]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Load companies and wallets for filter dropdowns (all)
  useEffect(() => {
    const token = getToken();
    Promise.all([
      fetch(`/api/admin/wallet-companies?pageSize=500`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then((r) => r.json()),
      fetch(`/api/admin/payment-wallets?pageSize=500`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then((r) => r.json()),
    ]).then(([cData, wData]) => {
      setCompanies(cData?.items ?? []);
      setWallets(wData?.items ?? []);
    }).catch(() => {});
  }, []);

  const onClear = () => {
    setFilters({
      ticket: "",
      username: "",
      company: "",
      wallet: "",
      status: "pending",
      trxId: "",
      startDate: "",
      endDate: "",
    });
    setApplied({});
    setPage(1);
  };

  const onSubmit = () => {
    setApplied({ ...filters });
    setPage(1);
  };

  const displayRows = useMemo(() => {
    if (loading && rows.length === 0) return [{ id: "loading-row" }];
    if (!loading && rows.length === 0) return [{ id: "empty-row" }];
    return rows;
  }, [loading, rows]);

  const statusFilter = (applied.status || "pending").toLowerCase();

  const companiesForCreate = useMemo(() => companies.map((c) => ({
    ...c,
    availableForDeposit: c.available_for_deposit === 1 || c.availableForDeposit === true,
  })), [companies]);

  const selectedWalletMeta = useMemo(() => {
    const id = createForm.paymentWalletId ? Number(createForm.paymentWalletId) : null;
    const w = (walletsForCreate || []).find((x) => Number(x.id) === id);
    if (!w) return null;
    return {
      balance: Number(w.balance ?? 0),
      minDeposit: Number(w.min_deposit ?? w.minDeposit ?? 0),
      maxDeposit: Number(w.max_deposit ?? w.maxDeposit ?? 0),
    };
  }, [walletsForCreate, createForm.paymentWalletId]);

  const editCompanyId = editForm.walletCompanyId || editTicket?.walletCompanyId;
  const selectedWalletMetaForEdit = useMemo(() => {
    const id = editForm.paymentWalletId || editTicket?.paymentWalletId;
    const numId = id != null ? Number(id) : null;
    const w = (walletsForEdit || []).find((x) => Number(x.id) === numId);
    if (!w) return editTicket ? { balance: editTicket.paymentWalletBalance ?? 0, minDeposit: editTicket.paymentWalletMinDeposit ?? 0, maxDeposit: editTicket.paymentWalletMaxDeposit ?? 0 } : null;
    return {
      balance: Number(w.balance ?? 0),
      minDeposit: Number(w.min_deposit ?? w.minDeposit ?? 0),
      maxDeposit: Number(w.max_deposit ?? w.maxDeposit ?? 0),
    };
  }, [walletsForEdit, editForm.paymentWalletId, editTicket]);

  const createSlipSizeError = !!(createSlipFile && createSlipFile.size > SLIP_MAX_BYTES);
  const editSlipSizeError = !!(editSlipFile && editSlipFile.size > SLIP_MAX_BYTES);
  const editEvidenceSizeError = !!(editEvidenceFile && editEvidenceFile.size > EVIDENCE_MAX_BYTES);

  useEffect(() => {
    if (!createOpen) return;
    setLoadingClients(true);
    const token = getToken();
    fetch(`/api/admin/users?pageSize=500`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setClients(data?.items ?? []))
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, [createOpen]);

  useEffect(() => {
    if (!createOpen || !createForm.walletCompanyId) {
      setWalletsForCreate([]);
      return;
    }
    const token = getToken();
    fetch(`/api/admin/payment-wallets?companyId=${createForm.walletCompanyId}&pageSize=500`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setWalletsForCreate(data?.items ?? []))
      .catch(() => setWalletsForCreate([]));
  }, [createOpen, createForm.walletCompanyId]);

  useEffect(() => {
    if (!editOpen || !editCompanyId) {
      setWalletsForEdit([]);
      return;
    }
    const token = getToken();
    fetch(`/api/admin/payment-wallets?companyId=${editCompanyId}&pageSize=500`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setWalletsForEdit(data?.items ?? []))
      .catch(() => setWalletsForEdit([]));
  }, [editOpen, editCompanyId]);

  const openView = (row) => {
    setViewTicket(null);
    setViewNotes("");
    setViewError("");
    setViewOpen(true);
    const token = getToken();
    fetch(`/api/admin/deposit-tickets/${row.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setViewTicket(data);
        setViewNotes(data?.notes ?? "");
      })
      .catch(() => setViewError("Failed to load ticket."));
  };

  const handleViewSaveNotes = () => {
    if (!viewTicket?.id) return;
    setViewSaving(true);
    setViewError("");
    const token = getToken();
    fetch(`/api/admin/deposit-tickets/${viewTicket.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ notes: viewNotes.trim() || undefined }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok && data?.message) throw new Error(data.message);
        setViewSaving(false);
      })
      .catch((e) => setViewError(e?.message || "Failed to save."))
      .finally(() => setViewSaving(false));
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditTicket(null);
    setEditForm({ process: "", walletCompanyId: "", paymentWalletId: "", amount: "", trxId: "", notes: "", reason: "" });
    setEditSlipFile(null);
    setEditEvidenceFile(null);
    setEditError("");
    setEditOpen(true);
    const token = getToken();
    fetch(`/api/admin/deposit-tickets/${row.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setEditTicket(data);
        setEditForm((p) => ({
          ...p,
          walletCompanyId: data.walletCompanyId ?? "",
          paymentWalletId: data.paymentWalletId ?? "",
          amount: data.amount != null ? String(Math.floor(Number(data.amount))) : "",
          trxId: data.trxId ?? "",
          notes: data.notes ?? "",
        }));
      })
      .catch(() => setEditError("Failed to load ticket."));
  };

  const handleEditSubmit = () => {
    if (!editTicket?.id) return;
    if (!editForm.process) {
      setEditError("Please select Approve or Reject.");
      return;
    }
    if (editForm.process === "approve") {
      if (editSlipSizeError || editEvidenceSizeError) {
        setEditError(
          editSlipSizeError ? SLIP_SIZE_ERROR_MSG : EVIDENCE_SIZE_ERROR_MSG
        );
        return;
      }
      const amt = Number(editForm.amount ?? editTicket.amount);
      const minD = selectedWalletMetaForEdit?.minDeposit ?? 0;
      const maxD = selectedWalletMetaForEdit?.maxDeposit ?? 0;
      if (!Number.isFinite(amt) || amt < minD || (maxD > 0 && amt > maxD)) {
        setEditError(`Amount must be between ${Math.floor(minD)} and ${maxD ? Math.floor(maxD) : "unlimited"}.`);
        return;
      }
      const trxNormApprove = normalizeTrxIdInput(editForm.trxId || "");
      if (!trxNormApprove) {
        setEditError("Trx ID is required.");
        return;
      }
    }
    if (editForm.process === "reject") {
      if (editEvidenceSizeError) {
        setEditError(EVIDENCE_SIZE_ERROR_MSG);
        return;
      }
      if (!(editForm.reason || "").trim()) {
        setEditError("Reason is required for reject.");
        return;
      }
    }
    setEditSaving(true);
    setEditError("");
    const token = getToken();
    if (editForm.process === "approve") {
      const formData = new FormData();
      formData.append("walletCompanyId", editForm.walletCompanyId || editTicket.walletCompanyId);
      formData.append("paymentWalletId", editForm.paymentWalletId || editTicket.paymentWalletId);
      formData.append("amount", String(Math.floor(Number(editForm.amount ?? editTicket.amount))));
      formData.append("trxId", normalizeTrxIdInput(editForm.trxId || ""));
      if (editForm.notes != null) formData.append("notes", editForm.notes);
      if (editSlipFile) formData.append("slip", editSlipFile);
      if (editEvidenceFile) formData.append("evidence", editEvidenceFile);
      fetch(`/api/admin/deposit-tickets/${editTicket.id}/approve`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.message && !data.ticket) throw new Error(data.message || "Failed.");
          setEditOpen(false);
          setEditRow(null);
          setEditTicket(null);
          fetchTickets();
        })
        .catch((e) => setEditError(e?.message || "Failed to approve."))
        .finally(() => setEditSaving(false));
    } else {
      const reasonTrim = (editForm.reason || "").trim();
      const notesTrim = (editForm.notes || "").trim();
      const rejectOpts = token ? { Authorization: `Bearer ${token}` } : {};
      const rejectReq = editEvidenceFile
        ? (() => {
            const fd = new FormData();
            fd.append("reason", reasonTrim);
            if (notesTrim) fd.append("notes", notesTrim);
            fd.append("evidence", editEvidenceFile);
            return fetch(`/api/admin/deposit-tickets/${editTicket.id}/reject`, {
              method: "PATCH",
              headers: rejectOpts,
              body: fd,
            });
          })()
        : fetch(`/api/admin/deposit-tickets/${editTicket.id}/reject`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...rejectOpts,
            },
            body: JSON.stringify({ reason: reasonTrim, notes: notesTrim || undefined }),
          });
      rejectReq
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok && data?.message) throw new Error(data.message);
          setEditOpen(false);
          setEditRow(null);
          setEditTicket(null);
          fetchTickets();
        })
        .catch((e) => setEditError(e?.message || "Failed to reject."))
        .finally(() => setEditSaving(false));
    }
  };

  const openCreate = () => {
    setCreateForm({
      clientId: "",
      walletCompanyId: "",
      paymentWalletId: "",
      amount: "",
      trxId: "",
      notes: "",
    });
    setCreateSlipFile(null);
    setCreateError("");
    setCreateOpen(true);
  };

  const handleCreateSubmit = () => {
    const { clientId, walletCompanyId, paymentWalletId, amount, trxId, notes } = createForm;
    const cid = String(clientId ?? "").trim();
    const wcid = String(walletCompanyId ?? "").trim();
    const pwid = String(paymentWalletId ?? "").trim();
    if (!cid || !wcid || !pwid) {
      setCreateError("Username, Company and Wallet are required.");
      return;
    }
    const amt = Number(amount);
    const minD = selectedWalletMeta?.minDeposit ?? 0;
    const maxD = selectedWalletMeta?.maxDeposit ?? 0;
    if (!Number.isFinite(amt) || amt < minD || (maxD > 0 && amt > maxD)) {
      setCreateError(`Amount must be between ${Math.floor(minD)} and ${maxD ? Math.floor(maxD) : "unlimited"}.`);
      return;
    }
    if (createSlipSizeError) {
      setCreateError(SLIP_SIZE_ERROR_MSG);
      return;
    }
    const trxNorm = normalizeTrxIdInput(trxId || "");
    if (!trxNorm) {
      setCreateError("Trx ID is required.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    const formData = new FormData();
    formData.append("clientId", cid);
    formData.append("walletCompanyId", wcid);
    formData.append("paymentWalletId", pwid);
    formData.append("amount", String(Math.floor(amt)));
    formData.append("trxId", trxNorm);
    if (notes) formData.append("notes", notes);
    if (createSlipFile) formData.append("slip", createSlipFile);
    const token = getToken();
    fetch("/api/admin/deposit-tickets", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message && !data.id && !data.ticketId) throw new Error(data.message);
        setCreateOpen(false);
        fetchTickets();
      })
      .catch((e) => setCreateError(e?.message || "Failed to create."))
      .finally(() => setCreateSaving(false));
  };

  const filtersBar = (
    <AdminFilterBar
      actionsAddon={
        statusFilter === "pending" ? (
          <AdminAutoRefresh onRefresh={fetchTickets} />
        ) : null
      }
      onClear={onClear}
      onSubmit={onSubmit}
    >
      <AdminFilterField label="Ticket">
        <AdminInput
          value={filters.ticket}
          onChange={(v) => setFilters((f) => ({ ...f, ticket: v }))}
          placeholder="ID"
        />
      </AdminFilterField>
      <AdminFilterField label="Username">
        <AdminInput
          value={filters.username}
          onChange={(v) => setFilters((f) => ({ ...f, username: v }))}
          placeholder="Search"
        />
      </AdminFilterField>
      <AdminFilterField label="Company">
        <select
          className={`jw-adminInput ${!filters.company ? "jw-adminInput--placeholder" : ""}`}
          value={filters.company}
          onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
        >
          <option value="">All</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.id}
            </option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Wallet">
        <select
          className={`jw-adminInput ${!filters.wallet ? "jw-adminInput--placeholder" : ""}`}
          value={filters.wallet}
          onChange={(e) => setFilters((f) => ({ ...f, wallet: e.target.value }))}
        >
          <option value="">All</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.number})
            </option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select
          className={`jw-adminInput ${!filters.status ? "jw-adminInput--placeholder" : ""}`}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="Trx ID">
        <AdminInput
          value={filters.trxId}
          onChange={(v) => setFilters((f) => ({ ...f, trxId: v }))}
          placeholder="Alphanumeric"
        />
      </AdminFilterField>
      <AdminFilterField label="Date">
        <AdminDateRange
          startDate={filters.startDate}
          endDate={filters.endDate}
          placeholder="Please Select"
          onChange={({ startDate, endDate }) =>
            setFilters((f) => ({ ...f, startDate, endDate }))
          }
        />
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={openCreate}>
          <span className="jw-adminCreateBtnInner">
            Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} />
          </span>
        </AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <>
      <AdminPageShell
        title={title || "Transactions"}
        tabs={tabs}
        filters={filtersBar}
        table={
          <>
            {error && !loading ? (
              <div className="jw-adminUsersPage__notice is-error">{error}</div>
            ) : null}
            <DepositTable
              rows={displayRows}
              loading={loading}
              statusFilter={statusFilter}
              onEdit={openEdit}
            onView={openView}
            onTrxIdClick={(r) => { setTrxIdModalValue(r?.trxId ?? ""); setTrxIdModalOpen(true); }}
            onSlipClick={(r) => {}}
            />
          </>
        }
        pagination={
          <AdminPagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        }
      />
      <CreateModal
        open={createOpen}
        onClose={() => { if (!createSaving) setCreateOpen(false); }}
        form={createForm}
        companiesForCreate={companiesForCreate}
        walletsForCreate={walletsForCreate}
        selectedWalletMeta={selectedWalletMeta}
        clients={clients}
        loadingClients={loadingClients}
        onChange={(key, value) =>
          setCreateForm((p) => {
            const next = { ...p, [key]: value };
            if (key === "walletCompanyId") next.paymentWalletId = "";
            return next;
          })
        }
        onSlipChange={setCreateSlipFile}
        slipFile={createSlipFile}
        slipSizeError={createSlipSizeError}
        onSubmit={handleCreateSubmit}
        saving={createSaving}
        errorText={createError}
      />
      <EditModal
        open={editOpen}
        onClose={() => { if (!editSaving) { setEditOpen(false); setEditRow(null); setEditTicket(null); } }}
        ticket={editTicket}
        form={editForm}
        companiesForCreate={companiesForCreate}
        walletsForCreate={walletsForEdit}
        selectedWalletMeta={selectedWalletMetaForEdit}
        onChange={(key, value) =>
          setEditForm((p) => {
            const next = { ...p, [key]: value };
            if (key === "walletCompanyId") next.paymentWalletId = "";
            return next;
          })
        }
        onSlipChange={setEditSlipFile}
        slipFile={editSlipFile}
        slipSizeError={editSlipSizeError}
        onEvidenceChange={setEditEvidenceFile}
        evidenceFile={editEvidenceFile}
        evidenceSizeError={editEvidenceSizeError}
        onSubmit={handleEditSubmit}
        onOpenSlip={(url) => setSlipModalUrl(url)}
        saving={editSaving}
        errorText={editError}
      />
      <ViewModal
        open={viewOpen}
        onClose={() => { setViewOpen(false); setViewTicket(null); }}
        ticket={viewTicket}
        notes={viewNotes}
        onChangeNotes={setViewNotes}
        onSaveNotes={handleViewSaveNotes}
        onOpenSlip={(url) => setSlipModalUrl(url)}
        saving={viewSaving}
        errorText={viewError}
      />
      <TrxIdModal open={trxIdModalOpen} onClose={() => setTrxIdModalOpen(false)} trxId={trxIdModalValue} />
      <SlipImageModal open={!!slipModalUrl} onClose={() => setSlipModalUrl(null)} slipUrl={slipModalUrl} />
    </>
  );
}

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

const DEFAULT_TIMER_MINUTES = 15;
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const SLIP_SIZE_ERROR_MSG = "Slip image must be 10MB or smaller.";
const EVIDENCE_SIZE_ERROR_MSG = "Evidence image must be 10MB or smaller.";
const SLIP_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const SLIP_ACCEPT_HINT = "Accepted: JPEG, PNG, GIF, WebP. Max 10MB.";

const withdrawAmountInputNoScrollProps = {
  onWheel: (e) => e.currentTarget.blur(),
  onKeyDown: (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
  },
};

function ticketRemainingSeconds(createdAt, processMinutes = DEFAULT_TIMER_MINUTES) {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  const end = created + (processMinutes || DEFAULT_TIMER_MINUTES) * 60 * 1000;
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

function normalizeTrxIdInput(value) {
  if (value == null) return "";
  return String(value)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 30)
    .toLowerCase();
}

function TicketTimer({ createdAt, processMinutes }) {
  const [seconds, setSeconds] = useState(() =>
    ticketRemainingSeconds(createdAt, processMinutes)
  );
  useEffect(() => {
    setSeconds(ticketRemainingSeconds(createdAt, processMinutes));
    const t = setInterval(
      () => setSeconds(ticketRemainingSeconds(createdAt, processMinutes)),
      1000
    );
    return () => clearInterval(t);
  }, [createdAt, processMinutes]);
  const color = ticketTimerColor(seconds);
  return (
    <span className="jw-ticketTimer" style={{ color, fontWeight: 600 }}>
      {formatTimer(seconds)}
    </span>
  );
}

function getStatusDisplay(row, processMinutes) {
  const s = (row?.status || "").toLowerCase();
  if (s === "approved") return { label: "Approved", className: "jw-depositState-approved" };
  if (s === "rejected") return { label: "Rejected", className: "jw-depositState-rejected" };
  const sec = ticketRemainingSeconds(row?.createdAt, processMinutes);
  if (sec !== null && sec < 0) return { label: "Overdue", className: "jw-depositState-overdue" };
  return { label: "Pending", className: "jw-depositState-pending" };
}

function WithdrawTable({ rows, loading, statusFilter, onEdit, onView, onTrxIdClick }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";
  const showTimer = statusFilter === "pending";
  const showTicketCol = statusFilter === "pending" || statusFilter === "rejected";
  const showCreatedAt = statusFilter === "pending" || statusFilter === "approved";
  const showUpdatedAt = statusFilter === "rejected" || statusFilter === "approved";
  const colCount =
    6 +
    (showTimer ? 1 : 0) +
    (showTicketCol ? 1 : 0) +
    (showCreatedAt ? 1 : 0) +
    (showUpdatedAt ? 1 : 0) +
    1;

  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            {showTimer && <th>Timer</th>}
            {showTicketCol && <th>Ticket</th>}
            <th>Username</th>
            <th>Company</th>
            <th>Account</th>
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
              const processMin = r.withdrawProcessMinutes ?? DEFAULT_TIMER_MINUTES;
              const statusDisplay = getStatusDisplay(r, processMin);
              const isPending = (r.status || "").toLowerCase() === "pending";
              const isApproved = (r.status || "").toLowerCase() === "approved";
              const isRejected = (r.status || "").toLowerCase() === "rejected";
              const accountDisplay =
                r.accountTitle && r.accountNumber
                  ? `${r.accountTitle} (${r.accountNumber})`
                  : r.accountTitle || r.accountNumber || "—";
              return (
                <tr key={r.id}>
                  {showTimer && (
                    <td>
                      <TicketTimer createdAt={r.createdAt} processMinutes={processMin} />
                    </td>
                  )}
                  {showTicketCol && <td>{r.id}</td>}
                  <td>{r.username || "—"}</td>
                  <td>{r.walletCompanyName || "—"}</td>
                  <td>{accountDisplay}</td>
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

function CreateModal({
  open,
  onClose,
  form,
  companiesForCreate,
  clientWallets,
  clients,
  loadingClients,
  loadingWallets,
  onChange,
  onSubmit,
  saving,
  errorText,
}) {
  const [usernameSearch, setUsernameSearch] = useState("");
  const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const usernameInputRef = React.useRef(null);

  useEffect(() => {
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

  useEffect(() => {
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

  const companyList = companiesForCreate || [];
  const walletList = clientWallets || [];
  const selectedClient = form.clientId
    ? clientList.find((c) => Number(c.id) === Number(form.clientId))
    : null;
  const displayUsername = selectedClient ? selectedClient.username || "" : usernameSearch;

  const handleUsernameInputChange = (e) => {
    setUsernameSearch(e.target.value);
    onChange("clientId", "");
    setUsernameDropdownOpen(true);
  };

  const handleUsernameSelect = (c) => {
    onChange("clientId", String(c.id));
    setUsernameSearch(c.username || "");
    setUsernameDropdownOpen(false);
  };

  const handleUsernameFocus = () => setUsernameDropdownOpen(true);
  const handleUsernameBlur = () => setTimeout(() => setUsernameDropdownOpen(false), 150);

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
      setHighlightedIndex((i) =>
        i < 0 ? 0 : Math.min(i + 1, filteredClients.length - 1)
      );
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

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create withdraw ticket"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Create Withdraw Ticket</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">
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
              />
              {form.clientId ? (
                <span className="jw-depositUsernameDropdown__selectedTick" aria-hidden="true">
                  <Check size={18} strokeWidth={2.75} />
                </span>
              ) : null}
              {loadingClients && (
                <span className="jw-adminUsersModal__hint" style={{ marginTop: 4, display: "block" }}>
                  Loading…
                </span>
              )}
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
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleUsernameSelect(c);
                        }}
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
              {companyList
                .filter((c) => c.availableForWithdraw)
                .map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Client Wallet</label>
            <select
              className="jw-adminInput"
              value={String(form.clientWalletId ?? "")}
              onChange={(e) => onChange("clientWalletId", e.target.value)}
            >
              <option value="">Select wallet</option>
              {loadingWallets ? (
                <option value="" disabled>
                  Loading…
                </option>
              ) : (
                walletList.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.accountTitle} ({w.accountNumber})
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Amount</label>
            <input
              type="number"
              className="jw-adminUsersModal__input"
              value={form.amount ?? ""}
              onChange={(e) => onChange("amount", e.target.value)}
              placeholder="Amount"
              min={500}
              {...withdrawAmountInputNoScrollProps}
            />
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
          {errorText && (
            <div className="jw-adminUsersPage__notice is-error">{errorText}</div>
          )}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button
            type="button"
            className="jw-adminUsersModal__btn is-light"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="jw-adminUsersModal__btn is-green"
            onClick={onSubmit}
            disabled={saving}
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  open,
  onClose,
  ticket,
  form,
  paymentWallets,
  onChange,
  onSlipChange,
  slipFile,
  slipSizeError,
  onEvidenceChange,
  evidenceFile,
  evidenceSizeError,
  onSubmit,
  saving,
  errorText,
}) {
  const slipInputRef = React.useRef(null);
  const evidenceInputRef = React.useRef(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = React.useState(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = React.useState(null);
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
    if (!evidenceFile) {
      setEvidencePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(evidenceFile);
    setEvidencePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [evidenceFile]);

  if (!open) return null;

  const processMin = ticket?.withdrawProcessMinutes ?? DEFAULT_TIMER_MINUTES;
  const statusDisplay = ticket ? getStatusDisplay(ticket, processMin) : { label: "—", className: "" };
  const isApprove = form.process === "approve";
  const isReject = form.process === "reject";
  const walletList = paymentWallets || [];
  const selectedPwId = form.paymentWalletId ? Number(form.paymentWalletId) : null;
  const selectedPw = walletList.find((w) => Number(w.id) === selectedPwId);
  const pwBalance = selectedPw != null ? Number(selectedPw.balance ?? 0) : 0;
  const pwMin = selectedPw != null ? Number(selectedPw.minWithdraw ?? 0) : 0;
  const pwMax = selectedPw != null ? Number(selectedPw.maxWithdraw ?? 0) : 0;

  if (!ticket) {
    return (
      <div
        className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
        onClick={onClose}
      >
        <div className="jw-adminUsersModal" onClick={(e) => e.stopPropagation()} role="dialog">
          <div className="jw-adminUsersModal__body">Loading ticket…</div>
        </div>
      </div>
    );
  }

  const accountDisplay =
    ticket.accountTitle && ticket.accountNumber
      ? `${ticket.accountTitle} (${ticket.accountNumber})`
      : ticket.accountTitle || ticket.accountNumber || "—";

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit withdraw ticket"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Edit Withdraw Ticket</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Information</label>
            <div className="jw-adminUsersModal__readOnly jw-adminUsersModal__infoBlock">
              <div>
                Timer: <TicketTimer createdAt={ticket.createdAt} processMinutes={processMin} />
              </div>
              <div>
                Status: <span className={statusDisplay.className}>{statusDisplay.label}</span>
              </div>
              <div>Ticket id: {ticket.id}</div>
              <div>Created at: {formatAdminDateTime(ticket.createdAt)}</div>
              <div>Created by: {ticket.createdByUsername || "—"}</div>
              <div>Username: {ticket.username || "—"}</div>
              <div>Company: {ticket.walletCompanyName || "—"}</div>
              <div>Account: {accountDisplay}</div>
              <div>Amount: {ticket.amount != null ? Math.floor(Number(ticket.amount)).toLocaleString() : "—"}</div>
              <div>Client balance: {ticket.clientBalance != null ? Math.floor(Number(ticket.clientBalance)).toLocaleString() : "—"}</div>
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
                <label className="jw-adminUsersModal__label">
                  Payment Wallet<span className="jw-adminRequiredMark">*</span>
                </label>
                <select
                  className="jw-adminInput"
                  value={String(form.paymentWalletId ?? "")}
                  onChange={(e) => onChange("paymentWalletId", e.target.value)}
                >
                  <option value="">Select</option>
                  {walletList.map((w) => (
                    <option key={w.id} value={String(w.id)}>
                      {w.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="jw-adminUsersModal__field jw-depositWalletMetaBelow">
                <div
                  className="jw-adminUsersModal__readOnly jw-adminUsersModal__infoBlock"
                  aria-label="Selected payment wallet balance and limits"
                >
                  Balance: {Math.floor(pwBalance).toLocaleString()} | Min: {Math.floor(pwMin).toLocaleString()} | Max:{" "}
                  {pwMax > 0 ? Math.floor(pwMax).toLocaleString() : "—"}
                </div>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Amount</label>
                {selectedPw ? (
                  <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>
                    Must be between Rs. {Math.floor(pwMin).toLocaleString()} and{" "}
                    {pwMax > 0 ? `Rs. ${Math.floor(pwMax).toLocaleString()}` : "no max"} for this wallet.
                  </span>
                ) : null}
                <input
                  type="number"
                  className="jw-adminUsersModal__input"
                  value={form.amount ?? ticket.amount ?? ""}
                  onChange={(e) => onChange("amount", e.target.value)}
                  min={selectedPw && pwMin > 0 ? pwMin : 1}
                  max={selectedPw && pwMax > 0 ? pwMax : undefined}
                  {...withdrawAmountInputNoScrollProps}
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">
                  Trx ID<span className="jw-adminRequiredMark">*</span> (alphanumeric, max 30)
                </label>
                <input
                  className="jw-adminUsersModal__input"
                  value={form.trxId ?? ""}
                  onChange={(e) => onChange("trxId", normalizeTrxIdInput(e.target.value))}
                  maxLength={30}
                  placeholder="Payout reference"
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Slip (optional)</label>
                <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>{SLIP_ACCEPT_HINT}</span>
                <input
                  ref={slipInputRef}
                  type="file"
                  accept={SLIP_ACCEPT}
                  className="jw-adminUsersModal__input"
                  onChange={(e) => onSlipChange?.(e.target.files?.[0] || null)}
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
                <label className="jw-adminUsersModal__label">
                  Evidence<span className="jw-adminRequiredMark">*</span> (compulsory)
                </label>
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
          {errorText && (
            <div className="jw-adminUsersPage__notice is-error">{errorText}</div>
          )}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button
            type="button"
            className="jw-adminUsersModal__btn is-light"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="jw-adminUsersModal__btn is-green"
            onClick={onSubmit}
            disabled={saving || (isApprove && (!evidenceFile || slipSizeError || evidenceSizeError)) || (isReject && evidenceSizeError)}
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

const SLIP_ZOOM_MIN = 50;
const SLIP_ZOOM_MAX = 200;
const SLIP_ZOOM_STEP = 25;

function SlipImageModal({ open, onClose, imageUrl, title }) {
  const [zoomPct, setZoomPct] = useState(100);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (open && imageUrl) {
      setZoomPct(100);
      setImgError(false);
    }
  }, [open, imageUrl]);

  if (!open || !imageUrl) return null;

  const zoomOut = () => setZoomPct((z) => Math.max(SLIP_ZOOM_MIN, z - SLIP_ZOOM_STEP));
  const zoomIn = () => setZoomPct((z) => Math.min(SLIP_ZOOM_MAX, z + SLIP_ZOOM_STEP));

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div
        className="jw-depositSlipModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Image"}
      >
        <div className="jw-depositSlipModal__headerRow">
          <div className="jw-adminUsersModal__title">{title || "Image"}</div>
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
              src={imageUrl}
              alt={title || "Image"}
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

function ViewModal({ open, onClose, ticket, notes, onChangeNotes, onSaveNotes, onOpenSlip, saving, errorText }) {
  if (!open) return null;

  if (!ticket) {
    return (
      <div
        className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
        onClick={onClose}
      >
        <div className="jw-adminUsersModal" onClick={(e) => e.stopPropagation()} role="dialog">
          <div className="jw-adminUsersModal__body">Loading ticket…</div>
        </div>
      </div>
    );
  }

  const processMin = ticket.withdrawProcessMinutes ?? DEFAULT_TIMER_MINUTES;
  const statusDisplay = getStatusDisplay(ticket, processMin);
  const isApproved = (ticket.status || "").toLowerCase() === "approved";
  const isRejected = (ticket.status || "").toLowerCase() === "rejected";
  const accountDisplay =
    ticket.accountTitle && ticket.accountNumber
      ? `${ticket.accountTitle} (${ticket.accountNumber})`
      : ticket.accountTitle || ticket.accountNumber || "—";

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

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="View withdraw ticket"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">View Withdraw Ticket</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Information</label>
            <div className="jw-adminUsersModal__readOnly jw-adminUsersModal__infoBlock">
              <div>Time Taken: {timeTaken}</div>
              <div>
                Status: <span className={statusDisplay.className}>{statusDisplay.label}</span>
              </div>
              <div>Ticket id: {ticket.id}</div>
              <div>
                Transaction No.: {isApproved ? ticket.ledgerTransactionNumber || "—" : "—"}
              </div>
              <div>Created at: {formatAdminDateTime(ticket.createdAt)}</div>
              <div>Updated at: {formatAdminDateTime(ticket.updatedAt)}</div>
              <div>Created by: {ticket.createdByUsername || "—"}</div>
              {isApproved && <div>Trx ID: {ticket.trxId || "—"}</div>}
              <div>Username: {ticket.username || "—"}</div>
              <div>Company: {ticket.walletCompanyName || "—"}</div>
              <div>Account: {accountDisplay}</div>
              <div>Amount: {ticket.amount != null ? Math.floor(Number(ticket.amount)).toLocaleString() : "—"}</div>
              {isApproved && (
                <>
                  <div>Payment Wallet: {ticket.paymentWalletName || "—"}</div>
                  <div>Slip: {ticket.slipPath ? (
                    <button type="button" className="jw-adminUsersModal__link" onClick={() => onOpenSlip?.(`${getApiOrigin()}${ticket.slipPath}`, "Slip")}>
                      View slip
                    </button>
                  ) : "—"}</div>
                  <div>Evidence: {ticket.evidencePath ? (
                    <button type="button" className="jw-adminUsersModal__link" onClick={() => onOpenSlip?.(`${getApiOrigin()}${ticket.evidencePath}`, "Evidence")}>
                      View evidence
                    </button>
                  ) : "—"}</div>
                </>
              )}
              {isRejected && <div>Reason: {ticket.reason || "—"}</div>}
              {isRejected && (
                <div>Evidence: {ticket.evidencePath ? (
                  <button type="button" className="jw-adminUsersModal__link" onClick={() => onOpenSlip?.(`${getApiOrigin()}${ticket.evidencePath}`, "Evidence")}>
                    View evidence
                  </button>
                ) : "—"}</div>
              )}
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
          {errorText && (
            <div className="jw-adminUsersPage__notice is-error">{errorText}</div>
          )}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button
            type="button"
            className="jw-adminUsersModal__btn is-light"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
          <button
            type="button"
            className="jw-adminUsersModal__btn is-primary"
            onClick={onSaveNotes}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrxIdModal({ open, onClose, trxId }) {
  if (!open) return null;
  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
    >
      <div
        className="jw-adminUsersModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Trx ID"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Trx ID</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__readOnly">{trxId || "—"}</div>
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WithdrawTab({ title, tabs }) {
  const [filters, setFilters] = useState({
    ticket: "",
    username: "",
    company: "",
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

  const [companies, setCompanies] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    clientId: "",
    walletCompanyId: "",
    clientWalletId: "",
    amount: "",
    notes: "",
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientWallets, setClientWallets] = useState([]);
  const [loadingWallets, setLoadingWallets] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editTicket, setEditTicket] = useState(null);
  const [editForm, setEditForm] = useState({
    process: "",
    paymentWalletId: "",
    amount: "",
    trxId: "",
    notes: "",
    reason: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editEvidenceFile, setEditEvidenceFile] = useState(null);
  const [editSlipFile, setEditSlipFile] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [viewNotes, setViewNotes] = useState("");
  const [viewSaving, setViewSaving] = useState(false);
  const [viewError, setViewError] = useState("");

  const [trxIdModalOpen, setTrxIdModalOpen] = useState(false);
  const [trxIdModalValue, setTrxIdModalValue] = useState("");
  const [imageModalUrl, setImageModalUrl] = useState(null);
  const [imageModalTitle, setImageModalTitle] = useState("Image");

  const fetchTickets = useCallback(() => {
    setLoading(true);
    setError("");
    const q = buildQuery({
      ticket: applied.ticket || undefined,
      username: applied.username || undefined,
      company: applied.company || undefined,
      status: applied.status || "pending",
      trxId: applied.trxId ? normalizeTrxIdInput(applied.trxId) : undefined,
      dateFrom: applied.startDate || undefined,
      dateTo: applied.endDate || undefined,
      page,
      pageSize,
    });
    const token = getToken();
    fetch(`/api/admin/withdraw-tickets?${q}`, {
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

  useEffect(() => {
    const token = getToken();
    fetch(`/api/admin/wallet-companies?pageSize=500`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setCompanies(data?.items ?? []))
      .catch(() => {});
  }, []);

  const onClear = () => {
    setFilters({
      ticket: "",
      username: "",
      company: "",
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

  const companiesForCreate = useMemo(
    () =>
      companies.map((c) => ({
        ...c,
        availableForWithdraw:
          c.available_for_withdraw === 1 || c.availableForWithdraw === true,
      })),
    [companies]
  );

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
    if (!createOpen || !createForm.clientId || !createForm.walletCompanyId) {
      setClientWallets([]);
      setLoadingWallets(false);
      return;
    }
    setLoadingWallets(true);
    const token = getToken();
    fetch(
      `/api/admin/withdraw-tickets/client-wallets?clientId=${createForm.clientId}&companyId=${createForm.walletCompanyId}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
      .then((r) => r.json())
      .then((data) => setClientWallets(data?.items ?? []))
      .catch(() => setClientWallets([]))
      .finally(() => setLoadingWallets(false));
  }, [createOpen, createForm.clientId, createForm.walletCompanyId]);

  const openView = (row) => {
    setViewTicket(null);
    setViewNotes("");
    setViewError("");
    setViewOpen(true);
    const token = getToken();
    fetch(`/api/admin/withdraw-tickets/${row.id}`, {
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
    fetch(`/api/admin/withdraw-tickets/${viewTicket.id}`, {
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
      })
      .catch((e) => setViewError(e?.message || "Failed to save."))
      .finally(() => setViewSaving(false));
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditTicket(null);
    setEditForm({
      process: "",
      paymentWalletId: "",
      amount: "",
      trxId: "",
      notes: "",
      reason: "",
    });
    setEditError("");
    setEditOpen(true);
    const token = getToken();
    fetch(`/api/admin/withdraw-tickets/${row.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setEditTicket(data);
        setEditForm((p) => ({
          ...p,
          amount: data.amount != null ? String(Math.floor(Number(data.amount))) : "",
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
      const pwId = editForm.paymentWalletId || editTicket.paymentWalletId;
      if (!pwId) {
        setEditError("Payment wallet is required.");
        return;
      }
      const trxNorm = normalizeTrxIdInput(editForm.trxId || "");
      if (!trxNorm) {
        setEditError("Trx ID is required.");
        return;
      }
      if (!editEvidenceFile) {
        setEditError("Evidence image is required for approve.");
        return;
      }
      const wallets = editTicket?.paymentWallets ?? [];
      const numPwId = Number(pwId);
      const selectedPw = wallets.find((w) => Number(w.id) === numPwId);
      const amtNum =
        editForm.amount !== "" && editForm.amount != null
          ? Number(editForm.amount)
          : Number(editTicket.amount ?? 0);
      if (!Number.isFinite(amtNum) || amtNum <= 0) {
        setEditError("Enter a valid amount.");
        return;
      }
      if (selectedPw) {
        const minW = Number(selectedPw.minWithdraw ?? selectedPw.min_withdraw ?? 0);
        const maxW = Number(selectedPw.maxWithdraw ?? selectedPw.max_withdraw ?? 0);
        if (amtNum < minW) {
          setEditError(
            `Amount must be at least Rs. ${Math.floor(minW).toLocaleString()} for this payment wallet.`,
          );
          return;
        }
        if (maxW > 0 && amtNum > maxW) {
          setEditError(
            `Amount must not exceed Rs. ${Math.floor(maxW).toLocaleString()} for this payment wallet.`,
          );
          return;
        }
      }
    }
    if (editForm.process === "reject") {
      if (!(editForm.reason || "").trim()) {
        setEditError("Reason is required for reject.");
        return;
      }
    }
    setEditSaving(true);
    setEditError("");
    const token = getToken();
    if (editForm.process === "approve") {
      const fd = new FormData();
      fd.append("paymentWalletId", editForm.paymentWalletId || editTicket.paymentWalletId);
      fd.append("trxId", normalizeTrxIdInput(editForm.trxId || ""));
      if (editForm.amount != null) fd.append("amount", String(editForm.amount));
      if (editForm.notes) fd.append("notes", editForm.notes);
      fd.append("evidence", editEvidenceFile);
      if (editSlipFile) fd.append("slip", editSlipFile);
      fetch(`/api/admin/withdraw-tickets/${editTicket.id}/approve`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.message && !data.ticket) throw new Error(data.message);
          setEditOpen(false);
          setEditRow(null);
          setEditTicket(null);
          setEditEvidenceFile(null);
          setEditSlipFile(null);
          fetchTickets();
        })
        .catch((e) => setEditError(e?.message || "Failed to approve."))
        .finally(() => setEditSaving(false));
    } else {
      const rejectOpts = token ? { Authorization: `Bearer ${token}` } : {};
      const rejectReq = editEvidenceFile
        ? (() => {
            const fd = new FormData();
            fd.append("reason", (editForm.reason || "").trim());
            fd.append("notes", editForm.notes || "");
            fd.append("evidence", editEvidenceFile);
            return fetch(`/api/admin/withdraw-tickets/${editTicket.id}/reject`, {
              method: "PATCH",
              headers: rejectOpts,
              body: fd,
            });
          })()
        : fetch(`/api/admin/withdraw-tickets/${editTicket.id}/reject`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...rejectOpts,
            },
            body: JSON.stringify({
              reason: (editForm.reason || "").trim(),
              notes: editForm.notes || undefined,
            }),
          });
      rejectReq
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok && data?.message) throw new Error(data.message);
          setEditOpen(false);
          setEditRow(null);
          setEditTicket(null);
          setEditEvidenceFile(null);
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
      clientWalletId: "",
      amount: "",
      notes: "",
    });
    setCreateError("");
    setCreateOpen(true);
  };

  const handleCreateSubmit = () => {
    const { clientId, walletCompanyId, clientWalletId, amount, notes } = createForm;
    const cid = String(clientId ?? "").trim();
    const wcid = String(walletCompanyId ?? "").trim();
    const cwid = String(clientWalletId ?? "").trim();
    if (!cid || !wcid || !cwid) {
      setCreateError("Username, Company and Client Wallet are required.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 500) {
      setCreateError("Minimum amount is Rs. 500.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    const token = getToken();
    fetch("/api/admin/withdraw-tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clientId: cid,
        clientWalletId: cwid,
        amount: Math.floor(amt),
        notes: notes || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message && !data.id) throw new Error(data.message);
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
            <WithdrawTable
              rows={displayRows}
              loading={loading}
              statusFilter={statusFilter}
              onEdit={openEdit}
              onView={openView}
              onTrxIdClick={(r) => {
                setTrxIdModalValue(r?.trxId ?? "");
                setTrxIdModalOpen(true);
              }}
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
        onClose={() => {
          if (!createSaving) setCreateOpen(false);
        }}
        form={createForm}
        companiesForCreate={companiesForCreate}
        clientWallets={clientWallets}
        clients={clients}
        loadingClients={loadingClients}
        loadingWallets={loadingWallets}
        onChange={(key, value) =>
          setCreateForm((p) => {
            const next = { ...p, [key]: value };
            if (key === "clientId") next.walletCompanyId = next.clientWalletId = "";
            if (key === "walletCompanyId") next.clientWalletId = "";
            return next;
          })
        }
        onSubmit={handleCreateSubmit}
        saving={createSaving}
        errorText={createError}
      />
      <EditModal
        open={editOpen}
        onClose={() => {
          if (!editSaving) {
            setEditOpen(false);
            setEditRow(null);
            setEditTicket(null);
            setEditEvidenceFile(null);
            setEditSlipFile(null);
          }
        }}
        ticket={editTicket}
        form={editForm}
        paymentWallets={editTicket?.paymentWallets ?? []}
        onChange={(key, value) => setEditForm((p) => ({ ...p, [key]: value }))}
        onSlipChange={setEditSlipFile}
        slipFile={editSlipFile}
        slipSizeError={!!(editSlipFile && editSlipFile.size > EVIDENCE_MAX_BYTES)}
        onEvidenceChange={setEditEvidenceFile}
        evidenceFile={editEvidenceFile}
        evidenceSizeError={!!(editEvidenceFile && editEvidenceFile.size > EVIDENCE_MAX_BYTES)}
        onSubmit={handleEditSubmit}
        saving={editSaving}
        errorText={editError}
      />
      <ViewModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewTicket(null);
        }}
        ticket={viewTicket}
        notes={viewNotes}
        onChangeNotes={setViewNotes}
        onSaveNotes={handleViewSaveNotes}
        onOpenSlip={(url, title) => {
          if (url) {
            setImageModalUrl(url);
            setImageModalTitle(title || "Image");
          }
        }}
        saving={viewSaving}
        errorText={viewError}
      />
      <TrxIdModal
        open={trxIdModalOpen}
        onClose={() => setTrxIdModalOpen(false)}
        trxId={trxIdModalValue}
      />
      <SlipImageModal
        open={!!imageModalUrl}
        onClose={() => setImageModalUrl(null)}
        imageUrl={imageModalUrl}
        title={imageModalTitle}
      />
    </>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, Plus, ZoomIn, ZoomOut } from "lucide-react";
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
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
const EVIDENCE_SIZE_ERROR_MSG = "Evidence image must be 10MB or smaller.";
const SLIP_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const SLIP_ACCEPT_HINT = "Accepted: JPEG, PNG, GIF, WebP. Max 10MB.";

const amountInputNoScrollProps = {
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

function TransfersTable({ rows, loading, statusFilter, onEdit, onView }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";
  const showTimer = statusFilter === "pending";
  const showTicketCol = statusFilter === "pending" || statusFilter === "rejected";
  const showCreatedAt = statusFilter === "pending" || statusFilter === "approved";
  const showUpdatedAt = statusFilter === "rejected" || statusFilter === "approved";
  const totalCols =
    7 +
    (showTimer ? 1 : 0) +
    (showTicketCol ? 1 : 0) +
    (showCreatedAt ? 1 : 0) +
    (showUpdatedAt ? 1 : 0);

  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            {showTimer && <th>Timer</th>}
            {showTicketCol && <th>Ticket</th>}
            <th>Client</th>
            <th>Brand</th>
            <th>Master</th>
            <th>Account</th>
            <th>Direction</th>
            <th>Amount</th>
            <th>Status</th>
            {showCreatedAt && <th>Created at</th>}
            {showUpdatedAt && <th>Updated at</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td colSpan={totalCols}>
                  <div className="jw-adminSkeleton" style={{ height: 20 }} />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={totalCols} className="jw-adminEmpty">
                No results found
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const processMin = r.transferProcessMinutes ?? DEFAULT_TIMER_MINUTES;
              const statusDisplay = getStatusDisplay(r, processMin);
              const isPending = (r.status || "").toLowerCase() === "pending";
              const isApproved = (r.status || "").toLowerCase() === "approved";
              const isRejected = (r.status || "").toLowerCase() === "rejected";
              return (
                <tr key={r.id}>
                  {showTimer && (
                    <td>
                      <TicketTimer createdAt={r.createdAt} processMinutes={processMin} />
                    </td>
                  )}
                  {showTicketCol && <td>{r.id}</td>}
                  <td>{r.username || "—"}</td>
                  <td>{r.brandName || "—"}</td>
                  <td>{r.masterDisplayLabel || (r.brandCompanyUsername ? `@${r.brandCompanyUsername}` : "—")}</td>
                  <td>{r.clientAccountUsername || "—"}</td>
                  <td>{r.direction || "—"}</td>
                  <td>{r.amount != null ? Math.floor(Number(r.amount)).toLocaleString() : "—"}</td>
                  <td>
                    <span className={statusDisplay.className}>{statusDisplay.label}</span>
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
                    ) : isApproved || isRejected ? (
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
  brands,
  companies,
  clients,
  clientAccounts,
  loadingClients,
  loadingCompanies,
  loadingClientAccounts,
  onChange,
  onClientSelect,
  onAccountSelect,
  onSubmit,
  saving,
  errorText,
}) {
  const [usernameSearch, setUsernameSearch] = useState("");
  const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [accountHighlightedIndex, setAccountHighlightedIndex] = useState(-1);
  const usernameInputRef = React.useRef(null);
  const accountInputRef = React.useRef(null);

  useEffect(() => {
    if (open) {
      setUsernameSearch("");
      setUsernameDropdownOpen(false);
      setAccountSearch("");
      setAccountDropdownOpen(false);
      setHighlightedIndex(-1);
      setAccountHighlightedIndex(-1);
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

  const accountList = clientAccounts || [];
  /** When Master is chosen, only list client_accounts linked to that brand_company. */
  const accountsScopedToMaster = useMemo(() => {
    const bcId = form.brandCompanyId;
    if (!bcId || !Number(bcId)) return accountList;
    const n = Number(bcId);
    return accountList.filter(
      (a) => a.brandCompanyId != null && Number(a.brandCompanyId) === n
    );
  }, [accountList, form.brandCompanyId]);

  const filteredAccounts = useMemo(() => {
    const q = (accountSearch || "").trim().toLowerCase();
    const base = accountsScopedToMaster;
    if (!q) return base;
    return base.filter(
      (a) =>
        (a.username || "").toLowerCase().includes(q) ||
        (a.masterLabel || "").toLowerCase().includes(q) ||
        (a.brandName || "").toLowerCase().includes(q)
    );
  }, [accountsScopedToMaster, accountSearch]);

  useEffect(() => {
    if (!open || !accountDropdownOpen) {
      setAccountHighlightedIndex(-1);
      return;
    }
    if (filteredAccounts.length === 0) {
      setAccountHighlightedIndex(-1);
      return;
    }
    const selIdx = filteredAccounts.findIndex((a) => Number(a.id) === Number(form.clientAccountId));
    setAccountHighlightedIndex(selIdx >= 0 ? selIdx : 0);
  }, [open, accountDropdownOpen, filteredAccounts, form.clientAccountId]);

  if (!open) return null;

  const selectedClient = form.clientId
    ? clientList.find((c) => Number(c.id) === Number(form.clientId))
    : null;
  const displayUsername = selectedClient ? selectedClient.username || "" : usernameSearch;

  const handleUsernameInputChange = (e) => {
    setUsernameSearch(e.target.value);
    if (onClientSelect) {
      onClientSelect("");
    } else {
      onChange("clientId", "");
    }
    setUsernameDropdownOpen(true);
  };

  const handleUsernameSelect = (c) => {
    if (onClientSelect) {
      onClientSelect(String(c.id));
    } else {
      onChange("clientId", String(c.id));
    }
    setUsernameSearch(c.username || "");
    setUsernameDropdownOpen(false);
  };

  const selectedAccount = form.clientAccountId
    ? accountList.find((a) => Number(a.id) === Number(form.clientAccountId))
    : null;
  const displayAccount = selectedAccount
    ? selectedAccount.username || ""
    : accountSearch;

  const handleAccountInputChange = (e) => {
    setAccountSearch(e.target.value);
    onChange("clientAccountId", "");
    setAccountDropdownOpen(true);
  };

  const handleAccountSelect = (a) => {
    if (onAccountSelect) {
      onAccountSelect(a);
    } else {
      onChange("clientAccountId", String(a.id));
      onChange("brandId", a.brandId ? String(a.brandId) : "");
      onChange("brandCompanyId", a.brandCompanyId ? String(a.brandCompanyId) : "");
    }
    setAccountSearch(a.username || "");
    setAccountDropdownOpen(false);
  };

  const handleAccountFocus = () => setAccountDropdownOpen(true);
  const handleAccountBlur = () => setTimeout(() => setAccountDropdownOpen(false), 150);

  const handleAccountKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setAccountDropdownOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!accountDropdownOpen) {
        setAccountDropdownOpen(true);
        if (filteredAccounts.length > 0) setAccountHighlightedIndex(0);
        return;
      }
      if (filteredAccounts.length === 0) return;
      setAccountHighlightedIndex((i) =>
        i < 0 ? 0 : Math.min(i + 1, filteredAccounts.length - 1)
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!accountDropdownOpen || filteredAccounts.length === 0) return;
      setAccountHighlightedIndex((i) => (i <= 0 ? 0 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      if (accountDropdownOpen && filteredAccounts.length > 0 && accountHighlightedIndex >= 0) {
        e.preventDefault();
        const row = filteredAccounts[accountHighlightedIndex];
        if (row) handleAccountSelect(row);
      }
    }
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
        aria-label="Create transfer ticket"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Create Transfer Ticket</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">
              Username (search and select)
              <span className="jw-adminRequiredMark" aria-hidden="true">*</span>
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
            <label className="jw-adminUsersModal__label">Brand</label>
            <select
              className="jw-adminInput"
              value={String(form.brandId ?? "")}
              onChange={(e) => onChange("brandId", e.target.value)}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Master</label>
            <select
              className="jw-adminInput"
              value={String(form.brandCompanyId ?? "")}
              onChange={(e) => onChange("brandCompanyId", e.target.value)}
              disabled={!form.brandId || loadingCompanies}
            >
              <option value="">
                {loadingCompanies ? "Loading…" : "Select Master"}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.displayLabel || `@${c.username}`}
                </option>
              ))}
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">
              Account (search and select)
              <span className="jw-adminRequiredMark" aria-hidden="true">*</span>
            </label>
            <div
              className={`jw-adminUsersModal__inputWrap jw-depositUsernameDropdown${form.clientAccountId ? " jw-depositUsernameDropdown--hasClient" : ""}`}
            >
              <input
                ref={accountInputRef}
                type="text"
                className="jw-adminInput"
                value={displayAccount}
                onChange={handleAccountInputChange}
                onFocus={handleAccountFocus}
                onBlur={handleAccountBlur}
                onKeyDown={handleAccountKeyDown}
                placeholder="Search client accounts"
                autoComplete="off"
                disabled={!form.clientId}
              />
              {form.clientAccountId ? (
                <span className="jw-depositUsernameDropdown__selectedTick" aria-hidden="true">
                  <Check size={18} strokeWidth={2.75} />
                </span>
              ) : null}
              {loadingClientAccounts && (
                <span className="jw-adminUsersModal__hint" style={{ marginTop: 4, display: "block" }}>
                  Loading…
                </span>
              )}
              {accountDropdownOpen && !loadingClientAccounts && form.clientId && (
                <ul className="jw-depositUsernameDropdown__list" role="listbox">
                  {filteredAccounts.length === 0 ? (
                    <li className="jw-depositUsernameDropdown__item is-empty">No matches</li>
                  ) : (
                    filteredAccounts.map((a, idx) => (
                      <li
                        key={a.id}
                        className={`jw-depositUsernameDropdown__item${idx === accountHighlightedIndex ? " is-keyboard-focus" : ""}`}
                        role="option"
                        aria-selected={Number(a.id) === Number(form.clientAccountId)}
                        onMouseEnter={() => setAccountHighlightedIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAccountSelect(a);
                        }}
                      >
                        {a.username || "—"}
                        {a.masterLabel ? ` (${a.masterLabel})` : ""}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            {form.clientId ? null : (
              <span className="jw-adminUsersModal__hint" style={{ fontSize: 11, opacity: 0.8 }}>
                Select Username first
              </span>
            )}
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Direction</label>
            <select
              className="jw-adminInput"
              value={form.direction || ""}
              onChange={(e) => onChange("direction", e.target.value)}
            >
              <option value="">Select</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Amount</label>
            <input
              type="number"
              className="jw-adminInput"
              value={form.amount ?? ""}
              onChange={(e) => onChange("amount", e.target.value)}
              min={0.01}
              step="any"
              {...amountInputNoScrollProps}
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
            disabled={saving || loadingClients}
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTransferModal({
  open,
  onClose,
  ticket,
  form,
  companies,
  clientAccounts,
  loadingCompanies,
  loadingClientAccounts,
  brands,
  onChange,
  onEvidenceChange,
  evidenceFile,
  evidenceSizeError,
  onSubmit,
  saving,
  errorText,
}) {
  const evidenceInputRef = React.useRef(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = React.useState(null);
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
  const processMin = ticket?.transferProcessMinutes ?? DEFAULT_TIMER_MINUTES;
  const statusDisplay = ticket ? getStatusDisplay(ticket, processMin) : { label: "—", className: "" };
  const isApprove = form.process === "approve";
  const isReject = form.process === "reject";
  const approveAccounts = (clientAccounts || []).filter((a) =>
    !form.brandCompanyId ? true : Number(a.brandCompanyId) === Number(form.brandCompanyId)
  );

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
        aria-label="Edit transfer ticket"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Edit Transfer Ticket</div>
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
              <div>Direction: {ticket.direction}</div>
              <div>Created at: {formatAdminDateTime(ticket.createdAt)}</div>
              <div>Created by: {ticket.createdByUsername || "—"}</div>
              <div>Client: {ticket.username || "—"}</div>
              <div>Brand: {ticket.brandName || "—"}</div>
              <div>Master: {ticket.masterDisplayLabel || "—"}</div>
              <div>Account: {ticket.clientAccountUsername || "—"}</div>
              <div>Amount: {ticket.amount != null ? Math.floor(Number(ticket.amount)).toLocaleString() : "—"}</div>
              <div>
                Client balance:{" "}
                {ticket.clientBalance != null
                  ? Math.floor(Number(ticket.clientBalance)).toLocaleString()
                  : "—"}
              </div>
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
                  Brand<span className="jw-adminRequiredMark">*</span>
                </label>
                <select
                  className="jw-adminInput"
                  value={String(form.brandId ?? "")}
                  onChange={(e) => onChange("brandId", e.target.value)}
                >
                  <option value="">Select</option>
                  {brands.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">
                  Master<span className="jw-adminRequiredMark">*</span>
                </label>
                <select
                  className="jw-adminInput"
                  value={String(form.brandCompanyId ?? "")}
                  onChange={(e) => onChange("brandCompanyId", e.target.value)}
                  disabled={!form.brandId || loadingCompanies}
                >
                  <option value="">
                    {loadingCompanies ? "Loading…" : "Select Master"}
                  </option>
                  {companies.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.displayLabel || `@${c.username}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">
                  Account<span className="jw-adminRequiredMark">*</span>
                </label>
                <select
                  className="jw-adminInput"
                  value={String(form.clientAccountId ?? "")}
                  onChange={(e) => onChange("clientAccountId", e.target.value)}
                  disabled={loadingClientAccounts}
                >
                  <option value="">
                    {loadingClientAccounts ? "Loading…" : "Select Account"}
                  </option>
                  {approveAccounts.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.username}
                      </option>
                    ))}
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">
                  Direction<span className="jw-adminRequiredMark">*</span>
                </label>
                <select
                  className="jw-adminInput"
                  value={String(form.direction || "")}
                  onChange={(e) => onChange("direction", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Amount</label>
                <input
                  type="number"
                  className="jw-adminInput"
                  value={form.amount ?? ""}
                  onChange={(e) => onChange("amount", e.target.value)}
                  min={0.01}
                  step="any"
                  {...amountInputNoScrollProps}
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">
                  Evidence<span className="jw-adminRequiredMark">*</span>
                </label>
                <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>
                  {SLIP_ACCEPT_HINT}
                </span>
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
                    {evidencePreviewUrl ? (
                      <img src={evidencePreviewUrl} alt="" className="jw-adminCompaniesFilePreview" />
                    ) : null}
                    <span className="jw-adminCompaniesFileName">{evidenceFile.name}</span>
                    <span className="jw-adminUsersModal__hint">
                      {(evidenceFile.size / 1024).toFixed(1)} KB
                    </span>
                    {evidenceSizeError ? (
                      <div className="jw-adminUsersModal__error">{EVIDENCE_SIZE_ERROR_MSG}</div>
                    ) : null}
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
                <label className="jw-adminUsersModal__label">
                  Reason<span className="jw-adminRequiredMark">*</span>
                </label>
                <input
                  className="jw-adminUsersModal__input"
                  value={form.reason ?? ""}
                  onChange={(e) => onChange("reason", e.target.value)}
                  placeholder="Required"
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Evidence (optional)</label>
                <span className="jw-adminUsersModal__hint" style={{ display: "block", marginBottom: 4 }}>
                  {SLIP_ACCEPT_HINT}
                </span>
                <input
                  ref={evidenceInputRef}
                  type="file"
                  accept={SLIP_ACCEPT}
                  className="jw-adminUsersModal__input"
                  onChange={(e) => onEvidenceChange?.(e.target.files?.[0] || null)}
                />
                {evidenceFile ? (
                  <div className="jw-adminCompaniesFileInfo">
                    {evidencePreviewUrl ? (
                      <img src={evidencePreviewUrl} alt="" className="jw-adminCompaniesFilePreview" />
                    ) : null}
                    <span className="jw-adminCompaniesFileName">{evidenceFile.name}</span>
                    {evidenceSizeError ? (
                      <div className="jw-adminUsersModal__error">{EVIDENCE_SIZE_ERROR_MSG}</div>
                    ) : null}
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
            disabled={
              saving ||
              (isApprove && (!evidenceFile || evidenceSizeError)) ||
              (isReject && evidenceSizeError)
            }
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
        <div className="jw-depositSlipModal__body">
          {!imgError ? (
            <img
              src={imageUrl}
              alt=""
              style={{ maxWidth: `${zoomPct}%`, height: "auto" }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div>Failed to load image.</div>
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

function ViewTransferModal({
  open,
  onClose,
  ticket,
  notes,
  onChangeNotes,
  onSaveNotes,
  onOpenImage,
  saving,
  errorText,
}) {
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
  const statusDisplay = getStatusDisplay(ticket, ticket.transferProcessMinutes ?? 15);
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
  const evidenceUrl = ticket.evidencePath ? `${getApiOrigin()}${ticket.evidencePath}` : null;

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="View transfer ticket"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">View Transfer Ticket</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Information</label>
            <div className="jw-adminUsersModal__readOnly jw-adminUsersModal__infoBlock">
              <div>Time taken: {timeTaken}</div>
              <div>
                Status: <span className={statusDisplay.className}>{statusDisplay.label}</span>
              </div>
              <div>Ticket id: {ticket.id}</div>
              <div>
                Transaction No.: {isApproved ? ticket.ledgerTransactionNumber || "—" : "—"}
              </div>
              <div>Direction: {ticket.direction || "—"}</div>
              <div>Created at: {formatAdminDateTime(ticket.createdAt)}</div>
              <div>Updated at: {formatAdminDateTime(ticket.updatedAt)}</div>
              <div>Created by: {ticket.createdByUsername || "—"}</div>
              <div>Updated by: {ticket.updatedByUsername || "—"}</div>
              <div>Client: {ticket.username || "—"}</div>
              <div>Brand: {ticket.brandName || "—"}</div>
              <div>Master: {ticket.masterDisplayLabel || "—"}</div>
              <div>Account: {ticket.clientAccountUsername || "—"}</div>
              <div>Amount: {ticket.amount != null ? Math.floor(Number(ticket.amount)).toLocaleString() : "—"}</div>
              <div>
                Evidence:{" "}
                {evidenceUrl ? (
                  <button
                    type="button"
                    className="jw-adminUsersModal__link"
                    onClick={() => onOpenImage?.(evidenceUrl)}
                  >
                    View evidence
                  </button>
                ) : (
                  "—"
                )}
              </div>
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

function fetchBrandCompanies(brandId, token) {
  if (!brandId) return Promise.resolve([]);
  return fetch(`/api/admin/transfer-tickets/brand-companies?brandId=${encodeURIComponent(brandId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => r.json())
    .then((d) => d.items ?? [])
    .catch(() => []);
}

function fetchClientAccounts(clientId, token) {
  if (!clientId) return Promise.resolve([]);
  return fetch(`/api/admin/transfer-tickets/client-accounts?clientId=${encodeURIComponent(clientId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => r.json())
    .then((d) => d.items ?? [])
    .catch(() => []);
}

export default function TransfersTab({ title, tabs }) {
  const [filters, setFilters] = useState({
    ticket: "",
    username: "",
    brand: "",
    brandCompany: "",
    accountUsername: "",
    direction: "",
    status: "pending",
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

  const [brands, setBrands] = useState([]);
  const [filterCompanies, setFilterCompanies] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    clientId: "",
    clientAccountId: "",
    brandId: "",
    brandCompanyId: "",
    direction: "",
    amount: "",
    notes: "",
  });
  const [createCompanies, setCreateCompanies] = useState([]);
  const [createClientAccounts, setCreateClientAccounts] = useState([]);
  const [loadingCreateCompanies, setLoadingCreateCompanies] = useState(false);
  const [loadingCreateClientAccounts, setLoadingCreateClientAccounts] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [editForm, setEditForm] = useState({
    process: "",
    brandId: "",
    brandCompanyId: "",
    clientAccountId: "",
    direction: "",
    amount: "",
    notes: "",
    reason: "",
  });
  const [editCompanies, setEditCompanies] = useState([]);
  const [editClientAccounts, setEditClientAccounts] = useState([]);
  const [loadingEditCompanies, setLoadingEditCompanies] = useState(false);
  const [loadingEditClientAccounts, setLoadingEditClientAccounts] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editEvidenceFile, setEditEvidenceFile] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [viewNotes, setViewNotes] = useState("");
  const [viewSaving, setViewSaving] = useState(false);
  const [viewError, setViewError] = useState("");
  const [imageModalUrl, setImageModalUrl] = useState(null);

  const fetchTickets = useCallback(() => {
    setLoading(true);
    setError("");
    const q = buildQuery({
      ticket: applied.ticket || undefined,
      username: applied.username || undefined,
      brand: applied.brand || undefined,
      brandCompany: applied.brandCompany || undefined,
      accountUsername: applied.accountUsername || undefined,
      direction: applied.direction || undefined,
      status: applied.status || "pending",
      dateFrom: applied.startDate || undefined,
      dateTo: applied.endDate || undefined,
      page,
      pageSize,
    });
    const token = getToken();
    fetch(`/api/admin/transfer-tickets?${q}`, {
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
    fetch(`/api/admin/brands?pageSize=500&availability=accounts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setBrands(data?.items ?? []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!filters.brand) {
      setFilterCompanies([]);
      return;
    }
    const token = getToken();
    fetchBrandCompanies(filters.brand, token).then(setFilterCompanies);
  }, [filters.brand]);

  useEffect(() => {
    if (!createOpen || !createForm.brandId) {
      setCreateCompanies([]);
      return;
    }
    setLoadingCreateCompanies(true);
    const token = getToken();
    fetchBrandCompanies(createForm.brandId, token)
      .then(setCreateCompanies)
      .finally(() => setLoadingCreateCompanies(false));
  }, [createOpen, createForm.brandId]);

  useEffect(() => {
    if (!createOpen || !createForm.clientId) {
      setCreateClientAccounts([]);
      return;
    }
    setLoadingCreateClientAccounts(true);
    const token = getToken();
    fetchClientAccounts(createForm.clientId, token)
      .then(setCreateClientAccounts)
      .finally(() => setLoadingCreateClientAccounts(false));
  }, [createOpen, createForm.clientId]);

  useEffect(() => {
    if (!editOpen || !editForm.brandId) {
      if (!editOpen) setEditCompanies([]);
      return;
    }
    setLoadingEditCompanies(true);
    const token = getToken();
    fetchBrandCompanies(editForm.brandId, token)
      .then(setEditCompanies)
      .finally(() => setLoadingEditCompanies(false));
  }, [editOpen, editForm.brandId]);

  useEffect(() => {
    if (!editOpen || !editTicket?.clientId) {
      if (!editOpen) setEditClientAccounts([]);
      return;
    }
    setLoadingEditClientAccounts(true);
    const token = getToken();
    fetchClientAccounts(editTicket.clientId, token)
      .then(setEditClientAccounts)
      .finally(() => setLoadingEditClientAccounts(false));
  }, [editOpen, editTicket?.clientId]);

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

  const onClear = () => {
    setFilters({
      ticket: "",
      username: "",
      brand: "",
      brandCompany: "",
      accountUsername: "",
      direction: "",
      status: "pending",
      startDate: "",
      endDate: "",
    });
    setApplied({});
    setPage(1);
  };

  const onSubmitFilters = () => {
    setApplied({ ...filters });
    setPage(1);
  };

  const displayRows = useMemo(() => {
    if (loading && rows.length === 0) return [{ id: "loading-row" }];
    if (!loading && rows.length === 0) return [{ id: "empty-row" }];
    return rows;
  }, [loading, rows]);

  const statusFilter = (applied.status || "pending").toLowerCase();

  const openView = (row) => {
    setViewTicket(null);
    setViewNotes("");
    setViewError("");
    setViewOpen(true);
    const token = getToken();
    fetch(`/api/admin/transfer-tickets/${row.id}`, {
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
    fetch(`/api/admin/transfer-tickets/${viewTicket.id}`, {
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
    setEditTicket(null);
    setEditForm({
      process: "",
      brandId: "",
      brandCompanyId: "",
      clientAccountId: "",
      direction: "",
      amount: "",
      notes: "",
      reason: "",
    });
    setEditEvidenceFile(null);
    setEditError("");
    setEditOpen(true);
    const token = getToken();
    fetch(`/api/admin/transfer-tickets/${row.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setEditTicket(data);
        setEditCompanies(data.brandCompanies ?? []);
        setEditForm((p) => ({
          ...p,
          brandId: String(data.brandId ?? ""),
          brandCompanyId: String(data.brandCompanyId ?? ""),
          clientAccountId: String(data.clientAccountId ?? ""),
          direction: String(data.direction ?? "").toUpperCase(),
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
      const bid = editForm.brandId;
      const bcid = editForm.brandCompanyId;
      const caid = editForm.clientAccountId;
      const dir = String(editForm.direction || "").toUpperCase();
      if (!bid || !bcid || !caid || !dir) {
        setEditError("Brand, Master, Account and Direction are required.");
        return;
      }
      if (!["IN", "OUT"].includes(dir)) {
        setEditError("Direction must be IN or OUT.");
        return;
      }
      if (editForm.amount != null && editForm.amount !== "") {
        const n = Number(editForm.amount);
        if (!Number.isFinite(n) || n <= 0) {
          setEditError("Amount must be a positive number.");
          return;
        }
      }
      if (!editEvidenceFile) {
        setEditError("Evidence image is required for approve.");
        return;
      }
    }
    if (editForm.process === "reject" && !(editForm.reason || "").trim()) {
      setEditError("Reason is required for reject.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    const token = getToken();

    if (editForm.process === "approve") {
      const fd = new FormData();
      fd.append("brandId", String(editForm.brandId));
      fd.append("brandCompanyId", String(editForm.brandCompanyId));
      fd.append("clientAccountId", String(editForm.clientAccountId));
      fd.append("direction", String(editForm.direction || "").toUpperCase());
      if (editForm.amount != null && editForm.amount !== "")
        fd.append("amount", String(editForm.amount));
      if (editForm.notes) fd.append("notes", editForm.notes);
      fd.append("evidence", editEvidenceFile);
      fetch(`/api/admin/transfer-tickets/${editTicket.id}/approve`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.message && !data.ticket) throw new Error(data.message);
          setEditOpen(false);
          setEditTicket(null);
          setEditEvidenceFile(null);
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
            return fetch(`/api/admin/transfer-tickets/${editTicket.id}/reject`, {
              method: "PATCH",
              headers: rejectOpts,
              body: fd,
            });
          })()
        : fetch(`/api/admin/transfer-tickets/${editTicket.id}/reject`, {
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
      clientAccountId: "",
      brandId: "",
      brandCompanyId: "",
      direction: "",
      amount: "",
      notes: "",
    });
    setCreateError("");
    setCreateOpen(true);
  };

  const handleCreateSubmit = () => {
    const { clientId, clientAccountId, direction, amount, notes } = createForm;
    if (!clientId || !direction) {
      setCreateError("Client and direction are required.");
      return;
    }
    if (!clientAccountId || !Number(clientAccountId)) {
      setCreateError("Account is required.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setCreateError("Valid amount is required.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    const token = getToken();
    fetch("/api/admin/transfer-tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clientId: Number(clientId),
        clientAccountId: Number(clientAccountId),
        direction,
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
      onSubmit={onSubmitFilters}
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
          placeholder="Client"
        />
      </AdminFilterField>
      <AdminFilterField label="Brand">
        <select
          className={`jw-adminInput ${!filters.brand ? "jw-adminInput--placeholder" : ""}`}
          value={filters.brand}
          onChange={(e) =>
            setFilters((f) => ({ ...f, brand: e.target.value, brandCompany: "" }))
          }
        >
          <option value="">All</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Master">
        <select
          className={`jw-adminInput ${!filters.brandCompany ? "jw-adminInput--placeholder" : ""}`}
          value={filters.brandCompany}
          onChange={(e) => setFilters((f) => ({ ...f, brandCompany: e.target.value }))}
          disabled={!filters.brand}
        >
          <option value="">All</option>
          {filterCompanies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayLabel || `@${c.username}`}
            </option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Account">
        <AdminInput
          value={filters.accountUsername}
          onChange={(v) => setFilters((f) => ({ ...f, accountUsername: v }))}
          placeholder="Username"
        />
      </AdminFilterField>
      <AdminFilterField label="Direction">
        <select
          className="jw-adminInput"
          value={filters.direction}
          onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
        >
          <option value="">All</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select
          className="jw-adminInput"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
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

  const evidenceSizeError = !!(editEvidenceFile && editEvidenceFile.size > EVIDENCE_MAX_BYTES);

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
            <TransfersTable
              rows={displayRows}
              loading={loading}
              statusFilter={statusFilter}
              onEdit={openEdit}
              onView={openView}
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
        brands={brands}
        companies={createCompanies}
        clients={clients}
        clientAccounts={createClientAccounts}
        loadingClients={loadingClients}
        loadingCompanies={loadingCreateCompanies}
        loadingClientAccounts={loadingCreateClientAccounts}
        onChange={(key, value) =>
          setCreateForm((p) => {
            const next = { ...p, [key]: value };
            if (key === "brandId") {
              next.brandCompanyId = "";
              next.clientAccountId = "";
            }
            if (key === "brandCompanyId") next.clientAccountId = "";
            return next;
          })
        }
        onClientSelect={(clientId) =>
          setCreateForm((p) => ({
            ...p,
            clientId,
            clientAccountId: "",
            brandId: "",
            brandCompanyId: "",
          }))
        }
        onAccountSelect={(account) =>
          setCreateForm((p) => ({
            ...p,
            clientAccountId: account?.id ? String(account.id) : "",
            brandId: account?.brandId ? String(account.brandId) : "",
            brandCompanyId: account?.brandCompanyId ? String(account.brandCompanyId) : "",
          }))
        }
        onSubmit={handleCreateSubmit}
        saving={createSaving}
        errorText={createError}
      />
      <EditTransferModal
        open={editOpen}
        onClose={() => {
          if (!editSaving) {
            setEditOpen(false);
            setEditTicket(null);
            setEditEvidenceFile(null);
          }
        }}
        ticket={editTicket}
        form={editForm}
        companies={editCompanies}
        clientAccounts={editClientAccounts}
        loadingCompanies={loadingEditCompanies}
        loadingClientAccounts={loadingEditClientAccounts}
        brands={editTicket?.brands ?? brands}
        onChange={(key, value) =>
          setEditForm((p) => {
            const next = { ...p, [key]: value };
            if (key === "brandId") {
              next.brandCompanyId = "";
              next.clientAccountId = "";
            }
            if (key === "brandCompanyId") next.clientAccountId = "";
            return next;
          })
        }
        onEvidenceChange={setEditEvidenceFile}
        evidenceFile={editEvidenceFile}
        evidenceSizeError={evidenceSizeError}
        onSubmit={handleEditSubmit}
        saving={editSaving}
        errorText={editError}
      />
      <ViewTransferModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewTicket(null);
        }}
        ticket={viewTicket}
        notes={viewNotes}
        onChangeNotes={setViewNotes}
        onSaveNotes={handleViewSaveNotes}
        onOpenImage={(url) => setImageModalUrl(url)}
        saving={viewSaving}
        errorText={viewError}
      />
      <SlipImageModal
        open={!!imageModalUrl}
        onClose={() => setImageModalUrl(null)}
        imageUrl={imageModalUrl}
        title="Evidence"
      />
    </>
  );
}

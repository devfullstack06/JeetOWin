import React from "react";
import { createPortal } from "react-dom";
import { Eye } from "lucide-react";
import AdminPageShell from "../../admin/components/AdminPageShell/AdminPageShell";
import AdminPagination from "../../admin/components/AdminPagination/AdminPagination";
import "../../admin/components/AdminPageShell/adminPageShell.css";
import "../../admin/components/AdminFilterBar/adminFilterBar.css";
import "../../admin/components/AdminTable/adminTable.css";
import "../../admin/pages/Users/usersPage.css";
import "../../admin/pages/Wallets/walletsPage.css";
import "../../admin/pages/Affiliates/affiliateTab.css";

export const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "7days", label: "7 Days" },
  { key: "30days", label: "30 Days" },
  { key: "this_month", label: "This Month" },
];

export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const ok =
    key === "active" ||
    key === "approved" ||
    key === "verified" ||
    key === "paid";
  return (
    <span className={`jw-adminStatus ${ok ? "is-active" : "is-inactive"}`}>
      {status || "—"}
    </span>
  );
}

export function AffiliateStatCards({ items }) {
  return (
    <div className="jw-adminAffReportsGrid">
      {(items || []).map((item) => (
        <div key={item.label} className="jw-adminAffReportCard">
          <div className="jw-adminAffReportCard__label">{item.label}</div>
          <div className="jw-adminAffReportCard__value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function AffiliatePage({ title, children, filters, pagination, error }) {
  return (
    <AdminPageShell
      title={title}
      filters={filters || null}
      table={(
        <div className="jw-adminNgIntegrated">
          {error ? (
            <div className="jw-adminUsersPage__notice is-error jw-adminNgIntegrated__notice">{error}</div>
          ) : null}
          {children}
          {pagination != null ? (
            <div className="jw-adminNgIntegrated__pagination">{pagination}</div>
          ) : null}
        </div>
      )}
    />
  );
}

export function AffiliateTable({ columns, rows, loading = false, emptyText = "No records found." }) {
  const colCount = columns.length;
  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colCount}>
                <div className="jw-adminSkeleton" style={{ height: 20 }} />
              </td>
            </tr>
          ) : !rows?.length ? (
            <tr>
              <td colSpan={colCount} className="jw-adminEmpty">{emptyText}</td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id ?? idx}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={c.key === "actions" ? "jw-adminTd__actions" : undefined}
                  >
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AffiliateTablePagination({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  return (
    <AdminPagination
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}

function EditIconSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#15a84b"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
      />
    </svg>
  );
}

export function AffiliateTableEditBtn({ onClick, title = "Edit", disabled = false }) {
  return (
    <button
      type="button"
      className="jw-adminEditBtn"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <EditIconSvg />
    </button>
  );
}

export function AffiliateTableViewBtn({ onClick, href, title = "View", disabled = false }) {
  const className = "jw-adminEditBtn jw-adminReportsViewBtn";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} title={title} aria-label={title}>
        <Eye size={16} />
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <Eye size={16} />
    </button>
  );
}

export function AffiliateActionModal({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = "Save",
  saving = false,
  confirmType = "button",
}) {
  if (!open) return null;
  return createPortal(
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onClose}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">{title}</div>
        </div>
        <div className="jw-adminUsersModal__body">{children}</div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose}>
            Cancel
          </button>
          <button
            type={confirmType}
            className="jw-adminUsersModal__btn is-green"
            disabled={saving}
            onClick={onConfirm}
          >
            {saving ? "Saving…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Build query params for affiliate date filters (preset or custom range). */
export function buildDateQuery({ preset, startDate, endDate }) {
  if (startDate && endDate) {
    return { preset: "custom", startDate, endDate };
  }
  return { preset: preset || "this_month" };
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
  AdminButton,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminDateRange from "../../components/AdminDateRange/AdminDateRange";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import { formatAdminDateTime } from "../../utils/adminDateUtils";
import "../Users/usersPage.css";
import "./reportsPage.css";

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  return search.toString();
}

function GeneralEntriesTable({ rows, loading, onAction }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";

  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Narration</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td colSpan={6}>
                  <div className="jw-adminSkeleton" style={{ height: 20 }} />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={6} className="jw-adminEmpty">
                No results found
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{formatAdminDateTime(r.createdAt)}</td>
                <td>{r.fromAccount || "—"}</td>
                <td>{r.toAccount || "—"}</td>
                <td className="jw-adminTd__narration">
                  {r.narration ? String(r.narration).slice(0, 60) + (r.narration.length > 60 ? "…" : "") : "—"}
                </td>
                <td>{Number(r.amount)?.toLocaleString() ?? "0"}</td>
                <td className="jw-adminTd__actions">
                  <button
                    type="button"
                    className="jw-adminEditBtn"
                    title="View / Edit"
                    onClick={() => onAction?.(r)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function EntryDetailModal({ open, entry, narration, onNarrationChange, saving, errorText, onSave, onClose }) {
  if (!open) return null;
  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Transaction details"
    >
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Transaction details</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Trx ID</label>
            <div className="jw-adminUsersModal__readOnly">{entry?.trxId || "—"}</div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Date</label>
            <div className="jw-adminUsersModal__readOnly">{formatAdminDateTime(entry?.createdAt)}</div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">From</label>
            <div className="jw-adminUsersModal__readOnly">{entry?.fromAccount || "—"}</div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">To</label>
            <div className="jw-adminUsersModal__readOnly">{entry?.toAccount || "—"}</div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Amount</label>
            <div className="jw-adminUsersModal__readOnly">{Number(entry?.amount)?.toLocaleString() ?? "0"}</div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Narration (editable)</label>
            <textarea
              className="jw-adminUsersModal__input jw-adminUsersModal__textarea"
              value={narration}
              onChange={(e) => onNarrationChange?.(e.target.value)}
              placeholder="Notes"
              rows={3}
            />
          </div>
          {errorText && <div className="jw-adminUsersPage__notice is-error">{errorText}</div>}
        </div>
        <div className="jw-adminUsersModal__footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "12px 22px 20px" }}>
          <button type="button" className="jw-adminBtn is-light" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="jw-adminBtn is-green" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { key: "general-entries", label: "General Entries" },
      { key: "general-ledger", label: "General Ledger" },
      { key: "balance-sheet", label: "Balance Sheet" },
    ],
    []
  );

  const activeTab = useMemo(() => {
    if (location.pathname.includes("/general-ledger")) return "general-ledger";
    if (location.pathname.includes("/balance-sheet")) return "balance-sheet";
    return "general-entries";
  }, [location.pathname]);

  // General Entries state
  const [geFilters, setGeFilters] = useState({
    from: "",
    to: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
    trxId: "",
  });
  const [geApplied, setGeApplied] = useState({});
  const [gePage, setGePage] = useState(1);
  const [gePageSize, setGePageSize] = useState(25);
  const [geRows, setGeRows] = useState([]);
  const [geTotal, setGeTotal] = useState(0);
  const [geLoading, setGeLoading] = useState(false);
  const [geErrorText, setGeErrorText] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailNarration, setDetailNarration] = useState("");
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState("");

  const geDisplayRows = useMemo(() => {
    if (geLoading && geRows.length === 0) return [{ id: "loading-row" }];
    if (!geLoading && geRows.length === 0) return [{ id: "empty-row" }];
    return geRows;
  }, [geLoading, geRows]);

  const fetchGeneralEntries = useCallback(() => {
    let ignore = false;
    setGeLoading(true);
    setGeErrorText("");
    const query = buildQuery({
      from: geApplied.from,
      to: geApplied.to,
      minAmount: geApplied.minAmount,
      maxAmount: geApplied.maxAmount,
      dateFrom: geApplied.startDate,
      dateTo: geApplied.endDate,
      trxId: geApplied.trxId,
      page: gePage,
      pageSize: gePageSize,
    });
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/general-entries?${query}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (!data.items) {
          setGeRows([]);
          setGeTotal(0);
          setGeErrorText(data?.message || "Unable to load.");
          return;
        }
        setGeRows(data.items);
        setGeTotal(Number(data.total || 0));
      })
      .catch(() => {
        if (!ignore) setGeRows([]), setGeTotal(0), setGeErrorText("Unable to load general entries.");
      })
      .finally(() => {
        if (!ignore) setGeLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [geApplied, gePage, gePageSize]);

  useEffect(() => {
    if (activeTab !== "general-entries") return;
    fetchGeneralEntries();
  }, [activeTab, fetchGeneralEntries]);

  const onGeSubmit = () => {
    setGeApplied({ ...geFilters });
    setGePage(1);
  };

  const onGeClear = () => {
    setGeFilters({
      from: "",
      to: "",
      minAmount: "",
      maxAmount: "",
      startDate: "",
      endDate: "",
      trxId: "",
    });
    setGeApplied({});
    setGePage(1);
  };

  const openDetail = (row) => {
    setDetailEntry(row);
    setDetailNarration(row?.narration ?? "");
    setDetailError("");
    setDetailOpen(true);
  };

  const closeDetail = () => {
    if (!detailSaving) setDetailOpen(false);
  };

  const saveDetailNarration = async () => {
    if (!detailEntry?.id) return;
    setDetailSaving(true);
    setDetailError("");
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/admin/general-entries/${detailEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ narration: detailNarration }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailError(data?.message || "Failed to update.");
        return;
      }
      setDetailEntry((e) => (e ? { ...e, narration: detailNarration } : null));
      setGeRows((prev) =>
        prev.map((r) => (r.id === detailEntry.id ? { ...r, narration: detailNarration } : r))
      );
      setDetailOpen(false);
    } catch {
      setDetailError("Failed to update.");
    } finally {
      setDetailSaving(false);
    }
  };

  const generalEntriesFilters = (
    <AdminFilterBar onClear={onGeClear} onSubmit={onGeSubmit}>
      <AdminFilterField label="From">
        <AdminInput
          value={geFilters.from}
          onChange={(v) => setGeFilters((f) => ({ ...f, from: v }))}
          placeholder="Account debited"
        />
      </AdminFilterField>
      <AdminFilterField label="To">
        <AdminInput
          value={geFilters.to}
          onChange={(v) => setGeFilters((f) => ({ ...f, to: v }))}
          placeholder="Account credited"
        />
      </AdminFilterField>
      <AdminFilterField label="Trx ID">
        <AdminInput
          value={geFilters.trxId}
          onChange={(v) => setGeFilters((f) => ({ ...f, trxId: v }))}
          placeholder="Transaction ID"
        />
      </AdminFilterField>
      <AdminFilterField label="Min. Amount">
        <AdminInput
          value={geFilters.minAmount}
          onChange={(v) => setGeFilters((f) => ({ ...f, minAmount: v }))}
          placeholder="Min"
          inputMode="decimal"
        />
      </AdminFilterField>
      <AdminFilterField label="Max Amount">
        <AdminInput
          value={geFilters.maxAmount}
          onChange={(v) => setGeFilters((f) => ({ ...f, maxAmount: v }))}
          placeholder="Max"
          inputMode="decimal"
        />
      </AdminFilterField>
      <AdminFilterField label="Date">
        <AdminDateRange
          startDate={geFilters.startDate}
          endDate={geFilters.endDate}
          placeholder="Please Select"
          onChange={({ startDate, endDate }) =>
            setGeFilters((f) => ({ ...f, startDate, endDate }))
          }
        />
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <>
      <AdminPageShell
        title="Reports"
        tabs={
          <AdminTabs
            tabs={tabs}
            activeKey={activeTab}
            onChange={(key) => navigate(`/admin/reports/${key}`)}
          />
        }
        filters={activeTab === "general-entries" ? generalEntriesFilters : null}
        table={
          activeTab === "general-entries" ? (
            <>
              {geErrorText && !geLoading && (
                <div className="jw-adminUsersPage__notice is-error">{geErrorText}</div>
              )}
              <GeneralEntriesTable
                rows={geDisplayRows}
                loading={geLoading}
                onAction={openDetail}
              />
            </>
          ) : activeTab === "general-ledger" ? (
            <div className="jw-adminReportsPlaceholder">General Ledger — Coming soon.</div>
          ) : activeTab === "balance-sheet" ? (
            <div className="jw-adminReportsPlaceholder">Balance Sheet — Coming soon.</div>
          ) : null
        }
        pagination={
          activeTab === "general-entries" ? (
            <AdminPagination
              total={geTotal}
              page={gePage}
              pageSize={gePageSize}
              onPageChange={setGePage}
              onPageSizeChange={(n) => {
                setGePageSize(n);
                setGePage(1);
              }}
            />
          ) : null
        }
      />

      <EntryDetailModal
        open={detailOpen}
        entry={detailEntry}
        narration={detailNarration}
        onNarrationChange={setDetailNarration}
        saving={detailSaving}
        errorText={detailError}
        onSave={saveDetailNarration}
        onClose={closeDetail}
      />
    </>
  );
}

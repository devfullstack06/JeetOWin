import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
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
import csvFileIcon from "../../assets/csv-file-icon.svg";
import printerIcon from "../../assets/printer-icon.svg";
import "../Users/usersPage.css";
import "../Notifications/notificationGroupsTab.css";
import "./reportsPage.css";

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  return search.toString();
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cols) {
  return cols.map(csvEscape).join(",");
}

function downloadCsv(filename, lines) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatAccountTypeLabel(t) {
  if (t == null || t === "") return "—";
  const s = String(t).toLowerCase();
  if (s === "payment_wallet") return "Payment wallet";
  if (s === "brand_company") return "Brand company";
  if (s === "master") return "Master";
  if (s === "affiliate") return "Affiliate";
  return s.charAt(0).toUpperCase() + s.slice(1);
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
            <th>Transaction No.</th>
            <th>From</th>
            <th>Type</th>
            <th>To</th>
            <th>Type</th>
            <th>Narration</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td colSpan={9}>
                  <div className="jw-adminSkeleton" style={{ height: 20 }} />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={9} className="jw-adminEmpty">
                No results found
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{formatAdminDateTime(r.createdAt)}</td>
                <td>{r.transactionNumber || "—"}</td>
                <td>{r.fromAccount || "—"}</td>
                <td>{formatAccountTypeLabel(r.fromAccountType)}</td>
                <td>{r.toAccount || "—"}</td>
                <td>{formatAccountTypeLabel(r.toAccountType)}</td>
                <td className="jw-adminTd__narration">
                  {r.narration ? String(r.narration).slice(0, 60) + (r.narration.length > 60 ? "…" : "") : "—"}
                </td>
                <td>{Number(r.amount)?.toLocaleString() ?? "0"}</td>
                <td className="jw-adminTd__actions">
                  <button
                    type="button"
                    className="jw-adminEditBtn jw-adminReportsViewBtn"
                    title="View / Edit"
                    onClick={() => onAction?.(r)}
                    aria-label="View / Edit"
                  >
                    <Eye size={16} />
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

function GeneralLedgerTable({ rows, loading, onViewEntry }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";

  const fmt = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    return x.toLocaleString();
  };

  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            <th>Date</th>
            <th>Transaction No.</th>
            <th>Counterparty</th>
            <th>Counterparty type</th>
            <th>Narration</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Balance</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`gl-sk-${i}`}>
                <td colSpan={9}>
                  <div className="jw-adminSkeleton" style={{ height: 20 }} />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={9} className="jw-adminEmpty">
                No results in this period
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{formatAdminDateTime(r.createdAt)}</td>
                <td>{r.transactionNumber || "—"}</td>
                <td>{r.counterpartyName || "—"}</td>
                <td>{formatAccountTypeLabel(r.counterpartyType)}</td>
                <td className="jw-adminTd__narration">
                  {r.narration
                    ? String(r.narration).slice(0, 60) + (r.narration.length > 60 ? "…" : "")
                    : "—"}
                </td>
                <td>{r.debit ? fmt(r.debit) : "—"}</td>
                <td>{r.credit ? fmt(r.credit) : "—"}</td>
                <td>{fmt(r.balanceAfter)}</td>
                <td className="jw-adminTd__actions">
                  <button
                    type="button"
                    className="jw-adminEditBtn jw-adminReportsViewBtn"
                    title="View / Edit"
                    onClick={() => onViewEntry?.(r.id)}
                    aria-label="View / Edit"
                  >
                    <Eye size={16} />
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
          <dl className="jw-adminReportsTransactionInfo" aria-label="Transaction information">
            <div className="jw-adminReportsTransactionInfo__row">
              <dt>Transaction No.</dt>
              <dd>{entry?.transactionNumber || "—"}</dd>
            </div>
            <div className="jw-adminReportsTransactionInfo__row">
              <dt>Date</dt>
              <dd>{formatAdminDateTime(entry?.createdAt)}</dd>
            </div>
            <div className="jw-adminReportsTransactionInfo__row">
              <dt>From</dt>
              <dd>{entry?.fromAccount || "—"}</dd>
            </div>
            <div className="jw-adminReportsTransactionInfo__row">
              <dt>From type</dt>
              <dd>{formatAccountTypeLabel(entry?.fromAccountType)}</dd>
            </div>
            <div className="jw-adminReportsTransactionInfo__row">
              <dt>To</dt>
              <dd>{entry?.toAccount || "—"}</dd>
            </div>
            <div className="jw-adminReportsTransactionInfo__row">
              <dt>To type</dt>
              <dd>{formatAccountTypeLabel(entry?.toAccountType)}</dd>
            </div>
            <div className="jw-adminReportsTransactionInfo__row">
              <dt>Amount</dt>
              <dd>{Number(entry?.amount)?.toLocaleString() ?? "0"}</dd>
            </div>
          </dl>
          <div className="jw-adminUsersModal__field jw-adminReportsTransactionNarration">
            <label className="jw-adminUsersModal__label" htmlFor="jw-ge-narration">
              Narration
            </label>
            <textarea
              id="jw-ge-narration"
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
    fromType: "",
    toType: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
    transactionNumber: "",
  });
  const [geApplied, setGeApplied] = useState({});
  const [geAccountTypes, setGeAccountTypes] = useState([]);
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

  const [glAccountOptions, setGlAccountOptions] = useState([]);
  const [glFilters, setGlFilters] = useState({
    accountType: "",
    accountId: "",
    startDate: "",
    endDate: "",
  });
  const [glAccountSearch, setGlAccountSearch] = useState("");
  const [glAccountDropdownOpen, setGlAccountDropdownOpen] = useState(false);
  const glAccountWrapRef = useRef(null);
  const [glApplied, setGlApplied] = useState({});
  const [glPage, setGlPage] = useState(1);
  const [glPageSize, setGlPageSize] = useState(25);
  const [glRows, setGlRows] = useState([]);
  const [glTotal, setGlTotal] = useState(0);
  const [glOpeningBalance, setGlOpeningBalance] = useState(0);
  const [glLoading, setGlLoading] = useState(false);
  const [glErrorText, setGlErrorText] = useState("");
  const [glWarningText, setGlWarningText] = useState("");

  const [bsFilters, setBsFilters] = useState({ startDate: "", endDate: "" });
  const [bsApplied, setBsApplied] = useState({});
  const [bsItems, setBsItems] = useState([]);
  const [bsAdminRec, setBsAdminRec] = useState(null);
  const [bsWarning, setBsWarning] = useState("");
  const [bsLoading, setBsLoading] = useState(false);
  const [bsError, setBsError] = useState("");
  const [bsShowZeroBalances, setBsShowZeroBalances] = useState(true);

  const geDisplayRows = useMemo(() => {
    if (geLoading && geRows.length === 0) return [{ id: "loading-row" }];
    if (!geLoading && geRows.length === 0) return [{ id: "empty-row" }];
    return geRows;
  }, [geLoading, geRows]);

  const glDisplayRows = useMemo(() => {
    if (glLoading && glRows.length === 0) return [{ id: "loading-row" }];
    if (!glLoading && glRows.length === 0) return [{ id: "empty-row" }];
    return glRows;
  }, [glLoading, glRows]);

  const fetchGeneralEntries = useCallback(() => {
    let ignore = false;
    setGeLoading(true);
    setGeErrorText("");
    const query = buildQuery({
      from: geApplied.from,
      to: geApplied.to,
      fromType: geApplied.fromType,
      toType: geApplied.toType,
      minAmount: geApplied.minAmount,
      maxAmount: geApplied.maxAmount,
      dateFrom: geApplied.startDate,
      dateTo: geApplied.endDate,
      transactionNumber: geApplied.transactionNumber,
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

  useEffect(() => {
    if (activeTab !== "general-entries") return;
    let ignore = false;
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/general-entries/account-types", {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        setGeAccountTypes(Array.isArray(data?.types) ? data.types : []);
      })
      .catch(() => {
        if (!ignore) setGeAccountTypes([]);
      });
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "general-ledger") return;
    let ignore = false;
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/reports/general-ledger/accounts", {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        setGlAccountOptions(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (!ignore) setGlAccountOptions([]);
      });
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (!glAccountDropdownOpen) return;
    const onDoc = (e) => {
      if (glAccountWrapRef.current && !glAccountWrapRef.current.contains(e.target)) {
        setGlAccountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [glAccountDropdownOpen]);

  useEffect(() => {
    if (activeTab !== "general-ledger") return;
    if (!glApplied.accountId) {
      setGlRows([]);
      setGlTotal(0);
      setGlOpeningBalance(0);
      setGlWarningText("");
      setGlErrorText("");
      setGlLoading(false);
      return;
    }
    let ignore = false;
    setGlLoading(true);
    setGlErrorText("");
    setGlWarningText("");
    const query = buildQuery({
      accountId: glApplied.accountId,
      dateFrom: glApplied.startDate,
      dateTo: glApplied.endDate,
      page: glPage,
      pageSize: glPageSize,
    });
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/reports/general-ledger/statement?${query}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        return { res, data };
      })
      .then(({ res, data }) => {
        if (ignore) return;
        if (!res.ok) {
          setGlRows([]);
          setGlTotal(0);
          setGlOpeningBalance(0);
          setGlErrorText(data?.message || "Unable to load statement.");
          return;
        }
        if (data.warning) setGlWarningText(String(data.warning));
        if (!Array.isArray(data.items)) {
          setGlRows([]);
          setGlTotal(0);
          setGlOpeningBalance(0);
          setGlErrorText(data?.message || "Unable to load statement.");
          return;
        }
        setGlRows(data.items);
        setGlTotal(Number(data.total || 0));
        setGlOpeningBalance(Number(data.openingBalance) || 0);
      })
      .catch(() => {
        if (!ignore) {
          setGlRows([]);
          setGlTotal(0);
          setGlOpeningBalance(0);
          setGlErrorText("Unable to load general ledger.");
        }
      })
      .finally(() => {
        if (!ignore) setGlLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [activeTab, glApplied, glPage, glPageSize]);

  useEffect(() => {
    if (activeTab !== "balance-sheet") return;
    let ignore = false;
    setBsLoading(true);
    setBsError("");
    setBsWarning("");
    const query = buildQuery({
      dateFrom: bsApplied.startDate,
      dateTo: bsApplied.endDate,
    });
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/reports/balance-sheet?${query}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        return { res, data };
      })
      .then(({ res, data }) => {
        if (ignore) return;
        if (!res.ok) {
          setBsItems([]);
          setBsAdminRec(null);
          setBsError(data?.message || "Unable to load balance sheet.");
          return;
        }
        if (data.warning) setBsWarning(String(data.warning));
        if (!Array.isArray(data.items)) {
          setBsItems([]);
          setBsAdminRec(null);
          setBsError(data?.message || "Unable to load balance sheet.");
          return;
        }
        setBsItems(data.items);
        setBsAdminRec(data.adminReconciliation ?? null);
      })
      .catch(() => {
        if (!ignore) {
          setBsItems([]);
          setBsAdminRec(null);
          setBsError("Unable to load balance sheet.");
        }
      })
      .finally(() => {
        if (!ignore) setBsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [activeTab, bsApplied]);

  const onGeSubmit = () => {
    setGeApplied({ ...geFilters });
    setGePage(1);
  };

  const onGeClear = () => {
    setGeFilters({
      from: "",
      to: "",
      fromType: "",
      toType: "",
      minAmount: "",
      maxAmount: "",
      startDate: "",
      endDate: "",
      transactionNumber: "",
    });
    setGeApplied({});
    setGePage(1);
  };

  const onGlSubmit = () => {
    if (!String(glFilters.accountId || "").trim()) {
      setGlErrorText("Select an account to view the ledger.");
      return;
    }
    setGlErrorText("");
    setGlApplied({
      accountId: String(glFilters.accountId).trim(),
      startDate: glFilters.startDate,
      endDate: glFilters.endDate,
    });
    setGlPage(1);
  };

  const onGlClear = () => {
    setGlFilters({ accountType: "", accountId: "", startDate: "", endDate: "" });
    setGlAccountSearch("");
    setGlAccountDropdownOpen(false);
    setGlApplied({});
    setGlPage(1);
    setGlErrorText("");
    setGlWarningText("");
  };

  const pickGlAccount = (a) => {
    setGlFilters((f) => ({ ...f, accountId: String(a.id) }));
    setGlAccountSearch("");
    setGlAccountDropdownOpen(false);
  };

  const clearGlAccount = () => {
    setGlFilters((f) => ({ ...f, accountId: "" }));
    setGlAccountSearch("");
    setGlAccountDropdownOpen(false);
  };

  const onBsSubmit = () => {
    setBsApplied({
      startDate: bsFilters.startDate,
      endDate: bsFilters.endDate,
    });
  };

  const onBsClear = () => {
    setBsFilters({ startDate: "", endDate: "" });
    setBsApplied({});
    setBsError("");
    setBsWarning("");
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

  const openGlEntryDetail = async (entryId) => {
    const id = Number(entryId);
    if (!Number.isFinite(id)) return;
    setDetailError("");
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/admin/general-entries/${id}`, {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGlErrorText(data?.message || "Unable to load entry.");
        return;
      }
      setDetailEntry(data);
      setDetailNarration(data?.narration ?? "");
      setDetailOpen(true);
    } catch {
      setGlErrorText("Unable to load entry.");
    }
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
      setGlRows((prev) =>
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
      <AdminFilterField label="From type">
        <select
          className="jw-adminInput"
          value={geFilters.fromType}
          onChange={(e) => setGeFilters((f) => ({ ...f, fromType: e.target.value }))}
          aria-label="Filter by from account type"
        >
          <option value="">All types</option>
          {geAccountTypes.map((t) => (
            <option key={t} value={t}>
              {formatAccountTypeLabel(t)}
            </option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="To">
        <AdminInput
          value={geFilters.to}
          onChange={(v) => setGeFilters((f) => ({ ...f, to: v }))}
          placeholder="Account credited"
        />
      </AdminFilterField>
      <AdminFilterField label="To type">
        <select
          className="jw-adminInput"
          value={geFilters.toType}
          onChange={(e) => setGeFilters((f) => ({ ...f, toType: e.target.value }))}
          aria-label="Filter by to account type"
        >
          <option value="">All types</option>
          {geAccountTypes.map((t) => (
            <option key={`to-${t}`} value={t}>
              {formatAccountTypeLabel(t)}
            </option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Transaction No.">
        <AdminInput
          value={geFilters.transactionNumber}
          onChange={(v) => setGeFilters((f) => ({ ...f, transactionNumber: v }))}
          placeholder="e.g. PWT569001, DP569001"
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

  const glAccountTypesList = useMemo(() => {
    const s = new Set();
    glAccountOptions.forEach((a) => {
      if (a.type) s.add(String(a.type));
    });
    return [...s].sort();
  }, [glAccountOptions]);

  const glAccountsByTypeFilter = useMemo(() => {
    const t = glFilters.accountType;
    if (!t) return glAccountOptions;
    return glAccountOptions.filter((a) => String(a.type) === String(t));
  }, [glAccountOptions, glFilters.accountType]);

  const glAccountSearchMatches = useMemo(() => {
    const q = glAccountSearch.trim().toLowerCase();
    let list = glAccountsByTypeFilter;
    if (q) {
      list = list.filter(
        (a) =>
          String(a.name || "")
            .toLowerCase()
            .includes(q) || String(a.id).includes(q)
      );
    }
    return list.slice(0, 80);
  }, [glAccountsByTypeFilter, glAccountSearch]);

  const glPickedAccountDisplayName = useMemo(() => {
    if (!glFilters.accountId) return "";
    const a = glAccountOptions.find((x) => String(x.id) === String(glFilters.accountId));
    return a
      ? String(a.name || "").trim() || `Account #${glFilters.accountId}`
      : `Account #${glFilters.accountId}`;
  }, [glFilters.accountId, glAccountOptions]);

  const glSelectedAccountLabel = useMemo(() => {
    const id = glApplied.accountId;
    if (!id) return "";
    const a = glAccountOptions.find((x) => String(x.id) === String(id));
    return a ? String(a.name || "").trim() || `Account #${id}` : `Account #${id}`;
  }, [glApplied.accountId, glAccountOptions]);

  const bsCreditRows = useMemo(() => {
    let list = bsItems.filter((r) => (Number(r.netBalance) || 0) >= 0);
    if (!bsShowZeroBalances) {
      list = list.filter((r) => (Number(r.netBalance) || 0) !== 0);
    }
    return list
      .map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        columnBalance: Number(r.netBalance) || 0,
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [bsItems, bsShowZeroBalances]);

  const bsDebitRows = useMemo(() => {
    return bsItems
      .filter((r) => (Number(r.netBalance) || 0) < 0)
      .map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        columnBalance: Math.abs(Number(r.netBalance) || 0),
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [bsItems]);

  const bsCreditGrand = useMemo(
    () => bsCreditRows.reduce((s, r) => s + (Number(r.columnBalance) || 0), 0),
    [bsCreditRows]
  );
  const bsDebitGrand = useMemo(
    () => bsDebitRows.reduce((s, r) => s + (Number(r.columnBalance) || 0), 0),
    [bsDebitRows]
  );

  const bsGrandTotalsMismatch = useMemo(
    () => Math.abs(bsCreditGrand - bsDebitGrand) > 0.000001,
    [bsCreditGrand, bsDebitGrand]
  );

  const showBsRecPanel = useMemo(() => {
    if (bsGrandTotalsMismatch) return true;
    if (!bsAdminRec) return false;
    return bsAdminRec.inSync !== true;
  }, [bsGrandTotalsMismatch, bsAdminRec]);

  const exportGlCsv = useCallback(async () => {
    if (!glApplied.accountId) return;
    const token = localStorage.getItem("token") || "";
    const pageSize = 500;
    let page = 1;
    const all = [];
    let total = Infinity;
    while (all.length < total && page < 500) {
      const q = buildQuery({
        accountId: glApplied.accountId,
        dateFrom: glApplied.startDate,
        dateTo: glApplied.endDate,
        page,
        pageSize,
      });
      const res = await fetch(`/api/admin/reports/general-ledger/statement?${q}`, {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.items)) break;
      total = Number(data.total) || 0;
      all.push(...data.items);
      if (all.length >= total) break;
      page += 1;
    }
    const opening = Number(glOpeningBalance) || 0;
    const lines = [];
    lines.push(
      csvRow([
        "Report",
        "General ledger",
        "Account",
        glSelectedAccountLabel,
        "Date from",
        glApplied.startDate || "",
        "Date to",
        glApplied.endDate || "",
      ])
    );
    lines.push(
      csvRow([
        "Opening balance (before start date)",
        glApplied.startDate ? String(opening) : "n/a (no start date)",
      ])
    );
    lines.push(
      csvRow([
        "Date",
        "Transaction No.",
        "Counterparty",
        "Counterparty type",
        "Narration",
        "Debit",
        "Credit",
        "Balance after",
      ])
    );
    for (const r of all) {
      lines.push(
        csvRow([
          formatAdminDateTime(r.createdAt),
          r.transactionNumber,
          r.counterpartyName,
          formatAccountTypeLabel(r.counterpartyType),
          r.narration,
          r.debit || 0,
          r.credit || 0,
          r.balanceAfter,
        ])
      );
    }
    downloadCsv(`general-ledger-${glApplied.accountId}.csv`, lines);
  }, [glApplied, glOpeningBalance, glSelectedAccountLabel]);

  const exportBsCsv = useCallback(() => {
    const period = [
      bsApplied.startDate || "",
      bsApplied.endDate || "",
    ]
      .filter(Boolean)
      .join(" to ");
    const lines = [];
    lines.push(csvRow(["Report", "Balance sheet", "Period", period || "All time"]));
    lines.push(csvRow(["Section", "Credit balance accounts"]));
    lines.push(csvRow(["Account", "Type", "Balance"]));
    for (const r of bsCreditRows) {
      lines.push(csvRow([r.name, formatAccountTypeLabel(r.type), r.columnBalance]));
    }
    lines.push(csvRow(["Grand total (credit side)", "", bsCreditGrand]));
    lines.push("");
    lines.push(csvRow(["Section", "Debit balance accounts"]));
    lines.push(csvRow(["Account", "Type", "Balance"]));
    for (const r of bsDebitRows) {
      lines.push(csvRow([r.name, formatAccountTypeLabel(r.type), r.columnBalance]));
    }
    lines.push(csvRow(["Grand total (debit side)", "", bsDebitGrand]));
    lines.push("");
    lines.push(csvRow(["Admin reconciliation (ledger account id 1)"]));
    if (bsAdminRec) {
      lines.push(
        csvRow([
          "Computed from general entries",
          bsAdminRec.computedFromGeneralEntries,
          "Stored admin_account_balance",
          bsAdminRec.storedBalance == null ? "" : bsAdminRec.storedBalance,
          "Difference (stored − computed)",
          bsAdminRec.difference == null ? "" : bsAdminRec.difference,
          "In sync",
          bsAdminRec.inSync == null ? "" : bsAdminRec.inSync ? "yes" : "no",
        ])
      );
      if (bsAdminRec.note) lines.push(csvRow(["Note", bsAdminRec.note]));
    }
    downloadCsv("balance-sheet.csv", lines);
  }, [bsApplied, bsAdminRec, bsCreditRows, bsDebitRows, bsCreditGrand, bsDebitGrand]);

  const generalLedgerFilters = (
    <AdminFilterBar onClear={onGlClear} onSubmit={onGlSubmit}>
      <AdminFilterField label="Account type">
        <select
          className={`jw-adminInput ${!glFilters.accountType ? "jw-adminInput--placeholder" : ""}`}
          value={glFilters.accountType}
          onChange={(e) => {
            const v = e.target.value;
            setGlFilters((f) => {
              const next = { ...f, accountType: v };
              if (v && f.accountId) {
                const acc = glAccountOptions.find((x) => String(x.id) === String(f.accountId));
                if (!acc || String(acc.type) !== v) next.accountId = "";
              }
              return next;
            });
            setGlAccountSearch("");
            setGlAccountDropdownOpen(false);
          }}
          aria-label="Filter accounts by type"
        >
          <option value="">All types</option>
          {glAccountTypesList.map((t) => (
            <option key={t} value={t}>
              {formatAccountTypeLabel(t)}
            </option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Account">
        <div className="jw-adminNgFilterUser" ref={glAccountWrapRef}>
          {glFilters.accountId ? (
            <div className="jw-adminNgFilterPicked">
              <span>{glPickedAccountDisplayName}</span>
              <button type="button" className="jw-adminNgFilterClear" onClick={clearGlAccount}>
                Clear
              </button>
            </div>
          ) : (
            <>
              <AdminInput
                value={glAccountSearch}
                onChange={(v) => {
                  setGlAccountSearch(v);
                  setGlAccountDropdownOpen(true);
                }}
                onFocus={() => setGlAccountDropdownOpen(true)}
                placeholder="Search account…"
              />
              {glAccountDropdownOpen ? (
                <div className="jw-adminNgUserDropdown jw-adminNgUserDropdown--filter">
                  {glAccountSearchMatches.length === 0 ? (
                    <div className="jw-adminUsersModal__hint" style={{ padding: 12 }}>
                      No accounts match.
                    </div>
                  ) : (
                    glAccountSearchMatches.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="jw-adminNgUserDropdown__row"
                        onClick={() => pickGlAccount(a)}
                      >
                        <span className="jw-adminNgUserDropdown__name">{a.name || "—"}</span>
                        <span className="jw-adminNgUserDropdown__sub">
                          #{a.id} · {formatAccountTypeLabel(a.type)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </AdminFilterField>
      <AdminFilterField label="Date">
        <AdminDateRange
          startDate={glFilters.startDate}
          endDate={glFilters.endDate}
          placeholder="Please Select"
          onChange={({ startDate, endDate }) =>
            setGlFilters((f) => ({ ...f, startDate, endDate }))
          }
        />
      </AdminFilterField>
    </AdminFilterBar>
  );

  const balanceSheetFilters = (
    <AdminFilterBar onClear={onBsClear} onSubmit={onBsSubmit}>
      <AdminFilterField label="Date">
        <AdminDateRange
          startDate={bsFilters.startDate}
          endDate={bsFilters.endDate}
          placeholder="Please Select (all time if empty)"
          onChange={({ startDate, endDate }) =>
            setBsFilters((f) => ({ ...f, startDate, endDate }))
          }
        />
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <div className="jw-adminReportsRoot">
      <AdminPageShell
        title="Reports"
        tabs={
          <AdminTabs
            tabs={tabs}
            activeKey={activeTab}
            onChange={(key) => navigate(`/admin/reports/${key}`)}
          />
        }
        filters={
          activeTab === "general-entries"
            ? generalEntriesFilters
            : activeTab === "general-ledger"
              ? generalLedgerFilters
              : activeTab === "balance-sheet"
                ? balanceSheetFilters
                : null
        }
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
            <>
              {glErrorText && !glLoading && (
                <div className="jw-adminUsersPage__notice is-error">{glErrorText}</div>
              )}
              {glWarningText && (
                <div className="jw-adminUsersPage__notice">{glWarningText}</div>
              )}
              {!glApplied.accountId ? (
                <div className="jw-adminReportsPlaceholder">
                  Select an account, optionally set a date range, then Apply to view the account statement.
                </div>
              ) : (
                <div className="jw-adminReportsPrintBlock">
                  <div className="jw-adminReportsGlTopRow jw-adminReportsNoPrint">
                    <div className="jw-adminReportsGlSummary" aria-live="polite">
                      <span className="jw-adminReportsGlSummary__account">{glSelectedAccountLabel}</span>
                      {glApplied.startDate ? (
                        <span className="jw-adminReportsGlSummary__opening">
                          {" "}
                          · Opening balance (before {glApplied.startDate}):{" "}
                          {(Number(glOpeningBalance) || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="jw-adminReportsGlSummary__opening">
                          {" "}
                          · Set a start date to carry forward an opening balance from prior movements.
                        </span>
                      )}
                    </div>
                    <div className="jw-adminReportsToolbar jw-adminReportsToolbar--iconsRight jw-adminReportsGlToolbar">
                      <button
                        type="button"
                        className="jw-adminReportsIconBtn"
                        onClick={exportGlCsv}
                        disabled={glLoading}
                        aria-label="Export CSV"
                        title="Export CSV"
                      >
                        <img src={csvFileIcon} alt="" width={22} height={22} />
                      </button>
                      <button
                        type="button"
                        className="jw-adminReportsIconBtn"
                        onClick={() => window.print()}
                        disabled={glLoading}
                        aria-label="Print"
                        title="Print"
                      >
                        <img src={printerIcon} alt="" width={22} height={22} />
                      </button>
                    </div>
                  </div>
                  <h2 className="jw-adminReportsPrintTitle">General ledger</h2>
                  <GeneralLedgerTable
                    rows={glDisplayRows}
                    loading={glLoading}
                    onViewEntry={openGlEntryDetail}
                  />
                </div>
              )}
            </>
          ) : activeTab === "balance-sheet" ? (
            <div className="jw-adminReportsBs jw-adminReportsPrintBlock jw-adminReportsBsWrap">
              <div className="jw-adminReportsBsTopRow jw-adminReportsNoPrint">
                <button
                  type="button"
                  className="jw-adminReportsBsZeroToggle"
                  onClick={() => setBsShowZeroBalances((v) => !v)}
                  aria-pressed={bsShowZeroBalances}
                  title={
                    bsShowZeroBalances
                      ? "Hide accounts with zero balance"
                      : "Show accounts with zero balance"
                  }
                >
                  {bsShowZeroBalances ? "Hide zero balances" : "Show zero balances"}
                </button>
                <p className="jw-adminReportsBsMeta">
                  {bsApplied.startDate || bsApplied.endDate
                    ? `Entries dated ${bsApplied.startDate || "…"} to ${bsApplied.endDate || "…"} (inclusive).`
                    : "All time — every entry with both ledger account IDs."}
                </p>
                <div className="jw-adminReportsToolbar">
                  <button
                    type="button"
                    className="jw-adminReportsIconBtn"
                    onClick={exportBsCsv}
                    disabled={bsLoading || bsItems.length === 0}
                    aria-label="Export CSV"
                    title="Export CSV"
                  >
                    <img src={csvFileIcon} alt="" width={22} height={22} />
                  </button>
                  <button
                    type="button"
                    className="jw-adminReportsIconBtn"
                    onClick={() => window.print()}
                    disabled={bsLoading}
                    aria-label="Print"
                    title="Print"
                  >
                    <img src={printerIcon} alt="" width={22} height={22} />
                  </button>
                </div>
              </div>
              <h2 className="jw-adminReportsPrintTitle">Balance sheet</h2>
              {bsError && !bsLoading && (
                <div className="jw-adminUsersPage__notice is-error">{bsError}</div>
              )}
              {bsWarning && (
                <div className="jw-adminUsersPage__notice">{bsWarning}</div>
              )}
              {bsLoading ? (
                <div className="jw-adminTableWrap">
                  <div className="jw-adminSkeleton" style={{ height: 200, margin: 12 }} />
                </div>
              ) : (
                <>
                  <div className="jw-adminBsGrid">
                    <div className="jw-adminBsCol">
                      <h3 className="jw-adminBsCol__title">Credit balance accounts</h3>
                      <div className="jw-adminTableWrap jw-adminBsTableWrap">
                        <table className="jw-adminTable jw-adminBsTable">
                          <thead>
                            <tr>
                              <th className="jw-adminBsTable__account">Account</th>
                              <th className="jw-adminBsTable__type">Type</th>
                              <th className="jw-adminBsTable__balance">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bsCreditRows.map((r) => (
                              <tr key={`c-${r.id}`}>
                                <td className="jw-adminBsTable__account">
                                  <span className="jw-adminBsTable__cellText" title={r.name || ""}>
                                    {r.name || "—"}
                                  </span>
                                </td>
                                <td className="jw-adminBsTable__type">
                                  <span
                                    className="jw-adminBsTable__cellText"
                                    title={formatAccountTypeLabel(r.type)}
                                  >
                                    {formatAccountTypeLabel(r.type)}
                                  </span>
                                </td>
                                <td className="jw-adminBsTable__balance">
                                  {(Number(r.columnBalance) || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            <tr className="jw-adminBsTable__total">
                              <td className="jw-adminBsTable__account" colSpan={2}>
                                <strong>Grand total</strong>
                              </td>
                              <td className="jw-adminBsTable__balance">
                                <strong>{bsCreditGrand.toLocaleString()}</strong>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="jw-adminBsCol">
                      <h3 className="jw-adminBsCol__title">Debit balance accounts</h3>
                      <div className="jw-adminTableWrap jw-adminBsTableWrap">
                        <table className="jw-adminTable jw-adminBsTable">
                          <thead>
                            <tr>
                              <th className="jw-adminBsTable__account">Account</th>
                              <th className="jw-adminBsTable__type">Type</th>
                              <th className="jw-adminBsTable__balance">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bsDebitRows.map((r) => (
                              <tr key={`d-${r.id}`}>
                                <td className="jw-adminBsTable__account">
                                  <span className="jw-adminBsTable__cellText" title={r.name || ""}>
                                    {r.name || "—"}
                                  </span>
                                </td>
                                <td className="jw-adminBsTable__type">
                                  <span
                                    className="jw-adminBsTable__cellText"
                                    title={formatAccountTypeLabel(r.type)}
                                  >
                                    {formatAccountTypeLabel(r.type)}
                                  </span>
                                </td>
                                <td className="jw-adminBsTable__balance">
                                  {(Number(r.columnBalance) || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            <tr className="jw-adminBsTable__total">
                              <td className="jw-adminBsTable__account" colSpan={2}>
                                <strong>Grand total</strong>
                              </td>
                              <td className="jw-adminBsTable__balance">
                                <strong>{bsDebitGrand.toLocaleString()}</strong>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  {showBsRecPanel ? (
                    <div className="jw-adminReportsBsRec">
                      {bsGrandTotalsMismatch ? (
                        <p className="jw-adminReportsBsRec__totalsErr" role="alert">
                          <strong>Debit and credit grand totals do not match.</strong> Credit side total is{" "}
                          {bsCreditGrand.toLocaleString()} and debit side total is{" "}
                          {bsDebitGrand.toLocaleString()}. In a closed ledger they should be equal; investigate
                          entries missing account IDs or amounts posted outside this date range.
                        </p>
                      ) : null}
                      {bsAdminRec && bsAdminRec.inSync === false ? (
                        <>
                          {bsGrandTotalsMismatch ? (
                            <div className="jw-adminReportsBsRec__divider" aria-hidden="true" />
                          ) : null}
                          <div className="jw-adminReportsBsRec__title">Admin reconciliation (ledger account id 1)</div>
                          <p className="jw-adminReportsBsRec__body">
                            <strong>Computed from general entries:</strong>{" "}
                            {(Number(bsAdminRec.computedFromGeneralEntries) || 0).toLocaleString()}
                            {" · "}
                            <strong>Stored in admin_account_balance:</strong>{" "}
                            {(Number(bsAdminRec.storedBalance) || 0).toLocaleString()}
                            {" · "}
                            <strong>Difference (stored − computed):</strong>{" "}
                            {(Number(bsAdminRec.difference) || 0).toLocaleString()}
                            <span className="jw-adminReportsBsRec__warn">
                              {" "}
                              — Balances do not match; investigate postings vs balance table.
                            </span>
                          </p>
                        </>
                      ) : null}
                      {bsAdminRec && bsAdminRec.inSync == null ? (
                        <>
                          {bsGrandTotalsMismatch ? (
                            <div className="jw-adminReportsBsRec__divider" aria-hidden="true" />
                          ) : null}
                          <div className="jw-adminReportsBsRec__title">Admin reconciliation (ledger account id 1)</div>
                          <p className="jw-adminReportsBsRec__body">
                            {bsAdminRec.note || "Stored balance unavailable."}
                          </p>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
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
          ) : activeTab === "general-ledger" && glApplied.accountId ? (
            <AdminPagination
              total={glTotal}
              page={glPage}
              pageSize={glPageSize}
              onPageChange={setGlPage}
              onPageSizeChange={(n) => {
                setGlPageSize(n);
                setGlPage(1);
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
    </div>
  );
}

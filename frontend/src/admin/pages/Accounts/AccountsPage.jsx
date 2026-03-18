import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Plus, X } from "lucide-react";
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
import "../../components/AdminTable/adminTable.css";

const TABS = [
  { key: "list", label: "List" },
  { key: "tickets", label: "Tickets" },
];

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  return search.toString();
}

function SortIcon({ dir }) {
  return (
    <span className={`jw-adminSortIcon ${dir ? "is-on" : ""}`}>
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M4 2 L6 0 L8 2 Z" fill={dir === "asc" ? "#333" : "#bbb"} />
        <path d="M4 10 L6 12 L8 10 Z" fill={dir === "desc" ? "#333" : "#bbb"} />
      </svg>
    </span>
  );
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

const LIST_COLUMNS = [
  { key: "clientUsername", header: "Clients", sortKey: "clientUsername" },
  { key: "username", header: "Username", sortKey: "username" },
  { key: "brand", header: "Brand", sortKey: "brand" },
  { key: "status", header: "Status", sortKey: "status" },
  { key: "createdAt", header: "Created at", sortKey: "createdAt" },
  { key: "updatedAt", header: "Updated at", sortKey: "updatedAt" },
  { key: "actions", header: "Actions" },
];

function ListTable({ rows, loading, sort, onSort, onEdit }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";

  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            {LIST_COLUMNS.map((c) => {
              const sortable = !!c.sortKey;
              const dir = sort?.key === c.sortKey ? sort?.dir : null;
              return (
                <th
                  key={c.key}
                  onClick={() => sortable && onSort?.(c.sortKey)}
                  role={sortable ? "button" : undefined}
                  tabIndex={sortable ? 0 : undefined}
                >
                  <span className="jw-adminThInner">
                    {c.header}
                    {sortable && <SortIcon dir={dir} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td colSpan={LIST_COLUMNS.length}>
                  <div className="jw-adminSkeleton" style={{ height: 20 }} />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={LIST_COLUMNS.length} className="jw-adminEmpty">
                No results found
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{r.clientUsername || "—"}</td>
                <td className="jw-adminTd__username">
                  <span className="jw-adminLinkLike">{r.username || "—"}</span>
                </td>
                <td>{r.brand || "—"}</td>
                <td>
                  <span
                    className={`jw-adminStatus ${
                      r.status === "Active" ? "is-active" : "is-inactive"
                    }`}
                  >
                    {r.status || "—"}
                  </span>
                </td>
                <td className="jw-adminTd__date">{formatAdminDateTime(r.createdAt)}</td>
                <td className="jw-adminTd__date">{formatAdminDateTime(r.updatedAt)}</td>
                <td className="jw-adminTd__actions">
                  <button
                    type="button"
                    className="jw-adminEditBtn"
                    title="Edit"
                    onClick={() => onEdit?.(r)}
                  >
                    <EditIconSvg />
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

function CreateModal({
  open,
  form,
  brands,
  masters,
  saving,
  errorText,
  showPassword = true,
  onToggleShowPassword,
  onChange,
  onCancel,
  onConfirm,
}) {
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const clientDebounceRef = useRef(null);
  const clientWrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setClientSearch("");
    setClientOptions([]);
    setClientDropdownOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current);
    const q = clientSearch.trim();
    if (!q) {
      setClientOptions([]);
      setClientDropdownOpen(!!q);
      return;
    }
    clientDebounceRef.current = setTimeout(() => {
      setClientLoading(true);
      const token = localStorage.getItem("token") || "";
      const params = new URLSearchParams({ username: q, pageSize: "20" });
      fetch(`/api/admin/users?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
        .then((res) => res.json())
        .then((data) => {
          setClientOptions(data.items || []);
          setClientDropdownOpen(true);
        })
        .catch(() => setClientOptions([]))
        .finally(() => setClientLoading(false));
    }, 300);
    return () => {
      if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current);
    };
  }, [open, clientSearch]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (clientWrapRef.current && !clientWrapRef.current.contains(e.target)) {
        setClientDropdownOpen(false);
      }
    }
    if (open && clientDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, clientDropdownOpen]);

  if (!open) return null;
  const hasWebsite = !!form.brandId;
  const hasClient = !!form.clientId;

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onCancel}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create account"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Create</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field" ref={clientWrapRef}>
            <label className="jw-adminUsersModal__label">Client</label>
            {hasClient ? (
              <div className="jw-adminUsersModal__inputWrap jw-adminUsersModal__selectedRow">
                <span className="jw-adminUsersModal__selectedLabel">{form.clientUsername || "—"}</span>
                <button
                  type="button"
                  className="jw-adminUsersModal__clearSelect"
                  onClick={() => {
                    onChange("clientId", "");
                    onChange("clientUsername", "");
                  }}
                  aria-label="Clear client"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <input
                  className="jw-adminUsersModal__input"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  onFocus={() => clientOptions.length > 0 && setClientDropdownOpen(true)}
                  placeholder="Search by client username"
                  autoComplete="off"
                />
                {clientLoading && (
                  <div className="jw-adminUsersModal__dropdownLoading">Searching...</div>
                )}
                {clientDropdownOpen && clientOptions.length > 0 && !clientLoading && (
                  <div className="jw-adminUsersModal__dropdown">
                    {clientOptions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="jw-adminUsersModal__dropdownItem"
                        onClick={() => {
                          onChange("clientId", c.id);
                          onChange("clientUsername", c.username || "");
                          setClientSearch("");
                          setClientOptions([]);
                          setClientDropdownOpen(false);
                        }}
                      >
                        {c.username || "—"}
                      </button>
                    ))}
                  </div>
                )}
                {clientDropdownOpen && clientSearch.trim() && clientOptions.length === 0 && !clientLoading && (
                  <div className="jw-adminUsersModal__dropdownEmpty">No clients found</div>
                )}
              </>
            )}
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Username</label>
            <input
              className="jw-adminUsersModal__input"
              value={form.username}
              onChange={(e) => onChange("username", e.target.value)}
              placeholder="Please Enter"
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Password</label>
            <div className="jw-adminUsersModal__inputWrap">
              <input
                type={showPassword ? "text" : "password"}
                className="jw-adminUsersModal__input"
                value={form.password}
                onChange={(e) => onChange("password", e.target.value)}
                placeholder="Please Enter"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="jw-adminUsersModal__eye"
                onClick={onToggleShowPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden />
                ) : (
                  <Eye size={18} aria-hidden />
                )}
              </button>
            </div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Select Website</label>
            <select
              className={`jw-adminUsersModal__input ${!form.brandId ? "jw-adminInput--placeholder" : ""}`}
              value={form.brandId === "" ? "" : form.brandId}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : "";
                onChange("brandId", v);
                onChange("brandCompanyId", "");
              }}
            >
              <option value="">Please Select</option>
              {(brands || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          {hasWebsite && (
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Select Master</label>
              <select
                className={`jw-adminUsersModal__input ${!form.brandCompanyId ? "jw-adminInput--placeholder" : ""}`}
                value={form.brandCompanyId === "" ? "" : form.brandCompanyId}
                onChange={(e) => onChange("brandCompanyId", e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Please Select</option>
                {(masters || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.username}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Status</label>
            <select
              className="jw-adminUsersModal__input"
              value={form.status}
              onChange={(e) => onChange("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Notes (Optional)</label>
            <textarea
              className="jw-adminUsersModal__input jw-adminUsersModal__textarea"
              value={form.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              placeholder="Optional"
              rows={3}
            />
          </div>
          {errorText ? (
            <div className="jw-adminUsersModal__error">{errorText}</div>
          ) : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button
            type="button"
            className="jw-adminUsersModal__btn is-light"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="jw-adminUsersModal__btn is-green"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Creating..." : "Create +"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  open,
  row,
  form,
  saving,
  errorText,
  showPassword = true,
  onToggleShowPassword,
  onChange,
  onCancel,
  onConfirm,
}) {
  if (!open || !row) return null;

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onCancel}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit account"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Edit</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Client</label>
            <input
              className="jw-adminUsersModal__input is-readonly"
              value={row.clientUsername || "—"}
              readOnly
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Username</label>
            <input
              className="jw-adminUsersModal__input is-readonly"
              value={row.username || ""}
              readOnly
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">New Password</label>
            <div className="jw-adminUsersModal__inputWrap">
              <input
                type={showPassword ? "text" : "password"}
                className="jw-adminUsersModal__input"
                value={form.newPassword}
                onChange={(e) => onChange("newPassword", e.target.value)}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="jw-adminUsersModal__eye"
                onClick={onToggleShowPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden />
                ) : (
                  <Eye size={18} aria-hidden />
                )}
              </button>
            </div>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Website</label>
            <input
              className="jw-adminUsersModal__input is-readonly"
              value={row.brand || ""}
              readOnly
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Created at</label>
            <input
              className="jw-adminUsersModal__input is-readonly"
              value={formatAdminDateTime(row.createdAt)}
              readOnly
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Status</label>
            <select
              className="jw-adminUsersModal__input"
              value={form.status}
              onChange={(e) => onChange("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Notes (Optional)</label>
            <textarea
              className="jw-adminUsersModal__input jw-adminUsersModal__textarea"
              value={form.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              placeholder="Optional"
              rows={3}
            />
          </div>
          {errorText ? (
            <div className="jw-adminUsersModal__error">{errorText}</div>
          ) : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button
            type="button"
            className="jw-adminUsersModal__btn is-light"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="jw-adminUsersModal__btn is-green"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    if (location.pathname.includes("/tickets")) return "tickets";
    return "list";
  }, [location.pathname]);

  const [filters, setFilters] = useState({
    client: "",
    username: "",
    brand: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [applied, setApplied] = useState({});
  const [sort, setSort] = useState({ key: "updatedAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [brands, setBrands] = useState([]);
  const [masters, setMasters] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    clientId: "",
    clientUsername: "",
    username: "",
    password: "",
    brandId: "",
    brandCompanyId: "",
    status: "active",
    notes: "",
  });
  const [showCreatePassword, setShowCreatePassword] = useState(true);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ newPassword: "", notes: "", status: "active" });
  const [showEditPassword, setShowEditPassword] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const displayRows = useMemo(() => {
    if (loading && rows.length === 0) return [{ id: "loading-row" }];
    if (!loading && rows.length === 0) return [{ id: "empty-row" }];
    return rows;
  }, [loading, rows]);

  const fetchList = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setErrorText("");
    const query = buildQuery({
      client: applied.client,
      username: applied.username,
      brand: applied.brand,
      status: applied.status,
      dateFrom: applied.startDate,
      dateTo: applied.endDate,
      page,
      pageSize,
      sortKey: sort.key,
      sortDir: sort.dir,
    });
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/client-accounts?${query}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        setRows(data.items || []);
        setTotal(Number(data.total || 0));
        if (data.message && !data.items) setErrorText(data.message);
      })
      .catch(() => {
        if (!ignore) setRows([]), setTotal(0), setErrorText("Unable to load list.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [applied, page, pageSize, sort]);

  useEffect(() => {
    if (activeTab !== "list") return;
    fetchList();
  }, [activeTab, fetchList]);

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/brands/for-accounts", {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => setBrands(data.brands || []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!createForm.brandId) {
      setMasters([]);
      return;
    }
    const token = localStorage.getItem("token") || "";
    const query = buildQuery({
      website: createForm.brandId,
      type: "master",
      status: "active",
      pageSize: 500,
    });
    fetch(`/api/admin/brand-companies?${query}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => setMasters(data.items || []))
      .catch(() => setMasters([]));
  }, [createForm.brandId]);

  const onListSubmit = () => {
    setApplied({ ...filters });
    setPage(1);
  };

  const onListClear = () => {
    setFilters({ client: "", username: "", brand: "", status: "", startDate: "", endDate: "" });
    setApplied({});
    setPage(1);
  };

  const onListSort = (sortKey) => {
    setSort((s) => {
      if (s.key !== sortKey) return { key: sortKey, dir: "asc" };
      if (s.dir === "asc") return { key: sortKey, dir: "desc" };
      return { key: "updatedAt", dir: "desc" };
    });
    setPage(1);
  };

  const openCreate = () => {
    setCreateForm({
      clientId: "",
      clientUsername: "",
      username: "",
      password: "",
      brandId: "",
      brandCompanyId: "",
      status: "active",
      notes: "",
    });
    setShowCreatePassword(true);
    setCreateError("");
    setCreateOpen(true);
  };

  const handleCreateConfirm = async () => {
    const f = createForm;
    if (!f.username.trim()) {
      setCreateError("Username is required.");
      return;
    }
    if (!f.password) {
      setCreateError("Password is required.");
      return;
    }
    if (!f.brandId) {
      setCreateError("Website is required.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch("/api/admin/client-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clientId: f.clientId ? Number(f.clientId) : undefined,
          username: f.username.trim(),
          password: f.password,
          brandId: Number(f.brandId),
          brandCompanyId: f.brandCompanyId ? Number(f.brandCompanyId) : undefined,
          status: f.status,
          notes: f.notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data?.message || "Failed to create.");
        setCreateSaving(false);
        return;
      }
      setCreateOpen(false);
      setCreateSaving(false);
      fetchList();
    } catch {
      setCreateError("Failed to create.");
      setCreateSaving(false);
    }
  };

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({
      newPassword: "",
      notes: row.notes != null ? row.notes : "",
      status: row.statusRaw === "inactive" ? "inactive" : "active",
    });
    setShowEditPassword(true);
    setEditError("");
    setEditOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!editRow?.id) return;
    setEditSaving(true);
    setEditError("");
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/admin/client-accounts/${editRow.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          newPassword: editForm.newPassword || undefined,
          notes: editForm.notes,
          status: editForm.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.message || "Failed to update.");
        setEditSaving(false);
        return;
      }
      setEditOpen(false);
      setEditRow(null);
      setEditSaving(false);
      fetchList();
    } catch {
      setEditError("Failed to update.");
      setEditSaving(false);
    }
  };

  const listFilters = (
    <AdminFilterBar onClear={onListClear} onSubmit={onListSubmit}>
      <AdminFilterField label="Client">
        <AdminInput
          value={filters.client}
          onChange={(v) => setFilters((f) => ({ ...f, client: v }))}
          placeholder="Search by client username"
        />
      </AdminFilterField>
      <AdminFilterField label="Username">
        <AdminInput
          value={filters.username}
          onChange={(v) => setFilters((f) => ({ ...f, username: v }))}
          placeholder="Please Enter"
        />
      </AdminFilterField>
      <AdminFilterField label="Brand">
        <AdminInput
          value={filters.brand}
          onChange={(v) => setFilters((f) => ({ ...f, brand: v }))}
          placeholder="Please Enter"
        />
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select
          className={`jw-adminInput ${!filters.status ? "jw-adminInput--placeholder" : ""}`}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">Please Select</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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

  return (
    <>
      <AdminPageShell
        title="Accounts"
        tabs={
          <AdminTabs
            tabs={TABS}
            activeKey={activeTab}
            onChange={(key) => navigate(key === "tickets" ? "/admin/accounts/tickets" : "/admin/accounts/list")}
          />
        }
        filters={activeTab === "list" ? listFilters : null}
        table={
          activeTab === "list" ? (
            <>
              {errorText && !loading ? (
                <div className="jw-adminUsersPage__notice is-error">{errorText}</div>
              ) : null}
              <ListTable
                rows={displayRows}
                loading={loading}
                sort={sort}
                onSort={onListSort}
                onEdit={openEdit}
              />
            </>
          ) : activeTab === "tickets" ? (
            <div className="jw-adminReportsPlaceholder">Tickets — Coming soon.</div>
          ) : null
        }
        pagination={
          activeTab === "list" ? (
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
          ) : null
        }
      />

      <CreateModal
        open={createOpen}
        form={createForm}
        brands={brands}
        masters={masters}
        saving={createSaving}
        errorText={createError}
        showPassword={showCreatePassword}
        onToggleShowPassword={() => setShowCreatePassword((v) => !v)}
        onChange={(key, value) => setCreateForm((prev) => ({ ...prev, [key]: value }))}
        onCancel={() => {
          if (!createSaving) setCreateOpen(false);
        }}
        onConfirm={handleCreateConfirm}
      />

      <EditModal
        open={editOpen}
        row={editRow}
        form={editForm}
        saving={editSaving}
        errorText={editError}
        showPassword={showEditPassword}
        onToggleShowPassword={() => setShowEditPassword((v) => !v)}
        onChange={(key, value) => setEditForm((prev) => ({ ...prev, [key]: value }))}
        onCancel={() => {
          if (!editSaving) setEditOpen(false);
        }}
        onConfirm={handleEditConfirm}
      />
    </>
  );
}

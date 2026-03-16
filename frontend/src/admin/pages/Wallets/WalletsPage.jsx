import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
  AdminButton,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import { getWalletIconUrl } from "../../../utils/walletIconUrl";
import "../Users/usersPage.css";
import "./walletsPage.css";

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

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path
        fill="#15a84b"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
      />
    </svg>
  );
}

function getImageSrc(row) {
  return getWalletIconUrl(row) ?? null;
}

function ImagePopupModal({ open, src, name, onClose }) {
  const [imgError, setImgError] = useState(false);
  React.useEffect(() => {
    if (open && src) setImgError(false);
  }, [open, src]);
  if (!open || !src) return null;
  return (
    <div className="jw-adminImagePopupOverlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Wallet company image">
      <div className="jw-adminImagePopup" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="jw-adminImagePopupClose"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={24} />
        </button>
        {name ? <div className="jw-adminImagePopupTitle">{name}</div> : null}
        {imgError ? (
          <div className="jw-adminImagePopupError">Image not found. Re-upload the SVG in Edit to save it to the server.</div>
        ) : (
          <img
            src={src}
            alt={name || "Wallet company"}
            className="jw-adminImagePopupImg"
            onError={() => setImgError(true)}
          />
        )}
      </div>
    </div>
  );
}

function CompaniesTable({ rows, sort, onSort, onEdit, onImageClick, loading }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";

  const cols = [
    { key: "name", header: "Name", sortKey: "name" },
    { key: "forDP", header: "For DP", sortKey: "forDP" },
    { key: "forWD", header: "For WD", sortKey: "forWD" },
    { key: "sortOrder", header: "Sort order", sortKey: "sortOrder" },
    { key: "image", header: "Image" },
    { key: "actions", header: "Actions" },
  ];

  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            {cols.map((c) => {
              const sortable = !!c.sortKey;
              const dir = sort?.key === c.sortKey ? sort?.dir : null;
              return (
                <th
                  key={c.key}
                  onClick={() => sortable && onSort?.(c.sortKey)}
                  role={sortable ? "button" : undefined}
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
                <td colSpan={6}><div className="jw-adminSkeleton" style={{ height: 20 }} /></td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={6} className="jw-adminEmpty">No results found</td>
            </tr>
          ) : (
            rows.map((r) => {
              const hasImage = r.iconPath || r.iconKey || r.iconSvg;
              return (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.forDP ?? "—"}</td>
                  <td>{r.forWD ?? "—"}</td>
                  <td>{r.sortOrder !== undefined && r.sortOrder !== null ? r.sortOrder : "—"}</td>
                  <td>
                    {hasImage ? (
                      <button
                        type="button"
                        className="jw-adminCompaniesImageLink"
                        onClick={() => onImageClick?.(r)}
                      >
                        image
                      </button>
                    ) : (
                      <span className="jw-adminCompaniesImagePlaceholder">—</span>
                    )}
                  </td>
                  <td className="jw-adminTd__actions">
                    <button
                      type="button"
                      className="jw-adminEditBtn"
                      title="Edit"
                      onClick={() => onEdit?.(r)}
                    >
                      <EditIcon />
                    </button>
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

function CreateCompanyModal({ open, form, saving, errorText, onChange, onIconFileSelect, onCancel, onConfirm }) {
  const fileInputRef = React.useRef(null);

  if (!open) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onIconFileSelect) {
      onIconFileSelect(file);
      onChange("iconSvg", "selected");
    } else {
      const reader = new FileReader();
      reader.onload = () => onChange("iconSvg", reader.result || "");
      reader.readAsText(file, "UTF-8");
    }
  };

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onCancel}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create Wallet Company">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Create Wallet Company</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Name</label>
            <input
              className="jw-adminUsersModal__input"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Please Enter"
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Available for Deposit</label>
            <select
              className="jw-adminUsersModal__input"
              value={form.availableForDeposit}
              onChange={(e) => onChange("availableForDeposit", e.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Available for Withdraw</label>
            <select
              className="jw-adminUsersModal__input"
              value={form.availableForWithdraw}
              onChange={(e) => onChange("availableForWithdraw", e.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Sort order</label>
            <input
              type="number"
              min={0}
              className="jw-adminUsersModal__input"
              value={form.sortOrder === "" ? "" : form.sortOrder}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") onChange("sortOrder", "");
                else { const n = parseInt(v, 10); if (!Number.isNaN(n) && n >= 0) onChange("sortOrder", n); }
              }}
              placeholder="Leave empty for auto (last)"
            />
            <span className="jw-adminUsersModal__hint">Lowest number shows first and is default on client.</span>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              className="jw-adminUsersModal__input"
              onChange={handleFileChange}
            />
            {form.iconSvg ? <span className="jw-adminCompaniesFileOk">SVG selected</span> : null}
          </div>
          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onConfirm} disabled={saving}>
            {saving ? "Creating..." : "Create +"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCompanyModal({ open, company, form, saving, errorText, onChange, onIconFileSelect, onCancel, onConfirm }) {
  const fileInputRef = React.useRef(null);

  if (!open || !company) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onIconFileSelect) {
      onIconFileSelect(file);
      onChange("iconSvg", "selected");
    } else {
      const reader = new FileReader();
      reader.onload = () => onChange("iconSvg", reader.result || "");
      reader.readAsText(file, "UTF-8");
    }
  };

  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onCancel}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit Wallet Company">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Edit Wallet Company</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Name</label>
            <input className="jw-adminUsersModal__input is-readonly" value={company.name || ""} readOnly />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Available for Deposit</label>
            <select
              className="jw-adminUsersModal__input"
              value={form.availableForDeposit}
              onChange={(e) => onChange("availableForDeposit", e.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Available for Withdraw</label>
            <select
              className="jw-adminUsersModal__input"
              value={form.availableForWithdraw}
              onChange={(e) => onChange("availableForWithdraw", e.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Sort order</label>
            <input
              type="number"
              min={0}
              className="jw-adminUsersModal__input"
              value={form.sortOrder === "" ? "" : form.sortOrder}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") onChange("sortOrder", "");
                else { const n = parseInt(v, 10); if (!Number.isNaN(n) && n >= 0) onChange("sortOrder", n); }
              }}
              placeholder="Lowest = first / default"
            />
            <span className="jw-adminUsersModal__hint">Lowest number shows first and is default on client.</span>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Image (SVG)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              className="jw-adminUsersModal__input"
              onChange={handleFileChange}
            />
            {form.iconSvg ? <span className="jw-adminCompaniesFileOk">New SVG selected</span> : company.iconSvg ? <span className="jw-adminCompaniesFileOk">Current image on file</span> : null}
          </div>
          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onConfirm} disabled={saving}>{saving ? "Saving..." : "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

function PaymentWalletsTable({ rows, sort, onSort, onEdit, onQrClick, loading }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";
  const cols = [
    { key: "name", header: "Name", sortKey: "name" },
    { key: "number", header: "Number", sortKey: "number" },
    { key: "company", header: "Company", sortKey: "company" },
    { key: "status", header: "Status", sortKey: "status" },
    { key: "balance", header: "Balance", sortKey: "balance" },
    { key: "qr", header: "QR" },
    { key: "actions", header: "Actions" },
  ];
  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            {cols.map((c) => {
              const sortable = !!c.sortKey;
              const dir = sort?.key === c.sortKey ? sort?.dir : null;
              return (
                <th key={c.key} onClick={() => sortable && onSort?.(c.sortKey)} role={sortable ? "button" : undefined}>
                  <span className="jw-adminThInner">{c.header}{sortable && <SortIcon dir={dir} />}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`}><td colSpan={7}><div className="jw-adminSkeleton" style={{ height: 20 }} /></td></tr>
            ))
          ) : isEmpty ? (
            <tr><td colSpan={7} className="jw-adminEmpty">No results found</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.number}</td>
                <td>{r.companyName || "—"}</td>
                <td><span className={`jw-adminStatus ${r.status === "Active" ? "is-active" : "is-inactive"}`}>{r.status}</span></td>
                <td>{Number(r.balance)?.toLocaleString() ?? "0"}</td>
                <td>
                  {r.qrImagePath ? (
                    <button type="button" className="jw-adminCompaniesImageLink" onClick={() => onQrClick?.(r)}>image</button>
                  ) : (
                    <span className="jw-adminCompaniesImagePlaceholder">—</span>
                  )}
                </td>
                <td className="jw-adminTd__actions">
                  <button type="button" className="jw-adminEditBtn" title="Edit" onClick={() => onEdit?.(r)}><EditIcon /></button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function WalletsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = useMemo(() => [
    { key: "companies", label: "Companies" },
    { key: "wallets", label: "Wallets" },
  ], []);
  const activeTab = useMemo(() => {
    return location.pathname.endsWith("/wallets/wallets") ? "wallets" : "companies";
  }, [location.pathname]);

  const [filters, setFilters] = useState({ name: "", availability: "" });
  const [applied, setApplied] = useState({ name: "", availability: "" });
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", availableForDeposit: "yes", availableForWithdraw: "yes", sortOrder: "", iconSvg: "" });
  const [createIconFile, setCreateIconFile] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState({ availableForDeposit: "yes", availableForWithdraw: "yes", sortOrder: "", iconSvg: "" });
  const [editIconFile, setEditIconFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [imagePopup, setImagePopup] = useState({ open: false, src: null, name: "" });

  // Payment Wallets tab state
  const [pwFilters, setPwFilters] = useState({ name: "", number: "", status: "" });
  const [pwApplied, setPwApplied] = useState({ name: "", number: "", status: "" });
  const [pwSort, setPwSort] = useState({ key: "name", dir: "asc" });
  const [pwPage, setPwPage] = useState(1);
  const [pwPageSize, setPwPageSize] = useState(25);
  const [pwRows, setPwRows] = useState([]);
  const [pwTotal, setPwTotal] = useState(0);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrorText, setPwErrorText] = useState("");
  const [walletCompaniesActive, setWalletCompaniesActive] = useState([]);
  const [pwCreateOpen, setPwCreateOpen] = useState(false);
  const [pwCreateForm, setPwCreateForm] = useState({
    name: "", number: "", walletCompanyId: "", minDeposit: "", minWithdraw: "", maxDeposit: "", maxWithdraw: "",
    qrImageBase64: "", availableForDeposit: "yes", availableForWithdraw: "yes", sortOrder: "",
  });
  const [pwCreateSaving, setPwCreateSaving] = useState(false);
  const [pwCreateError, setPwCreateError] = useState("");
  const [pwEditOpen, setPwEditOpen] = useState(false);
  const [pwEditing, setPwEditing] = useState(null);
  const [pwEditForm, setPwEditForm] = useState({});
  const [pwEditSaving, setPwEditSaving] = useState(false);
  const [pwEditError, setPwEditError] = useState("");
  const [pwAdjustOpen, setPwAdjustOpen] = useState(false);
  const [pwAdjustType, setPwAdjustType] = useState("topup"); // "topup" | "deduct"
  const [pwAdjustWalletId, setPwAdjustWalletId] = useState("");
  const [pwAdjustAmount, setPwAdjustAmount] = useState("");
  const [pwAdjustNotes, setPwAdjustNotes] = useState("");
  const [pwAdjustSaving, setPwAdjustSaving] = useState(false);
  const [pwAdjustError, setPwAdjustError] = useState("");
  const [adminAccountBalance, setAdminAccountBalance] = useState(null);
  const [qrPopup, setQrPopup] = useState({ open: false, src: null, name: "" });

  const openImagePopup = (row) => {
    const src = getImageSrc(row);
    if (src) setImagePopup({ open: true, src, name: row.name || "" });
  };

  const fetchCompanies = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setErrorText("");
    const query = buildQuery({
      name: applied.name,
      availability: applied.availability,
      page,
      pageSize,
      sortKey: sort.key,
      sortDir: sort.dir,
    });
    const token = localStorage.getItem("token") || "";

    fetch(`/api/admin/wallet-companies?${query}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (!data.items) {
          setRows([]);
          setTotal(0);
          setErrorText(data?.message || "Unable to load.");
          return;
        }
        setRows(data.items);
        setTotal(Number(data.total || 0));
      })
      .catch(() => {
        if (!ignore) setRows([]), setTotal(0), setErrorText("Unable to load wallet companies.");
      })
      .finally(() => { if (!ignore) setLoading(false); });

    return () => { ignore = true; };
  }, [applied, page, pageSize, sort]);

  useEffect(() => {
    if (activeTab !== "companies") return;
    fetchCompanies();
  }, [activeTab, fetchCompanies]);

  const fetchPaymentWallets = useCallback(() => {
    let ignore = false;
    setPwLoading(true);
    setPwErrorText("");
    const query = buildQuery({
      name: pwApplied.name,
      number: pwApplied.number,
      status: pwApplied.status,
      page: pwPage,
      pageSize: pwPageSize,
      sortKey: pwSort.key,
      sortDir: pwSort.dir,
    });
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/payment-wallets?${query}`, {
      method: "GET",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (!data.items) {
          setPwRows([]);
          setPwTotal(0);
          setPwErrorText(data?.message || "Unable to load.");
          return;
        }
        setPwRows(data.items);
        setPwTotal(Number(data.total || 0));
      })
      .catch(() => {
        if (!ignore) setPwRows([]), setPwTotal(0), setPwErrorText("Unable to load payment wallets.");
      })
      .finally(() => { if (!ignore) setPwLoading(false); });
    return () => { ignore = true; };
  }, [pwApplied, pwPage, pwPageSize, pwSort]);

  useEffect(() => {
    if (activeTab !== "wallets") return;
    fetchPaymentWallets();
  }, [activeTab, fetchPaymentWallets]);

  useEffect(() => {
    if (activeTab !== "wallets" || walletCompaniesActive.length > 0) return;
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/wallet-companies/active", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      .then((res) => res.json())
      .then((data) => setWalletCompaniesActive(data?.companies ?? []))
      .catch(() => {});
  }, [activeTab, walletCompaniesActive.length]);

  const fetchAdminAccountBalance = useCallback(() => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/admin-account-balance", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      .then((res) => res.json())
      .then((data) => setAdminAccountBalance(data?.balance ?? 0))
      .catch(() => setAdminAccountBalance(0));
  }, []);

  useEffect(() => {
    if (activeTab !== "wallets") return;
    fetchAdminAccountBalance();
  }, [activeTab, fetchAdminAccountBalance]);

  const onSubmit = () => {
    setApplied(filters);
    setPage(1);
  };

  const onClear = () => {
    setFilters({ name: "", availability: "" });
  };

  const pwOnSubmit = () => {
    setPwApplied(pwFilters);
    setPwPage(1);
  };

  const pwOnClear = () => {
    setPwFilters({ name: "", number: "", status: "" });
  };

  const pwOnSort = (sortKey) => {
    setPwSort((s) => (s.key !== sortKey ? { key: sortKey, dir: "asc" } : { key: sortKey, dir: s.dir === "asc" ? "desc" : "asc" }));
    setPwPage(1);
  };

  const onSort = (sortKey) => {
    setSort((s) => {
      if (s.key !== sortKey) return { key: sortKey, dir: "asc" };
      return { key: sortKey, dir: s.dir === "asc" ? "desc" : "asc" };
    });
    setPage(1);
  };

  const openCreate = () => {
    setCreateForm({ name: "", availableForDeposit: "yes", availableForWithdraw: "yes", sortOrder: "", iconSvg: "" });
    setCreateIconFile(null);
    setCreateError("");
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (!createSaving) setCreateOpen(false);
  };

  const handleCreateChange = (key, value) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    setCreateError("");
  };

  const handleCreateConfirm = async () => {
    if (!createForm.name.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    const token = localStorage.getItem("token") || "";
    try {
      let res;
      if (createIconFile) {
        const formData = new FormData();
        formData.append("name", createForm.name.trim());
        formData.append("availableForDeposit", createForm.availableForDeposit);
        formData.append("availableForWithdraw", createForm.availableForWithdraw);
        if (createForm.sortOrder !== "" && createForm.sortOrder !== undefined) {
          formData.append("sortOrder", String(createForm.sortOrder));
        }
        formData.append("icon", createIconFile);
        res = await fetch("/api/admin/wallet-companies", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        res = await fetch("/api/admin/wallet-companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: createForm.name.trim(),
            availableForDeposit: createForm.availableForDeposit,
            availableForWithdraw: createForm.availableForWithdraw,
            sortOrder: createForm.sortOrder !== "" && createForm.sortOrder !== undefined ? Number(createForm.sortOrder) : undefined,
            iconSvg: createForm.iconSvg || undefined,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data?.message || "Failed to create.");
        setCreateSaving(false);
        return;
      }
      setCreateOpen(false);
      setCreateIconFile(null);
      setCreateSaving(false);
      fetchCompanies();
    } catch {
      setCreateError("Failed to create wallet company.");
      setCreateSaving(false);
    }
  };

  const openEdit = (row) => {
    setEditingCompany(row);
    setEditForm({
      availableForDeposit: row.availableForDeposit ? "yes" : "no",
      availableForWithdraw: row.availableForWithdraw ? "yes" : "no",
      sortOrder: row.sortOrder !== undefined && row.sortOrder !== null ? row.sortOrder : "",
      iconSvg: "",
    });
    setEditIconFile(null);
    setEditError("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (!editSaving) setEditOpen(false), setEditingCompany(null);
  };

  const handleEditChange = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
    setEditError("");
  };

  const handleEditConfirm = async () => {
    if (!editingCompany?.id) return;
    setEditSaving(true);
    setEditError("");
    const token = localStorage.getItem("token") || "";
    try {
      let res;
      if (editIconFile) {
        const formData = new FormData();
        formData.append("availableForDeposit", editForm.availableForDeposit);
        formData.append("availableForWithdraw", editForm.availableForWithdraw);
        if (editForm.sortOrder !== "" && editForm.sortOrder !== undefined && editForm.sortOrder !== null) {
          formData.append("sortOrder", String(editForm.sortOrder));
        }
        formData.append("icon", editIconFile);
        res = await fetch(`/api/admin/wallet-companies/${editingCompany.id}`, {
          method: "PATCH",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        const body = {
          availableForDeposit: editForm.availableForDeposit,
          availableForWithdraw: editForm.availableWithdraw,
        };
        if (editForm.sortOrder !== "" && editForm.sortOrder !== undefined && editForm.sortOrder !== null) {
          body.sortOrder = Number(editForm.sortOrder);
        }
        if (editForm.iconSvg && editForm.iconSvg.trim()) body.iconSvg = editForm.iconSvg;
        res = await fetch(`/api/admin/wallet-companies/${editingCompany.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.message || "Failed to update.");
        setEditSaving(false);
        return;
      }
      const updated = data?.item;
      if (updated) setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setEditOpen(false);
      setEditingCompany(null);
      setEditIconFile(null);
      setEditSaving(false);
    } catch {
      setEditError("Failed to update.");
      setEditSaving(false);
    }
  };

  const displayRows = useMemo(() => {
    if (loading) return [{ id: "loading-row" }];
    if (!loading && rows.length === 0) return [{ id: "empty-row" }];
    return rows;
  }, [rows, loading]);

  const companiesFilters = (
    <AdminFilterBar onClear={onClear} onSubmit={onSubmit}>
      <AdminFilterField label="Name">
        <AdminInput value={filters.name} onChange={(v) => setFilters((f) => ({ ...f, name: v }))} placeholder="Please Enter" />
      </AdminFilterField>
      <AdminFilterField label="Availability">
        <select
          className={`jw-adminInput ${!filters.availability ? "jw-adminInput--placeholder" : ""}`}
          value={filters.availability}
          onChange={(e) => setFilters((f) => ({ ...f, availability: e.target.value }))}
        >
          <option value="">Please Select</option>
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={openCreate}>
          <span className="jw-adminCreateBtnInner">Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} /></span>
        </AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );

  const pwDisplayRows = useMemo(() => {
    if (pwLoading) return [{ id: "loading-row" }];
    if (!pwLoading && pwRows.length === 0) return [{ id: "empty-row" }];
    return pwRows;
  }, [pwRows, pwLoading]);

  const walletsFilters = (
    <AdminFilterBar
      onClear={pwOnClear}
      onSubmit={pwOnSubmit}
      summary={
        <div className="jw-adminFilterField">
          <div className="jw-adminFilterField__label">Balance</div>
          <div className="jw-adminFilterField__control">
            Admin Account: <span style={{ fontSize: 20 }}>Rs. {adminAccountBalance != null ? Number(adminAccountBalance).toLocaleString() : "—"}</span>
          </div>
        </div>
      }
    >
      <AdminFilterField label="Name">
        <AdminInput value={pwFilters.name} onChange={(v) => setPwFilters((f) => ({ ...f, name: v }))} placeholder="Please Enter" />
      </AdminFilterField>
      <AdminFilterField label="Number">
        <AdminInput value={pwFilters.number} onChange={(v) => setPwFilters((f) => ({ ...f, number: v }))} placeholder="Please Enter" />
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select
          className={`jw-adminInput ${!pwFilters.status ? "jw-adminInput--placeholder" : ""}`}
          value={pwFilters.status}
          onChange={(e) => setPwFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">Please Select</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={() => { setPwCreateForm({ name: "", number: "", walletCompanyId: "", minDeposit: "", minWithdraw: "", maxDeposit: "", maxWithdraw: "", qrImageBase64: "", availableForDeposit: "yes", availableForWithdraw: "yes", sortOrder: "" }); setPwCreateError(""); setPwCreateOpen(true); }}>
          <span className="jw-adminCreateBtnInner">Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} /></span>
        </AdminButton>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="light" onClick={() => { setPwAdjustType("topup"); setPwAdjustWalletId(""); setPwAdjustAmount(""); setPwAdjustNotes(""); setPwAdjustError(""); setPwAdjustOpen(true); }}>TopUp</AdminButton>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="light" onClick={() => { setPwAdjustType("deduct"); setPwAdjustWalletId(""); setPwAdjustAmount(""); setPwAdjustNotes(""); setPwAdjustError(""); setPwAdjustOpen(true); }}>Deduct</AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <>
      <AdminPageShell
        title="Wallets Info"
        tabs={<AdminTabs tabs={tabs} activeKey={activeTab} onChange={(key) => navigate(key === "wallets" ? "/admin/wallets/wallets" : "/admin/wallets/company")} />}
        filters={activeTab === "companies" ? companiesFilters : activeTab === "wallets" ? walletsFilters : null}
        table={
          activeTab === "companies" ? (
            <>
              {errorText && !loading ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
              <CompaniesTable
                rows={displayRows}
                sort={sort}
                onSort={onSort}
                onEdit={openEdit}
                onImageClick={openImagePopup}
                loading={loading}
              />
            </>
          ) : activeTab === "wallets" ? (
            <>
              {pwErrorText && !pwLoading ? <div className="jw-adminUsersPage__notice is-error">{pwErrorText}</div> : null}
              <PaymentWalletsTable
                rows={pwDisplayRows}
                sort={pwSort}
                onSort={pwOnSort}
                onEdit={(r) => { setPwEditing(r); setPwEditForm({ name: r.name, number: r.number, status: r.statusRaw || "active", minDeposit: r.minDeposit ?? "", minWithdraw: r.minWithdraw ?? "", maxDeposit: r.maxDeposit ?? "", maxWithdraw: r.maxWithdraw ?? "", availableForDeposit: r.availableForDeposit ? "yes" : "no", availableForWithdraw: r.availableForWithdraw ? "yes" : "no", sortOrder: r.sortOrder ?? "", qrImageBase64: "" }); setPwEditError(""); setPwEditOpen(true); }}
                onQrClick={(r) => { const src = r.qrImagePath ? `/uploads/qr/${r.qrImagePath}` : null; if (src) setQrPopup({ open: true, src, name: r.name || "" }); }}
                loading={pwLoading}
              />
            </>
          ) : (
            <div className="jw-adminWalletsPlaceholder">—</div>
          )
        }
        pagination={
          activeTab === "companies" ? (
            <AdminPagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            />
          ) : activeTab === "wallets" ? (
            <AdminPagination
              total={pwTotal}
              page={pwPage}
              pageSize={pwPageSize}
              onPageChange={setPwPage}
              onPageSizeChange={(n) => { setPwPageSize(n); setPwPage(1); }}
            />
          ) : null
        }
      />

      <CreateCompanyModal
        open={createOpen}
        form={createForm}
        saving={createSaving}
        errorText={createError}
        onChange={handleCreateChange}
        onIconFileSelect={setCreateIconFile}
        onCancel={closeCreate}
        onConfirm={handleCreateConfirm}
      />
      <EditCompanyModal
        open={editOpen}
        company={editingCompany}
        form={editForm}
        saving={editSaving}
        errorText={editError}
        onChange={handleEditChange}
        onIconFileSelect={setEditIconFile}
        onCancel={closeEdit}
        onConfirm={handleEditConfirm}
      />
      <ImagePopupModal
        open={imagePopup.open}
        src={imagePopup.src}
        name={imagePopup.name}
        onClose={() => setImagePopup({ open: false, src: null, name: "" })}
      />

      {/* Payment Wallet Create Modal */}
      {pwCreateOpen && (
        <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={() => !pwCreateSaving && setPwCreateOpen(false)}>
          <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="jw-adminUsersModal__header"><div className="jw-adminUsersModal__title">Create Payment Wallet</div></div>
            <div className="jw-adminUsersModal__body">
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Name (alphabets only, max 20)</label>
                <input className="jw-adminUsersModal__input" value={pwCreateForm.name} onChange={(e) => setPwCreateForm((f) => ({ ...f, name: e.target.value.replace(/[^A-Za-z ]/g, "").slice(0, 20) }))} placeholder="Please Enter" />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Number (alphanumeric, max 30)</label>
                <input className="jw-adminUsersModal__input" value={pwCreateForm.number} onChange={(e) => setPwCreateForm((f) => ({ ...f, number: e.target.value.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 30) }))} placeholder="Please Enter" />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Wallet Company</label>
                <select className="jw-adminUsersModal__input" value={pwCreateForm.walletCompanyId} onChange={(e) => setPwCreateForm((f) => ({ ...f, walletCompanyId: e.target.value }))}>
                  <option value="">Please Select</option>
                  {walletCompaniesActive.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="jw-adminUsersModal__field" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label className="jw-adminUsersModal__label">Min. Deposit</label><input type="number" min={0} className="jw-adminUsersModal__input" value={pwCreateForm.minDeposit} onChange={(e) => setPwCreateForm((f) => ({ ...f, minDeposit: e.target.value }))} /></div>
                <div><label className="jw-adminUsersModal__label">Min. Withdraw</label><input type="number" min={0} className="jw-adminUsersModal__input" value={pwCreateForm.minWithdraw} onChange={(e) => setPwCreateForm((f) => ({ ...f, minWithdraw: e.target.value }))} /></div>
                <div><label className="jw-adminUsersModal__label">Max. Deposit</label><input type="number" min={0} className="jw-adminUsersModal__input" value={pwCreateForm.maxDeposit} onChange={(e) => setPwCreateForm((f) => ({ ...f, maxDeposit: e.target.value }))} /></div>
                <div><label className="jw-adminUsersModal__label">Max. Withdraw</label><input type="number" min={0} className="jw-adminUsersModal__input" value={pwCreateForm.maxWithdraw} onChange={(e) => setPwCreateForm((f) => ({ ...f, maxWithdraw: e.target.value }))} /></div>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">QR image (150×150 to 240×240 px)</label>
                <input type="file" accept="image/*" className="jw-adminUsersModal__input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setPwCreateForm((f) => ({ ...f, qrImageBase64: reader.result || "" }));
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Available for Deposit</label>
                <select className="jw-adminUsersModal__input" value={pwCreateForm.availableForDeposit} onChange={(e) => setPwCreateForm((f) => ({ ...f, availableForDeposit: e.target.value }))}>
                  <option value="yes">Yes</option><option value="no">No</option>
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Available for Withdraw</label>
                <select className="jw-adminUsersModal__input" value={pwCreateForm.availableForWithdraw} onChange={(e) => setPwCreateForm((f) => ({ ...f, availableForWithdraw: e.target.value }))}>
                  <option value="yes">Yes</option><option value="no">No</option>
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Sort order</label>
                <input type="number" min={0} className="jw-adminUsersModal__input" value={pwCreateForm.sortOrder} onChange={(e) => setPwCreateForm((f) => ({ ...f, sortOrder: e.target.value }))} placeholder="Leave empty for auto" />
              </div>
              {pwCreateError && <div className="jw-adminUsersModal__error">{pwCreateError}</div>}
            </div>
            <div className="jw-adminUsersModal__actions">
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => !pwCreateSaving && setPwCreateOpen(false)} disabled={pwCreateSaving}>Cancel</button>
              <button type="button" className="jw-adminUsersModal__btn is-green" disabled={pwCreateSaving} onClick={async () => {
                if (!/^[A-Za-z ]+$/.test(pwCreateForm.name) || pwCreateForm.name.length > 20) { setPwCreateError("Name: alphabets only, max 20."); return; }
                if (!pwCreateForm.number || pwCreateForm.number.length > 30) { setPwCreateError("Number: required, max 30."); return; }
                if (!pwCreateForm.walletCompanyId) { setPwCreateError("Select a wallet company."); return; }
                setPwCreateSaving(true); setPwCreateError("");
                const token = localStorage.getItem("token") || "";
                try {
                  const res = await fetch("/api/admin/payment-wallets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({
                      name: pwCreateForm.name.trim(),
                      number: pwCreateForm.number.trim(),
                      walletCompanyId: Number(pwCreateForm.walletCompanyId),
                      minDeposit: Number(pwCreateForm.minDeposit) || 0,
                      minWithdraw: Number(pwCreateForm.minWithdraw) || 0,
                      maxDeposit: Number(pwCreateForm.maxDeposit) || 0,
                      maxWithdraw: Number(pwCreateForm.maxWithdraw) || 0,
                      qrImageBase64: pwCreateForm.qrImageBase64 || undefined,
                      availableForDeposit: pwCreateForm.availableForDeposit,
                      availableForWithdraw: pwCreateForm.availableForWithdraw,
                      sortOrder: pwCreateForm.sortOrder !== "" ? Number(pwCreateForm.sortOrder) : undefined,
                    }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) { setPwCreateError(data?.message || "Failed to create."); setPwCreateSaving(false); return; }
                  setPwCreateOpen(false); setPwCreateSaving(false);
                  fetchPaymentWallets();
                } catch { setPwCreateError("Failed to create."); setPwCreateSaving(false); }
              }}>{pwCreateSaving ? "Creating..." : "Create +"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Wallet Edit Modal */}
      {pwEditOpen && pwEditing && (
        <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={() => !pwEditSaving && (setPwEditOpen(false), setPwEditing(null))}>
          <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="jw-adminUsersModal__header"><div className="jw-adminUsersModal__title">Edit Payment Wallet</div></div>
            <div className="jw-adminUsersModal__body">
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Name</label>
                <input className="jw-adminUsersModal__input" value={pwEditForm.name ?? ""} onChange={(e) => setPwEditForm((f) => ({ ...f, name: e.target.value.replace(/[^A-Za-z ]/g, "").slice(0, 20) }))} />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Number</label>
                <input className="jw-adminUsersModal__input" value={pwEditForm.number ?? ""} onChange={(e) => setPwEditForm((f) => ({ ...f, number: e.target.value.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 30) }))} />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Status</label>
                <select className="jw-adminUsersModal__input" value={pwEditForm.status ?? "active"} onChange={(e) => setPwEditForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">QR image</label>
                <input type="file" accept="image/*" className="jw-adminUsersModal__input" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => setPwEditForm((f) => ({ ...f, qrImageBase64: reader.result })); reader.readAsDataURL(file); } }} />
              </div>
              <div className="jw-adminUsersModal__field" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label className="jw-adminUsersModal__label">Min. Deposit</label><input type="number" min={0} className="jw-adminUsersModal__input" value={pwEditForm.minDeposit ?? ""} onChange={(e) => setPwEditForm((f) => ({ ...f, minDeposit: e.target.value }))} /></div>
                <div><label className="jw-adminUsersModal__label">Min. Withdraw</label><input type="number" min={0} className="jw-adminUsersModal__input" value={pwEditForm.minWithdraw ?? ""} onChange={(e) => setPwEditForm((f) => ({ ...f, minWithdraw: e.target.value }))} /></div>
                <div><label className="jw-adminUsersModal__label">Max. Deposit</label><input type="number" min={0} className="jw-adminUsersModal__input" value={pwEditForm.maxDeposit ?? ""} onChange={(e) => setPwEditForm((f) => ({ ...f, maxDeposit: e.target.value }))} /></div>
                <div><label className="jw-adminUsersModal__label">Max. Withdraw</label><input type="number" min={0} className="jw-adminUsersModal__input" value={pwEditForm.maxWithdraw ?? ""} onChange={(e) => setPwEditForm((f) => ({ ...f, maxWithdraw: e.target.value }))} /></div>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Available for Deposit</label>
                <select className="jw-adminUsersModal__input" value={pwEditForm.availableForDeposit ?? "yes"} onChange={(e) => setPwEditForm((f) => ({ ...f, availableForDeposit: e.target.value }))}>
                  <option value="yes">Yes</option><option value="no">No</option>
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Available for Withdraw</label>
                <select className="jw-adminUsersModal__input" value={pwEditForm.availableForWithdraw ?? "yes"} onChange={(e) => setPwEditForm((f) => ({ ...f, availableForWithdraw: e.target.value }))}>
                  <option value="yes">Yes</option><option value="no">No</option>
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Sort order</label>
                <input type="number" min={0} className="jw-adminUsersModal__input" value={pwEditForm.sortOrder ?? ""} onChange={(e) => setPwEditForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              {pwEditError && <div className="jw-adminUsersModal__error">{pwEditError}</div>}
            </div>
            <div className="jw-adminUsersModal__actions">
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => !pwEditSaving && (setPwEditOpen(false), setPwEditing(null))} disabled={pwEditSaving}>Cancel</button>
              <button type="button" className="jw-adminUsersModal__btn is-green" disabled={pwEditSaving} onClick={async () => {
                setPwEditSaving(true); setPwEditError("");
                const token = localStorage.getItem("token") || "";
                try {
                  const body = { name: pwEditForm.name, number: pwEditForm.number, status: pwEditForm.status, minDeposit: Number(pwEditForm.minDeposit) || 0, minWithdraw: Number(pwEditForm.minWithdraw) || 0, maxDeposit: Number(pwEditForm.maxDeposit) || 0, maxWithdraw: Number(pwEditForm.maxWithdraw) || 0, availableForDeposit: pwEditForm.availableForDeposit, availableForWithdraw: pwEditForm.availableForWithdraw, sortOrder: pwEditForm.sortOrder !== "" ? Number(pwEditForm.sortOrder) : undefined };
                  if (pwEditForm.qrImageBase64) body.qrImageBase64 = pwEditForm.qrImageBase64;
                  const res = await fetch(`/api/admin/payment-wallets/${pwEditing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) { setPwEditError(data?.message || "Failed to update."); setPwEditSaving(false); return; }
                  const updated = data?.item; if (updated) setPwRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
                  setPwEditOpen(false); setPwEditing(null); setPwEditSaving(false);
                } catch { setPwEditError("Failed to update."); setPwEditSaving(false); }
              }}>{pwEditSaving ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}

      {/* TopUp / Deduct Modal (unified) */}
      {pwAdjustOpen && (
        <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={() => !pwAdjustSaving && (setPwAdjustOpen(false), setPwAdjustWalletId(""), setPwAdjustAmount(""), setPwAdjustNotes(""), setPwAdjustError(""))}>
          <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="jw-adminUsersModal__header"><div className="jw-adminUsersModal__title">{pwAdjustType === "topup" ? "Top Up" : "Deduct"}</div></div>
            <div className="jw-adminUsersModal__body">
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Select Payment Wallet</label>
                <select className="jw-adminUsersModal__input" value={pwAdjustWalletId} onChange={(e) => setPwAdjustWalletId(e.target.value)}>
                  <option value="">Please Select</option>
                  {pwRows.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} — {r.number} (Rs. {Number(r.balance)?.toLocaleString() ?? "0"})</option>
                  ))}
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Enter Amount</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  className="jw-adminUsersModal__input"
                  value={pwAdjustAmount}
                  onChange={(e) => setPwAdjustAmount(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault(); }}
                  placeholder="0.00"
                />
              </div>
              {pwAdjustWalletId && (() => {
                const sel = pwRows.find((r) => String(r.id) === String(pwAdjustWalletId));
                const before = sel ? Number(sel.balance) || 0 : 0;
                const amt = Number(pwAdjustAmount) || 0;
                const after = pwAdjustType === "topup" ? before + amt : Math.max(0, before - amt);
                return (
                  <>
                    <div className="jw-adminUsersModal__field">
                      <label className="jw-adminUsersModal__label">Before Balance</label>
                      <div className="jw-adminUsersModal__readOnly">Rs. {before.toLocaleString()}</div>
                    </div>
                    <div className="jw-adminUsersModal__field">
                      <label className="jw-adminUsersModal__label">After Balance</label>
                      <div className="jw-adminUsersModal__readOnly">Rs. {after.toLocaleString()}</div>
                    </div>
                  </>
                );
              })()}
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Notes (optional)</label>
                <textarea className="jw-adminUsersModal__input jw-adminUsersModal__textarea" value={pwAdjustNotes} onChange={(e) => setPwAdjustNotes(e.target.value)} placeholder="Info for this transaction" rows={3} />
              </div>
              {pwAdjustError && <div className="jw-adminUsersModal__error">{pwAdjustError}</div>}
            </div>
            <div className="jw-adminUsersModal__actions">
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => !pwAdjustSaving && (setPwAdjustOpen(false), setPwAdjustWalletId(""), setPwAdjustAmount(""), setPwAdjustNotes(""), setPwAdjustError(""))} disabled={pwAdjustSaving}>Cancel</button>
              <button type="button" className="jw-adminUsersModal__btn is-green" disabled={pwAdjustSaving} onClick={async () => {
                const walletId = pwAdjustWalletId ? Number(pwAdjustWalletId) : 0;
                const amt = Number(pwAdjustAmount);
                if (!walletId) { setPwAdjustError("Please select a payment wallet."); return; }
                if (!Number.isFinite(amt) || amt <= 0) { setPwAdjustError("Enter a valid amount."); return; }
                setPwAdjustSaving(true); setPwAdjustError("");
                const endpoint = pwAdjustType === "topup" ? "topup" : "deduct";
                try {
                  const res = await fetch(`/api/admin/payment-wallets/${walletId}/${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(localStorage.getItem("token") ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}) },
                    body: JSON.stringify({ amount: amt, notes: pwAdjustNotes || undefined }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) { setPwAdjustError(data?.message || "Failed."); setPwAdjustSaving(false); return; }
                  setPwRows((prev) => prev.map((r) => (r.id === walletId ? { ...r, balance: data.balance } : r)));
                  fetchAdminAccountBalance();
                  setPwAdjustOpen(false); setPwAdjustWalletId(""); setPwAdjustAmount(""); setPwAdjustNotes(""); setPwAdjustSaving(false);
                } catch { setPwAdjustError("Failed."); setPwAdjustSaving(false); }
              }}>{pwAdjustSaving ? "..." : pwAdjustType === "topup" ? "Top Up" : "Deduct"}</button>
            </div>
          </div>
        </div>
      )}

      {/* QR popup */}
      {qrPopup.open && qrPopup.src && (
        <div className="jw-adminImagePopupOverlay" onClick={() => setQrPopup({ open: false, src: null, name: "" })} role="dialog" aria-modal="true">
          <div className="jw-adminImagePopup" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="jw-adminImagePopupClose" onClick={() => setQrPopup({ open: false, src: null, name: "" })} aria-label="Close"><X size={24} /></button>
            {qrPopup.name && <div className="jw-adminImagePopupTitle">{qrPopup.name}</div>}
            <img src={qrPopup.src} alt="QR" className="jw-adminImagePopupImg" style={{ maxWidth: 280, maxHeight: 280 }} />
          </div>
        </div>
      )}
    </>
  );
}

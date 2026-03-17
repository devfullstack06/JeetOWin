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
import "../Wallets/walletsPage.css";
import "./brandsPage.css";

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

function ImagePopupModal({ open, src, name, onClose }) {
  const [imgError, setImgError] = useState(false);
  React.useEffect(() => {
    if (open && src) setImgError(false);
  }, [open, src]);
  if (!open || !src) return null;
  return (
    <div className="jw-adminImagePopupOverlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Brand image">
      <div className="jw-adminImagePopup" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="jw-adminImagePopupClose" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>
        {name ? <div className="jw-adminImagePopupTitle">{name}</div> : null}
        {imgError ? (
          <div className="jw-adminImagePopupError">Image not found.</div>
        ) : (
          <img src={src} alt={name || "Brand"} className="jw-adminImagePopupImg" onError={() => setImgError(true)} />
        )}
      </div>
    </div>
  );
}

function WebsiteBrandsTable({ rows, sort, onSort, onEdit, onImageClick, loading }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";
  const cols = [
    { key: "name", header: "Name", sortKey: "name" },
    { key: "accounts", header: "Accounts", sortKey: "accounts" },
    { key: "home", header: "Home", sortKey: "home" },
    { key: "sortOrder", header: "Sort Order", sortKey: "sortOrder" },
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
                <th key={c.key} onClick={() => sortable && onSort?.(c.sortKey)} role={sortable ? "button" : undefined}>
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
              const hasImage = r.iconPath || r.iconSvg;
              return (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.forAccountsYesNo ?? (r.forAccounts ? "Yes" : "No")}</td>
                  <td>{r.forHomeYesNo ?? (r.forHome ? "Yes" : "No")}</td>
                  <td>{r.sortOrder !== undefined && r.sortOrder !== null ? r.sortOrder : "—"}</td>
                  <td>
                    {hasImage ? (
                      <button type="button" className="jw-adminCompaniesImageLink" onClick={() => onImageClick?.(r)}>
                        image
                      </button>
                    ) : (
                      <span className="jw-adminCompaniesImagePlaceholder">—</span>
                    )}
                  </td>
                  <td className="jw-adminTd__actions">
                    <button type="button" className="jw-adminEditBtn" title="Edit" onClick={() => onEdit?.(r)}>
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

const ICON_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ICON_SIZE_ERROR_MSG = "Icon file must be 2MB or smaller.";

function CreateBrandModal({ open, form, saving, errorText, onChange, onIconFileSelect, onCancel, onConfirm, iconFile, iconSizeError }) {
  const fileInputRef = React.useRef(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  React.useEffect(() => {
    if (!iconFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(iconFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);
  if (!open) return null;
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onIconFileSelect?.(file);
    onChange("iconSvg", "selected");
  };
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onCancel}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create Brand">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Create Brand</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Name</label>
            <input className="jw-adminUsersModal__input" value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Please Enter" />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Available for Accounts</label>
            <select className="jw-adminUsersModal__input" value={form.availableAccounts} onChange={(e) => onChange("availableAccounts", e.target.value)}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Available for Home</label>
            <select className="jw-adminUsersModal__input" value={form.availableHome} onChange={(e) => onChange("availableHome", e.target.value)}>
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
              placeholder="Leave empty for auto"
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Image (SVG)</label>
            <input ref={fileInputRef} type="file" accept=".svg" className="jw-adminUsersModal__input" onChange={handleFileChange} />
            {form.iconSvg ? <span className="jw-adminCompaniesFileOk">SVG selected</span> : null}
            {iconFile ? (
              <div className="jw-adminCompaniesFileInfo">
                {previewUrl ? <img src={previewUrl} alt="" className="jw-adminCompaniesFilePreview" /> : null}
                <span className="jw-adminCompaniesFileName">{iconFile.name}</span>
                <span className="jw-adminUsersModal__hint">{(iconFile.size / 1024).toFixed(1)} KB</span>
                {iconSizeError ? <div className="jw-adminUsersModal__error">{ICON_SIZE_ERROR_MSG}</div> : null}
              </div>
            ) : null}
          </div>
          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onConfirm} disabled={saving || iconSizeError}>
            {saving ? "Creating..." : "Create +"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditBrandModal({ open, brand, form, saving, errorText, onChange, onIconFileSelect, onCancel, onConfirm, iconFile, iconSizeError }) {
  const fileInputRef = React.useRef(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  React.useEffect(() => {
    if (!iconFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(iconFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);
  if (!open || !brand) return null;
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onIconFileSelect?.(file);
    onChange("iconSvg", "selected");
  };
  return (
    <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={onCancel}>
      <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit Brand">
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Edit Brand</div>
        </div>
        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Name</label>
            <input className="jw-adminUsersModal__input is-readonly" value={brand.name || ""} readOnly />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Available for Accounts</label>
            <select className="jw-adminUsersModal__input" value={form.availableAccounts} onChange={(e) => onChange("availableAccounts", e.target.value)}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Available for Home</label>
            <select className="jw-adminUsersModal__input" value={form.availableHome} onChange={(e) => onChange("availableHome", e.target.value)}>
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
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Image (SVG)</label>
            <input ref={fileInputRef} type="file" accept=".svg" className="jw-adminUsersModal__input" onChange={handleFileChange} />
            {form.iconSvg ? <span className="jw-adminCompaniesFileOk">New SVG selected</span> : brand.iconPath ? <span className="jw-adminCompaniesFileOk">Current image on file</span> : null}
            {iconFile ? (
              <div className="jw-adminCompaniesFileInfo">
                {previewUrl ? <img src={previewUrl} alt="" className="jw-adminCompaniesFilePreview" /> : null}
                <span className="jw-adminCompaniesFileName">{iconFile.name}</span>
                <span className="jw-adminUsersModal__hint">{(iconFile.size / 1024).toFixed(1)} KB</span>
                {iconSizeError ? <div className="jw-adminUsersModal__error">{ICON_SIZE_ERROR_MSG}</div> : null}
              </div>
            ) : null}
          </div>
          {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
        </div>
        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onConfirm} disabled={saving || iconSizeError}>{saving ? "Saving..." : "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "website", label: "Website" },
  { key: "master", label: "Master" },
];

export default function BrandsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    const p = location.pathname;
    if (p.includes("/brands/website")) return "website";
    if (p.includes("/brands/company") || p.includes("/brands/master")) return "master";
    return "website";
  }, [location.pathname]);

  const [filters, setFilters] = useState({ name: "", availability: "" });
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState({ key: "sortOrder", dir: "asc" });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", availableAccounts: "yes", availableHome: "yes", sortOrder: "", iconSvg: "" });
  const [createIconFile, setCreateIconFile] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editForm, setEditForm] = useState({ availableAccounts: "yes", availableHome: "yes", sortOrder: "", iconSvg: "" });
  const [editIconFile, setEditIconFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [imagePopup, setImagePopup] = useState({ open: false, src: null, name: "" });

  const fetchBrands = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setErrorText("");
    const sortKeyMap = { name: "name", accounts: "accounts", home: "home", sortOrder: "sortOrder" };
    const apiSortKey = sortKeyMap[sort.key] || "sortOrder";
    const query = buildQuery({
      name: applied.name,
      availability: applied.availability,
      page,
      pageSize,
      sortKey: apiSortKey,
      sortDir: sort.dir,
    });
    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/brands?${query}`, {
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
        if (!ignore) setRows([]), setTotal(0), setErrorText("Unable to load brands.");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [applied, page, pageSize, sort]);

  useEffect(() => {
    if (activeTab !== "website") return;
    fetchBrands();
  }, [activeTab, fetchBrands]);

  const displayRows = useMemo(() => {
    if (loading) return [{ id: "loading-row" }];
    if (!loading && rows.length === 0) return [{ id: "empty-row" }];
    return rows;
  }, [rows, loading]);

  const onSubmit = () => { setApplied(filters); setPage(1); };
  const onClear = () => { setFilters({ name: "", availability: "" }); };
  const onSort = (sortKey) => {
    setSort((s) => (s.key !== sortKey ? { key: sortKey, dir: "asc" } : { key: sortKey, dir: s.dir === "asc" ? "desc" : "asc" }));
    setPage(1);
  };

  const openCreate = () => {
    setCreateForm({ name: "", availableAccounts: "yes", availableHome: "yes", sortOrder: "", iconSvg: "" });
    setCreateIconFile(null);
    setCreateError("");
    setCreateOpen(true);
  };
  const closeCreate = () => { if (!createSaving) setCreateOpen(false); };
  const handleCreateChange = (key, value) => { setCreateForm((prev) => ({ ...prev, [key]: value })); setCreateError(""); };

  const handleCreateConfirm = async () => {
    if (!createForm.name.trim()) { setCreateError("Name is required."); return; }
    setCreateSaving(true);
    setCreateError("");
    const token = localStorage.getItem("token") || "";
    try {
      let res;
      if (createIconFile) {
        const formData = new FormData();
        formData.append("name", createForm.name.trim());
        formData.append("availableAccounts", createForm.availableAccounts);
        formData.append("availableHome", createForm.availableHome);
        if (createForm.sortOrder !== "" && createForm.sortOrder !== undefined) formData.append("sortOrder", String(createForm.sortOrder));
        formData.append("icon", createIconFile);
        res = await fetch("/api/admin/brands", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        res = await fetch("/api/admin/brands", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            name: createForm.name.trim(),
            availableAccounts: createForm.availableAccounts,
            availableHome: createForm.availableHome,
            sortOrder: createForm.sortOrder !== "" && createForm.sortOrder !== undefined ? Number(createForm.sortOrder) : undefined,
            iconSvg: createForm.iconSvg && createForm.iconSvg !== "selected" ? createForm.iconSvg : undefined,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCreateError(data?.message || "Failed to create."); setCreateSaving(false); return; }
      setCreateOpen(false);
      setCreateIconFile(null);
      setCreateSaving(false);
      fetchBrands();
    } catch {
      setCreateError("Failed to create brand.");
      setCreateSaving(false);
    }
  };

  const openEdit = (row) => {
    setEditingBrand(row);
    setEditForm({
      availableAccounts: row.forAccounts ? "yes" : "no",
      availableHome: row.forHome ? "yes" : "no",
      sortOrder: row.sortOrder !== undefined && row.sortOrder !== null ? row.sortOrder : "",
      iconSvg: "",
    });
    setEditIconFile(null);
    setEditError("");
    setEditOpen(true);
  };
  const closeEdit = () => { if (!editSaving) setEditOpen(false), setEditingBrand(null); };
  const handleEditChange = (key, value) => { setEditForm((prev) => ({ ...prev, [key]: value })); setEditError(""); };

  const handleEditConfirm = async () => {
    if (!editingBrand?.id) return;
    setEditSaving(true);
    setEditError("");
    const token = localStorage.getItem("token") || "";
    try {
      let res;
      if (editIconFile) {
        const formData = new FormData();
        formData.append("availableAccounts", editForm.availableAccounts);
        formData.append("availableHome", editForm.availableHome);
        if (editForm.sortOrder !== "" && editForm.sortOrder !== undefined && editForm.sortOrder !== null) formData.append("sortOrder", String(editForm.sortOrder));
        formData.append("icon", editIconFile);
        res = await fetch(`/api/admin/brands/${editingBrand.id}`, {
          method: "PATCH",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        const body = { availableAccounts: editForm.availableAccounts, availableHome: editForm.availableHome };
        if (editForm.sortOrder !== "" && editForm.sortOrder !== undefined && editForm.sortOrder !== null) body.sortOrder = Number(editForm.sortOrder);
        if (editForm.iconSvg && editForm.iconSvg.trim() && editForm.iconSvg !== "selected") body.iconSvg = editForm.iconSvg;
        res = await fetch(`/api/admin/brands/${editingBrand.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setEditError(data?.message || "Failed to update."); setEditSaving(false); return; }
      const updated = data?.item;
      if (updated) setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setEditOpen(false);
      setEditingBrand(null);
      setEditIconFile(null);
      setEditSaving(false);
    } catch {
      setEditError("Failed to update.");
      setEditSaving(false);
    }
  };

  const openImagePopup = (row) => {
    const src = getWalletIconUrl(row);
    if (src) setImagePopup({ open: true, src, name: row.name || "" });
  };

  const websiteFilters = (
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
          <option value="accounts">Accounts</option>
          <option value="home">Home</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={openCreate}>
          <span className="jw-adminCreateBtnInner">Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} /></span>
        </AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <>
      <AdminPageShell
        title="Brands"
        tabs={<AdminTabs tabs={TABS} activeKey={activeTab} onChange={(key) => navigate(key === "master" ? "/admin/brands/company" : "/admin/brands/website")} />}
        filters={activeTab === "website" ? websiteFilters : null}
        table={
          activeTab === "website" ? (
            <>
              {errorText && !loading ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
              <WebsiteBrandsTable
                rows={displayRows}
                sort={sort}
                onSort={onSort}
                onEdit={openEdit}
                onImageClick={openImagePopup}
                loading={loading}
              />
            </>
          ) : (
            <div className="jw-adminBrandsPlaceholder">Master — Coming soon.</div>
          )
        }
        pagination={
          activeTab === "website" ? (
            <AdminPagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            />
          ) : null
        }
      />
      <CreateBrandModal
        open={createOpen}
        form={createForm}
        saving={createSaving}
        errorText={createError}
        onChange={handleCreateChange}
        onIconFileSelect={setCreateIconFile}
        onCancel={closeCreate}
        onConfirm={handleCreateConfirm}
        iconFile={createIconFile}
        iconSizeError={!!(createIconFile && createIconFile.size > ICON_MAX_BYTES)}
      />
      <EditBrandModal
        open={editOpen}
        brand={editingBrand}
        form={editForm}
        saving={editSaving}
        errorText={editError}
        onChange={handleEditChange}
        onIconFileSelect={setEditIconFile}
        onCancel={closeEdit}
        onConfirm={handleEditConfirm}
        iconFile={editIconFile}
        iconSizeError={!!(editIconFile && editIconFile.size > ICON_MAX_BYTES)}
      />
      <ImagePopupModal open={imagePopup.open} src={imagePopup.src} name={imagePopup.name} onClose={() => setImagePopup({ open: false, src: null, name: "" })} />
    </>
  );
}

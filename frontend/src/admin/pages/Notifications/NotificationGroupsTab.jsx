import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
  AdminButton,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import { formatAdminDateTime } from "../../utils/adminDateUtils";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";
import "../Wallets/walletsPage.css";
import "./notificationGroupsTab.css";

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  return search.toString();
}

const GROUP_NAME_CHAR_RE = /[A-Za-z0-9]/;

function sanitizeGroupNameInput(value) {
  return String(value || "")
    .split("")
    .filter((ch) => GROUP_NAME_CHAR_RE.test(ch))
    .join("");
}

function SortIcon({ dir }) {
  return (
    <span className={`jw-adminSortIcon ${dir ? "is-on" : ""}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M4 2 L6 0 L8 2 Z" fill={dir === "asc" ? "#333" : "#bbb"} />
        <path d="M4 10 L6 12 L8 10 Z" fill={dir === "desc" ? "#333" : "#bbb"} />
      </svg>
    </span>
  );
}

function EditIconSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#15a84b"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
      />
    </svg>
  );
}

function GroupsTable({ rows, sort, onSort, onEdit, loading }) {
  const isLoading = loading || (rows.length === 1 && rows[0]?.id === "loading-row");
  const isEmpty = !loading && rows.length === 1 && rows[0]?.id === "empty-row";
  const cols = [
    { key: "name", header: "Group Name", sortKey: "name" },
    { key: "members", header: "Members", sortKey: "members" },
    { key: "status", header: "Status", sortKey: "status" },
    { key: "updatedAt", header: "Updated at", sortKey: "updatedAt" },
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
                    {sortable ? <SortIcon dir={dir} /> : null}
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
                <td colSpan={5}>
                  <div className="jw-adminSkeleton" style={{ height: 20 }} />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={5} className="jw-adminEmpty">
                No groups found
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name || "—"}</td>
                <td>{r.memberCount ?? 0}</td>
                <td>
                  <span
                    className={`jw-adminStatus ${
                      r.status === "Active" ? "is-active" : "is-inactive"
                    }`}
                  >
                    {r.status || "—"}
                  </span>
                </td>
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

function ClientMultiPicker({
  label = "Group members (search by username)",
  countLabel = "Selected clients",
  selected,
  onAdd,
  onRemove,
  disabled,
  hint,
}) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    const query = q.trim();
    if (!query) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debRef.current = setTimeout(() => {
      setLoading(true);
      const token = localStorage.getItem("token") || "";
      fetch(`/api/admin/users?${buildQuery({ username: query, page: 1, pageSize: 20 })}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          setOptions(Array.isArray(data.items) ? data.items : []);
          setOpen(true);
        })
        .catch(() => {
          setOptions([]);
          setOpen(false);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [q]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.userId)), [selected]);

  return (
    <div className="jw-adminUsersModal__field" ref={wrapRef}>
      <label className="jw-adminUsersModal__label">{label}</label>
      <div className="jw-adminNgModalPickerSearch">
        <AdminInput
          value={q}
          onChange={(v) => setQ(v)}
          placeholder="Type username…"
          disabled={disabled}
        />
        {open && options.length > 0 ? (
          <div className="jw-adminNgUserDropdown jw-adminNgUserDropdown--modalPicker">
            {options.map((u) => (
              <button
                key={u.id}
                type="button"
                className="jw-adminNgUserDropdown__row"
                disabled={selectedIds.has(u.id)}
                onClick={() => {
                  if (selectedIds.has(u.id)) return;
                  onAdd?.({ userId: u.id, username: u.username, name: u.name || "" });
                  setQ("");
                  setOpen(false);
                }}
              >
                <span className="jw-adminNgUserDropdown__name">{u.username}</span>
                <span className="jw-adminNgUserDropdown__sub">{u.name || "—"}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {loading ? <div className="jw-adminUsersModal__hint">Searching…</div> : null}
      <div className="jw-adminNgSelectedWrap">
        {selected.map((s) => (
          <span key={s.userId} className="jw-adminNgChip">
            <span>{s.username}</span>
            <button
              type="button"
              className="jw-adminNgChipRemove"
              aria-label={`Remove ${s.username}`}
              disabled={disabled}
              onClick={() => onRemove?.(s.userId)}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className="jw-adminUsersModal__hint">
        {countLabel}: {selected.length}
        {hint ? ` — ${hint}` : ""}
      </div>
    </div>
  );
}

function UsernamesViewModal({ open, onClose, members, totalCount, truncated }) {
  if (!open) return null;
  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader jw-adminNgDetailsOverlay"
      role="presentation"
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
        style={{ maxWidth: 420 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jw-admin-ng-usernames-title"
      >
        <div className="jw-adminUsersModal__header jw-adminNgModalHeader">
          <div className="jw-adminUsersModal__title" id="jw-admin-ng-usernames-title">
            Selected users ({totalCount})
          </div>
          <button type="button" className="jw-adminNgModalClose" onClick={onClose} aria-label="Close">
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="jw-adminUsersModal__body">
          {truncated ? (
            <div className="jw-adminUsersModal__hint" style={{ marginBottom: 10 }}>
              Showing the first {members.length} usernames. The full list is stored when you create the group.
            </div>
          ) : null}
          <ul className="jw-adminNgUsernameList">
            {members.map((m) => (
              <li key={m.userId}>{m.username || `User #${m.userId}`}</li>
            ))}
          </ul>
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

function useGroupAudienceEditor({ metaOpen, resolveOpen }) {
  const [audienceType, setAudienceType] = useState("all");
  const [excludeUsers, setExcludeUsers] = useState([]);
  const [includeUsers, setIncludeUsers] = useState([]);
  const [customCriteria, setCustomCriteria] = useState([]);
  const [criteriaKind, setCriteriaKind] = useState("brand");
  const [criteriaPickId, setCriteriaPickId] = useState("");
  const [brandOptions, setBrandOptions] = useState([]);
  const [walletOptions, setWalletOptions] = useState([]);
  const [resolveCount, setResolveCount] = useState(0);
  const [resolveMembers, setResolveMembers] = useState([]);
  const [resolveTruncated, setResolveTruncated] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [viewUsernamesOpen, setViewUsernamesOpen] = useState(false);

  const resetAll = useCallback(() => {
    setAudienceType("all");
    setExcludeUsers([]);
    setIncludeUsers([]);
    setCustomCriteria([]);
    setCriteriaKind("brand");
    setCriteriaPickId("");
    setResolveCount(0);
    setResolveMembers([]);
    setResolveTruncated(false);
    setResolveError("");
    setViewUsernamesOpen(false);
  }, []);

  const applySeedFromMembers = useCallback((apiMembers) => {
    const users = (apiMembers || []).map((m) => ({
      userId: m.userId,
      username: m.username || "",
      name: m.fullName != null ? String(m.fullName) : m.name != null ? String(m.name) : "",
    }));
    setAudienceType("selected");
    setIncludeUsers(users);
    setExcludeUsers([]);
    setCustomCriteria([]);
    setCriteriaKind("brand");
    setCriteriaPickId("");
    setViewUsernamesOpen(false);
  }, []);

  useEffect(() => {
    if (!metaOpen) return;
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/notification-groups/audience/brands", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => setBrandOptions(Array.isArray(data.items) ? data.items : []))
      .catch(() => setBrandOptions([]));
    fetch("/api/admin/notification-groups/audience/wallet-companies", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => setWalletOptions(Array.isArray(data.items) ? data.items : []))
      .catch(() => setWalletOptions([]));
  }, [metaOpen]);

  const audiencePayload = useMemo(() => {
    const excludeUserIds = excludeUsers.map((u) => u.userId);
    const base = { type: audienceType, excludeUserIds };
    if (audienceType === "selected") {
      return { ...base, includeUserIds: includeUsers.map((u) => u.userId) };
    }
    if (audienceType === "custom") {
      return {
        ...base,
        customCriteria: customCriteria.map((c) => ({ kind: c.kind, id: c.id })),
      };
    }
    return base;
  }, [audienceType, excludeUsers, includeUsers, customCriteria]);

  useEffect(() => {
    if (!resolveOpen) return;
    setResolveLoading(true);
    setResolveError("");
    const t = window.setTimeout(() => {
      const token = localStorage.getItem("token") || "";
      fetch("/api/admin/notification-groups/audience/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(audiencePayload),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setResolveCount(0);
            setResolveMembers([]);
            setResolveTruncated(false);
            setResolveError(String(data?.message || "Could not load audience preview."));
            return;
          }
          setResolveError("");
          setResolveCount(Number(data.count) || 0);
          setResolveMembers(Array.isArray(data.members) ? data.members : []);
          setResolveTruncated(!!data.membersTruncated);
        })
        .catch(() => {
          setResolveCount(0);
          setResolveMembers([]);
          setResolveTruncated(false);
          setResolveError("Could not load audience preview.");
        })
        .finally(() => setResolveLoading(false));
    }, 380);
    return () => window.clearTimeout(t);
  }, [resolveOpen, audiencePayload]);

  const addCriterion = useCallback(() => {
    const id = Number(criteriaPickId);
    if (!Number.isInteger(id) || id <= 0) return;
    const kind = criteriaKind === "wallet" ? "wallet" : "brand";
    const opts = kind === "brand" ? brandOptions : walletOptions;
    const row = opts.find((o) => Number(o.id) === id);
    const labelName = row?.name || (kind === "brand" ? `Brand #${id}` : `Wallet #${id}`);
    setCustomCriteria((prev) => {
      if (prev.some((c) => c.kind === kind && c.id === id)) return prev;
      return [...prev, { key: `${kind}-${id}`, kind, id, name: labelName }];
    });
    setCriteriaPickId("");
  }, [criteriaPickId, criteriaKind, brandOptions, walletOptions]);

  const removeCriterion = useCallback((key) => {
    setCustomCriteria((prev) => prev.filter((c) => c.key !== key));
  }, []);

  const entityOptions = useMemo(
    () => (criteriaKind === "brand" ? brandOptions : walletOptions),
    [criteriaKind, brandOptions, walletOptions],
  );

  return {
    audienceType,
    setAudienceType,
    excludeUsers,
    setExcludeUsers,
    includeUsers,
    setIncludeUsers,
    customCriteria,
    setCustomCriteria,
    criteriaKind,
    setCriteriaKind,
    criteriaPickId,
    setCriteriaPickId,
    brandOptions,
    walletOptions,
    resolveCount,
    resolveMembers,
    resolveTruncated,
    resolveLoading,
    resolveError,
    viewUsernamesOpen,
    setViewUsernamesOpen,
    audiencePayload,
    addCriterion,
    removeCriterion,
    entityOptions,
    resetAll,
    applySeedFromMembers,
  };
}

function GroupAudienceFieldset({
  radioGroupName,
  disabled,
  audienceType,
  setAudienceType,
  excludeUsers,
  setExcludeUsers,
  includeUsers,
  setIncludeUsers,
  customCriteria,
  criteriaKind,
  setCriteriaKind,
  criteriaPickId,
  setCriteriaPickId,
  entityOptions,
  addCriterion,
  removeCriterion,
  resolveCount,
  resolveLoading,
  resolveError,
  onOpenView,
}) {
  return (
    <>
      <fieldset className="jw-adminNgAudience">
        <legend className="jw-adminUsersModal__label jw-adminNgAudience__legend">Select audience</legend>

        <label className="jw-adminNgAudience__radio">
          <input
            type="radio"
            name={radioGroupName}
            checked={audienceType === "all"}
            onChange={() => setAudienceType("all")}
            disabled={disabled}
          />
          <span>All users</span>
        </label>
        {audienceType === "all" ? (
          <div className="jw-adminNgAudience__block">
            <div className="jw-adminNgAudience__details">
              <span>Selected users details: {resolveLoading ? "…" : resolveCount}</span>
              <button
                type="button"
                className="jw-adminNgAudience__viewBtn"
                disabled={disabled || resolveLoading || resolveCount === 0}
                onClick={onOpenView}
              >
                View
              </button>
            </div>
            <ClientMultiPicker
              label="Exclude users"
              countLabel="Excluded users"
              selected={excludeUsers}
              onAdd={(m) => setExcludeUsers((prev) => [...prev, m])}
              onRemove={(id) => setExcludeUsers((prev) => prev.filter((x) => x.userId !== id))}
              disabled={disabled}
              hint="Search by username; excluded users are removed from the audience count."
            />
          </div>
        ) : null}

        <label className="jw-adminNgAudience__radio">
          <input
            type="radio"
            name={radioGroupName}
            checked={audienceType === "custom"}
            onChange={() => setAudienceType("custom")}
            disabled={disabled}
          />
          <span>Custom audience</span>
        </label>
        {audienceType === "custom" ? (
          <div className="jw-adminNgAudience__block">
            <div className="jw-adminNgAudience__details">
              <span>Selected users details: {resolveLoading ? "…" : resolveCount}</span>
              <button
                type="button"
                className="jw-adminNgAudience__viewBtn"
                disabled={disabled || resolveLoading || resolveCount === 0}
                onClick={onOpenView}
              >
                View
              </button>
            </div>
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Select type</label>
              <select
                className="jw-adminUsersModal__input"
                value={criteriaKind}
                onChange={(e) => {
                  setCriteriaKind(e.target.value === "wallet" ? "wallet" : "brand");
                  setCriteriaPickId("");
                }}
                disabled={disabled}
              >
                <option value="brand">Brand</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>
            <div className="jw-adminUsersModal__field jw-adminNgAudience__addRow">
              <label className="jw-adminUsersModal__label">{criteriaKind === "brand" ? "Select brand" : "Select wallet"}</label>
              <div className="jw-adminNgAudience__addRowInner">
                <select
                  className="jw-adminUsersModal__input"
                  value={criteriaPickId}
                  onChange={(e) => setCriteriaPickId(e.target.value)}
                  disabled={disabled}
                >
                  <option value="">Choose…</option>
                  {entityOptions.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="jw-adminUsersModal__btn is-light" onClick={addCriterion} disabled={disabled || !criteriaPickId}>
                  Add
                </button>
              </div>
              <div className="jw-adminUsersModal__hint">
                Add one or more brands or wallets; clients matching any selection are included (each username counted once).
              </div>
            </div>
            {customCriteria.length > 0 ? (
              <div className="jw-adminNgSelectedWrap" style={{ marginBottom: 12 }}>
                {customCriteria.map((c) => (
                  <span key={c.key} className="jw-adminNgChip">
                    <span>
                      {c.kind === "brand" ? "Brand" : "Wallet"}: {c.name}
                    </span>
                    <button
                      type="button"
                      className="jw-adminNgChipRemove"
                      aria-label={`Remove ${c.name}`}
                      disabled={disabled}
                      onClick={() => removeCriterion(c.key)}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <ClientMultiPicker
              label="Exclude users"
              countLabel="Excluded users"
              selected={excludeUsers}
              onAdd={(m) => setExcludeUsers((prev) => [...prev, m])}
              onRemove={(id) => setExcludeUsers((prev) => prev.filter((x) => x.userId !== id))}
              disabled={disabled}
              hint="Excluded users are removed from the custom audience count."
            />
          </div>
        ) : null}

        <label className="jw-adminNgAudience__radio">
          <input
            type="radio"
            name={radioGroupName}
            checked={audienceType === "selected"}
            onChange={() => setAudienceType("selected")}
            disabled={disabled}
          />
          <span>Selected users</span>
        </label>
        {audienceType === "selected" ? (
          <div className="jw-adminNgAudience__block">
            <div className="jw-adminNgAudience__details">
              <span>Selected users details: {resolveLoading ? "…" : resolveCount}</span>
              <button
                type="button"
                className="jw-adminNgAudience__viewBtn"
                disabled={disabled || resolveLoading || resolveCount === 0}
                onClick={onOpenView}
              >
                View
              </button>
            </div>
            <ClientMultiPicker
              label="Select users"
              countLabel="Included users"
              selected={includeUsers}
              onAdd={(m) => setIncludeUsers((prev) => [...prev, m])}
              onRemove={(id) => setIncludeUsers((prev) => prev.filter((x) => x.userId !== id))}
              disabled={disabled}
              hint="Search by username to add clients to this group."
            />
            <ClientMultiPicker
              label="Exclude users"
              countLabel="Excluded users"
              selected={excludeUsers}
              onAdd={(m) => setExcludeUsers((prev) => [...prev, m])}
              onRemove={(id) => setExcludeUsers((prev) => prev.filter((x) => x.userId !== id))}
              disabled={disabled}
              hint="Optional: remove users from the selection above."
            />
          </div>
        ) : null}
      </fieldset>

      {resolveError ? (
        <div className="jw-adminUsersModal__hint is-error" style={{ color: "#c62828" }}>
          {resolveError}
        </div>
      ) : null}
    </>
  );
}

function CreateGroupModal({ open, onClose, onSaved, groupNameHint }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const au = useGroupAudienceEditor({
    metaOpen: open,
    resolveOpen: open,
  });

  useEffect(() => {
    if (!open) return;
    setName("");
    setErrorText("");
    au.resetAll();
  }, [open, au.resetAll]);

  const onNameChange = (v) => {
    setName(sanitizeGroupNameInput(v));
  };

  const submit = async () => {
    setErrorText("");
    if (!/^[A-Za-z0-9]+$/.test(name)) {
      setErrorText("Group name: letters and digits only (no spaces or symbols).");
      return;
    }
    setSaving(true);
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch("/api/admin/notification-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name, audience: au.audiencePayload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(data?.message || "Failed to create group.");
        setSaving(false);
        return;
      }
      onSaved?.(data.item);
      onClose?.();
    } catch {
      setErrorText("Failed to create group.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" role="presentation">
        <div
          className="jw-adminUsersModal jw-adminUsersModal--scrollable jw-adminUsersModal--ngForm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jw-admin-ng-create-title"
        >
          <div className="jw-adminUsersModal__header jw-adminNgModalHeader">
            <div className="jw-adminUsersModal__title" id="jw-admin-ng-create-title">
              Create notification group
            </div>
            <button type="button" className="jw-adminNgModalClose" onClick={onClose} aria-label="Close">
              <X size={22} strokeWidth={2} />
            </button>
          </div>
          <div className="jw-adminUsersModal__body">
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Group name</label>
              <input
                className="jw-adminUsersModal__input"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Alphanumeric only"
                disabled={saving}
              />
              {groupNameHint ? <div className="jw-adminUsersModal__hint">{groupNameHint}</div> : null}
            </div>

            <GroupAudienceFieldset
              radioGroupName="jw-ng-audience-create"
              disabled={saving}
              audienceType={au.audienceType}
              setAudienceType={au.setAudienceType}
              excludeUsers={au.excludeUsers}
              setExcludeUsers={au.setExcludeUsers}
              includeUsers={au.includeUsers}
              setIncludeUsers={au.setIncludeUsers}
              customCriteria={au.customCriteria}
              criteriaKind={au.criteriaKind}
              setCriteriaKind={au.setCriteriaKind}
              criteriaPickId={au.criteriaPickId}
              setCriteriaPickId={au.setCriteriaPickId}
              entityOptions={au.entityOptions}
              addCriterion={au.addCriterion}
              removeCriterion={au.removeCriterion}
              resolveCount={au.resolveCount}
              resolveLoading={au.resolveLoading}
              resolveError={au.resolveError}
              onOpenView={() => au.setViewUsernamesOpen(true)}
            />

            {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
          </div>
          <div className="jw-adminUsersModal__actions">
            <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="jw-adminUsersModal__btn is-green" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </div>
      </div>
      <UsernamesViewModal
        open={au.viewUsernamesOpen}
        onClose={() => au.setViewUsernamesOpen(false)}
        members={au.resolveMembers}
        totalCount={au.resolveCount}
        truncated={au.resolveTruncated}
      />
    </>
  );
}

function EditGroupModal({ open, groupId, onClose, onSaved, groupNameHint }) {
  const [name, setName] = useState("");
  const [statusRaw, setStatusRaw] = useState("active");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const au = useGroupAudienceEditor({
    metaOpen: open && !!groupId,
    resolveOpen: open && !!groupId && !loading,
  });

  useEffect(() => {
    if (!open || !groupId) return;
    let ignore = false;
    setErrorText("");
    au.resetAll();
    setLoading(true);
    const token = localStorage.getItem("token") || "";
    const gid = groupId;
    fetch(`/api/admin/notification-groups/${gid}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        const it = data.item;
        if (!it) throw new Error("empty");
        setName(it.name || "");
        setStatusRaw(it.statusRaw === "inactive" ? "inactive" : "active");
        au.applySeedFromMembers(it.members || []);
      })
      .catch(() => {
        if (!ignore) {
          setErrorText("Failed to load group.");
          setName("");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [open, groupId, au.resetAll, au.applySeedFromMembers]);

  const onNameChange = (v) => {
    setName(sanitizeGroupNameInput(v));
  };

  const submit = async () => {
    setErrorText("");
    if (!/^[A-Za-z0-9]+$/.test(name)) {
      setErrorText("Group name: letters and digits only (no spaces or symbols).");
      return;
    }
    setSaving(true);
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`/api/admin/notification-groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name,
          statusRaw,
          audience: au.audiencePayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(data?.message || "Failed to update group.");
        setSaving(false);
        return;
      }
      onSaved?.(data.item);
      onClose?.();
    } catch {
      setErrorText("Failed to update group.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !groupId) return null;

  return (
    <>
      <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" role="presentation">
        <div className="jw-adminUsersModal jw-adminUsersModal--scrollable jw-adminUsersModal--ngForm" role="dialog" aria-modal="true" aria-labelledby="jw-admin-ng-edit-title">
          <div className="jw-adminUsersModal__header jw-adminNgModalHeader">
            <div className="jw-adminUsersModal__title" id="jw-admin-ng-edit-title">
              Edit notification group
            </div>
            <button type="button" className="jw-adminNgModalClose" onClick={onClose} aria-label="Close">
              <X size={22} strokeWidth={2} />
            </button>
          </div>
          <div className="jw-adminUsersModal__body">
            {loading ? (
              <div className="jw-adminUserViewLoading">Loading…</div>
            ) : (
              <>
                <div className="jw-adminUsersModal__field">
                  <label className="jw-adminUsersModal__label">Group name</label>
                  <input className="jw-adminUsersModal__input" value={name} onChange={(e) => onNameChange(e.target.value)} disabled={saving} />
                  {groupNameHint ? <div className="jw-adminUsersModal__hint">{groupNameHint}</div> : null}
                </div>
                <div className="jw-adminUsersModal__field">
                  <label className="jw-adminUsersModal__label">Status</label>
                  <select className="jw-adminUsersModal__input" value={statusRaw} onChange={(e) => setStatusRaw(e.target.value)} disabled={saving}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <GroupAudienceFieldset
                  radioGroupName="jw-ng-audience-edit"
                  disabled={saving}
                  audienceType={au.audienceType}
                  setAudienceType={au.setAudienceType}
                  excludeUsers={au.excludeUsers}
                  setExcludeUsers={au.setExcludeUsers}
                  includeUsers={au.includeUsers}
                  setIncludeUsers={au.setIncludeUsers}
                  customCriteria={au.customCriteria}
                  criteriaKind={au.criteriaKind}
                  setCriteriaKind={au.setCriteriaKind}
                  criteriaPickId={au.criteriaPickId}
                  setCriteriaPickId={au.setCriteriaPickId}
                  entityOptions={au.entityOptions}
                  addCriterion={au.addCriterion}
                  removeCriterion={au.removeCriterion}
                  resolveCount={au.resolveCount}
                  resolveLoading={au.resolveLoading}
                  resolveError={au.resolveError}
                  onOpenView={() => au.setViewUsernamesOpen(true)}
                />
              </>
            )}
            {errorText ? <div className="jw-adminUsersModal__error">{errorText}</div> : null}
          </div>
          <div className="jw-adminUsersModal__actions">
            <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="jw-adminUsersModal__btn is-green" onClick={submit} disabled={saving || loading}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
      <UsernamesViewModal
        open={au.viewUsernamesOpen}
        onClose={() => au.setViewUsernamesOpen(false)}
        members={au.resolveMembers}
        totalCount={au.resolveCount}
        truncated={au.resolveTruncated}
      />
    </>
  );
}

export default function NotificationGroupsTab() {
  const [groupNames, setGroupNames] = useState([]);
  const [filters, setFilters] = useState({
    memberUserId: "",
    memberUsername: "",
    groupId: "",
    status: "",
  });
  const [applied, setApplied] = useState({
    memberUserId: "",
    groupId: "",
    status: "",
  });
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOptions, setMemberOptions] = useState([]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const memberDebounceRef = useRef(null);
  const memberWrapRef = useRef(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState({ key: "updatedAt", dir: "desc" });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const loadNames = useCallback(() => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/admin/notification-groups/names", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => setGroupNames(Array.isArray(data.items) ? data.items : []))
      .catch(() => setGroupNames([]));
  }, []);

  useEffect(() => {
    loadNames();
  }, [loadNames]);

  useEffect(() => {
    const onDoc = (e) => {
      if (memberWrapRef.current && !memberWrapRef.current.contains(e.target)) setMemberDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (memberDebounceRef.current) clearTimeout(memberDebounceRef.current);
    const q = memberSearch.trim();
    if (!q) {
      setMemberOptions([]);
      setMemberDropdownOpen(false);
      return;
    }
    memberDebounceRef.current = setTimeout(() => {
      setMemberSearchLoading(true);
      const token = localStorage.getItem("token") || "";
      fetch(`/api/admin/users?${buildQuery({ username: q, page: 1, pageSize: 15 })}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          setMemberOptions(Array.isArray(data.items) ? data.items : []);
          setMemberDropdownOpen(true);
        })
        .catch(() => {
          setMemberOptions([]);
          setMemberDropdownOpen(false);
        })
        .finally(() => setMemberSearchLoading(false));
    }, 300);
    return () => {
      if (memberDebounceRef.current) clearTimeout(memberDebounceRef.current);
    };
  }, [memberSearch]);

  const fetchList = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setErrorText("");
    const token = localStorage.getItem("token") || "";
    const q = buildQuery({
      ...(applied.memberUserId ? { memberUserId: applied.memberUserId } : {}),
      ...(applied.groupId ? { groupId: applied.groupId } : {}),
      status: applied.status || "all",
      page,
      pageSize,
      sortKey: sort.key,
      sortDir: sort.dir,
    });
    fetch(`/api/admin/notification-groups?${q}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (!data.items) {
          setRows([]);
          setTotal(0);
          setErrorText(data?.message || "Unable to load groups.");
          return;
        }
        setRows(data.items);
        setTotal(Number(data.total || 0));
      })
      .catch(() => {
        if (!ignore) {
          setRows([]);
          setTotal(0);
          setErrorText("Unable to load groups.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [applied, page, pageSize, sort]);

  useEffect(() => {
    return fetchList();
  }, [fetchList]);

  const displayRows = useMemo(() => {
    if (loading) return [{ id: "loading-row" }];
    if (!loading && rows.length === 0) return [{ id: "empty-row" }];
    return rows;
  }, [rows, loading]);

  const onSubmitFilters = () => {
    setApplied({
      memberUserId: filters.memberUserId || "",
      groupId: filters.groupId || "",
      status: filters.status || "",
    });
    setPage(1);
  };

  const onClearFilters = () => {
    setFilters({ memberUserId: "", memberUsername: "", groupId: "", status: "" });
    setApplied({ memberUserId: "", groupId: "", status: "" });
    setMemberSearch("");
    setMemberOptions([]);
    setMemberDropdownOpen(false);
    setPage(1);
  };

  const onSort = (sortKey) => {
    setSort((s) => (s.key !== sortKey ? { key: sortKey, dir: "asc" } : { key: sortKey, dir: s.dir === "asc" ? "desc" : "asc" }));
    setPage(1);
  };

  const pickMemberFilter = (u) => {
    setFilters((f) => ({
      ...f,
      memberUserId: String(u.id),
      memberUsername: u.username || "",
    }));
    setMemberSearch("");
    setMemberDropdownOpen(false);
  };

  const clearMemberFilter = () => {
    setFilters((f) => ({ ...f, memberUserId: "", memberUsername: "" }));
    setMemberSearch("");
  };

  const filterBar = (
    <AdminFilterBar onClear={onClearFilters} onSubmit={onSubmitFilters}>
      <AdminFilterField label="Username (client)">
        <div className="jw-adminNgFilterUser" ref={memberWrapRef}>
          {filters.memberUserId ? (
            <div className="jw-adminNgFilterPicked">
              <span>{filters.memberUsername || `User #${filters.memberUserId}`}</span>
              <button type="button" className="jw-adminNgFilterClear" onClick={clearMemberFilter}>
                Clear
              </button>
            </div>
          ) : (
            <>
              <AdminInput
                value={memberSearch}
                onChange={(v) => setMemberSearch(v)}
                placeholder="Search username…"
              />
              {memberDropdownOpen && memberOptions.length > 0 ? (
                <div className="jw-adminNgUserDropdown jw-adminNgUserDropdown--filter">
                  {memberOptions.map((u) => (
                    <button key={u.id} type="button" className="jw-adminNgUserDropdown__row" onClick={() => pickMemberFilter(u)}>
                      <span className="jw-adminNgUserDropdown__name">{u.username}</span>
                      <span className="jw-adminNgUserDropdown__sub">{u.name || "—"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {memberSearchLoading ? <div className="jw-adminUsersModal__hint">Searching…</div> : null}
            </>
          )}
        </div>
      </AdminFilterField>
      <AdminFilterField label="Group name">
        <select
          className={`jw-adminInput ${!filters.groupId ? "jw-adminInput--placeholder" : ""}`}
          value={filters.groupId}
          onChange={(e) => setFilters((f) => ({ ...f, groupId: e.target.value }))}
        >
          <option value="">All groups</option>
          {groupNames.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
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
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={() => setCreateOpen(true)}>
          <span className="jw-adminCreateBtnInner">
            Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} />
          </span>
        </AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );

  const groupNameHint = "Letters and digits only (A–Z, a–z, 0–9). No spaces or symbols.";

  return (
    <>
      <div className="jw-adminNgIntegrated">
        <div className="jw-adminNgIntegrated__filters">{filterBar}</div>
        {errorText && !loading ? (
          <div className="jw-adminUsersPage__notice is-error jw-adminNgIntegrated__notice">{errorText}</div>
        ) : null}
        <GroupsTable
          rows={displayRows}
          sort={sort}
          onSort={onSort}
          onEdit={(r) => {
            setEditId(r.id);
            setEditOpen(true);
          }}
          loading={loading}
        />
        <div className="jw-adminNgIntegrated__pagination">
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
        </div>
      </div>
      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        groupNameHint={groupNameHint}
        onSaved={() => {
          loadNames();
          fetchList();
        }}
      />
      <EditGroupModal
        open={editOpen}
        groupId={editId}
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
        }}
        groupNameHint={groupNameHint}
        onSaved={() => {
          loadNames();
          fetchList();
        }}
      />
    </>
  );
}

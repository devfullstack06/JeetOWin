import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminDateRange from "../../components/AdminDateRange/AdminDateRange";
import AdminTable from "../../components/AdminTable/AdminTable";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import { formatAdminDateTime } from "../../utils/adminDateUtils";
import "./usersPage.css";

function buildQuery(params) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value === "") return;
    search.set(key, String(value));
  });

  return search.toString();
}

/** Same as admin Wallets balance cell: grouped integer, no decimals */
function formatUserBalanceCell(value) {
  return Math.floor(Number(value ?? 0) || 0).toLocaleString();
}

function normalizeContactToDisplay(contact) {
  if (!contact) return "";
  const digits = String(contact).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("92")) return digits.slice(2);
  return digits.length > 10 ? digits.slice(0, 10) : digits;
}

function EditUserModal({
  open,
  user,
  form,
  saving,
  errorText,
  showPassword,
  onToggleShowPassword,
  onChange,
  onCancel,
  onConfirm,
}) {
  if (!open || !user) return null;

  return (
    <div className="jw-adminUsersModalOverlay" onClick={onCancel}>
      <div
        className="jw-adminUsersModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit User"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Edit User</div>
        </div>

        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Username</label>
            <input
              className="jw-adminUsersModal__input is-readonly"
              value={user.username || ""}
              readOnly
            />
          </div>

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
            <label className="jw-adminUsersModal__label">Contact Number</label>
            <input
              className="jw-adminUsersModal__input"
              value={form.contact}
              onChange={(e) => onChange("contact", e.target.value)}
              placeholder="10 digits, starting with 3"
              inputMode="numeric"
              maxLength={12}
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
            <label className="jw-adminUsersModal__label">Status</label>
            <select
              className="jw-adminUsersModal__input"
              value={form.status}
              onChange={(e) => onChange("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
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

export default function UsersPage() {
  const tabs = useMemo(() => [{ key: "user-info", label: "User Info" }], []);
  const [activeTab, setActiveTab] = useState("user-info");

  const [filters, setFilters] = useState({
    username: "",
    contact: "",
    startDate: "",
    endDate: "",
  });

  const [applied, setApplied] = useState({
    username: "",
    contact: "",
    startDate: "",
    endDate: "",
  });

  const [sort, setSort] = useState({
    key: "joinDateISO",
    dir: "desc",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    contact: "",
    newPassword: "",
    status: "active",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const columns = useMemo(
    () => [
      { key: "username", header: "Username", sortKey: "username" },
      { key: "name", header: "Name", sortKey: "name" },
      { key: "contact", header: "Contact Number", sortKey: "contact" },
      { key: "balance", header: "Balance", sortKey: "balance" },
      { key: "status", header: "Status", sortKey: "status" },
      { key: "joinDateISO", header: "Join Date", sortKey: "joinDateISO" },
      { key: "actions", header: "Actions" },
    ],
    []
  );

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      setLoading(true);
      setErrorText("");

      try {
        const token = localStorage.getItem("token") || "";
        const query = buildQuery({
          username: applied.username,
          contact: applied.contact,
          startDate: applied.startDate,
          endDate: applied.endDate,
          page,
          pageSize,
          sortKey: sort.key,
          sortDir: sort.dir,
        });

        const response = await fetch(`/api/admin/users?${query}`, {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (ignore) return;
          setRows([]);
          setTotal(0);
          setErrorText(data?.message || "Unable to load users.");
          setLoading(false);
          return;
        }

        if (ignore) return;

        const items = Array.isArray(data?.items) ? data.items : [];

        setRows(
          items.map((item) => ({
            ...item,
            joinDateText: formatAdminDateTime(item.joinDateISO) || item.joinDateISO || "",
            balance: formatUserBalanceCell(item.balance),
          }))
        );
        setTotal(Number(data?.total || 0));
        setLoading(false);
      } catch (err) {
        if (ignore) return;
        setRows([]);
        setTotal(0);
        setErrorText("Unable to load users.");
        setLoading(false);
      }
    }

    loadUsers();

    return () => {
      ignore = true;
    };
  }, [applied, page, pageSize, sort]);

  const onSubmit = () => {
    setApplied(filters);
    setPage(1);
  };

  const onClear = () => {
    setFilters((f) => ({
      ...f,
      username: "",
      contact: "",
      startDate: "",
      endDate: "",
    }));
  };

  const onSort = (sortKey) => {
    setSort((s) => {
      if (s.key !== sortKey) return { key: sortKey, dir: "asc" };
      if (s.dir === "asc") return { key: sortKey, dir: "desc" };
      if (s.dir === "desc") return { key: "joinDateISO", dir: "desc" };
      return { key: sortKey, dir: "asc" };
    });
    setPage(1);
  };

  const openEditModal = (row) => {
    setEditingUser(row);
    setEditForm({
      name: row.name || "",
      contact: normalizeContactToDisplay(row.contact),
      newPassword: "",
      status: row.statusRaw || (row.status === "Active" ? "active" : "suspended"),
    });
    setShowEditPassword(false);
    setEditError("");
    setEditOpen(true);
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditingUser(null);
    setEditError("");
  };

  const handleEditChange = (key, value) => {
    if (key === "contact") {
      value = String(value).replace(/\D/g, "").slice(0, 10);
    }
    setEditForm((prev) => ({ ...prev, [key]: value }));
    setEditError("");
  };

  const handleEditConfirm = async () => {
    if (!editingUser?.id) return;

    if (!editForm.name.trim() || editForm.name.trim().length < 3) {
      setEditError("Full name must be at least 3 characters");
      return;
    }

    const contactDigits = editForm.contact.replace(/\D/g, "");
    if (contactDigits.length !== 10) {
      setEditError("Mobile number must be exactly 10 digits");
      return;
    }
    if (!/^3/.test(contactDigits)) {
      setEditError("Mobile number must start with 3");
      return;
    }
    if (!/^\d{10}$/.test(contactDigits)) {
      setEditError("Mobile number must contain only digits");
      return;
    }

    if (editForm.newPassword.trim() && editForm.newPassword.length < 6) {
      setEditError("Password must be at least 6 characters");
      return;
    }

    setEditSaving(true);
    setEditError("");

    const contactE164 = `+92${contactDigits}`;
    const body = {
      name: editForm.name.trim(),
      contact: contactE164,
      status: editForm.status,
    };
    if (editForm.newPassword.trim()) {
      body.newPassword = editForm.newPassword;
    }

    try {
      const token = localStorage.getItem("token") || "";

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEditError(data?.message || "Unable to update user.");
        setEditSaving(false);
        return;
      }

      const updatedItem = data?.item;

      if (updatedItem) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === updatedItem.id
              ? {
                  ...updatedItem,
                  joinDateText: formatAdminDateTime(updatedItem.joinDateISO) || updatedItem.joinDateISO || "",
                  balance: formatUserBalanceCell(updatedItem.balance),
                }
              : row
          )
        );
      }

      setEditSaving(false);
      setEditOpen(false);
      setEditingUser(null);
    } catch (err) {
      setEditError("Unable to update user.");
      setEditSaving(false);
    }
  };

  const displayRows = useMemo(() => {
    if (loading) return [{ id: "loading-row" }];
    if (!loading && rows.length === 0) return [{ id: "empty-row" }];
    return rows;
  }, [rows, loading]);

  return (
    <>
      <AdminPageShell
        title="Page Title"
        tabs={
          <AdminTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
        }
        filters={
          <AdminFilterBar onClear={onClear} onSubmit={onSubmit}>
            <AdminFilterField label="Username">
              <AdminInput
                value={filters.username}
                onChange={(v) => setFilters((f) => ({ ...f, username: v }))}
                placeholder="Please Enter"
              />
            </AdminFilterField>

            <AdminFilterField label="Contact Number">
              <AdminInput
                value={filters.contact}
                onChange={(v) => setFilters((f) => ({ ...f, contact: v }))}
                placeholder="Please Enter"
                inputMode="tel"
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
          </AdminFilterBar>
        }
        table={
          <>
            {errorText && !loading ? (
              <div className="jw-adminUsersPage__notice is-error">{errorText}</div>
            ) : null}

            <AdminTable
              columns={columns}
              rows={displayRows}
              sort={sort}
              onSort={onSort}
              onEdit={openEditModal}
            />
          </>
        }
        pagination={
          <AdminPagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        }
      />

      <EditUserModal
        open={editOpen}
        user={editingUser}
        form={editForm}
        saving={editSaving}
        errorText={editError}
        showPassword={showEditPassword}
        onToggleShowPassword={() => setShowEditPassword((v) => !v)}
        onChange={handleEditChange}
        onCancel={closeEditModal}
        onConfirm={handleEditConfirm}
      />
    </>
  );
}
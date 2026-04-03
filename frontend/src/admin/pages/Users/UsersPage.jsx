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
import "../Wallets/walletsPage.css";

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
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onCancel}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
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

          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Notes (optional)</label>
            <textarea
              className="jw-adminUsersModal__input jw-adminUsersModal__textarea"
              value={form.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              placeholder="Internal notes about this user"
              rows={4}
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

const USER_STAT_ROWS = [
  { key: "deposit", label: "Deposit" },
  { key: "withdraw", label: "Withdraw" },
  { key: "transferIn", label: "Transfer IN" },
  { key: "transferOut", label: "Transfer OUT" },
];

function UserStatsFirstRecentCell({ cell }) {
  if (!cell || cell.amount == null) {
    return <span className="jw-adminUserStatsDash">—</span>;
  }
  return (
    <div className="jw-adminUserStatsCell">
      <div className="jw-adminUserStatsAmt">{formatUserBalanceCell(cell.amount)}</div>
      <div className="jw-adminUserStatsTime">{formatAdminDateTime(cell.at)}</div>
    </div>
  );
}

function ViewUserModal({ open, loading, errorText, usernameTitle, detail, onClose }) {
  if (!open) return null;

  const item = detail?.item;
  const stats = detail?.stats;
  const warning = detail?.warning;

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable jw-adminUsersModal--userView"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jw-admin-user-view-title"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title" id="jw-admin-user-view-title">
            View: {usernameTitle || item?.username || "—"}
          </div>
        </div>

        <div className="jw-adminUsersModal__body">
          {loading ? (
            <div className="jw-adminUserViewLoading">Loading…</div>
          ) : errorText ? (
            <div className="jw-adminUsersModal__error">{errorText}</div>
          ) : item ? (
            <>
              {warning ? (
                <div className="jw-adminUsersPage__notice" style={{ border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" }}>
                  {warning}
                </div>
              ) : null}

              <div className="jw-adminUserViewDetails">
                <div className="jw-adminUserViewDetails__grid">
                  <div className="jw-adminUserViewDetails__cell">
                    <span className="jw-adminUserViewLabel">Full Name:</span> {item.name || "—"}
                  </div>
                  <div className="jw-adminUserViewDetails__cell">
                    <span className="jw-adminUserViewLabel">Contact Number:</span> {item.contact || "—"}
                  </div>
                  <div className="jw-adminUserViewDetails__cell">
                    <span className="jw-adminUserViewLabel">Balance:</span> {formatUserBalanceCell(item.balance)}
                  </div>
                  <div className="jw-adminUserViewDetails__cell">
                    <span className="jw-adminUserViewLabel">Status:</span> {item.status || "—"}
                  </div>
                  <div className="jw-adminUserViewDetails__cell">
                    <span className="jw-adminUserViewLabel">Joining Date:</span>{" "}
                    {formatAdminDateTime(item.joinDateISO)}
                  </div>
                  <div className="jw-adminUserViewDetails__cell">
                    <span className="jw-adminUserViewLabel">Last Login:</span>{" "}
                    {item.lastLoginAt ? formatAdminDateTime(item.lastLoginAt) : "—"}
                  </div>
                </div>
              </div>

              <div className="jw-adminUserViewStatsWrap">
                <div className="jw-adminUserViewSectionTitle">Stats</div>
                <div className="jw-adminUserStatsTableWrap">
                  <table className="jw-adminUserStatsTable">
                    <thead>
                      <tr>
                        <th>Transaction</th>
                        <th>First</th>
                        <th>Recent</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {USER_STAT_ROWS.map((row) => {
                        const s = stats?.[row.key] || {};
                        return (
                          <tr key={row.key}>
                            <td className="jw-adminUserStatsTxn">{row.label}</td>
                            <td>
                              <UserStatsFirstRecentCell cell={s.first} />
                            </td>
                            <td>
                              <UserStatsFirstRecentCell cell={s.recent} />
                            </td>
                            <td className="jw-adminUserStatsTotalCell">
                              {formatUserBalanceCell(s.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Notes</label>
                <div className="jw-adminUsersModal__readOnly jw-adminUserViewNotes">
                  {item.notes?.trim() ? item.notes : "—"}
                </div>
              </div>
            </>
          ) : null}
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
    notes: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewUsername, setViewUsername] = useState("");
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [viewDetail, setViewDetail] = useState(null);

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
            notes: item.notes != null ? String(item.notes) : "",
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
      notes: row.notes != null ? String(row.notes) : "",
    });
    setShowEditPassword(false);
    setEditError("");
    setEditOpen(true);
  };

  const openViewModal = async (row) => {
    if (!row?.id) return;
    setViewOpen(true);
    setViewUsername(row.username || "");
    setViewLoading(true);
    setViewError("");
    setViewDetail(null);

    try {
      const token = localStorage.getItem("token") || "";
      const response = await fetch(`/api/admin/users/${row.id}/detail`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setViewError(data?.message || "Unable to load user details.");
        setViewLoading(false);
        return;
      }
      setViewDetail({
        item: data.item,
        stats: data.stats,
        warning: data.warning,
      });
    } catch {
      setViewError("Unable to load user details.");
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewOpen(false);
    setViewUsername("");
    setViewError("");
    setViewDetail(null);
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
      notes: editForm.notes,
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
                  notes: updatedItem.notes != null ? String(updatedItem.notes) : "",
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
              onUsernameClick={openViewModal}
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

      <ViewUserModal
        open={viewOpen}
        loading={viewLoading}
        errorText={viewError}
        usernameTitle={viewUsername}
        detail={viewDetail}
        onClose={closeViewModal}
      />
    </>
  );
}
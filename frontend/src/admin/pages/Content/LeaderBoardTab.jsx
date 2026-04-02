import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Eye, Plus } from "lucide-react";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
  AdminButton,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import AdminDateRange from "../../components/AdminDateRange/AdminDateRange";
import "../Users/usersPage.css";
import "../Reports/reportsPage.css";
import "./contentPage.css";

function authHeaders() {
  const token = localStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  return search.toString();
}

const LeaderBoardAdminContext = createContext(null);

function useLeaderBoardAdmin() {
  const v = useContext(LeaderBoardAdminContext);
  if (!v) throw new Error("Leader board admin components require LeaderBoardAdminProvider");
  return v;
}

export function LeaderBoardAdminProvider({ active, children }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [filters, setFilters] = useState({
    username: "",
    type: "",
    mock: "",
    aggregated: "no",
    dateFrom: "",
    dateTo: "",
  });
  const [applied, setApplied] = useState(() => ({
    username: "",
    type: "",
    mock: "",
    aggregated: "no",
    dateFrom: "",
    dateTo: "",
  }));

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    entryType: "deposit",
    amount: "",
    entryDate: todayYmd(),
  });
  const [usernameHint, setUsernameHint] = useState("");
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [previewBalance, setPreviewBalance] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const [mocksOpen, setMocksOpen] = useState(false);
  const [mockUsernames, setMockUsernames] = useState([]);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewCtx, setViewCtx] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewError, setViewError] = useState("");
  const [viewDateFrom, setViewDateFrom] = useState("");
  const [viewDateTo, setViewDateTo] = useState("");

  useEffect(() => {
    if (!active) {
      setCreateOpen(false);
      setMocksOpen(false);
      setViewOpen(false);
    }
  }, [active]);

  const aggregated = applied.aggregated === "yes";

  const fetchList = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setErrorText("");
    const q = buildQuery({
      page,
      pageSize,
      username: applied.username || undefined,
      type: applied.type || undefined,
      mock: applied.mock || undefined,
      aggregated: applied.aggregated === "yes" ? "yes" : "no",
      dateFrom: applied.dateFrom || undefined,
      dateTo: applied.dateTo || undefined,
    });
    fetch(`/api/admin/leaderboard-mocks?${q}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.items == null) {
          setItems([]);
          setTotal(0);
          setErrorText(data?.message || "Unable to load.");
          return;
        }
        setItems(data.items);
        setTotal(Number(data.total || 0));
      })
      .catch(() => {
        if (!ignore) {
          setItems([]);
          setTotal(0);
          setErrorText("Unable to load.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, pageSize, applied]);

  useEffect(() => {
    if (!active) return undefined;
    return fetchList();
  }, [active, fetchList]);

  const onClear = useCallback(() => {
    setFilters({
      username: "",
      type: "",
      mock: "",
      aggregated: "no",
      dateFrom: "",
      dateTo: "",
    });
    setApplied({
      username: "",
      type: "",
      mock: "",
      aggregated: "no",
      dateFrom: "",
      dateTo: "",
    });
    setPage(1);
  }, []);

  const onSubmit = useCallback(() => {
    setApplied({ ...filters });
    setPage(1);
  }, [filters]);

  const openCreate = useCallback(() => {
    setCreateForm({ username: "", entryType: "deposit", amount: "", entryDate: todayYmd() });
    setUsernameHint("");
    setPreviewBalance(null);
    setCreateError("");
    setCreateOpen(true);
  }, []);

  const checkUsername = useCallback((name) => {
    const u = String(name || "").trim();
    if (u.length < 3) {
      setUsernameHint("");
      return;
    }
    setUsernameCheckLoading(true);
    fetch(`/api/admin/leaderboard-mocks/check-username?${buildQuery({ username: u })}`, {
      headers: authHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "real_user") {
          setUsernameHint("change username as real user already exist for this username");
        } else if (data.status === "mock_user") {
          setUsernameHint("mock user");
        } else if (data.status === "new_mock") {
          setUsernameHint("new mock user");
        } else {
          setUsernameHint("");
        }
      })
      .catch(() => setUsernameHint(""))
      .finally(() => setUsernameCheckLoading(false));
  }, []);

  useEffect(() => {
    if (!createOpen) return undefined;
    const u = String(createForm.username || "").trim();
    const amount = Number(createForm.amount);
    if (u.length < 3 || !Number.isFinite(amount) || amount <= 0) {
      setPreviewBalance(null);
      return undefined;
    }
    const t = setTimeout(() => {
      const q = buildQuery({
        username: u,
        entryType: createForm.entryType,
        amount: String(amount),
        entryDate: createForm.entryDate || todayYmd(),
      });
      fetch(`/api/admin/leaderboard-mocks/preview-balance?${q}`, { headers: authHeaders() })
        .then((res) => res.json())
        .then((data) => {
          if (data.balanceAfter != null) setPreviewBalance(data.balanceAfter);
          else setPreviewBalance(null);
        })
        .catch(() => setPreviewBalance(null));
    }, 300);
    return () => clearTimeout(t);
  }, [createOpen, createForm.username, createForm.entryType, createForm.amount, createForm.entryDate]);

  const handleCreate = useCallback(async () => {
    const u = createForm.username.trim();
    if (u.length < 3) {
      setCreateError("Username must be at least 3 characters.");
      return;
    }
    if (usernameHint.includes("real user")) {
      setCreateError("Cannot create mock entry for a registered username.");
      return;
    }
    const amount = Number(createForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCreateError("Enter a valid amount.");
      return;
    }
    setCreateSaving(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/leaderboard-mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          username: u,
          entryType: createForm.entryType,
          amount,
          entryDate: createForm.entryDate || todayYmd(),
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
  }, [createForm, usernameHint, fetchList]);

  const openMocks = useCallback(() => {
    fetch("/api/admin/leaderboard-mocks/mock-usernames", { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setMockUsernames(Array.isArray(data.usernames) ? data.usernames : []);
        setMocksOpen(true);
      })
      .catch(() => setMockUsernames([]));
  }, []);

  const openView = useCallback((row) => {
    const base = { row, aggregated: !!row.aggregated };
    if (row.aggregated && row.source === "real_agg") {
      setViewCtx({ ...base, userId: row.userId, realAggregated: true });
    } else if (row.aggregated) {
      setViewCtx({ ...base, mockUserId: row.mockUserId, entryId: null });
    } else if (row.source === "deposit") {
      const tid = Number(String(row.id).replace(/^d-/, ""));
      setViewCtx({ ...base, depositTicketId: tid });
    } else if (row.source === "transfer_out") {
      const tid = Number(String(row.id).replace(/^t-/, ""));
      setViewCtx({ ...base, transferTicketId: tid });
    } else {
      const eid = Number(String(row.id).replace(/^m-/, ""));
      setViewCtx({ ...base, mockUserId: row.mockUserId, entryId: eid });
    }
    setViewDateFrom("");
    setViewDateTo("");
    setViewOpen(true);
    setViewData(null);
    setViewError("");
  }, []);

  const loadView = useCallback(() => {
    if (!viewCtx) return;
    setViewLoading(true);
    setViewError("");
    const common = {
      dateFrom: viewDateFrom || undefined,
      dateTo: viewDateTo || undefined,
    };
    let q;
    if (viewCtx.realAggregated && viewCtx.userId) {
      q = buildQuery({ ...common, userId: viewCtx.userId, realAggregated: "1" });
    } else if (viewCtx.depositTicketId) {
      q = buildQuery({ ...common, depositTicketId: viewCtx.depositTicketId });
    } else if (viewCtx.transferTicketId) {
      q = buildQuery({ ...common, transferTicketId: viewCtx.transferTicketId });
    } else {
      q = buildQuery({
        ...common,
        mockUserId: viewCtx.mockUserId,
        entryId: viewCtx.aggregated ? undefined : viewCtx.entryId,
      });
    }
    fetch(`/api/admin/leaderboard-mocks/detail-view?${q}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.message && !data.mockUser && !data.realUser) {
          setViewError(data.message);
          setViewData(null);
          return;
        }
        setViewData(data);
      })
      .catch(() => {
        setViewError("Failed to load.");
        setViewData(null);
      })
      .finally(() => setViewLoading(false));
  }, [viewCtx, viewDateFrom, viewDateTo]);

  useEffect(() => {
    if (viewOpen && viewCtx) loadView();
  }, [viewOpen, viewCtx, viewDateFrom, viewDateTo, loadView]);

  const value = useMemo(
    () => ({
      active,
      items,
      total,
      page,
      setPage,
      pageSize,
      setPageSize,
      loading,
      errorText,
      filters,
      setFilters,
      onClear,
      onSubmit,
      aggregated,
      openCreate,
      openMocks,
      openView,
      createOpen,
      setCreateOpen,
      createForm,
      setCreateForm,
      usernameHint,
      usernameCheckLoading,
      checkUsername,
      previewBalance,
      createSaving,
      createError,
      setCreateError,
      handleCreate,
      mocksOpen,
      setMocksOpen,
      mockUsernames,
      viewOpen,
      setViewOpen,
      viewCtx,
      viewLoading,
      viewData,
      viewError,
      viewDateFrom,
      viewDateTo,
      setViewDateFrom,
      setViewDateTo,
    }),
    [
      active,
      items,
      total,
      page,
      pageSize,
      loading,
      errorText,
      filters,
      onClear,
      onSubmit,
      aggregated,
      openCreate,
      openMocks,
      openView,
      createOpen,
      createForm,
      usernameHint,
      usernameCheckLoading,
      checkUsername,
      previewBalance,
      createSaving,
      createError,
      handleCreate,
      mocksOpen,
      mockUsernames,
      viewOpen,
      viewCtx,
      viewLoading,
      viewData,
      viewError,
      viewDateFrom,
      viewDateTo,
    ]
  );

  return (
    <LeaderBoardAdminContext.Provider value={value}>{children}</LeaderBoardAdminContext.Provider>
  );
}

/** Same shell slot as social-media: AdminPageShell__filters */
export function LeaderBoardAdminFilters() {
  const { filters, setFilters, onClear, onSubmit, openCreate, openMocks } = useLeaderBoardAdmin();

  return (
    <AdminFilterBar onClear={onClear} onSubmit={onSubmit}>
      <AdminFilterField label="Date">
        <AdminDateRange
          startDate={filters.dateFrom}
          endDate={filters.dateTo}
          placeholder="Please Select"
          onChange={({ startDate, endDate }) =>
            setFilters((f) => ({ ...f, dateFrom: startDate || "", dateTo: endDate || "" }))
          }
        />
      </AdminFilterField>
      <AdminFilterField label="Username">
        <AdminInput
          value={filters.username}
          onChange={(v) => setFilters((f) => ({ ...f, username: v }))}
          placeholder="Please Enter"
        />
      </AdminFilterField>
      <AdminFilterField label="Type">
        <select
          className={`jw-adminInput ${!filters.type ? "jw-adminInput--placeholder" : ""}`}
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="">Please Select</option>
          <option value="deposit">Deposit</option>
          <option value="transfer_out">Transfer OUT</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="Mock">
        <select
          className={`jw-adminInput ${!filters.mock ? "jw-adminInput--placeholder" : ""}`}
          value={filters.mock}
          onChange={(e) => setFilters((f) => ({ ...f, mock: e.target.value }))}
        >
          <option value="">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="Aggregated">
        <select
          className="jw-adminInput"
          value={filters.aggregated}
          onChange={(e) => setFilters((f) => ({ ...f, aggregated: e.target.value }))}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={openCreate}>
          <span className="jw-adminCreateBtnInner">
            Create <Plus size={16} style={{ verticalAlign: "middle", marginLeft: 4 }} />
          </span>
        </AdminButton>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="light" onClick={openMocks}>
          Mocks
        </AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );
}

/** Same shell slot as social-media: notice + jw-adminTableWrap inside AdminPageShell__table */
export function LeaderBoardAdminTable() {
  const { items, loading, errorText, aggregated, openView } = useLeaderBoardAdmin();

  return (
    <>
      {errorText && !loading ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
      <div className="jw-adminTableWrap">
        <table className="jw-adminTable">
          <thead>
            <tr>
              <th>
                <span className="jw-adminThInner">Username</span>
              </th>
              <th>
                <span className="jw-adminThInner">Mock</span>
              </th>
              <th>
                <span className="jw-adminThInner">Type</span>
              </th>
              <th>
                <span className="jw-adminThInner">Amount</span>
              </th>
              <th>
                <span className="jw-adminThInner">Date</span>
              </th>
              <th>
                <span className="jw-adminThInner">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td colSpan={6}>
                    <div className="jw-adminSkeleton" style={{ height: 20 }} />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="jw-adminEmpty">
                  No leaderboard entries.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td>{r.username}</td>
                  <td>{r.isMock ? "Yes" : "No"}</td>
                  <td>{r.typeLabel}</td>
                  <td>
                    {aggregated
                      ? r.netAmount != null
                        ? Number(r.netAmount).toLocaleString("en-PK")
                        : "—"
                      : r.amount != null
                        ? Number(r.amount).toLocaleString("en-PK")
                        : "—"}
                  </td>
                  <td>{r.displayDate != null && r.displayDate !== "" ? r.displayDate : "—"}</td>
                  <td className="jw-adminTd__actions">
                    <button
                      type="button"
                      className="jw-adminEditBtn jw-adminReportsViewBtn"
                      title="View"
                      aria-label="View"
                      onClick={() => openView(r)}
                    >
                      <Eye size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Same shell slot as social-media: AdminPageShell__pagination */
export function LeaderBoardAdminPagination() {
  const { total, page, setPage, pageSize, setPageSize } = useLeaderBoardAdmin();

  return (
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
  );
}

export function LeaderBoardAdminModals() {
  const {
    createOpen,
    setCreateOpen,
    createForm,
    setCreateForm,
    usernameHint,
    usernameCheckLoading,
    checkUsername,
    previewBalance,
    createSaving,
    createError,
    setCreateError,
    handleCreate,
    mocksOpen,
    setMocksOpen,
    mockUsernames,
    viewOpen,
    setViewOpen,
    viewCtx,
    viewLoading,
    viewData,
    viewError,
    viewDateFrom,
    viewDateTo,
    setViewDateFrom,
    setViewDateTo,
  } = useLeaderBoardAdmin();

  const infoBlock = useMemo(() => {
    if (!viewData || !viewCtx) return null;
    const g = viewData.globalBalance;
    const ru = viewData.realUser;
    const mu = viewData.mockUser;
    const ce = viewData.clickedEntry;
    const uname = ru?.username || mu?.username || viewCtx.row?.username || "—";

    if (viewCtx.aggregated) {
      const r = viewCtx.row;
      return (
        <div className="jw-adminUsersModal__field">
          <div className="jw-adminUsersModal__label">Transaction info (aggregated)</div>
          <div className="jw-adminUsersModal__hint">
            Username: {uname}
            <br />
            Mock: {r?.isMock ? "Yes" : "No"}
            <br />
            Type: Sum
            <br />
            Amount (net): {r?.netAmount != null ? Number(r.netAmount).toLocaleString("en-PK") : "—"}
            <br />
            Current Balance: {g != null ? Number(g).toLocaleString("en-PK") : "—"}
            <br />
            Date: —
            <br />
            Trx No.: —
          </div>
        </div>
      );
    }
    if (ce) {
      const showTrx = !ce.isMock && ce.trxNo != null && String(ce.trxNo).trim() !== "";
      return (
        <div className="jw-adminUsersModal__field">
          <div className="jw-adminUsersModal__label">Transaction info</div>
          <div className="jw-adminUsersModal__hint">
            Username: {uname}
            <br />
            Mock: {ce.isMock ? "Yes" : "No"}
            <br />
            Type: {ce.typeLabel}
            <br />
            Amount: {ce.amount != null ? Number(ce.amount).toLocaleString("en-PK") : "—"}
            <br />
            Current Balance: {g != null ? Number(g).toLocaleString("en-PK") : "—"}
            <br />
            Date: {ce.displayDate != null && ce.displayDate !== "" ? ce.displayDate : "—"}
            <br />
            Trx No.: {showTrx ? String(ce.trxNo) : "—"}
          </div>
        </div>
      );
    }
    return (
      <div className="jw-adminUsersModal__field">
        <div className="jw-adminUsersModal__hint">User: {uname}</div>
      </div>
    );
  }, [viewData, viewCtx]);

  return (
    <>
      {createOpen ? (
        <div
          className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
          onClick={() => !createSaving && setCreateOpen(false)}
        >
          <div
            className="jw-adminUsersModal jw-adminUsersModal--scrollable"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Create mock leaderboard entry"
          >
            <div className="jw-adminUsersModal__header">
              <div className="jw-adminUsersModal__title">Create mock transaction</div>
            </div>
            <div className="jw-adminUsersModal__body">
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Username</label>
                <input
                  className="jw-adminUsersModal__input"
                  value={createForm.username}
                  onChange={(e) => {
                    setCreateForm((f) => ({ ...f, username: e.target.value }));
                    setCreateError("");
                  }}
                  onBlur={(e) => checkUsername(e.target.value)}
                />
                {usernameCheckLoading ? (
                  <div className="jw-adminUsersModal__hint">Checking…</div>
                ) : usernameHint ? (
                  <div
                    className={`jw-adminUsersModal__hint ${
                      usernameHint.includes("real user") ? "jw-adminUsersModal__error" : ""
                    }`}
                  >
                    {usernameHint}
                  </div>
                ) : null}
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Type</label>
                <select
                  className="jw-adminUsersModal__input"
                  value={createForm.entryType}
                  onChange={(e) => setCreateForm((f) => ({ ...f, entryType: e.target.value }))}
                >
                  <option value="deposit">Deposit</option>
                  <option value="transfer_out">Transfer OUT</option>
                </select>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Amount</label>
                <input
                  className="jw-adminUsersModal__input"
                  inputMode="decimal"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                />
                {previewBalance != null ? (
                  <div className="jw-adminUsersModal__hint">
                    Balance after (preview): {Number(previewBalance).toLocaleString("en-PK")}
                  </div>
                ) : null}
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Entry date</label>
                <input
                  type="date"
                  className="jw-adminUsersModal__input"
                  value={createForm.entryDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, entryDate: e.target.value }))}
                />
              </div>
              {createError ? <div className="jw-adminUsersModal__error">{createError}</div> : null}
            </div>
            <div className="jw-adminUsersModal__actions">
              <button
                type="button"
                className="jw-adminUsersModal__btn is-light"
                onClick={() => !createSaving && setCreateOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="jw-adminUsersModal__btn is-green" onClick={handleCreate} disabled={createSaving}>
                {createSaving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mocksOpen ? (
        <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={() => setMocksOpen(false)}>
          <div
            className="jw-adminUsersModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mock usernames"
          >
            <div className="jw-adminUsersModal__header">
              <div className="jw-adminUsersModal__title">Mock usernames</div>
            </div>
            <div className="jw-adminUsersModal__body">
              {mockUsernames.length === 0 ? (
                <div className="jw-adminUsersModal__hint">No mock users yet.</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {mockUsernames.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="jw-adminUsersModal__actions">
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => setMocksOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewOpen && viewCtx ? (
        <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={() => setViewOpen(false)}>
          <div
            className="jw-adminUsersModal jw-adminUsersModal--scrollable jw-adminLeaderBoardViewModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Leaderboard mock detail"
          >
            <div className="jw-adminUsersModal__header">
              <div className="jw-adminUsersModal__title">View</div>
            </div>
            <div className="jw-adminUsersModal__body">
              {viewLoading ? (
                <div className="jw-adminUsersModal__hint">Loading…</div>
              ) : viewError ? (
                <div className="jw-adminUsersModal__error">{viewError}</div>
              ) : (
                <>
                  {infoBlock}
                  <div className="jw-adminUsersModal__field">
                    <div className="jw-adminUsersModal__label">History date range</div>
                    <AdminDateRange
                      startDate={viewDateFrom}
                      endDate={viewDateTo}
                      placeholder="Please Select"
                      onChange={({ startDate, endDate }) => {
                        setViewDateFrom(startDate || "");
                        setViewDateTo(endDate || "");
                      }}
                    />
                  </div>
                  <div className="jw-adminTableWrap jw-adminLeaderBoardViewModalTable">
                    <table className="jw-adminTable">
                      <thead>
                        <tr>
                          <th>
                            <span className="jw-adminThInner">Date</span>
                          </th>
                          <th>
                            <span className="jw-adminThInner">Type</span>
                          </th>
                          <th>
                            <span className="jw-adminThInner">Amount</span>
                          </th>
                          <th>
                            <span className="jw-adminThInner">Balance</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewData?.history || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="jw-adminEmpty">
                              No rows in range.
                            </td>
                          </tr>
                        ) : (
                          viewData.history.map((h, i) => (
                            <tr key={`${h.entryDate}-${i}`}>
                              <td>{h.entryDate}</td>
                              <td>{h.typeLabel}</td>
                              <td>{Number(h.amount).toLocaleString("en-PK")}</td>
                              <td>
                                {h.balanceAfter != null && h.balanceAfter !== ""
                                  ? Number(h.balanceAfter).toLocaleString("en-PK")
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="jw-adminUsersModal__actions">
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => setViewOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

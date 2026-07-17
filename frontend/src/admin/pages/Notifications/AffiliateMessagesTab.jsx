import React, { useEffect, useState } from "react";
import { Eye, Plus, Send } from "lucide-react";
import AdminFilterBar, {
  AdminButton,
  AdminFilterField,
  AdminInput,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import { formatAdminDateTime } from "../../utils/adminDateUtils";
import { StatusBadge } from "../Affiliates/affiliateAdminShared";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";
import "../Wallets/walletsPage.css";
import "../Affiliates/affiliateTab.css";
import "./announcementsTab.css";

function authHeaders(json = true) {
  const token = localStorage.getItem("token") || "";
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function api(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { ...authHeaders(!(options.body instanceof FormData)), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data;
}

const DIRECTION_TABS = [
  { key: "from", label: "From Affiliates" },
  { key: "to", label: "To Affiliates" },
];

export default function AffiliateMessagesTab() {
  const [direction, setDirection] = useState("from");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div className="jw-adminNgIntegrated">
      <div className="jw-adminNgIntegrated__filters">
        <div className="jw-affMsgDirectionTabs">
          {DIRECTION_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`jw-affMsgDirectionTab${direction === t.key ? " is-active" : ""}`}
              onClick={() => { setDirection(t.key); setError(""); setMsg(""); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {error ? <div className="jw-adminUsersPage__notice is-error jw-adminNgIntegrated__notice">{error}</div> : null}
      {msg ? <div className="jw-adminUsersPage__notice" style={{ color: "green", marginBottom: 12 }}>{msg}</div> : null}
      {direction === "from" ? (
        <FromAffiliatesPanel setError={setError} setMsg={setMsg} />
      ) : (
        <ToAffiliatesPanel setError={setError} setMsg={setMsg} />
      )}
    </div>
  );
}

function FromAffiliatesPanel({ setError, setMsg }) {
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [applied, setApplied] = useState({ status: "", search: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    const q = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (applied.status) q.set("status", applied.status);
    if (applied.search) q.set("search", applied.search);
    api(`/affiliate-support-messages?${q}`)
      .then((d) => {
        setRows(d.messages || []);
        setTotal(Number(d.total) || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [applied, page, pageSize]);

  async function sendReply(closeAfter) {
    if (!active) return;
    setSaving(true);
    setError("");
    try {
      await api(`/affiliate-support-messages/${active.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply, close: !!closeAfter }),
      });
      setMsg(closeAfter ? "Reply sent and ticket closed." : "Reply sent to affiliate inbox.");
      setActive(null);
      setReply("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id, status) {
    setError("");
    try {
      await api(`/affiliate-support-messages/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <div className="jw-adminNgIntegrated__filters" style={{ borderBottom: "none", paddingTop: 0 }}>
        <AdminFilterBar
          onSubmit={() => { setApplied({ ...filters }); setPage(1); }}
          onClear={() => {
            setFilters({ status: "", search: "" });
            setApplied({ status: "", search: "" });
            setPage(1);
          }}
        >
          <AdminFilterField label="Search">
            <AdminInput
              value={filters.search}
              onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
              placeholder="Username, name, message"
            />
          </AdminFilterField>
          <AdminFilterField label="Status">
            <select
              className={`jw-adminInput ${!filters.status ? "jw-adminInput--placeholder" : ""}`}
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="replied">Replied</option>
              <option value="closed">Closed</option>
            </select>
          </AdminFilterField>
        </AdminFilterBar>
      </div>

      <div className="jw-adminTableWrap">
        <table className="jw-adminTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Affiliate</th>
              <th>Username</th>
              <th>Message</th>
              <th>Status</th>
              <th>Received</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="jw-adminSkeleton" style={{ height: 20 }} /></td></tr>
            ) : !rows.length ? (
              <tr><td colSpan={7} className="jw-adminEmpty">No messages from affiliates yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.affiliateName || "—"}</td>
                  <td>{r.username}</td>
                  <td style={{ maxWidth: 280 }}>{String(r.message || "").slice(0, 120)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="jw-adminTd__date">{formatAdminDateTime(r.createdAt)}</td>
                  <td className="jw-adminTd__actions">
                    <button
                      type="button"
                      className="jw-adminEditBtn jw-adminReportsViewBtn"
                      title="View / Reply"
                      onClick={() => { setActive(r); setReply(r.adminReply || ""); setMsg(""); }}
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

      <div className="jw-adminNgIntegrated__pagination">
        <AdminPagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      </div>

      {active ? (
        <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={() => setActive(null)}>
          <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="jw-adminUsersModal__header">
              <div className="jw-adminUsersModal__title">
                Support #{active.id} — {active.username}
              </div>
            </div>
            <div className="jw-adminUsersModal__body">
              <div className="jw-affMsgBubble is-from">
                <div className="jw-affMsgBubble__meta">
                  From affiliate · {formatAdminDateTime(active.createdAt)} · <StatusBadge status={active.status} />
                </div>
                <div className="jw-affMsgBubble__text">{active.message}</div>
              </div>
              {active.adminReply ? (
                <div className="jw-affMsgBubble is-to">
                  <div className="jw-affMsgBubble__meta">
                    Admin reply · {formatAdminDateTime(active.repliedAt)}
                    {active.repliedByUsername ? ` · ${active.repliedByUsername}` : ""}
                  </div>
                  <div className="jw-affMsgBubble__text">{active.adminReply}</div>
                </div>
              ) : null}
              <AdminFilterField label="Your reply">
                <textarea
                  className="jw-adminUsersModal__input"
                  rows={5}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply — it will appear in the affiliate’s inbox notifications"
                />
              </AdminFilterField>
            </div>
            <div className="jw-adminUsersModal__actions">
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => setActive(null)}>
                Cancel
              </button>
              {active.status !== "closed" ? (
                <button
                  type="button"
                  className="jw-adminUsersModal__btn is-light"
                  disabled={saving}
                  onClick={() => setStatus(active.id, "closed")}
                >
                  Close
                </button>
              ) : null}
              <button
                type="button"
                className="jw-adminUsersModal__btn is-green"
                disabled={saving || reply.trim().length < 2}
                onClick={() => sendReply(false)}
              >
                {saving ? "Sending…" : "Send Reply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ToAffiliatesPanel({ setError, setMsg }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", affiliateUserId: "" });
  const [affiliates, setAffiliates] = useState([]);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    const q = new URLSearchParams({
      audienceMode: "affiliates",
      page: String(page),
      pageSize: String(pageSize),
    });
    api(`/inbox?${q}`)
      .then((d) => {
        setRows(d.items || d.messages || []);
        setTotal(Number(d.total) || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, pageSize]);

  useEffect(() => {
    api("/affiliates")
      .then((d) => setAffiliates(d.affiliates || []))
      .catch(() => {});
  }, []);

  async function createMessage() {
    setSaving(true);
    setError("");
    try {
      const body = {
        title: form.title.trim(),
        messageMarkdown: form.body.trim(),
        audienceMode: "affiliates",
        timezone: "Asia/Karachi",
      };
      if (form.affiliateUserId) {
        body.includeUserIds = [Number(form.affiliateUserId)];
      }
      await api("/inbox", { method: "POST", body: JSON.stringify(body) });
      setMsg(form.affiliateUserId ? "Message sent to selected affiliate." : "Message sent to all active affiliates.");
      setShowCreate(false);
      setForm({ title: "", body: "", affiliateUserId: "" });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="jw-adminNgIntegrated__filters" style={{ borderBottom: "none", paddingTop: 0 }}>
        <AdminFilterBar
          onSubmit={load}
          onClear={() => setPage(1)}
          actions={(
            <div className="jw-adminFilterBar__buttons">
              <AdminButton variant="green" onClick={() => { setShowCreate(true); setMsg(""); setError(""); }}>
                <span className="jw-adminCreateBtnInner">
                  Send Message <Plus size={16} style={{ marginLeft: 4 }} />
                </span>
              </AdminButton>
            </div>
          )}
        />
      </div>

      <div className="jw-adminTableWrap">
        <table className="jw-adminTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Audience</th>
              <th>Seen</th>
              <th>Status</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="jw-adminSkeleton" style={{ height: 20 }} /></td></tr>
            ) : !rows.length ? (
              <tr><td colSpan={6} className="jw-adminEmpty">No outbound affiliate messages yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id || r.dbId}>
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>{r.audienceCount ?? "—"}</td>
                  <td>{r.seenByCount ?? 0}</td>
                  <td><StatusBadge status={r.statusRaw || r.status} /></td>
                  <td className="jw-adminTd__date">{formatAdminDateTime(r.sentAt || r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="jw-adminNgIntegrated__pagination">
        <AdminPagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      </div>

      {showCreate ? (
        <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={() => setShowCreate(false)}>
          <div className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="jw-adminUsersModal__header">
              <div className="jw-adminUsersModal__title">Send message to affiliates</div>
            </div>
            <div className="jw-adminUsersModal__body">
              <AdminFilterField label="Recipient">
                <select
                  className="jw-adminInput"
                  value={form.affiliateUserId}
                  onChange={(e) => setForm((f) => ({ ...f, affiliateUserId: e.target.value }))}
                >
                  <option value="">All active affiliates</option>
                  {affiliates.map((a) => (
                    <option key={a.id} value={a.userId}>
                      {a.username} — {a.name}
                    </option>
                  ))}
                </select>
              </AdminFilterField>
              <AdminFilterField label="Title">
                <AdminInput
                  value={form.title}
                  onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                  placeholder="Message title"
                />
              </AdminFilterField>
              <AdminFilterField label="Message">
                <textarea
                  className="jw-adminUsersModal__input"
                  rows={6}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Write your message…"
                />
              </AdminFilterField>
            </div>
            <div className="jw-adminUsersModal__actions">
              <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="jw-adminUsersModal__btn is-green"
                disabled={saving || !form.title.trim() || !form.body.trim()}
                onClick={createMessage}
              >
                <span className="jw-affSupportSubmit">
                  {saving ? "Sending…" : "Send"}
                  {!saving ? <Send size={15} /> : null}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import AdminPagination from "../../components/AdminPagination/AdminPagination";

const DEFAULT_FORM = {
  provider: "none",
  scriptSrc: "",
  enabled: false,
  startMinimized: true,
  hideOnAdmin: true,
  hideOnAuth: true,
};

export default function ChatTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [savedSnapshot, setSavedSnapshot] = useState(DEFAULT_FORM);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [events, setEvents] = useState([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageSize, setEventsPageSize] = useState(10);
  const [summary, setSummary] = useState({ days: 7, totalEvents: 0, uniqueVisitors: 0, topProvider: null, topProviderEvents: 0 });

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedSnapshot), [form, savedSnapshot]);
  const requireScript = form.provider !== "none";

  useEffect(() => {
    let ignore = false;
    const token = localStorage.getItem("token") || "";
    setLoading(true);
    setError("");
    fetch("/api/admin/chat-widget-settings", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (ignore) return;
        if (!ok) {
          setError(body?.message || "Failed to load chat settings.");
          return;
        }
        const next = {
          provider: body?.provider || "none",
          scriptSrc: body?.scriptSrc || "",
          enabled: !!body?.enabled,
          startMinimized: body?.startMinimized !== undefined ? !!body.startMinimized : true,
          hideOnAdmin: body?.hideOnAdmin !== undefined ? !!body.hideOnAdmin : true,
          hideOnAuth: body?.hideOnAuth !== undefined ? !!body.hideOnAuth : true,
        };
        setForm(next);
        setSavedSnapshot(next);
      })
      .catch(() => {
        if (!ignore) setError("Failed to load chat settings.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const token = localStorage.getItem("token") || "";
    setEventsLoading(true);
    setEventsError("");
    Promise.all([
      fetch(`/api/admin/chat-widget-events?page=${eventsPage}&pageSize=${eventsPageSize}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then((res) => res.json().then((body) => ({ ok: res.ok, body }))),
      fetch("/api/admin/chat-widget-events/summary?days=7", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then((res) => res.json().then((body) => ({ ok: res.ok, body }))),
    ])
      .then(([eventsResp, summaryResp]) => {
        if (ignore) return;
        if (!eventsResp.ok) {
          setEventsError(eventsResp.body?.message || "Failed to load chat events.");
        } else {
          setEvents(Array.isArray(eventsResp.body?.items) ? eventsResp.body.items : []);
          setEventsTotal(Number(eventsResp.body?.total || 0));
        }
        if (summaryResp.ok && summaryResp.body) {
          setSummary({
            days: Number(summaryResp.body.days || 7),
            totalEvents: Number(summaryResp.body.totalEvents || 0),
            uniqueVisitors: Number(summaryResp.body.uniqueVisitors || 0),
            topProvider: summaryResp.body.topProvider || null,
            topProviderEvents: Number(summaryResp.body.topProviderEvents || 0),
          });
        }
      })
      .catch(() => {
        if (!ignore) setEventsError("Failed to load chat events.");
      })
      .finally(() => {
        if (!ignore) setEventsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [eventsPage, eventsPageSize]);

  const onToggle = (key) => (e) => {
    setNotice("");
    setForm((prev) => ({ ...prev, [key]: e.target.checked }));
  };

  const onSave = async () => {
    if (requireScript && !form.scriptSrc.trim()) {
      setError("Script URL is required for selected provider.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch("/api/admin/chat-widget-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message || "Failed to save chat settings.");
        setSaving(false);
        return;
      }
      const next = body?.settings || form;
      setForm(next);
      setSavedSnapshot(next);
      setNotice("Saved. Client chat settings are live.");
      setSaving(false);
    } catch {
      setError("Failed to save chat settings.");
      setSaving(false);
    }
  };

  return (
    <div className="jw-adminContentPlaceholder" style={{ textAlign: "left" }}>
      <h3 style={{ marginTop: 0 }}>Client Chat Settings</h3>
      <p>Control chat provider and embed script for client pages from admin.</p>

      {error ? <div className="jw-adminUsersPage__notice is-error">{error}</div> : null}
      {notice ? <div className="jw-adminUsersPage__notice is-success">{notice}</div> : null}

      <div style={{ display: "grid", gap: 10, maxWidth: 680 }}>
        <label>
          Provider
          <select
            className="jw-adminInput"
            value={form.provider}
            onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
            disabled={loading || saving}
          >
            <option value="none">None</option>
            <option value="tawk">Tawk.to</option>
            <option value="textcom">Text.com</option>
          </select>
        </label>

        <label>
          Script URL
          <input
            className="jw-adminInput"
            value={form.scriptSrc}
            onChange={(e) => setForm((prev) => ({ ...prev, scriptSrc: e.target.value }))}
            placeholder="https://embed.tawk.to/... or provider script URL"
            disabled={loading || saving}
          />
        </label>

        <label>
          <input type="checkbox" checked={form.enabled} onChange={onToggle("enabled")} disabled={loading || saving} />{" "}
          Enabled
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.startMinimized}
            onChange={onToggle("startMinimized")}
            disabled={loading || saving}
          />{" "}
          Start Minimized
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.hideOnAdmin}
            onChange={onToggle("hideOnAdmin")}
            disabled={loading || saving}
          />{" "}
          Hide on Admin routes
        </label>
        <label>
          <input type="checkbox" checked={form.hideOnAuth} onChange={onToggle("hideOnAuth")} disabled={loading || saving} />{" "}
          Hide on Login/Signup/Terms
        </label>

        <div>
          <button type="button" className="jw-adminUsersModal__btn is-green" onClick={onSave} disabled={loading || saving || !dirty}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />
      <h4 style={{ marginTop: 0 }}>Webhook & Reporting (Phase C)</h4>
      <p style={{ marginTop: 0 }}>
        Webhook endpoint: <code>/api/chat-widget/webhook</code>. Send secret via <code>x-chat-webhook-secret</code> header.
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
        <div><strong>7-day Events:</strong> {summary.totalEvents}</div>
        <div><strong>Unique Visitors:</strong> {summary.uniqueVisitors}</div>
        <div><strong>Top Provider:</strong> {summary.topProvider || "—"}{summary.topProvider ? ` (${summary.topProviderEvents})` : ""}</div>
      </div>
      {eventsError ? <div className="jw-adminUsersPage__notice is-error">{eventsError}</div> : null}
      <div className="jw-adminTableWrap">
        <table className="jw-adminTable">
          <thead>
            <tr>
              <th>Created</th>
              <th>Provider</th>
              <th>Event</th>
              <th>Visitor</th>
              <th>Conversation</th>
            </tr>
          </thead>
          <tbody>
            {eventsLoading ? (
              <tr>
                <td colSpan={5}><div className="jw-adminSkeleton" style={{ height: 20 }} /></td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="jw-adminEmpty">No chat events yet</td>
              </tr>
            ) : (
              events.map((r) => (
                <tr key={r.id}>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                  <td>{r.provider || "—"}</td>
                  <td>{r.eventName || "—"}</td>
                  <td>{r.visitorName || r.visitorEmail || "—"}</td>
                  <td>{r.conversationId || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination
        total={eventsTotal}
        page={eventsPage}
        pageSize={eventsPageSize}
        onPageChange={setEventsPage}
        onPageSizeChange={(n) => {
          setEventsPageSize(n);
          setEventsPage(1);
        }}
      />
    </div>
  );
}

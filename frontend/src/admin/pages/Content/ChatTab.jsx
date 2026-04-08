import React, { useEffect, useMemo, useState } from "react";

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
    </div>
  );
}

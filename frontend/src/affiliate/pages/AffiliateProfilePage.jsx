import React, { useEffect, useState } from "react";
import { affiliateApi } from "../services/affiliateApi";
import { AffiliatePage } from "../components/AffiliateShared";
import {
  AdminButton,
  AdminInput,
  AdminFilterField,
} from "../../admin/components/AdminFilterBar/AdminFilterBar";

export default function AffiliateProfilePage() {
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", country: "", telegram: "", whatsapp: "", newPassword: "",
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    affiliateApi.getProfile().then((d) => {
      const p = d.profile || {};
      setMeta(p);
      setForm((f) => ({
        ...f,
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        country: p.country || "",
        telegram: p.telegram || "",
        whatsapp: p.whatsapp || "",
      }));
    }).catch((e) => setError(e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    setSaving(true);
    try {
      await affiliateApi.patchProfile(form);
      setMsg("Profile updated.");
      setForm((f) => ({ ...f, newPassword: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AffiliatePage title="Profile" error={error}>
      {meta ? (
        <div className="jw-adminAffReportCard" style={{ marginBottom: 16, maxWidth: 520 }}>
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <div><strong>Username:</strong> {meta.username}</div>
            <div><strong>Referral Code:</strong> {meta.referralCode}</div>
            <div><strong>Plan:</strong> {meta.planName} ({meta.commissionPercent}%)</div>
            <div><strong>Commission Maturity:</strong> {meta.commissionMaturityDays} days</div>
          </div>
        </div>
      ) : null}
      <form onSubmit={save} className="jw-adminAffSettingsForm">
        {["name", "email", "phone", "country", "telegram", "whatsapp"].map((key) => (
          <AdminFilterField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
            <AdminInput value={form[key]} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
          </AdminFilterField>
        ))}
        <AdminFilterField label="New Password">
          <AdminInput
            type="password"
            value={form.newPassword}
            onChange={(v) => setForm((f) => ({ ...f, newPassword: v }))}
            placeholder="Leave blank to keep current"
          />
        </AdminFilterField>
        {msg ? <div style={{ color: "green" }}>{msg}</div> : null}
        <AdminButton type="submit" variant="green" disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </AdminButton>
      </form>
    </AffiliatePage>
  );
}

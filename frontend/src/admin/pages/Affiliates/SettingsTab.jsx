import React, { useEffect, useState } from "react";
import AdminFilterBar, { AdminButton, AdminInput, AdminFilterField } from "../../components/AdminFilterBar/AdminFilterBar";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import { AffiliateIntegratedLayout } from "./affiliateAdminShared";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../Users/usersPage.css";
import "./affiliateTab.css";

export default function SettingsTab() {
  const [settings, setSettings] = useState({});
  const [shareUrlTemplate, setShareUrlTemplate] = useState("");
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    affiliateAdminApi.getSettings().then((d) => {
      setSettings(d.settings || {});
      setShareUrlTemplate(d.shareUrlTemplate || "");
    }).catch((e) => setError(e.message));
    affiliateAdminApi.getPlans().then((d) => setPlans(d.plans || [])).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const data = await affiliateAdminApi.patchSettings(settings);
      setSettings(data.settings || settings);
      setMsg("Settings saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function setBool(key, checked) {
    setSettings((s) => ({ ...s, [key]: checked ? "1" : "0" }));
  }

  const filterBar = (
    <AdminFilterBar
      onSubmit={save}
      onClear={() => setMsg("")}
      actions={(
        <div className="jw-adminFilterBar__buttons">
          <AdminButton variant="green" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Settings"}
          </AdminButton>
        </div>
      )}
    />
  );

  return (
    <AffiliateIntegratedLayout filters={filterBar} error={error} pagination={null}>
      {msg ? <div style={{ color: "green", marginBottom: 12 }}>{msg}</div> : null}
      <div className="jw-adminAffSettingsForm">
        <AdminFilterField label="Minimum Withdrawal">
          <AdminInput
            type="number"
            value={settings.minimum_withdrawal ?? ""}
            onChange={(v) => setSettings((s) => ({ ...s, minimum_withdrawal: v }))}
          />
        </AdminFilterField>
        <AdminFilterField label="Cookie Days">
          <AdminInput
            type="number"
            value={settings.cookie_days ?? ""}
            onChange={(v) => setSettings((s) => ({ ...s, cookie_days: v }))}
          />
        </AdminFilterField>
        <AdminFilterField label="Commission Delay Days">
          <AdminInput
            type="number"
            value={settings.commission_delay_days ?? ""}
            onChange={(v) => setSettings((s) => ({ ...s, commission_delay_days: v }))}
          />
        </AdminFilterField>
        <AdminFilterField label="Default Commission Plan">
          <select
            className="jw-adminInput"
            value={settings.default_commission_plan_id ?? "1"}
            onChange={(e) => setSettings((s) => ({ ...s, default_commission_plan_id: e.target.value }))}
          >
            {plans.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.name} ({pl.commissionPercent}%)</option>
            ))}
          </select>
        </AdminFilterField>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.self_referral_allowed === "1"}
            onChange={(e) => setBool("self_referral_allowed", e.target.checked)}
          />
          Allow self-referral
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.wallet_verification_required !== "0"}
            onChange={(e) => setBool("wallet_verification_required", e.target.checked)}
          />
          Require wallet verification before withdrawal
        </label>

        <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Affiliate Support Contacts</div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Shown to all affiliates on the Support page. Not the affiliate’s personal profile contacts.
          </div>
          <AdminFilterField label="Support Telegram">
            <AdminInput
              value={settings.support_telegram ?? ""}
              onChange={(v) => setSettings((s) => ({ ...s, support_telegram: v }))}
              placeholder="@your_support or t.me/..."
            />
          </AdminFilterField>
          <AdminFilterField label="Support WhatsApp">
            <AdminInput
              value={settings.support_whatsapp ?? ""}
              onChange={(v) => setSettings((s) => ({ ...s, support_whatsapp: v }))}
              placeholder="+92..."
            />
          </AdminFilterField>
          <AdminFilterField label="Support Email">
            <AdminInput
              type="email"
              value={settings.support_email ?? ""}
              onChange={(v) => setSettings((s) => ({ ...s, support_email: v }))}
              placeholder="affiliates@jeetowin.com"
            />
          </AdminFilterField>
        </div>

        {shareUrlTemplate ? (
          <AdminFilterField label="Share URL Template (read-only)">
            <AdminInput value={shareUrlTemplate} disabled onChange={() => {}} />
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Edit in Referral Program settings. Use {"{code}"} for referral code.
            </div>
          </AdminFilterField>
        ) : null}
      </div>
    </AffiliateIntegratedLayout>
  );
}

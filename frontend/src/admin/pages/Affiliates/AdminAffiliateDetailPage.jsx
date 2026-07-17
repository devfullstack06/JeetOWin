import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import { AdminButton, AdminInput, AdminFilterField } from "../../components/AdminFilterBar/AdminFilterBar";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import { formatMoney, IntegratedAdminTable, StatusBadge, AffiliateIntegratedLayout } from "./affiliateAdminShared";
import "./affiliateTab.css";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "players", label: "Players" },
  { key: "commissions", label: "Commission Ledger" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "wallets", label: "Wallets" },
  { key: "statistics", label: "Statistics" },
  { key: "account", label: "Account" },
];

const PROFILE_FIELDS = ["name", "email", "phone", "country", "telegram", "whatsapp"];

function formatDate(v) {
  if (!v) return "—";
  return String(v).slice(0, 16).replace("T", " ");
}

export default function AdminAffiliateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [profileForm, setProfileForm] = useState({});
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setError("");
    affiliateAdminApi
      .getAffiliate(id)
      .then((d) => {
        setData(d);
        const p = d.profile || {};
        setProfileForm({
          name: p.name || "",
          email: p.email || "",
          phone: p.phone || "",
          country: p.country || "",
          telegram: p.telegram || "",
          whatsapp: p.whatsapp || "",
          status: p.status || "active",
          planId: String(p.plan_id || ""),
          commissionMaturityDays: String(p.commission_maturity_days || 30),
        });
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    affiliateAdminApi.getPlans().then((d) => setPlans(d.plans || [])).catch(() => {});
  }, []);

  async function saveProfile() {
    setSaving(true);
    setError("");
    setMsg("");
    try {
      await affiliateAdminApi.patchAffiliate(id, {
        ...profileForm,
        planId: Number(profileForm.planId),
        commissionMaturityDays: Number(profileForm.commissionMaturityDays),
      });
      setMsg("Profile updated.");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (!newPassword) return;
    setSaving(true);
    setError("");
    try {
      await affiliateAdminApi.patchAffiliate(id, { newPassword });
      setNewPassword("");
      setMsg("Password updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !data) {
    return (
      <AdminPageShell
        title="Affiliate Details"
        table={<div className="jw-adminUsersPage__notice is-error">{error}</div>}
      />
    );
  }

  if (!data) {
    return <AdminPageShell title="Affiliate Details" table={<div>Loading…</div>} />;
  }

  const p = data.profile;
  const balance = data.balance || {};

  const playerColumns = [
    { key: "username", label: "Username" },
    { key: "registeredAt", label: "Registered", render: (r) => formatDate(r.registeredAt).slice(0, 10) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "transferIn", label: "Transfer IN", render: (r) => formatMoney(r.transferIn) },
    { key: "transferOut", label: "Transfer OUT", render: (r) => formatMoney(r.transferOut) },
    { key: "bonusPaid", label: "Bonus", render: (r) => formatMoney(r.bonusPaid) },
    { key: "netAmount", label: "Net", render: (r) => formatMoney(r.netAmount) },
    { key: "commission", label: "Commission", render: (r) => formatMoney(r.commission) },
  ];

  const commissionColumns = [
    { key: "period", label: "Period", render: (r) => `${String(r.period_start || "").slice(0, 10)} – ${String(r.period_end || "").slice(0, 10)}` },
    { key: "playerUsername", label: "Player" },
    { key: "transfer_in_total", label: "Transfer IN", render: (r) => formatMoney(r.transfer_in_total) },
    { key: "transfer_out_total", label: "Transfer OUT", render: (r) => formatMoney(r.transfer_out_total) },
    { key: "net_amount", label: "Net", render: (r) => formatMoney(r.net_amount) },
    { key: "commission_amount", label: "Commission", render: (r) => formatMoney(r.commission_amount) },
    { key: "maturity_at", label: "Matures", render: (r) => formatDate(r.maturity_at).slice(0, 10) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "remarks", label: "Remarks", render: (r) => r.remarks || "—" },
  ];

  const withdrawalColumns = [
    { key: "created_at", label: "Date", render: (r) => formatDate(r.created_at).slice(0, 10) },
    { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
    { key: "walletCompany", label: "Wallet Company" },
    { key: "accountTitle", label: "Account Title" },
    { key: "accountNumber", label: "Account Number" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "remarks", label: "Remarks", render: (r) => r.remarks || "—" },
  ];

  const walletColumns = [
    { key: "walletCompany", label: "Wallet Company" },
    { key: "account_title", label: "Account Title" },
    { key: "account_number", label: "Account Number" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "created_at", label: "Created", render: (r) => formatDate(r.created_at).slice(0, 10) },
  ];

  const balanceCards = [
    { label: "Available Balance", value: formatMoney(balance.availableBalance) },
    { label: "Approved Commissions", value: formatMoney(balance.approvedCommissions) },
    { label: "Pending Commissions", value: formatMoney(balance.pendingCommissions) },
    { label: "Approved (Not Matured)", value: formatMoney(balance.approvedNotMatured) },
    { label: "Paid Withdrawals", value: formatMoney(balance.paidWithdrawals) },
    { label: "Pending Withdrawals", value: formatMoney(balance.pendingWithdrawals) },
  ];

  return (
    <AdminPageShell
      title={`Affiliate: ${p.name}`}
      tabs={<AdminTabs tabs={TABS} activeKey={tab} onChange={setTab} />}
      filters={
        <AdminButton onClick={() => navigate("/admin/affiliate/affiliates")}>← Back to Affiliates</AdminButton>
      }
      table={(
        <>
          {tab === "profile" ? (
            <AffiliateIntegratedLayout error={error || null} pagination={null}>
              {msg ? <div style={{ color: "green", marginBottom: 8 }}>{msg}</div> : null}
              <div className="jw-adminAffSettingsForm">
                <div style={{ color: "#666", fontSize: 13 }}>
                  Username: <strong>{p.username}</strong> · Referral Code: <strong>{p.referral_code}</strong>
                </div>
                {PROFILE_FIELDS.map((key) => (
                  <AdminFilterField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                    <AdminInput
                      value={profileForm[key] || ""}
                      onChange={(v) => setProfileForm((f) => ({ ...f, [key]: v }))}
                    />
                  </AdminFilterField>
                ))}
                <AdminFilterField label="Status">
                  <select
                    className="jw-adminInput"
                    value={profileForm.status}
                    onChange={(e) => setProfileForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </AdminFilterField>
                <AdminFilterField label="Commission Plan">
                  <select
                    className="jw-adminInput"
                    value={profileForm.planId}
                    onChange={(e) => setProfileForm((f) => ({ ...f, planId: e.target.value }))}
                  >
                    {plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.name} ({pl.commissionPercent}%)</option>
                    ))}
                  </select>
                </AdminFilterField>
                <AdminFilterField label="Commission Maturity Days">
                  <select
                    className="jw-adminInput"
                    value={profileForm.commissionMaturityDays}
                    onChange={(e) => setProfileForm((f) => ({ ...f, commissionMaturityDays: e.target.value }))}
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </AdminFilterField>
                <AdminButton onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving…" : "Save Profile"}
                </AdminButton>
              </div>
            </AffiliateIntegratedLayout>
          ) : null}

          {tab === "players" ? (
            <AffiliateIntegratedLayout error={error || null} pagination={null}>
              <IntegratedAdminTable columns={playerColumns} rows={data.players} emptyText="No players yet." />
            </AffiliateIntegratedLayout>
          ) : null}

          {tab === "commissions" ? (
            <AffiliateIntegratedLayout error={error || null} pagination={null}>
              <IntegratedAdminTable columns={commissionColumns} rows={data.commissions} emptyText="No commissions yet." />
            </AffiliateIntegratedLayout>
          ) : null}

          {tab === "withdrawals" ? (
            <AffiliateIntegratedLayout error={error || null} pagination={null}>
              <IntegratedAdminTable columns={withdrawalColumns} rows={data.withdrawals} emptyText="No withdrawals yet." />
            </AffiliateIntegratedLayout>
          ) : null}

          {tab === "wallets" ? (
            <AffiliateIntegratedLayout error={error || null} pagination={null}>
              <IntegratedAdminTable columns={walletColumns} rows={data.wallets} emptyText="No wallets yet." />
            </AffiliateIntegratedLayout>
          ) : null}

          {tab === "statistics" ? (
            <AffiliateIntegratedLayout error={error || null} pagination={null}>
              <div className="jw-adminAffReportsGrid">
                {balanceCards.map((c) => (
                  <div key={c.label} className="jw-adminAffReportCard">
                    <div className="jw-adminAffReportCard__label">{c.label}</div>
                    <div className="jw-adminAffReportCard__value">{c.value}</div>
                  </div>
                ))}
              </div>
            </AffiliateIntegratedLayout>
          ) : null}

          {tab === "account" ? (
            <AffiliateIntegratedLayout error={error || null} pagination={null}>
              {msg ? <div style={{ color: "green", marginBottom: 8 }}>{msg}</div> : null}
              <div className="jw-adminAffSettingsForm">
                <div>Last login: {formatDate(p.lastLoginAt)}</div>
                <AdminFilterField label="New Password">
                  <AdminInput type="password" placeholder="Min 6 characters" value={newPassword} onChange={setNewPassword} />
                </AdminFilterField>
                <AdminButton onClick={savePassword} disabled={saving || !newPassword}>
                  Reset Password
                </AdminButton>
              </div>
            </AffiliateIntegratedLayout>
          ) : null}
        </>
      )}
    />
  );
}

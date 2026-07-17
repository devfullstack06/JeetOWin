import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { affiliateApi } from "../services/affiliateApi";
import {
  AffiliateActionModal,
  AffiliatePage,
  AffiliateTable,
  StatusBadge,
} from "../components/AffiliateShared";
import AdminFilterBar, {
  AdminButton,
  AdminInput,
  AdminFilterField,
} from "../../admin/components/AdminFilterBar/AdminFilterBar";

export default function AffiliateWalletsPage() {
  const [wallets, setWallets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ walletCompanyId: "", accountTitle: "", accountNumber: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([affiliateApi.getWallets(), affiliateApi.getWalletCompanies()])
      .then(([w, c]) => {
        setWallets(w.wallets || []);
        setCompanies(c.companies || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await affiliateApi.createWallet({
        walletCompanyId: Number(form.walletCompanyId),
        accountTitle: form.accountTitle,
        accountNumber: form.accountNumber,
      });
      setForm({ walletCompanyId: "", accountTitle: "", accountNumber: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleWallet(id, status) {
    setError("");
    try {
      await affiliateApi.patchWallet(id, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const columns = [
    { key: "walletCompany", label: "Wallet Company" },
    { key: "accountTitle", label: "Account Title" },
    { key: "accountNumber", label: "Account Number" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", label: "Created", render: (r) => String(r.createdAt || "").slice(0, 10) },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <AdminButton
          variant="light"
          onClick={() =>
            toggleWallet(
              r.id,
              r.status === "verified" || r.status === "active" ? "inactive" : "active"
            )
          }
        >
          {r.status === "inactive" ? "Activate" : "Deactivate"}
        </AdminButton>
      ),
    },
  ];

  const filterBar = (
    <AdminFilterBar
      onSubmit={load}
      onClear={() => setError("")}
      actions={(
        <div className="jw-adminFilterBar__buttons">
          <AdminButton variant="green" onClick={() => { setError(""); setShowAdd(true); }}>
            <span className="jw-adminCreateBtnInner">
              Add Wallet <Plus size={16} style={{ marginLeft: 4 }} />
            </span>
          </AdminButton>
        </div>
      )}
    />
  );

  return (
    <>
      <AffiliatePage title="Wallets" filters={filterBar} error={error}>
        <AffiliateTable columns={columns} rows={wallets} loading={loading} emptyText="No wallets yet." />
      </AffiliatePage>
      <AffiliateActionModal
        open={showAdd}
        title="Add Wallet"
        onClose={() => setShowAdd(false)}
        onConfirm={submit}
        confirmLabel="Add Wallet"
        saving={saving}
      >
        <AdminFilterField label="Wallet Company">
          <select
            className="jw-adminInput"
            value={form.walletCompanyId}
            onChange={(e) => setForm((f) => ({ ...f, walletCompanyId: e.target.value }))}
            required
          >
            <option value="">Select…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Account Title">
          <AdminInput
            value={form.accountTitle}
            onChange={(v) => setForm((f) => ({ ...f, accountTitle: v }))}
            required
          />
        </AdminFilterField>
        <AdminFilterField label="Account Number">
          <AdminInput
            value={form.accountNumber}
            onChange={(v) => setForm((f) => ({ ...f, accountNumber: v }))}
            required
          />
        </AdminFilterField>
      </AffiliateActionModal>
    </>
  );
}

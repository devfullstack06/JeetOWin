import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { affiliateApi } from "../services/affiliateApi";
import {
  AffiliateActionModal,
  AffiliatePage,
  AffiliateTable,
  StatusBadge,
  formatMoney,
} from "../components/AffiliateShared";
import {
  AdminButton,
  AdminInput,
  AdminFilterField,
} from "../../admin/components/AdminFilterBar/AdminFilterBar";
import "../../admin/components/AdminFilterBar/adminFilterBar.css";
import "../../admin/pages/Affiliates/affiliateTab.css";

export default function AffiliateWithdrawalsPage() {
  const [availableBalance, setAvailableBalance] = useState(0);
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(0);
  const [withdrawals, setWithdrawals] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({ walletId: "", amount: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([affiliateApi.getWithdrawals(), affiliateApi.getWallets()])
      .then(([wd, wl]) => {
        setAvailableBalance(wd.availableBalance);
        setMinimumWithdrawal(wd.minimumWithdrawal || 0);
        setWithdrawals(wd.withdrawals || []);
        setWallets((wl.wallets || []).filter((w) => w.status === "verified" || w.status === "active"));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await affiliateApi.createWithdrawal({
        walletId: Number(form.walletId),
        amount: Number(form.amount),
      });
      setForm({ walletId: "", amount: "" });
      setShowRequest(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "date", label: "Date", render: (r) => String(r.date || "").slice(0, 10) },
    { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
    { key: "walletCompany", label: "Wallet Company" },
    { key: "accountTitle", label: "Account Title" },
    { key: "accountNumber", label: "Account Number" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "remarks", label: "Remarks", render: (r) => r.remarks || "—" },
  ];

  const filterBar = (
    <div className="jw-affWithdrawToolbar">
      <div className="jw-affWithdrawToolbar__stats">
        <span className="jw-affWithdrawToolbar__stat">
          Available Balance: <strong>{formatMoney(availableBalance)}</strong>
        </span>
        {minimumWithdrawal > 0 ? (
          <span className="jw-affWithdrawToolbar__stat">
            Minimum withdrawal: <strong>{formatMoney(minimumWithdrawal)}</strong>
          </span>
        ) : null}
      </div>
      <AdminButton
        variant="green"
        onClick={() => { setError(""); setShowRequest(true); }}
      >
        <span className="jw-adminCreateBtnInner">
          Request Withdrawal <Plus size={16} style={{ marginLeft: 4 }} />
        </span>
      </AdminButton>
    </div>
  );

  return (
    <>
      <AffiliatePage title="Withdrawals" filters={filterBar} error={error}>
        <AffiliateTable
          columns={columns}
          rows={withdrawals}
          loading={loading}
          emptyText="No withdrawal requests yet."
        />
      </AffiliatePage>
      <AffiliateActionModal
        open={showRequest}
        title="Request Withdrawal"
        onClose={() => setShowRequest(false)}
        onConfirm={submit}
        confirmLabel="Submit Request"
        saving={saving}
      >
        <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
          Available: <strong>{formatMoney(availableBalance)}</strong>
          {minimumWithdrawal > 0 ? (
            <> · Min: <strong>{formatMoney(minimumWithdrawal)}</strong></>
          ) : null}
        </div>
        <AdminFilterField label="Select Wallet">
          <select
            className="jw-adminInput"
            value={form.walletId}
            onChange={(e) => setForm((f) => ({ ...f, walletId: e.target.value }))}
            required
          >
            <option value="">Select…</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.walletCompany} — {w.accountNumber}
              </option>
            ))}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Amount">
          <AdminInput
            type="number"
            value={form.amount}
            onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            required
          />
        </AdminFilterField>
      </AffiliateActionModal>
    </>
  );
}

import React, { useEffect, useState } from "react";
import AdminFilterBar, { AdminButton, AdminInput, AdminFilterField } from "../../components/AdminFilterBar/AdminFilterBar";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import {
  ActionModal,
  AffiliateIntegratedLayout,
  AffiliateTablePagination,
  formatMoney,
  IntegratedAdminTable,
  StatusBadge,
  useClientPagination,
} from "./affiliateAdminShared";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../../components/AdminTable/adminTable.css";
import "./affiliateTab.css";

export default function WithdrawalsTab() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    affiliateAdminApi
      .getWithdrawals()
      .then((d) => setRows(d.withdrawals || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function applyStatus(status) {
    if (!modal?.row) return;
    setSaving(true);
    try {
      await affiliateAdminApi.patchWithdrawalStatus(modal.row.id, { status, remarks });
      setModal(null);
      setRemarks("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const { total, pageRows } = useClientPagination(rows, page, pageSize);

  const columns = [
    { key: "date", label: "Date", render: (r) => String(r.date || "").slice(0, 16) },
    { key: "affiliate", label: "Affiliate" },
    { key: "amount", label: "Amount", render: (r) => formatMoney(r.amount) },
    { key: "walletCompany", label: "Wallet Company" },
    { key: "accountTitle", label: "Account Title" },
    { key: "accountNumber", label: "Account Number" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "remarks", label: "Remarks", render: (r) => r.remarks || "—" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <AdminButton onClick={() => setModal({ type: "approve", row: r })}>Approve</AdminButton>
          <AdminButton onClick={() => setModal({ type: "reject", row: r })}>Reject</AdminButton>
          <AdminButton onClick={() => setModal({ type: "paid", row: r })}>Mark Paid</AdminButton>
        </div>
      ),
    },
  ];

  const filterBar = (
    <AdminFilterBar
      onSubmit={load}
      onClear={() => setPage(1)}
      actions={(
        <div className="jw-adminFilterBar__buttons">
          <AdminButton variant="green" onClick={load}>Refresh</AdminButton>
        </div>
      )}
    />
  );

  return (
    <>
      <AffiliateIntegratedLayout
        filters={filterBar}
        error={error}
        pagination={(
          <AffiliateTablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          />
        )}
      >
        <IntegratedAdminTable columns={columns} rows={pageRows} loading={loading} />
      </AffiliateIntegratedLayout>
      {["approve", "reject", "paid"].map((type) => (
        <ActionModal
          key={type}
          open={modal?.type === type}
          title={`${type.charAt(0).toUpperCase() + type.slice(1)} withdrawal`}
          onClose={() => setModal(null)}
          onConfirm={() => applyStatus(type)}
          confirmLabel={type === "paid" ? "Mark Paid" : type.charAt(0).toUpperCase() + type.slice(1)}
          saving={saving}
        >
          <AdminFilterField label="Remarks">
            <AdminInput value={remarks} onChange={setRemarks} />
          </AdminFilterField>
        </ActionModal>
      ))}
    </>
  );
}

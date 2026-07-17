import React, { useEffect, useState } from "react";
import AdminFilterBar, { AdminButton, AdminInput, AdminFilterField } from "../../components/AdminFilterBar/AdminFilterBar";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import {
  ActionModal,
  AdminTableEditBtn,
  AdminTableViewBtn,
  AffiliateIntegratedLayout,
  AffiliateTablePagination,
  formatMoney,
  IntegratedAdminTable,
  StatusBadge,
  useClientPagination,
} from "./affiliateAdminShared";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";
import "./affiliateTab.css";

function formatDate(v) {
  if (!v) return "—";
  return String(v).slice(0, 10);
}

export default function CommissionsTab() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ affiliateId: "", status: "" });
  const [applied, setApplied] = useState({ affiliateId: "", status: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    const q = {};
    if (applied.affiliateId) q.affiliateId = applied.affiliateId;
    if (applied.status) q.status = applied.status;
    affiliateAdminApi
      .getCommissions(q)
      .then((d) => setRows(d.commissions || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [applied]);

  async function openHistory(row) {
    setModal({ type: "history", row });
    setAdjustments([]);
    try {
      const d = await affiliateAdminApi.getCommissionAdjustments(row.id);
      setAdjustments(d.adjustments || []);
    } catch (e) {
      setError(e.message);
    }
  }

  async function applyStatus(status) {
    if (!modal?.row) return;
    setSaving(true);
    try {
      await affiliateAdminApi.patchCommissionStatus(modal.row.id, { status, remarks });
      setModal(null);
      setRemarks("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function applyAdjust() {
    if (!modal?.row || !remarks.trim()) {
      setError("Remarks are required for adjustments.");
      return;
    }
    setSaving(true);
    try {
      await affiliateAdminApi.adjustCommission(modal.row.id, {
        adjustmentAmount: Number(adjustAmount),
        reason: remarks,
      });
      setModal(null);
      setRemarks("");
      setAdjustAmount("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const { total, pageRows } = useClientPagination(rows, page, pageSize);

  const columns = [
    { key: "period", label: "Date Range", render: (r) => `${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}` },
    { key: "affiliateName", label: "Affiliate" },
    { key: "player", label: "Player" },
    { key: "transferIn", label: "Transfer IN", render: (r) => formatMoney(r.transferIn) },
    { key: "transferOut", label: "Transfer OUT", render: (r) => formatMoney(r.transferOut) },
    { key: "bonusPaid", label: "Bonus", render: (r) => formatMoney(r.bonusPaid) },
    { key: "netAmount", label: "Net", render: (r) => formatMoney(r.netAmount) },
    { key: "commissionPercent", label: "%", render: (r) => `${r.commissionPercent}%` },
    { key: "commissionAmount", label: "Commission", render: (r) => formatMoney(r.commissionAmount) },
    { key: "maturityAt", label: "Matures", render: (r) => formatDate(r.maturityAt) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "remarks", label: "Remarks", render: (r) => r.remarks || "—" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <>
          <AdminButton onClick={() => setModal({ type: "approve", row: r })}>Approve</AdminButton>
          <AdminButton onClick={() => setModal({ type: "reject", row: r })}>Reject</AdminButton>
          <AdminButton onClick={() => setModal({ type: "paid", row: r })}>Mark Paid</AdminButton>
          <AdminTableEditBtn title="Adjust commission" onClick={() => setModal({ type: "adjust", row: r })} />
          <AdminTableViewBtn title="Adjustment history" onClick={() => openHistory(r)} />
        </>
      ),
    },
  ];

  const filterBar = (
    <AdminFilterBar
      onSubmit={() => { setApplied({ ...filters }); setPage(1); }}
      onClear={() => {
        setFilters({ affiliateId: "", status: "" });
        setApplied({ affiliateId: "", status: "" });
        setPage(1);
      }}
    >
      <AdminFilterField label="Affiliate ID">
        <AdminInput value={filters.affiliateId} onChange={(v) => setFilters((f) => ({ ...f, affiliateId: v }))} placeholder="Optional" />
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select
          className={`jw-adminInput ${!filters.status ? "jw-adminInput--placeholder" : ""}`}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </AdminFilterField>
    </AdminFilterBar>
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
      <ActionModal open={modal?.type === "approve"} title="Approve commission" onClose={() => setModal(null)} onConfirm={() => applyStatus("approved")} confirmLabel="Approve" saving={saving}>
        <AdminFilterField label="Remarks (optional)"><AdminInput value={remarks} onChange={setRemarks} /></AdminFilterField>
      </ActionModal>
      <ActionModal open={modal?.type === "reject"} title="Reject commission" onClose={() => setModal(null)} onConfirm={() => applyStatus("rejected")} confirmLabel="Reject" saving={saving}>
        <AdminFilterField label="Remarks"><AdminInput value={remarks} onChange={setRemarks} /></AdminFilterField>
      </ActionModal>
      <ActionModal open={modal?.type === "paid"} title="Mark commission paid" onClose={() => setModal(null)} onConfirm={() => applyStatus("paid")} confirmLabel="Mark Paid" saving={saving}>
        <AdminFilterField label="Remarks (optional)"><AdminInput value={remarks} onChange={setRemarks} /></AdminFilterField>
      </ActionModal>
      <ActionModal open={modal?.type === "adjust"} title="Adjust commission" onClose={() => setModal(null)} onConfirm={applyAdjust} confirmLabel="Apply Adjustment" saving={saving}>
        <AdminFilterField label="Adjustment amount (+/-)"><AdminInput type="number" value={adjustAmount} onChange={setAdjustAmount} /></AdminFilterField>
        <AdminFilterField label="Remarks (required)"><AdminInput value={remarks} onChange={setRemarks} /></AdminFilterField>
      </ActionModal>
      <ActionModal open={modal?.type === "history"} title={`Adjustment History — #${modal?.row?.id || ""}`} onClose={() => setModal(null)} onConfirm={() => setModal(null)} confirmLabel="Close" saving={false}>
        {adjustments.length ? (
          <div className="jw-adminTableWrap">
            <table className="jw-adminTable">
              <thead><tr><th>Date</th><th>Amount</th><th>Reason</th><th>Admin</th></tr></thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDate(a.createdAt)}</td>
                    <td>{formatMoney(a.adjustmentAmount)}</td>
                    <td>{a.reason}</td>
                    <td>{a.adminUsername || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="jw-adminEmpty">No adjustments recorded.</div>
        )}
      </ActionModal>
    </>
  );
}

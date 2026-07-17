import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import AdminFilterBar, { AdminButton, AdminInput, AdminFilterField } from "../../components/AdminFilterBar/AdminFilterBar";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import {
  ActionModal,
  AdminTableEditBtn,
  AffiliateIntegratedLayout,
  AffiliateTablePagination,
  IntegratedAdminTable,
  StatusBadge,
  useClientPagination,
} from "./affiliateAdminShared";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";
import "./affiliateTab.css";

export default function PlansTab() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({ name: "", commissionPercent: "", status: "active" });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    affiliateAdminApi
      .getPlans()
      .then((d) => setRows(d.plans || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function saveCreate() {
    setSaving(true);
    try {
      await affiliateAdminApi.createPlan({
        name: form.name,
        commissionPercent: Number(form.commissionPercent),
        status: form.status,
      });
      setShowCreate(false);
      setForm({ name: "", commissionPercent: "", status: "active" });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editRow) return;
    setSaving(true);
    try {
      await affiliateAdminApi.patchPlan(editRow.id, {
        name: form.name,
        commissionPercent: Number(form.commissionPercent),
        status: form.status,
      });
      setEditRow(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const { total, pageRows } = useClientPagination(rows, page, pageSize);

  const columns = [
    { key: "name", label: "Name" },
    { key: "commissionPercent", label: "Commission %", render: (r) => `${r.commissionPercent}%` },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <AdminTableEditBtn
          title="Edit plan"
          onClick={() => {
            setEditRow(r);
            setForm({ name: r.name, commissionPercent: r.commissionPercent, status: r.status });
          }}
        />
      ),
    },
  ];

  const filterBar = (
    <AdminFilterBar
      onSubmit={load}
      onClear={() => setPage(1)}
      actions={(
        <div className="jw-adminFilterBar__buttons">
          <AdminButton variant="light" onClick={() => setPage(1)}>Clear</AdminButton>
          <AdminButton variant="green" onClick={() => setShowCreate(true)}>
            <span className="jw-adminCreateBtnInner">
              Add Plan <Plus size={16} style={{ marginLeft: 4 }} />
            </span>
          </AdminButton>
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
      <ActionModal open={showCreate} title="Add plan" onClose={() => setShowCreate(false)} onConfirm={saveCreate} saving={saving}>
        <PlanFields form={form} setForm={setForm} />
      </ActionModal>
      <ActionModal open={!!editRow} title="Edit plan" onClose={() => setEditRow(null)} onConfirm={saveEdit} saving={saving}>
        <PlanFields form={form} setForm={setForm} />
      </ActionModal>
    </>
  );
}

function PlanFields({ form, setForm }) {
  return (
    <>
      <AdminFilterField label="Name">
        <AdminInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
      </AdminFilterField>
      <AdminFilterField label="Commission %">
        <AdminInput type="number" value={form.commissionPercent} onChange={(v) => setForm((f) => ({ ...f, commissionPercent: v }))} />
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select className="jw-adminInput" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </AdminFilterField>
    </>
  );
}

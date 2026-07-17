import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import AdminFilterBar, { AdminButton, AdminInput, AdminFilterField } from "../../components/AdminFilterBar/AdminFilterBar";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import {
  ActionModal,
  AdminTableEditBtn,
  AdminTableViewBtn,
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

const ASSET_TYPES = [
  "banner", "logo", "social_image", "video", "brand_asset", "telegram_graphic", "promotional_text",
];

export default function AssetsTab() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: "", type: "banner", textContent: "", fileUrl: "", sortOrder: 0, status: "active" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    affiliateAdminApi
      .getAssets()
      .then((d) => setRows(d.assets || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("type", form.type);
      fd.append("textContent", form.textContent || "");
      fd.append("fileUrl", form.fileUrl || "");
      fd.append("sortOrder", String(form.sortOrder || 0));
      fd.append("status", form.status || "active");
      if (file) fd.append("file", file);
      if (modal?.row) {
        await affiliateAdminApi.patchAsset(modal.row.id, fd);
      } else {
        await affiliateAdminApi.createAsset(fd);
      }
      setModal(null);
      setFile(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this asset?")) return;
    await affiliateAdminApi.deleteAsset(id);
    load();
  }

  const { total, pageRows } = useClientPagination(rows, page, pageSize);

  const columns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "sortOrder", label: "Sort" },
    {
      key: "file",
      label: "File",
      render: (r) => (r.fileUrl ? <AdminTableViewBtn href={r.fileUrl} title="View file" /> : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <>
          <AdminTableEditBtn
            title="Edit asset"
            onClick={() => {
              setModal({ row: r });
              setForm({
                title: r.title,
                type: r.type,
                textContent: r.textContent || "",
                fileUrl: r.fileUrl || "",
                sortOrder: r.sortOrder || 0,
                status: r.status,
              });
            }}
          />
          <AdminButton onClick={() => remove(r.id)}>Delete</AdminButton>
        </>
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
          <AdminButton
            variant="green"
            onClick={() => { setModal({}); setForm({ title: "", type: "banner", textContent: "", fileUrl: "", sortOrder: 0, status: "active" }); }}
          >
            <span className="jw-adminCreateBtnInner">
              Add Asset <Plus size={16} style={{ marginLeft: 4 }} />
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
      <ActionModal open={!!modal} title={modal?.row ? "Edit asset" : "Add asset"} onClose={() => setModal(null)} onConfirm={save} saving={saving}>
        <AdminFilterField label="Title">
          <AdminInput value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
        </AdminFilterField>
        <AdminFilterField label="Type">
          <select className="jw-adminInput" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Promotional text">
          <textarea className="jw-adminUsersModal__input" rows={3} value={form.textContent} onChange={(e) => setForm((f) => ({ ...f, textContent: e.target.value }))} />
        </AdminFilterField>
        <AdminFilterField label="File URL (optional if uploading)">
          <AdminInput value={form.fileUrl} onChange={(v) => setForm((f) => ({ ...f, fileUrl: v }))} />
        </AdminFilterField>
        <AdminFilterField label="Upload file">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </AdminFilterField>
        <AdminFilterField label="Sort order">
          <AdminInput type="number" value={form.sortOrder} onChange={(v) => setForm((f) => ({ ...f, sortOrder: v }))} />
        </AdminFilterField>
        <AdminFilterField label="Status">
          <select className="jw-adminInput" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </AdminFilterField>
      </ActionModal>
    </>
  );
}

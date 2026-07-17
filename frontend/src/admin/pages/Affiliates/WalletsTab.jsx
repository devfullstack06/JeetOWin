import React, { useEffect, useState } from "react";
import AdminFilterBar, { AdminButton } from "../../components/AdminFilterBar/AdminFilterBar";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import {
  AffiliateIntegratedLayout,
  AffiliateTablePagination,
  IntegratedAdminTable,
  StatusBadge,
  useClientPagination,
} from "./affiliateAdminShared";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../../components/AdminTable/adminTable.css";
import "./affiliateTab.css";

export default function WalletsTab() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    affiliateAdminApi
      .getWallets()
      .then((d) => setRows(d.wallets || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, action) {
    try {
      await affiliateAdminApi.patchWalletStatus(id, { action });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const { total, pageRows } = useClientPagination(rows, page, pageSize);

  const columns = [
    { key: "affiliate", label: "Affiliate" },
    { key: "walletCompany", label: "Wallet Company" },
    { key: "accountTitle", label: "Account Title" },
    { key: "accountNumber", label: "Account Number" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", label: "Created", render: (r) => String(r.createdAt || "").slice(0, 10) },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <AdminButton onClick={() => setStatus(r.id, "verify")}>Verify</AdminButton>
          <AdminButton onClick={() => setStatus(r.id, "reject")}>Reject</AdminButton>
          <AdminButton onClick={() => setStatus(r.id, "disable")}>Disable</AdminButton>
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
  );
}

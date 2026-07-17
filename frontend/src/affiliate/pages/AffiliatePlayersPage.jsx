import React, { useEffect, useState } from "react";
import { affiliateApi } from "../services/affiliateApi";
import {
  AffiliatePage,
  AffiliateTable,
  AffiliateTablePagination,
  DATE_PRESETS,
  StatusBadge,
  buildDateQuery,
  formatMoney,
} from "../components/AffiliateShared";
import AdminFilterBar, {
  AdminInput,
  AdminFilterField,
} from "../../admin/components/AdminFilterBar/AdminFilterBar";
import AdminDateRange from "../../admin/components/AdminDateRange/AdminDateRange";

const EMPTY = { preset: "30days", startDate: "", endDate: "", search: "" };

export default function AffiliatePlayersPage() {
  const [filters, setFilters] = useState({ ...EMPTY });
  const [applied, setApplied] = useState({ ...EMPTY });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    affiliateApi
      .getPlayers({
        ...buildDateQuery(applied),
        search: applied.search || undefined,
        page,
        pageSize,
      })
      .then((d) => {
        setRows(d.rows || []);
        setTotal(Number(d.total) || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [applied, page, pageSize]);

  const columns = [
    { key: "username", label: "Username" },
    { key: "registrationDate", label: "Registration Date", render: (r) => String(r.registrationDate || "").slice(0, 10) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "firstTransferIn", label: "First Transfer IN", render: (r) => (r.firstTransferIn ? String(r.firstTransferIn).slice(0, 10) : "—") },
    { key: "totalTransferIn", label: "Transfer IN", render: (r) => formatMoney(r.totalTransferIn) },
    { key: "totalTransferOut", label: "Transfer OUT", render: (r) => formatMoney(r.totalTransferOut) },
    { key: "bonusPaid", label: "Bonus Paid", render: (r) => formatMoney(r.bonusPaid) },
    { key: "netAmount", label: "Net", render: (r) => formatMoney(r.netAmount) },
    { key: "commissionEarned", label: "Commission", render: (r) => formatMoney(r.commissionEarned) },
    { key: "lastActive", label: "Last Active", render: (r) => (r.lastActive ? String(r.lastActive).slice(0, 10) : "—") },
  ];

  const filterBar = (
    <AdminFilterBar
      onSubmit={() => {
        const next = { ...filters };
        if (next.startDate && next.endDate) next.preset = "custom";
        setApplied(next);
        setPage(1);
      }}
      onClear={() => {
        setFilters({ ...EMPTY });
        setApplied({ ...EMPTY });
        setPage(1);
      }}
    >
      <AdminFilterField label="Date Range">
        <select
          className="jw-adminInput"
          value={filters.preset === "custom" ? "30days" : filters.preset}
          onChange={(e) => setFilters((f) => ({
            ...f,
            preset: e.target.value,
            startDate: "",
            endDate: "",
          }))}
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </AdminFilterField>
      <AdminFilterField label="Date">
        <AdminDateRange
          startDate={filters.startDate}
          endDate={filters.endDate}
          placeholder="Please Select"
          onChange={({ startDate, endDate }) =>
            setFilters((f) => ({
              ...f,
              startDate: startDate || "",
              endDate: endDate || "",
            }))
          }
        />
      </AdminFilterField>
      <AdminFilterField label="Search">
        <AdminInput
          value={filters.search}
          onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
          placeholder="Username"
        />
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <AffiliatePage
      title="Players"
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
      <AffiliateTable columns={columns} rows={rows} loading={loading} emptyText="No players found." />
    </AffiliatePage>
  );
}

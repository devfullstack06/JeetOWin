import React, { useEffect, useState } from "react";
import AdminFilterBar, { AdminInput, AdminFilterField } from "../../components/AdminFilterBar/AdminFilterBar";
import AdminDateRange from "../../components/AdminDateRange/AdminDateRange";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import { AffiliateIntegratedLayout, formatMoney } from "./affiliateAdminShared";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "./affiliateTab.css";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7days", label: "7 Days" },
  { key: "30days", label: "30 Days" },
  { key: "this_month", label: "This Month" },
];

const EMPTY_FILTERS = {
  preset: "this_month",
  startDate: "",
  endDate: "",
  affiliateId: "",
};

export default function ReportsTab() {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState({ ...EMPTY_FILTERS });
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    const q = {};
    if (applied.affiliateId) q.affiliateId = applied.affiliateId;
    if (applied.preset === "custom" && applied.startDate && applied.endDate) {
      q.preset = "custom";
      q.startDate = applied.startDate;
      q.endDate = applied.endDate;
    } else {
      q.preset = applied.preset || "this_month";
    }
    affiliateAdminApi
      .getReports(q)
      .then((d) => setMetrics(d.metrics))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [applied]);

  const cards = metrics
    ? [
        { label: "Transfer IN", value: formatMoney(metrics.transferIn) },
        { label: "Transfer OUT", value: formatMoney(metrics.transferOut) },
        { label: "Bonus Paid", value: formatMoney(metrics.bonusPaid) },
        { label: "Net Amount", value: formatMoney(metrics.netAmount) },
        { label: "Commission", value: formatMoney(metrics.commission) },
        { label: "Withdrawals", value: formatMoney(metrics.withdrawals) },
      ]
    : [];

  const filterBar = (
    <AdminFilterBar
      onSubmit={() => {
        const next = { ...filters };
        if (next.startDate && next.endDate) {
          next.preset = "custom";
        }
        setApplied(next);
      }}
      onClear={() => {
        setFilters({ ...EMPTY_FILTERS });
        setApplied({ ...EMPTY_FILTERS });
      }}
    >
      <AdminFilterField label="Date Range">
        <select
          className="jw-adminInput"
          value={filters.preset === "custom" ? "this_month" : filters.preset}
          onChange={(e) => setFilters((f) => ({
            ...f,
            preset: e.target.value,
            startDate: "",
            endDate: "",
          }))}
        >
          {PRESETS.map((p) => (
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
      <AdminFilterField label="Affiliate ID">
        <AdminInput value={filters.affiliateId} onChange={(v) => setFilters((f) => ({ ...f, affiliateId: v }))} placeholder="Optional" />
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <AffiliateIntegratedLayout filters={filterBar} error={error} pagination={null}>
      {loading ? (
        <div className="jw-adminSkeleton" style={{ height: 80, margin: "12px 0" }} />
      ) : (
        <div className="jw-adminAffReportsGrid">
          {cards.map((c) => (
            <div key={c.label} className="jw-adminAffReportCard">
              <div className="jw-adminAffReportCard__label">{c.label}</div>
              <div className="jw-adminAffReportCard__value">{c.value}</div>
            </div>
          ))}
        </div>
      )}
    </AffiliateIntegratedLayout>
  );
}

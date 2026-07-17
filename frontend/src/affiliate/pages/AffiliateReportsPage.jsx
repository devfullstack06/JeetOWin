import React, { useEffect, useState } from "react";
import { affiliateApi } from "../services/affiliateApi";
import {
  AffiliatePage,
  AffiliateStatCards,
  DATE_PRESETS,
  buildDateQuery,
  formatMoney,
} from "../components/AffiliateShared";
import AdminFilterBar, {
  AdminButton,
  AdminFilterField,
} from "../../admin/components/AdminFilterBar/AdminFilterBar";
import AdminDateRange from "../../admin/components/AdminDateRange/AdminDateRange";

const EMPTY = { preset: "this_month", startDate: "", endDate: "" };

export default function AffiliateReportsPage() {
  const [filters, setFilters] = useState({ ...EMPTY });
  const [applied, setApplied] = useState({ ...EMPTY });
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    affiliateApi
      .getReports(buildDateQuery(applied))
      .then((d) => setMetrics(d.metrics))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [applied]);

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      await affiliateApi.downloadReportsCsv(buildDateQuery(applied));
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  const cards = metrics
    ? [
        { label: "Clicks", value: metrics.clicks },
        { label: "Registrations", value: metrics.registrations },
        { label: "Active Players", value: metrics.activePlayers },
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
        if (next.startDate && next.endDate) next.preset = "custom";
        setApplied(next);
      }}
      onClear={() => {
        setFilters({ ...EMPTY });
        setApplied({ ...EMPTY });
      }}
      actionsAddon={(
        <AdminButton variant="green" onClick={exportCsv} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </AdminButton>
      )}
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
    </AdminFilterBar>
  );

  return (
    <AffiliatePage title="Reports" filters={filterBar} error={error}>
      {loading ? (
        <div className="jw-adminSkeleton" style={{ height: 80, margin: "12px 0" }} />
      ) : (
        <AffiliateStatCards items={cards} />
      )}
    </AffiliatePage>
  );
}

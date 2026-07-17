import React, { useEffect, useState } from "react";
import { affiliateApi } from "../services/affiliateApi";
import {
  AffiliatePage,
  AffiliateStatCards,
  DATE_PRESETS,
  buildDateQuery,
  formatMoney,
} from "../components/AffiliateShared";
import AdminFilterBar, { AdminFilterField } from "../../admin/components/AdminFilterBar/AdminFilterBar";
import AdminDateRange from "../../admin/components/AdminDateRange/AdminDateRange";

const EMPTY = { preset: "this_month", startDate: "", endDate: "" };

export default function AffiliateDashboardPage() {
  const [filters, setFilters] = useState({ ...EMPTY });
  const [applied, setApplied] = useState({ ...EMPTY });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    affiliateApi
      .getDashboard(buildDateQuery(applied))
      .then((data) => {
        if (!ignore) setSummary(data.summary);
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [applied]);

  const cards = summary
    ? [
        { label: "Total Clicks", value: summary.totalClicks },
        { label: "Registrations", value: summary.totalRegistrations },
        { label: "Active Players", value: summary.activePlayers },
        { label: "Transfer IN", value: formatMoney(summary.totalTransferIn) },
        { label: "Transfer OUT", value: formatMoney(summary.totalTransferOut) },
        { label: "Bonus Paid", value: formatMoney(summary.bonusPaid) },
        { label: "Net Amount", value: formatMoney(summary.netAmount) },
        { label: "Commission (Period)", value: formatMoney(summary.commissionThisMonth) },
        { label: "Pending Commission", value: formatMoney(summary.pendingCommission) },
        { label: "Paid Commission", value: formatMoney(summary.paidCommission) },
        { label: "Available Balance", value: formatMoney(summary.availableBalance) },
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
    <AffiliatePage title="Dashboard" filters={filterBar} error={error}>
      {loading ? (
        <div className="jw-adminSkeleton" style={{ height: 80, margin: "12px 0" }} />
      ) : (
        <AffiliateStatCards items={cards} />
      )}
    </AffiliatePage>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminAutoRefresh from "../../components/AdminFilterBar/AdminAutoRefresh";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "./dashboardPage.css";

const PERIOD_COLUMNS = [
  { id: "today", label: "Today", compareWith: "yesterday" },
  { id: "yesterday", label: "Yesterday", compareWith: null },
  { id: "thisWeek", label: "This week", compareWith: "lastWeek" },
  { id: "lastWeek", label: "Last week", compareWith: null },
  { id: "thisMonth", label: "This month", compareWith: "lastMonth" },
  { id: "lastMonth", label: "Last month", compareWith: null },
];

const BUSINESS_ROWS = [
  { key: "newClients", label: "New clients" },
  { key: "newClientAccounts", label: "New client accounts" },
  { key: "transfersCreated", label: "Transfers (created)" },
  { key: "transfersApproved", label: "Transfers (approved)" },
  { key: "depositsCreated", label: "Deposits (created)" },
  { key: "depositsApproved", label: "Deposits (approved)" },
  { key: "withdrawsCreated", label: "Withdraws (created)" },
  { key: "withdrawsApproved", label: "Withdraws (approved)" },
];

const AMOUNT_ROWS = [
  { key: "depositsApprovedAmount", label: "Deposit (approved)" },
  { key: "withdrawsApprovedAmount", label: "Withdraw (approved)" },
  { key: "transfersInApprovedAmount", label: "Transfer IN (approved)" },
  { key: "transfersOutApprovedAmount", label: "Transfer OUT (approved)" },
];

function fmt(n) {
  return Number(n ?? 0).toLocaleString();
}

function fmtRs(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "Rs. 0";
  return `Rs. ${x.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function nearlyEqual(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.005;
}

function MetricCell({ value, previous, showTrend, variant }) {
  const v = Number(value ?? 0);
  const p = previous != null && previous !== undefined ? Number(previous) : null;
  const text = variant === "rs" ? fmtRs(v) : fmt(v);

  if (!showTrend || p === null || !Number.isFinite(p)) {
    return <span className="jw-adminDashboard__metricText">{text}</span>;
  }

  if (nearlyEqual(v, p)) {
    return <span className="jw-adminDashboard__metricText">{text}</span>;
  }

  if (v > p) {
    return (
      <span className="jw-adminDashboard__metricCell">
        <span className="jw-adminDashboard__metricText">{text}</span>
        <span className="jw-adminDashboard__trend jw-adminDashboard__trend--up" aria-label="Up vs previous period">
          ↑
        </span>
      </span>
    );
  }

  return (
    <span className="jw-adminDashboard__metricCell">
      <span className="jw-adminDashboard__metricText">{text}</span>
      <span className="jw-adminDashboard__trend jw-adminDashboard__trend--down" aria-label="Down vs previous period">
        ↓
      </span>
    </span>
  );
}

function OverviewTable({ title, subtitle, periods, rows, variant }) {
  const p = periods || {};

  return (
    <div className="jw-adminDashboard__overviewCard">
      {title ? <h3 className="jw-adminDashboard__overviewTitle">{title}</h3> : null}
      {subtitle ? <p className="jw-adminDashboard__overviewSub">{subtitle}</p> : null}
      <div className="jw-adminDashboard__tableScroll">
        <table className="jw-adminDashboard__overviewTable">
          <thead>
            <tr>
              <th className="jw-adminDashboard__thMetric">Metric</th>
              {PERIOD_COLUMNS.map((col) => (
                <th key={col.id} className="jw-adminDashboard__thPeriod">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="jw-adminDashboard__tdMetric">{row.label}</td>
                {PERIOD_COLUMNS.map((col) => {
                  const slice = p[col.id] || {};
                  const val = slice[row.key];
                  const prevKey = col.compareWith;
                  const prevSlice = prevKey ? p[prevKey] : null;
                  const prevVal = prevSlice ? prevSlice[row.key] : null;
                  return (
                    <td key={col.id} className="jw-adminDashboard__tdValue">
                      <MetricCell
                        value={val}
                        previous={prevVal}
                        showTrend={!!col.compareWith}
                        variant={variant}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem("token") || "";
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData(null);
        setError(body?.message || "Failed to load dashboard.");
        return;
      }
      setData(body);
    } catch (e) {
      setData(null);
      setError(e?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = data?.queues;
  const bizPeriods = data?.businessOverview?.periods;
  const amtPeriods = data?.amountsOverview?.periods;
  const dq = data?.dataQuality;

  return (
    <AdminPageShell
      title="Dashboard"
      table={
        <div className="jw-adminDashboard">
          <div className="jw-adminDashboard__metaRow">
            <p className="jw-adminDashboard__meta">
              <strong>Time zone:</strong> {data?.timezone || "Asia/Karachi"} (PKT).{" "}
              {/* <strong>Today</strong> (PKT): <strong>{data?.todayYmd || "—"}</strong>. Weeks start on{" "}
              <strong>Monday</strong> (PKT). <strong>This week</strong> is Monday through today;{" "}
              <strong>this month</strong> is the 1st through today. Arrows compare Today → Yesterday, This
              week → Last week, This month → Last month. */}
            </p>
            <AdminAutoRefresh onRefresh={load} />
          </div>

          {error ? <div className="jw-adminDashboard__error">{error}</div> : null}

          {loading && !data ? (
            <div className="jw-adminDashboard__loading">Loading…</div>
          ) : null}

          {data ? (
            <>
              <section aria-labelledby="dash-queues-heading">
                <h2 id="dash-queues-heading" className="jw-adminDashboard__sectionTitle">
                  Queues (Needs Attention)
                </h2>
                <div className="jw-adminDashboard__queueList">
                  <Link className="jw-adminDashboard__queueLink" to="/admin/accounts/tickets">
                    <span className="jw-adminDashboard__queueLabel">Pending Account Tickets</span>
                    <span className="jw-adminDashboard__queueValue">{fmt(q?.accountTicketsPending)}</span>
                  </Link>
                  <Link className="jw-adminDashboard__queueLink" to="/admin/accounts/tickets">
                    <span className="jw-adminDashboard__queueLabel">Overdue Accounts Tickets</span>
                    <span
                      className={`jw-adminDashboard__queueValue ${(q?.accountTicketsOverdue ?? 0) > 0 ? "is-alert" : ""}`}
                    >
                      {fmt(q?.accountTicketsOverdue)}
                    </span>
                  </Link>
                  <Link className="jw-adminDashboard__queueLink" to="/admin/transactions/transfers">
                    <span className="jw-adminDashboard__queueLabel">Pending Transfer Tickets</span>
                    <span className="jw-adminDashboard__queueValue">{fmt(q?.transferTicketsPending)}</span>
                  </Link>
                  <Link className="jw-adminDashboard__queueLink" to="/admin/transactions/transfers">
                    <span className="jw-adminDashboard__queueLabel">Overdue Transfer Tickets</span>
                    <span
                      className={`jw-adminDashboard__queueValue ${(q?.transferTicketsOverdue ?? 0) > 0 ? "is-alert" : ""}`}
                    >
                      {fmt(q?.transferTicketsOverdue)}
                    </span>
                  </Link>
                  <Link className="jw-adminDashboard__queueLink" to="/admin/transactions/deposit">
                    <span className="jw-adminDashboard__queueLabel">Pending Deposit Tickets</span>
                    <span className="jw-adminDashboard__queueValue">{fmt(q?.depositTicketsPending)}</span>
                  </Link>
                  <Link className="jw-adminDashboard__queueLink" to="/admin/transactions/deposit">
                    <span className="jw-adminDashboard__queueLabel">Overdue Deposit Tickets</span>
                    <span
                      className={`jw-adminDashboard__queueValue ${(q?.depositTicketsOverdue ?? 0) > 0 ? "is-alert" : ""}`}
                    >
                      {fmt(q?.depositTicketsOverdue)}
                    </span>
                  </Link>
                  <Link className="jw-adminDashboard__queueLink" to="/admin/transactions/withdraw">
                    <span className="jw-adminDashboard__queueLabel">Pending Withdraw Tickets</span>
                    <span className="jw-adminDashboard__queueValue">{fmt(q?.withdrawTicketsPending)}</span>
                  </Link>
                  <Link className="jw-adminDashboard__queueLink" to="/admin/transactions/withdraw">
                    <span className="jw-adminDashboard__queueLabel">Overdue Withdraw Tickets</span>
                    <span
                      className={`jw-adminDashboard__queueValue ${(q?.withdrawTicketsOverdue ?? 0) > 0 ? "is-alert" : ""}`}
                    >
                      {fmt(q?.withdrawTicketsOverdue)}
                    </span>
                  </Link>
                </div>
              </section>

              <section aria-labelledby="dash-business-heading">
                <h2 id="dash-business-heading" className="jw-adminDashboard__sectionTitle">
                  Business overview
                </h2>
                <OverviewTable
                  // subtitle="Created / approved counts use the same rules as before (approval time uses COALESCE(updated_at, created_at) where applicable)."
                  periods={bizPeriods}
                  rows={BUSINESS_ROWS}
                  variant="count"
                />
              </section>

              <section aria-labelledby="dash-amounts-heading">
                <h2 id="dash-amounts-heading" className="jw-adminDashboard__sectionTitle">
                  Amounts overview
                </h2>
                <OverviewTable
                  // subtitle="Sums of ticket amounts for approved deposits, withdraws, and transfers (IN / OUT) in each PKT window."
                  periods={amtPeriods}
                  rows={AMOUNT_ROWS}
                  variant="rs"
                />
              </section>

              {(dq?.brandsAccountsNoActiveMaster ?? 0) > 0 ? (
                <section aria-labelledby="dash-quality-heading">
                  <h2 id="dash-quality-heading" className="jw-adminDashboard__sectionTitle">
                    Configuration check
                  </h2>
                  <div className="jw-adminDashboard__quality">
                    <strong>{fmt(dq?.brandsAccountsNoActiveMaster)}</strong> brand
                    {dq.brandsAccountsNoActiveMaster === 1 ? " has" : "s have"}{" "}
                    <strong>Accounts</strong> enabled but <strong>no active Master</strong> company.
                    Review brand setup under{" "}
                    <Link to="/admin/brands/website">Brands → Website</Link> and{" "}
                    <Link to="/admin/brands/company">Brands → Master</Link>.
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      }
    />
  );
}

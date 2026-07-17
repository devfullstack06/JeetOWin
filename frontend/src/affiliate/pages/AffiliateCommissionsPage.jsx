import React, { useEffect, useState } from "react";
import { affiliateApi } from "../services/affiliateApi";
import {
  AffiliatePage,
  AffiliateStatCards,
  AffiliateTable,
  StatusBadge,
  formatMoney,
} from "../components/AffiliateShared";

export default function AffiliateCommissionsPage() {
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    affiliateApi
      .getCommissions()
      .then((d) => {
        setSummary(d.summary);
        setLedger(d.ledger || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const cards = summary
    ? [
        { label: "Transfer IN", value: formatMoney(summary.transferIn) },
        { label: "Transfer OUT", value: formatMoney(summary.transferOut) },
        { label: "Bonus Paid", value: formatMoney(summary.bonusPaid) },
        { label: "Net Amount", value: formatMoney(summary.netAmount) },
        { label: "Commission %", value: `${summary.commissionPercent}%` },
        { label: "Commission Earned", value: formatMoney(summary.commissionEarned) },
        { label: "Pending", value: formatMoney(summary.pending) },
        { label: "Approved", value: formatMoney(summary.approved) },
        { label: "Paid", value: formatMoney(summary.paid) },
        { label: "Available Balance", value: formatMoney(summary.availableBalance) },
      ]
    : [];

  const columns = [
    { key: "period", label: "Date Range", render: (r) => `${r.periodStart} – ${r.periodEnd}` },
    { key: "player", label: "Player" },
    { key: "transferIn", label: "Transfer IN", render: (r) => formatMoney(r.transferIn) },
    { key: "transferOut", label: "Transfer OUT", render: (r) => formatMoney(r.transferOut) },
    { key: "bonusPaid", label: "Bonus Paid", render: (r) => formatMoney(r.bonusPaid) },
    { key: "netAmount", label: "Net", render: (r) => formatMoney(r.netAmount) },
    { key: "commissionPercent", label: "Commission %", render: (r) => `${r.commissionPercent}%` },
    { key: "commissionAmount", label: "Commission", render: (r) => formatMoney(r.commissionAmount) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "remarks", label: "Remarks", render: (r) => r.remarks || "—" },
  ];

  return (
    <AffiliatePage title="Commissions" error={error}>
      {loading && !summary ? (
        <div className="jw-adminSkeleton" style={{ height: 80, margin: "12px 0" }} />
      ) : (
        <AffiliateStatCards items={cards} />
      )}
      <div style={{ marginTop: 16 }}>
        <AffiliateTable
          columns={columns}
          rows={ledger}
          loading={loading && !ledger.length}
          emptyText="No commission ledger entries yet."
        />
      </div>
    </AffiliatePage>
  );
}

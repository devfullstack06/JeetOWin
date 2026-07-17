import React, { useEffect, useState } from "react";
import { affiliateApi } from "../services/affiliateApi";
import {
  AffiliatePage,
  AffiliateTable,
  AffiliateTableViewBtn,
} from "../components/AffiliateShared";
import { AdminButton } from "../../admin/components/AdminFilterBar/AdminFilterBar";

export default function AffiliateMarketingPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    affiliateApi
      .getAssets()
      .then((d) => setAssets(d.assets || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied!");
      setTimeout(() => setMsg(""), 1500);
    } catch {
      setMsg("Copy failed");
    }
  }

  const columns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type" },
    {
      key: "textContent",
      label: "Text",
      render: (a) => (a.textContent ? String(a.textContent).slice(0, 80) : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (a) => (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {a.fileUrl ? <AffiliateTableViewBtn href={a.fileUrl} title="View / Download" /> : null}
          {a.textContent ? (
            <AdminButton variant="light" onClick={() => copyText(a.textContent)}>Copy Text</AdminButton>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AffiliatePage title="Marketing Tools" error={error}>
      {msg ? <div style={{ color: "green", marginBottom: 12 }}>{msg}</div> : null}
      <AffiliateTable
        columns={columns}
        rows={assets}
        loading={loading}
        emptyText="No marketing assets available yet."
      />
    </AffiliatePage>
  );
}

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { affiliateApi } from "../services/affiliateApi";
import {
  AffiliateActionModal,
  AffiliatePage,
  AffiliateTable,
} from "../components/AffiliateShared";
import AdminFilterBar, {
  AdminButton,
  AdminInput,
  AdminFilterField,
} from "../../admin/components/AdminFilterBar/AdminFilterBar";

export default function AffiliateLinksPage() {
  const [data, setData] = useState(null);
  const [campaignName, setCampaignName] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function load() {
    affiliateApi.getLinks().then(setData).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, []);

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied!");
      setTimeout(() => setMsg(""), 1500);
    } catch {
      setMsg("Copy failed");
    }
  }

  async function createCampaign() {
    setSaving(true);
    setError("");
    try {
      await affiliateApi.createCampaign({ campaignName });
      setCampaignName("");
      setShowGenerate(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const campaignColumns = [
    { key: "campaignName", label: "Campaign" },
    {
      key: "stats",
      label: "Stats",
      render: (c) => `${c.clicksCount ?? 0} clicks · ${c.registrationsCount ?? 0} registrations`,
    },
    {
      key: "link",
      label: "Link",
      render: (c) => (
        <input className="jw-adminInput" readOnly value={c.link || ""} style={{ minWidth: 220 }} />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (c) => (
        <AdminButton variant="light" onClick={() => copyText(c.link)}>Copy</AdminButton>
      ),
    },
  ];

  const filterBar = (
    <AdminFilterBar
      onSubmit={load}
      onClear={() => { setError(""); setMsg(""); }}
      actions={(
        <div className="jw-adminFilterBar__buttons">
          <AdminButton variant="green" onClick={() => { setError(""); setShowGenerate(true); }}>
            <span className="jw-adminCreateBtnInner">
              Generate Campaign <Plus size={16} style={{ marginLeft: 4 }} />
            </span>
          </AdminButton>
        </div>
      )}
    />
  );

  return (
    <>
      <AffiliatePage title="My Links" filters={filterBar} error={error}>
        {msg ? <div className="jw-adminUsersPage__notice" style={{ color: "green", marginBottom: 12 }}>{msg}</div> : null}
        {data ? (
          <div className="jw-adminAffSettingsForm" style={{ maxWidth: "100%", marginBottom: 20 }}>
            <AdminFilterField label="Referral Code">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <AdminInput value={data.referralCode || ""} onChange={() => {}} readOnly />
                <AdminButton variant="light" onClick={() => copyText(data.referralCode)}>Copy Code</AdminButton>
              </div>
            </AdminFilterField>
            <AdminFilterField label="Main Referral Link">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <AdminInput value={data.mainLink || ""} onChange={() => {}} readOnly />
                <AdminButton variant="light" onClick={() => copyText(data.mainLink)}>Copy Link</AdminButton>
              </div>
            </AdminFilterField>
          </div>
        ) : (
          <div className="jw-adminSkeleton" style={{ height: 40, margin: "12px 0" }} />
        )}
        <AffiliateTable
          columns={campaignColumns}
          rows={data?.campaigns || []}
          loading={!data}
          emptyText="No campaign links yet. Generate one to get started."
        />
      </AffiliatePage>
      <AffiliateActionModal
        open={showGenerate}
        title="Generate Campaign Link"
        onClose={() => setShowGenerate(false)}
        onConfirm={createCampaign}
        confirmLabel="Generate"
        saving={saving}
      >
        <AdminFilterField label="Campaign name">
          <AdminInput
            value={campaignName}
            onChange={setCampaignName}
            placeholder="e.g. Facebook"
          />
        </AdminFilterField>
      </AffiliateActionModal>
    </>
  );
}

import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import { adminNavGroups } from "../../adminNav";
import usePageTitle from "../../../hooks/usePageTitle";
import AffiliatesTab from "./AffiliatesTab";
import CommissionsTab from "./CommissionsTab";
import WithdrawalsTab from "./WithdrawalsTab";
import WalletsTab from "./WalletsTab";
import PlansTab from "./PlansTab";
import AssetsTab from "./AssetsTab";
import ReportsTab from "./ReportsTab";
import SettingsTab from "./SettingsTab";
import "../Content/contentPage.css";
import "./affiliateTab.css";

const affiliateTabs = (() => {
  const g = adminNavGroups.find((x) => x.group === "Affiliates");
  if (!g?.items?.length) {
    return [{ key: "affiliates", label: "Affiliates" }];
  }
  return g.items.map((it) => {
    const seg = it.path.replace(/^.*\/admin\/affiliate\/?/, "").trim();
    const key = seg || "affiliates";
    return { key, label: it.label };
  });
})();

export default function AdminAffiliatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  usePageTitle("Affiliates");

  const activeTab = useMemo(() => {
    const p = location.pathname;
    const base = "/admin/affiliate";
    if (!p.startsWith(base)) return affiliateTabs[0]?.key ?? "affiliates";
    const rest = p.slice(base.length).replace(/^\/+/, "");
    if (!rest || rest.includes("/")) return affiliateTabs[0]?.key ?? "affiliates";
    return affiliateTabs.some((t) => t.key === rest) ? rest : affiliateTabs[0]?.key ?? "affiliates";
  }, [location.pathname]);

  const tabLabel = affiliateTabs.find((t) => t.key === activeTab)?.label ?? activeTab;

  return (
    <AdminPageShell
      title="Affiliates"
      tabs={
        <AdminTabs
          tabs={affiliateTabs}
          activeKey={activeTab}
          onChange={(key) => navigate(`/admin/affiliate/${key}`)}
        />
      }
      filters={null}
      table={
        activeTab === "affiliates" ? (
          <AffiliatesTab />
        ) : activeTab === "commissions" ? (
          <CommissionsTab />
        ) : activeTab === "withdrawals" ? (
          <WithdrawalsTab />
        ) : activeTab === "wallets" ? (
          <WalletsTab />
        ) : activeTab === "plans" ? (
          <PlansTab />
        ) : activeTab === "assets" ? (
          <AssetsTab />
        ) : activeTab === "reports" ? (
          <ReportsTab />
        ) : activeTab === "settings" ? (
          <SettingsTab />
        ) : (
          <div className="jw-adminContentPlaceholder">{tabLabel} — Coming soon.</div>
        )
      }
      pagination={null}
    />
  );
}

import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import { adminNavGroups } from "../../adminNav";
import usePageTitle from "../../../hooks/usePageTitle";
import NotificationGroupsTab from "./NotificationGroupsTab";
import AnnouncementsTab from "./AnnouncementsTab";
import InboxTab from "./InboxTab";
import "../Content/contentPage.css";

const notificationTabs = (() => {
  const g = adminNavGroups.find((x) => x.group === "Notifications");
  if (!g?.items?.length) {
    return [
      { key: "announcements", label: "Announcements" },
      { key: "inbox", label: "Inbox" },
    ];
  }
  return g.items.map((it) => {
    const seg = it.path.replace(/^.*\/admin\/notifications\/?/, "").trim();
    const key = seg || "announcements";
    return { key, label: it.label };
  });
})();

export default function AdminNotificationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  usePageTitle("Notifications");

  const activeTab = useMemo(() => {
    const p = location.pathname;
    const base = "/admin/notifications";
    if (!p.startsWith(base)) return "announcements";
    const rest = p.slice(base.length).replace(/^\/+/, "");
    if (!rest) return "announcements";
    return notificationTabs.some((t) => t.key === rest) ? rest : "announcements";
  }, [location.pathname]);

  const tabLabel =
    notificationTabs.find((t) => t.key === activeTab)?.label ?? activeTab;

  return (
    <AdminPageShell
      title="Notifications"
      tabs={
        <AdminTabs
          tabs={notificationTabs}
          activeKey={activeTab}
          onChange={(key) => navigate(`/admin/notifications/${key}`)}
        />
      }
      filters={null}
      table={
        activeTab === "announcements" ? (
          <AnnouncementsTab />
        ) : activeTab === "inbox" ? (
          <InboxTab />
        ) : activeTab === "groups" ? (
          <NotificationGroupsTab />
        ) : (
          <div className="jw-adminContentPlaceholder">
            {tabLabel} — Coming soon.
          </div>
        )
      }
      pagination={null}
    />
  );
}

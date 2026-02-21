import React from "react";

export default function NotificationsTabs({ activeTab, onChangeTab }) {
  return (
    <div className="jw-notifTabs" role="tablist" aria-label="Notifications tabs">
      <button
        type="button"
        role="tab"
        className={`jw-notifTab ${activeTab === "announcements" ? "is-active" : ""}`}
        aria-selected={activeTab === "announcements"}
        onClick={() => onChangeTab("announcements")}
      >
        Announcements
      </button>

      <button
        type="button"
        role="tab"
        className={`jw-notifTab ${activeTab === "inbox" ? "is-active" : ""}`}
        aria-selected={activeTab === "inbox"}
        onClick={() => onChangeTab("inbox")}
      >
        Inbox
      </button>

      {/* underline indicator */}
      <span
        className={`jw-notifTabIndicator ${
          activeTab === "inbox" ? "is-right" : "is-left"
        }`}
        aria-hidden="true"
      />
      <span className="jw-notifTabLine" aria-hidden="true" />
    </div>
  );
}

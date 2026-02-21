import React, { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usePageTitle from "../../hooks/usePageTitle";

import "./notificationsBody.css";

import { notificationsMock } from "./data/notificationsMock";
import NotificationsTabs from "./components/NotificationsTabs";
import NotificationsListStep from "./steps/NotificationsListStep";
import NotificationsDetailsStep from "./steps/NotificationsDetailsStep";

const STORAGE_KEY = {
  announcements: "jw.notifications.read.announcements",
  inbox: "jw.notifications.read.inbox",
};

function safeParseJsonArray(v) {
  try {
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function loadReadSet(tab) {
  if (typeof window === "undefined") return new Set();
  const raw = window.localStorage.getItem(STORAGE_KEY[tab]);
  const ids = safeParseJsonArray(raw);
  return new Set(ids);
}

function saveReadSet(tab, set) {
  if (typeof window === "undefined") return;
  const ids = Array.from(set);
  window.localStorage.setItem(STORAGE_KEY[tab], JSON.stringify(ids));
}

export default function NotificationsBody() {
  const navigate = useNavigate();
  usePageTitle("Notifications");

  // tab + step state machine
  const [activeTab, setActiveTab] = useState("announcements"); // announcements | inbox
  const [step, setStep] = useState("list"); // list | details
  const [selectedId, setSelectedId] = useState(null);

  // per user/device read state
  const [readAnnouncements, setReadAnnouncements] = useState(() =>
    loadReadSet("announcements"),
  );
  const [readInbox, setReadInbox] = useState(() => loadReadSet("inbox"));

  // data source (mock for now)
  const items = useMemo(() => {
    return activeTab === "announcements"
      ? notificationsMock.announcements
      : notificationsMock.inbox;
  }, [activeTab]);

  const readSet = useMemo(() => {
    return activeTab === "announcements" ? readAnnouncements : readInbox;
  }, [activeTab, readAnnouncements, readInbox]);

  const selectedMessage = useMemo(() => {
    if (!selectedId) return null;
    return items.find((x) => x.id === selectedId) || null;
  }, [items, selectedId]);

  const sectionLabel = useMemo(() => {
    if (step === "list") return "Notifications";
    return "Details";
  }, [step]);

  const goToList = () => {
    setStep("list");
    setSelectedId(null);
  };

  const markSelectedAsRead = () => {
    if (!selectedId) return;

    if (activeTab === "announcements") {
      setReadAnnouncements((prev) => {
        const next = new Set(prev);
        next.add(selectedId);
        saveReadSet("announcements", next);
        return next;
      });
      return;
    }

    setReadInbox((prev) => {
      const next = new Set(prev);
      next.add(selectedId);
      saveReadSet("inbox", next);
      return next;
    });
  };

  const handleClose = () => {
    // Same behavior as Accounts:
    // - on list: go /home
    // - on details: go back to list (and mark read)
    if (step === "list") {
      navigate("/home");
      return;
    }
    markSelectedAsRead();
    goToList();
  };

  const handleChangeTab = (nextTab) => {
    // switching tab always returns to list (like your design expectation)
    setActiveTab(nextTab);
    setStep("list");
    setSelectedId(null);
  };

  const handleOpenMessage = (id) => {
    setSelectedId(id);
    setStep("details");
  };

  const handleDetailsClose = () => {
    markSelectedAsRead();
    goToList();
  };

  // Safety: if user is in details and message disappears (future API),
  // fallback to list
  useEffect(() => {
    if (step === "details" && selectedId && !selectedMessage) {
      goToList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedId, selectedMessage]);

  return (
    <section className="jw-notifPage" aria-label="Notifications">
      <div className="jw-notifCard">
        {/* HEADER */}
        <div className="jw-notifHeader">
          <div className="jw-notifHeaderLeft">
            <span className="jw-notifIcon" aria-hidden="true">
              <Bell size={24} />
            </span>
            <h2 className="jw-notifTitle">Notifications</h2>
          </div>

          <button
            type="button"
            className="jw-notifClose"
            aria-label="Close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* SECTION LABEL (same pattern as Accounts) */}
        <div className="jw-notifSectionLabel" aria-hidden="true">
          <span className="jw-notifLine" />
          <span className="jw-notifLabelText">{sectionLabel}</span>
          <span className="jw-notifLine" />
        </div>

        {/* Tabs */}
        <NotificationsTabs
          activeTab={activeTab}
          onChangeTab={handleChangeTab}
        />

        {/* BODY PANEL */}
        <div className="jw-notifBodyPanel">
          {step === "list" && (
            <NotificationsListStep
              activeTab={activeTab}
              items={items}
              readSet={readSet}
              onOpenMessage={handleOpenMessage}
            />
          )}

          {step === "details" && selectedMessage && (
            <NotificationsDetailsStep
              message={selectedMessage}
              onClose={handleDetailsClose}
            />
          )}
        </div>
      </div>
    </section>
  );
}

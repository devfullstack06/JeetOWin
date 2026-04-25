import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, RotateCcw, Plus } from "lucide-react";
import Logo from "./Logo";
import announcementsIconUrl from "../assets/bottomnav/Notification-on.svg";
import inboxIconUrl from "../assets/bottomnav/Envelope.svg";
import "./landingHeader.css";

export default function LandingHeader({
  tickerText = "Australia edged out India by 3 wickets in their...",

  /* ✅ NEW: when true, CTA is replaced by balance widget */
  isLoggedIn = false,

  /* ✅ NEW: values later from backend/admin */
  balanceCurrency = "Rs.",
  balanceAmount = "1,000,000",

  /* ✅ NEW: hooks for later routing/data */
  onDeposit = null,
  onRefreshBalance = null,
}) {
  const navigate = useNavigate();

  /** Unread announcements (client only); null = not loaded yet */
  const [announcementUnread, setAnnouncementUnread] = useState(null);
  /** Unread inbox messages (client only); null = not loaded yet */
  const [inboxUnread, setInboxUnread] = useState(null);
  const [headerNotifTab, setHeaderNotifTab] = useState("announcements");

  useEffect(() => {
    if (!isLoggedIn) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem("role") !== "client") {
      setAnnouncementUnread(0);
      setInboxUnread(0);
      return;
    }

    let cancelled = false;
    const loadUnread = () => {
      const token = localStorage.getItem("token") || "";
      Promise.allSettled([
        fetch("/api/client/notifications/announcements/unread-count", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => res.json())
          .then((data) => Number(data?.count) || 0),
        fetch("/api/client/notifications/inbox/unread-count", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => res.json())
          .then((data) => Number(data?.count) || 0),
      ]).then((results) => {
        if (cancelled) return;
        const ann = results[0]?.status === "fulfilled" ? Number(results[0].value || 0) : 0;
        const ibx = results[1]?.status === "fulfilled" ? Number(results[1].value || 0) : 0;
        setAnnouncementUnread(ann);
        setInboxUnread(ibx);
      });
    };

    loadUnread();
    const onVis = () => {
      if (document.visibilityState === "visible") loadUnread();
    };
    const onRefresh = () => loadUnread();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("jw-announcements-refresh", onRefresh);
    window.addEventListener("jw-inbox-refresh", onRefresh);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("jw-announcements-refresh", onRefresh);
      window.removeEventListener("jw-inbox-refresh", onRefresh);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const ann = Number(announcementUnread || 0);
    const ibx = Number(inboxUnread || 0);
    if (ann > 0 && ibx > 0) {
      const id = window.setInterval(() => {
        setHeaderNotifTab((prev) => (prev === "announcements" ? "inbox" : "announcements"));
      }, 2000);
      return () => window.clearInterval(id);
    }
    if (ann > 0) {
      setHeaderNotifTab("announcements");
      return;
    }
    if (ibx > 0) {
      setHeaderNotifTab("inbox");
      return;
    }
    setHeaderNotifTab("announcements");
  }, [announcementUnread, inboxUnread]);

  const activeUnread =
    headerNotifTab === "inbox" ? Number(inboxUnread || 0) : Number(announcementUnread || 0);
  const hasAnyUnread = Number(announcementUnread || 0) > 0 || Number(inboxUnread || 0) > 0;
  const activeNotifLabel = headerNotifTab === "inbox" ? "Inbox" : "Announcements";
  const activeNotifIcon = headerNotifTab === "inbox" ? inboxIconUrl : announcementsIconUrl;
  const activeNotifTabParam = headerNotifTab === "inbox" ? "inbox" : "announcements";

  // Toggle button label every 1 second: Login <-> Sign Up
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const [ctaLabel, setCtaLabel] = useState("Sign Up");

  // ✅ balance UI state
  const [isBalanceHidden, setIsBalanceHidden] = useState(false); // shown by default
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // ✅ keep your existing CTA toggle ONLY when not logged in
    if (isLoggedIn) return;
    if (prefersReducedMotion) return;

    const id = setInterval(() => {
      setCtaLabel((prev) => (prev === "Sign Up" ? "Login" : "Sign Up"));
    }, 1000);

    return () => clearInterval(id);
  }, [prefersReducedMotion, isLoggedIn]);

  const handleDeposit = () => {
    if (typeof onDeposit === "function") return onDeposit();
    navigate("/deposit");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (typeof onRefreshBalance === "function") onRefreshBalance();
    window.setTimeout(() => setIsRefreshing(false), 650);
  };

  return (
    <header className="jw-landingHeader" role="banner">
      {/* Top row */}
      <div className="jw-landingTop">
        <Logo />

        {/* Desktop ticker (hidden on mobile via CSS) */}
        <div
          className="jw-landingTicker jw-landingTickerDesktop"
          aria-label="News ticker"
        >
          <div className="jw-landingTickerTrack">
            <span className="jw-landingTickerText">{tickerText}</span>
            <span className="jw-landingTickerText jw-landingTickerTextDup">
              {tickerText}
            </span>
          </div>
        </div>

        {/* ✅ Right: CTA OR Balance widget */}
        {!isLoggedIn ? (
          <button
            className={`jw-landingCta ${ctaLabel === "Sign Up" ? "jw-landingCta-signup" : "jw-landingCta-login"}`}
            type="button"
            onClick={() => navigate("/login")}
            aria-label="Go to login"
          >
            {ctaLabel}
          </button>
        ) : (
          <div className="jw-headerLoggedRight">
            {hasAnyUnread ? (
              <button
                type="button"
                className="jw-headerAnnounceBtn"
                aria-label={`${activeNotifLabel}, ${activeUnread} unread`}
                onClick={() => navigate(`/notifications?tab=${activeNotifTabParam}`)}
              >
                <img src={activeNotifIcon} alt="" className="jw-headerAnnounceIcon" width={22} height={22} />
                <span className="jw-headerAnnounceBadge" aria-hidden="true">
                  {activeUnread > 99 ? "99+" : activeUnread}
                </span>
              </button>
            ) : null}
            <div className="jw-headerBalance" aria-label="Balance and deposit">
            {/* main pill group */}
            <div className="jw-headerBalanceMain">
              <button
                type="button"
                className="jw-headerBalanceIcon"
                aria-label={isBalanceHidden ? "Show balance" : "Hide balance"}
                onClick={() => setIsBalanceHidden((v) => !v)}
              >
                {isBalanceHidden ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>

              <div className="jw-headerBalanceText" aria-label="Balance amount">
                <span className="jw-headerBalanceRs">{balanceCurrency}</span>
                <span className="jw-headerBalanceAmt">
                  {isBalanceHidden ? "****" : balanceAmount}
                </span>
              </div>

              <button
                type="button"
                className={`jw-headerBalanceIcon ${
                  isRefreshing ? "is-rotating" : ""
                }`}
                aria-label="Refresh balance"
                onClick={handleRefresh}
              >
                <RotateCcw size={20} />
              </button>
            </div>

            {/* green plus segment */}
            <button
              type="button"
              className="jw-headerBalancePlus"
              aria-label="Deposit"
              onClick={handleDeposit}
            >
              <Plus size={22} />
            </button>
          </div>
          </div>
        )}
      </div>

      {/* Mobile ticker (shown only on mobile via CSS) */}
      <div className="jw-landingTicker jw-landingTickerMobile" aria-label="News ticker">
        <div className="jw-landingTickerTrack">
          <span className="jw-landingTickerText">{tickerText}</span>
          <span className="jw-landingTickerText jw-landingTickerTextDup">{tickerText}</span>
        </div>
      </div>
    </header>
  );
}

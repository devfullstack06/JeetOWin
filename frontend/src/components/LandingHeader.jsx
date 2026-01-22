import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, RotateCcw, Plus } from "lucide-react";
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

  // Toggle button label every 1 second: Login <-> Sign Up
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const [ctaLabel, setCtaLabel] = useState("Sign Up");

  // ✅ balance UI state
  const [isBalanceHidden, setIsBalanceHidden] = useState(true); // default hidden
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
    // later: navigate("/deposit");
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
        <div
          className="jw-landingLogo"
          onClick={() => navigate("/")}
          role="button"
          tabIndex={0}
        >
          JeetOWin
        </div>

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
            className="jw-landingCta"
            type="button"
            onClick={() => navigate("/login")}
            aria-label="Go to login"
          >
            {ctaLabel}
          </button>
        ) : (
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

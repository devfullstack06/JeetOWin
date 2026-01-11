import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./landingHeader.css";

export default function LandingHeader({
  tickerText = "Australia edged out India by 3 wickets in their...",
}) {
  const navigate = useNavigate();

  // Toggle button label every 1 second: Login <-> Sign Up
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const [ctaLabel, setCtaLabel] = useState("Sign Up");

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setCtaLabel((prev) => (prev === "Sign Up" ? "Login" : "Sign Up"));
    }, 1000);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <header className="jw-landingHeader" role="banner">
      {/* Top row */}
      <div className="jw-landingTop">
        <div className="jw-landingLogo" onClick={() => navigate("/")} role="button" tabIndex={0}>
          JeetOWin
        </div>

        {/* Desktop ticker (hidden on mobile via CSS) */}
        <div className="jw-landingTicker jw-landingTickerDesktop" aria-label="News ticker">
          <div className="jw-landingTickerTrack">
            <span className="jw-landingTickerText">{tickerText}</span>
            <span className="jw-landingTickerText jw-landingTickerTextDup">{tickerText}</span>
          </div>
        </div>

        <button
          className="jw-landingCta"
          type="button"
          onClick={() => navigate("/login")}
          aria-label="Go to login"
        >
          {ctaLabel}
        </button>
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

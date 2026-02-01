import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";
import "./bottomNav.css";

import iconMenu from "../../assets/bottomnav/Menu Icon.svg";
import iconClose from "../../assets/bottomnav/Close.svg";
import iconSort from "../../assets/bottomnav/Sort.svg";
import iconFileUser from "../../assets/bottomnav/File-user.svg";
import iconBullhorn from "../../assets/bottomnav/Bullhorn.svg";
import iconComment from "../../assets/bottomnav/Comment.svg";

const NAV_ITEMS = [
  { key: "sort", to: "/dashboard", icon: iconSort, aria: "Dashboard" },
  { key: "accounts", to: "/accounts", icon: iconFileUser, aria: "Accounts" },
  { key: "announcements", to: "/accounts", icon: iconBullhorn, aria: "Announcements" },
  { key: "chat", to: "/accounts", icon: iconComment, aria: "Chat" },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // tiny tap animation state
  const [bump, setBump] = useState(false);
  const bumpTimerRef = useRef(null);

  // ✅ hide ONLY on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  // ✅ hide everywhere when NOT logged in (this automatically hides on landing "/")
  if (!isAuthenticated()) return null;

  // listen to layout state changes (including swipe open/close & overlay close)
  useEffect(() => {
    const handler = (e) => setIsMenuOpen(e.detail === true);
    window.addEventListener("jw:leftnav:state", handler);
    return () => window.removeEventListener("jw:leftnav:state", handler);
  }, []);

  // cleanup bump timer
  useEffect(() => {
    return () => {
      if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
    };
  }, []);

  const doHaptic = () => {
    try {
      if (navigator.vibrate) navigator.vibrate(18);
    } catch {
      // ignore
    }
  };

  const doBump = () => {
    setBump(false);
    requestAnimationFrame(() => {
      setBump(true);
      if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
      bumpTimerRef.current = window.setTimeout(() => setBump(false), 180);
    });
  };

  const toggleMenu = () => {
    const next = !isMenuOpen;

    doHaptic();
    doBump();

    // optimistic UI
    setIsMenuOpen(next);

    window.dispatchEvent(new CustomEvent("jw:leftnav:toggle", { detail: next }));
  };

  return (
    <nav className="jw-bottomNavWrap" aria-label="Bottom navigation">
      <div className="jw-bottomNav">
        {/* MENU / CLOSE toggle (NO active glow) */}
        <button
          type="button"
          className={`jw-bottomNavItem jw-bottomNavToggle ${bump ? "is-bump" : ""}`}
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          <img
            className="jw-bottomNavIcon"
            src={isMenuOpen ? iconClose : iconMenu}
            alt=""
          />
        </button>

        {/* Other nav icons */}
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) =>
              `jw-bottomNavItem ${isActive ? "is-active" : ""}`
            }
            aria-label={item.aria}
          >
            <img className="jw-bottomNavIcon" src={item.icon} alt="" />
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

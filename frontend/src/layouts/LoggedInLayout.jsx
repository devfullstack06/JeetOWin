import React, { useCallback, useEffect, useRef, useState } from "react";
import LandingHeader from "../components/LandingHeader";
import LeftNav from "../components/LeftNav";
import { useNavigate, useLocation } from "react-router-dom";
import { logout as logoutUser } from "../utils/auth";
import { startIdleLogout } from "../utils/idleLogout";
import { apiFetch } from "../services/api";
import "./loggedInLayout.css";

function formatBalance(num) {
  if (num == null || Number.isNaN(Number(num))) return "Rs. 0";
  return (
    "Rs. " +
    Number(num).toLocaleString("en-PK", {
      maximumFractionDigits: 0,
    })
  );
}

function formatBalanceAmount(num) {
  if (num == null || Number.isNaN(Number(num))) return "0";
  return Number(num).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  });
}

export default function LoggedInLayout({ activeId = "dashboard", children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [balance, setBalance] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fullName = (localStorage.getItem("jw:fullName") || "").trim();
  const username = (localStorage.getItem("jw:username") || "").trim();

  // Prefer first name from fullName, fallback to username, fallback to "User"
  const firstName =
    fullName.split(" ").filter(Boolean)[0] || username || "User";

  // Fetch balance from database
  const fetchBalance = useCallback(() => {
    if (localStorage.getItem("role") !== "client") return;
    apiFetch("/api/client/dashboard")
      .then((data) => setBalance(data?.balance ?? 0))
      .catch(() => setBalance(0));
  }, []);

  // swipe tracking refs
  const touchStartRef = useRef(null);

  // 🔓 LOGOUT HANDLER (single source of truth for this layout)
  const handleLogout = () => {
    // clear auth + notify other tabs
    const token = localStorage.getItem("token");

    // call server logout (ignore failures)
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      }).catch(() => {});
    }

    // then clear local auth + notify tabs
    logoutUser();

    localStorage.removeItem("jw:fullName");
    localStorage.removeItem("jw:username");

    // close drawer
    setNavOpen(false);

    // sync bottom nav icon
    window.dispatchEvent(
      new CustomEvent("jw:leftnav:state", { detail: false }),
    );

    // redirect (replace = no back)
    navigate("/login", { replace: true });
  };

  // 🔀 route navigation (logout handled here)
  const go = (id) => {
    if (id === "logout") {
      handleLogout();
      return;
    }

    const map = {
      dashboard: "/home",
      accounts: "/accounts",
      transfers: "/transfers",
      wallets: "/wallets",
      promotions: "/promotions",
      referral: "/referral",
      notifications: "/notifications",
      contact: "/contact",
      transactions: "/transactions",
      deposit: "/deposit",
      withdraw: "/withdraw",
    };

    navigate(map[id] || "/home");
  };

  // 🔑 listen to bottom nav toggle (menu/close button)
  useEffect(() => {
    const handler = (e) => {
      const next = e.detail === true;
      setNavOpen(next);

      // notify bottom nav of actual state
      window.dispatchEvent(
        new CustomEvent("jw:leftnav:state", { detail: next }),
      );
    };

    window.addEventListener("jw:leftnav:toggle", handler);
    return () => window.removeEventListener("jw:leftnav:toggle", handler);
  }, []);

  // 🔁 keep bottom nav icon in sync whenever navOpen changes
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("jw:leftnav:state", { detail: navOpen }),
    );
  }, [navOpen]);

  // ✅ auto-close drawer when route changes
  useEffect(() => {
    if (navOpen) setNavOpen(false);
    window.dispatchEvent(
      new CustomEvent("jw:leftnav:state", { detail: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ✅ session check on mount and every navigation: if client is suspended, apiFetch gets 401 and forces logout + redirect
  useEffect(() => {
    if (localStorage.getItem("role") !== "client") return;
    apiFetch("/api/auth/me").catch(() => {});
  }, [location.pathname]);

  // ✅ fetch balance on mount when client
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // ✅ refresh balance when triggered (e.g. after withdraw submit)
  useEffect(() => {
    const onRefresh = () => fetchBalance();
    window.addEventListener("jw:refresh-balance", onRefresh);
    return () => window.removeEventListener("jw:refresh-balance", onRefresh);
  }, [fetchBalance]);

  // ✅ idle auto-logout
  useEffect(() => {
    const stop = startIdleLogout({
      onLogout: () => {
        // use same logout behavior
        handleLogout();
      },
    });

    return stop;
    // handleLogout depends on navigate; safe to just use navigate as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ✅ multi-tab logout sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "jw:logout") {
        setNavOpen(false);
        window.dispatchEvent(
          new CustomEvent("jw:leftnav:state", { detail: false }),
        );
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [navigate]);

  // ✅ swipe gesture: edge swipe right to open, swipe left to close
  useEffect(() => {
    const isMobile = () =>
      window.matchMedia && window.matchMedia("(max-width: 768px)").matches;

    const onTouchStart = (ev) => {
      if (!isMobile()) return;
      if (!ev.touches || ev.touches.length !== 1) return;

      const t = ev.touches[0];
      const startX = t.clientX;
      const startY = t.clientY;

      // ignore if started on input controls
      const tag =
        ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : "";
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        tag === "button"
      )
        return;

      touchStartRef.current = {
        x: startX,
        y: startY,
        fromEdge: startX <= 24, // edge-swipe threshold
      };
    };

    const onTouchEnd = (ev) => {
      if (!isMobile()) return;
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;

      const changed = ev.changedTouches && ev.changedTouches[0];
      if (!changed) return;

      const dx = changed.clientX - start.x;
      const dy = changed.clientY - start.y;

      // avoid vertical scroll gestures
      if (Math.abs(dy) > 45) return;

      // OPEN: swipe right from left edge
      if (!navOpen && start.fromEdge && dx > 70) {
        setNavOpen(true);
        return;
      }

      // CLOSE: swipe left anywhere when open
      if (navOpen && dx < -70) {
        setNavOpen(false);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [navOpen]);

  const balanceDisplay = formatBalance(balance);
  const balanceAmountDisplay = formatBalanceAmount(balance);

  return (
    <div className="jw-loggedPage">
      <LandingHeader
        isLoggedIn
        balanceCurrency="Rs."
        balanceAmount={balanceAmountDisplay}
        onDeposit={() => go("deposit")}
        onRefreshBalance={fetchBalance}
      />

      <div className="jw-loggedGrid">
        {/* Desktop Left Nav */}
        <aside className="jw-loggedNav" aria-label="Left navigation">
          <div className="jw-loggedNavInner">
            <LeftNav
              variant="sidebar"
              userName={firstName}
              balanceValue={balanceDisplay}
              activeId={activeId}
              onNavigate={go}
              onDeposit={() => go("deposit")}
              onWithdraw={() => go("withdraw")}
              onRefreshBalance={fetchBalance}
            />
          </div>
        </aside>

        {/* Body */}
        <main className="jw-loggedBody">{children}</main>
      </div>

      {/* Mobile Drawer */}
      <LeftNav
        variant="drawer"
        userName={firstName}
        balanceValue={balanceDisplay}
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        activeId={activeId}
        onNavigate={(id) => {
          go(id);
          setNavOpen(false);
        }}
        onDeposit={() => {
          setNavOpen(false);
          go("deposit");
        }}
        onWithdraw={() => {
          setNavOpen(false);
          go("withdraw");
        }}
        onRefreshBalance={fetchBalance}
      />
    </div>
  );
}

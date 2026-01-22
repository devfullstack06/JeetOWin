import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  User,
  Wallet,
  Megaphone,
  Users,
  Bell,
  Headphones,
  LogOut,
  Eye,
  EyeOff,
  RotateCcw,
  X,
} from "lucide-react";
import "./leftNav.css";

export default function LeftNav({
  // "sidebar" => desktop panel only
  // "drawer"  => mobile drawer only
  variant = "sidebar",

  userName = "Ali",
  balanceLabel = "My Balance:",
  balanceValue = "Rs. 1,000,000",

  isOpen = false,
  onClose = () => {},

  activeId = "dashboard",
  onNavigate = () => {},

  onDeposit = () => {},
  onWithdraw = () => {},

  onRefreshBalance = () => {},
}) {
  // ✅ default balance is hidden
  const [isBalanceHidden, setIsBalanceHidden] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pages = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { id: "accounts", label: "Accounts", icon: <User size={20} /> },
      { id: "wallets", label: "My Wallets", icon: <Wallet size={20} /> },
      { id: "promotions", label: "Promotions", icon: <Megaphone size={20} /> },
      { id: "referral", label: "Referral Program", icon: <Users size={20} /> },
    ],
    []
  );

  const links = useMemo(
    () => [
      { id: "notifications", label: "Notifications", icon: <Bell size={20} /> },
      { id: "contact", label: "Contact Us", icon: <Headphones size={20} /> },
      { id: "logout", label: "Logout", icon: <LogOut size={20} /> },
    ],
    []
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshBalance(); // later: refresh balance only
    window.setTimeout(() => setIsRefreshing(false), 650);
  };

  const MainSection = (
    <div className="jw-leftNavMain">
      {/* Header (gap 40 from menu) */}
      <div className="jw-leftNavHeader">
        {/* Username */}
        <div className="jw-leftNavName">
          <div className="jw-leftNavHi">Hi,</div>
          <div className="jw-leftNavUser">{userName || "User"}</div>
        </div>

        {/* Balance + Buttons */}
        <div className="jw-leftNavBalance">
          <div className="jw-leftNavBalanceBlock">
            <div className="jw-leftNavBalanceRow">
              <div className="jw-leftNavBalanceLabel">{balanceLabel}</div>

              <div className="jw-leftNavBalanceActions">
                <button
                  type="button"
                  className="jw-leftNavIconBtn"
                  aria-label={isBalanceHidden ? "Show balance" : "Hide balance"}
                  onClick={() => setIsBalanceHidden((v) => !v)}
                >
                  {isBalanceHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>

                <button
                  type="button"
                  className={`jw-leftNavIconBtn ${isRefreshing ? "is-rotating" : ""}`}
                  aria-label="Refresh balance"
                  onClick={handleRefresh}
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>

            <div className="jw-leftNavBalanceValue">
              {isBalanceHidden ? "* * * * * * *" : balanceValue}
            </div>
          </div>

          <div className="jw-leftNavCtas">
            <button
              type="button"
              className="jw-leftNavBtnDeposit"
              onClick={onDeposit}
            >
              Deposit
            </button>
            <button
              type="button"
              className="jw-leftNavBtnWithdraw"
              onClick={onWithdraw}
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Center menu (5 rows) */}
      <div className="jw-leftNavList jw-leftNavPages" aria-label="Pages">
        {pages.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`jw-leftNavItem ${activeId === it.id ? "is-active" : ""}`}
            onClick={() => onNavigate(it.id)}
            aria-current={activeId === it.id ? "page" : undefined}
          >
            <span className="jw-leftNavItemLabel">{it.label}</span>
            <span className="jw-leftNavItemIcon" aria-hidden="true">
              {it.icon}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const FooterSection = (
    <div className="jw-leftNavFooter">
      <div className="jw-leftNavList jw-leftNavLinks" aria-label="Links">
        {links.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`jw-leftNavItem ${activeId === it.id ? "is-active" : ""}`}
            onClick={() => onNavigate(it.id)}
          >
            <span className="jw-leftNavItemLabel">{it.label}</span>
            <span className="jw-leftNavItemIcon" aria-hidden="true">
              {it.icon}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const NavPanel = (
    <div className="jw-leftNavPanel" role="navigation" aria-label="Left navigation">
      {/* Mobile close (drawer only) */}
      <button
        type="button"
        className="jw-leftNavClose"
        aria-label="Close menu"
        onClick={onClose}
      >
        <X size={20} />
      </button>

      {MainSection}

      {/* ✅ auto gap grows/shrinks with height */}
      <div className="jw-leftNavGrow" />

      {FooterSection}
    </div>
  );

  if (variant === "drawer") {
    return (
      <div className={`jw-leftNavDrawer ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
        <button
          type="button"
          className={`jw-leftNavOverlay ${isOpen ? "is-open" : ""}`}
          aria-label="Close menu overlay"
          onClick={onClose}
          tabIndex={isOpen ? 0 : -1}
        />
        <div className={`jw-leftNavDrawerPanel ${isOpen ? "is-open" : ""}`}>
          {NavPanel}
        </div>
      </div>
    );
  }

  return <div className="jw-leftNavDesktop">{NavPanel}</div>;
}

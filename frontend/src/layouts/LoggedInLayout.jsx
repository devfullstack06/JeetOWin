import React, { useState } from "react";
import LandingHeader from "../components/LandingHeader";
import LeftNav from "../components/LeftNav";
import { Menu, ArrowLeftRight, Wallet, Megaphone, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./loggedInLayout.css";

export default function LoggedInLayout({ activeId = "dashboard", children }) {
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();

  const go = (id) => {
    // map nav ids → routes
    const map = {
      dashboard: "/home",
      accounts: "/accounts",
      wallets: "/wallets",
      promotions: "/promotions",
      referral: "/referral",
      notifications: "/notifications",
      contact: "/contact",
      transactions: "/transactions",
      logout: "/logout",
    };
    navigate(map[id] || "/home");
  };

  return (
    <div className="jw-loggedPage">
      <LandingHeader isLoggedIn />

      <div className="jw-loggedGrid">
        {/* Desktop Left Nav */}
        <aside className="jw-loggedNav" aria-label="Left navigation">
          <div className="jw-loggedNavInner">
            <LeftNav
              variant="sidebar"
              activeId={activeId}
              onNavigate={go}
              onDeposit={() => go("transactions")}
              onWithdraw={() => go("transactions")}
              onRefreshBalance={() => {}}
            />
          </div>
        </aside>

        {/* Body */}
        <main className="jw-loggedBody">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <footer className="jw-loggedBottomNav" aria-label="Bottom navigation">
        <button
          className="jw-bottomItem"
          type="button"
          aria-label="Menu"
          onClick={() => setNavOpen(true)}
        >
          <Menu size={20} />
        </button>

        <button
          className="jw-bottomItem"
          type="button"
          aria-label="Transactions"
          onClick={() => go("transactions")}
        >
          <ArrowLeftRight size={20} />
        </button>

        <button
          className="jw-bottomItem"
          type="button"
          aria-label="Wallet"
          onClick={() => go("wallets")}
        >
          <Wallet size={20} />
        </button>

        <button
          className="jw-bottomItem"
          type="button"
          aria-label="Promotions"
          onClick={() => go("promotions")}
        >
          <Megaphone size={20} />
        </button>

        <button
          className="jw-bottomItem"
          type="button"
          aria-label="Chat"
          onClick={() => go("contact")}
        >
          <MessageCircle size={20} />
        </button>
      </footer>

      {/* Mobile Drawer */}
      <LeftNav
        variant="drawer"
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        activeId={activeId}
        onNavigate={(id) => {
          go(id);
          setNavOpen(false);
        }}
        onDeposit={() => {
          setNavOpen(false);
          go("transactions");
        }}
        onWithdraw={() => {
          setNavOpen(false);
          go("transactions");
        }}
        onRefreshBalance={() => {}}
      />
    </div>
  );
}

// frontend/src/pages/Dashboard.jsx
// Dashboard page layout (design only, no API calls)

import React from "react";
import { Home, Menu, ArrowLeftRight, Wallet, Megaphone, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "./dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="db-page">
      {/* Header: logo left, home right (mobile: hamburger + logo + home) */}
      <header className="db-header">
        <div className="db-headerLeft">
          {/* Hamburger menu (mobile only, visible via CSS) */}
          <button className="db-iconBtn db-hamburger" type="button" aria-label="Menu">
            <Menu size={22} />
          </button>

          <Logo />

          <div 
            className="db-logo" 
            onClick={() => navigate("/")}
          >
            JeetOWin
          </div>
        </div>

        <button
          className="db-iconBtn"
          type="button"
          aria-label="Home"
          onClick={() => navigate("/")}
        >
          <Home size={22} />
        </button>
      </header>

      {/* Body: sidebar + main content */}
      <div className="db-body">
        {/* Left sidebar (210px width on desktop, hidden on mobile) */}
        <aside className="db-leftNav">
          {/* Sidebar content placeholder */}
          <div className="db-sidebarContent">Sidebar</div>
        </aside>

        {/* Main content area (light grey background) */}
        <main className="db-main">
          <div className="db-container">
            <h1 className="db-title">Dashboard</h1>

            {/* Placeholder cards grid */}
            <div className="db-grid">
              <div className="db-card">
                <div className="db-cardTitle">Balance</div>
                <div className="db-cardValue">—</div>
              </div>

              <div className="db-card">
                <div className="db-cardTitle">Active Bets</div>
                <div className="db-cardValue">—</div>
              </div>

              <div className="db-card">
                <div className="db-cardTitle">Transactions</div>
                <div className="db-cardValue">—</div>
              </div>
            </div>

            {/* Additional placeholder panels */}
            <div className="db-panel">
              <div className="db-panelTitle">Recent Activity</div>
              <div className="db-panelBody">Placeholder content...</div>
            </div>

            <div className="db-panel" style={{ marginTop: "16px" }}>
              <div className="db-panelTitle">Quick Actions</div>
              <div className="db-panelBody">Placeholder content...</div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile footer nav (visible on mobile only) */}
      <footer className="db-footerNav">
        <button className="db-bottomItem" type="button" aria-label="Menu">
          <Menu size={20} />
        </button>
        <button className="db-bottomItem" type="button" aria-label="Transactions">
          <ArrowLeftRight size={20} />
        </button>
        <button className="db-bottomItem" type="button" aria-label="Wallet">
          <Wallet size={20} />
        </button>
        <button className="db-bottomItem" type="button" aria-label="Promotions">
          <Megaphone size={20} />
        </button>
        <button className="db-bottomItem" type="button" aria-label="Chat">
          <MessageCircle size={20} />
        </button>
      </footer>
    </div>
  );
}

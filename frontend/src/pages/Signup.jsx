// frontend/src/pages/Signup.jsx
// Design placeholder (form will be added next)

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Menu,
  ArrowLeftRight,
  Wallet,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import AuthTabs from "../components/AuthTabs";
import "./login.css";

export default function Signup() {
  const navigate = useNavigate();

  return (
    <div className="jw-page">
      {/* HEADER */}
      <header className="jw-header">
        <div className="jw-headerLeft">
          <button
            className="jw-iconBtn jw-hamburger"
            type="button"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>

          <div className="jw-logo">JeetOWin</div>
        </div>

        <button
          className="jw-iconBtn"
          type="button"
          aria-label="Home"
          onClick={() => navigate("/")}
        >
          <Home size={22} />
        </button>
      </header>

      {/* BODY */}
      <div className="jw-body">
        <aside className="jw-leftNav">{/* later */}</aside>

        <main className="jw-mainArea">
          <section className="jw-bannerStage">
            <img className="jw-bannerImg" src="/banner1.jpg" alt="Banner" />
          </section>

          <section className="jw-loginPanel">
            <AuthTabs />

            <div className="jw-form" style={{ paddingTop: 20 }}>
              <p style={{ color: "#fff", textAlign: "center", opacity: 0.9 }}>
                Sign Up form coming next
              </p>
            </div>
          </section>
        </main>
      </div>

      {/* FOOTER (mobile only) */}
      <footer className="jw-footerNav">
        <button className="jw-bottomItem" type="button" aria-label="Menu">
          <Menu size={20} />
        </button>
        <button
          className="jw-bottomItem"
          type="button"
          aria-label="Transactions"
        >
          <ArrowLeftRight size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Wallet">
          <Wallet size={20} />
        </button>
        <button
          className="jw-bottomItem"
          type="button"
          aria-label="Promotions"
        >
          <Megaphone size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Chat">
          <MessageCircle size={20} />
        </button>
      </footer>
    </div>
  );
}

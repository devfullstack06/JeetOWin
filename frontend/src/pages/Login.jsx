// frontend/src/pages/Login.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginApi } from "../services/authService";
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

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-redirect if already logged in (client)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role === "client") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both username and password");
      return;
    }

    try {
      setLoading(true);
      const data = await loginApi({ email, password });

      if (data.role && data.role !== "client") {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setError("Access denied. This login is for clients only.");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setEmail("");
    setPassword("");
    setError("");
  }

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
            {/* Tabs */}
            <AuthTabs />

            {/* Form */}
            <form className="jw-form" onSubmit={handleSubmit}>
              <label className="jw-field">
                <input
                  className="jw-input"
                  type="text"
                  placeholder="Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </label>

              <label className="jw-field">
                <input
                  className="jw-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </label>

              <button
                type="button"
                className="jw-forgot"
                onClick={() => alert("Forgot feature later")}
              >
                Forgot Username or Password?
              </button>

              {error ? <div className="jw-error">{error}</div> : null}

              <div className="jw-actions">
                <button
                  type="button"
                  className="jw-btn jw-btnCancel"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="jw-btn jw-btnLogin"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>
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

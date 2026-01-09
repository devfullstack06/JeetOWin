import React, { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { login as loginApi } from "../services/authService";
import {
  Home,
  List,
  Wallet,
  Megaphone,
  MessageCircle,
  Menu,
  ArrowLeftRight,
} from "lucide-react";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bannerUrl = useMemo(() => "/login-banner.jpg", []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const data = await loginApi({ email, password });

      // If backend returns token, store it
      if (data?.token) localStorage.setItem("token", data.token);

      // If backend returns user, store it (optional)
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));

      // For now, just go to home (we’ll build next page later)
      navigate("/");
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="jw-screen">
      {/* Top bar */}
      <header className="jw-topbar">
        <div className="jw-brand">JeetOWin</div>
        <button className="jw-iconbtn" type="button" aria-label="Home">
          <Home size={22} />
        </button>
      </header>

      {/* Banner */}
      <section
        className="jw-banner"
        style={{
          backgroundImage: `url(${bannerUrl})`,
        }}
      >
        <div className="jw-bannerOverlay" />
      </section>

      {/* Tabs */}
      <div className="jw-tabs">
        <div className="jw-tab jw-tabActive">Login</div>
        <NavLink className="jw-tab" to="/signup">
          Sign Up
        </NavLink>
      </div>

      {/* Form */}
      <main className="jw-main">
        <form className="jw-form" onSubmit={onSubmit}>
          <label className="jw-field">
            <input
              className="jw-input"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="jw-field">
            <input
              className="jw-input"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button
            type="button"
            className="jw-link"
            onClick={() => alert("We’ll build this page next.")}
          >
            Forgot Username or Password?
          </button>

          {error ? <div className="jw-error">{error}</div> : null}

          <div className="jw-actions">
            <button
              type="button"
              className="jw-btn jw-btnCancel"
              onClick={() => {
                setEmail("");
                setPassword("");
                setError("");
              }}
              disabled={loading}
            >
              Cancel
            </button>

            <button type="submit" className="jw-btn jw-btnLogin" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
      </main>

      {/* Bottom nav */}
      <footer className="jw-bottomnav">
        <button className="jw-bottomItem" type="button" aria-label="Menu">
          <Menu size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Markets">
          <ArrowLeftRight size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Wallet">
          <Wallet size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Announcements">
          <Megaphone size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Chat">
          <MessageCircle size={20} />
        </button>
      </footer>
    </div>
  );
}

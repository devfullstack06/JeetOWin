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
import Logo from "../components/Logo";
import "./login.css";
import usePageTitle from "../hooks/usePageTitle";

export default function Login() {
  const navigate = useNavigate();
  usePageTitle("Login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Show error when redirected after 401 (e.g. suspended account forced logout)
  useEffect(() => {
    const redirectError = sessionStorage.getItem("jw:loginError");
    if (redirectError) {
      sessionStorage.removeItem("jw:loginError");
      setError(redirectError);
    }
  }, []);

  // Auto-redirect if already logged in (client/admin)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }
    if (token && role === "client") {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    try {
      setLoading(true);

      const data = await loginApi({ username, password });

      // ✅ IMPORTANT: store auth for ProtectedRoute
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.role) localStorage.setItem("role", data.role);

      // ✅ store profile for greetings (client/admin)
      localStorage.setItem("jw:fullName", (data?.fullName || "").trim());
      localStorage.setItem("jw:username", (data?.username || "").trim());

      // ✅ route by role
      if (data?.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (data?.role === "client") {
        navigate("/home", { replace: true });
      } else {
        // Unknown role -> safe logout
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("jw:fullName");
        localStorage.removeItem("jw:username");
        setError("Access denied. Unsupported role.");
      }
    } catch (err) {
      // Clean any partial auth
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("jw:fullName");
      localStorage.removeItem("jw:username");

      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    navigate("/");
  }

  return (
    <div className="jw-page">
      {/* HEADER */}
      <header className="jw-header">
        <div className="jw-headerLeft">
          <Logo />
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
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
        <button className="jw-bottomItem" type="button" aria-label="Promotions">
          <Megaphone size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Chat">
          <MessageCircle size={20} />
        </button>
      </footer>
    </div>
  );
}
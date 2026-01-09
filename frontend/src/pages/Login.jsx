// frontend/src/pages/Login.jsx
// Client Login page matching the design screenshot

import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { login as loginApi } from "../services/authService";
import {
  Home,
  Menu,
  ArrowLeftRight,
  Wallet,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Banner image - use login-banner.jpg if it exists, fallback to banner1.jpg
  const bannerUrl = "/login-banner.jpg";

  /**
   * Handle form submission
   * Sends email and password to backend API
   */
  async function handleSubmit(e) {
    console.log("[Login] handleSubmit called");
    e.preventDefault();
    console.log("[Login] preventDefault executed");
    setError("");

    // Validation
    if (!email || !password) {
      console.log("[Login] Validation failed - missing email or password");
      setError("Please enter both username and password");
      return;
    }

    console.log("[Login] Starting login API call with email:", email);

    try {
      setLoading(true);
      console.log("[Login] Loading state set to true");
      
      const data = await loginApi({ email, password });
      console.log("[Login] API call successful, received data:", data);

      // Token is already stored in authService
      // Check if user is a client (only clients should access client login)
      if (data.role && data.role !== "client") {
        console.log("[Login] Role check failed - user role is:", data.role);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setError("Access denied. This login is for clients only.");
        return;
      }

      console.log("[Login] Login successful, redirecting to dashboard");
      // Redirect to old HTML dashboard temporarily until React dashboard is built
      // Once React dashboard is ready, change to: navigate("/dashboard")
      window.location.href = "/frontend/client/dashboard.html";
    } catch (err) {
      console.error("[Login] Error during login:", err);
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      console.log("[Login] Setting loading state to false");
      setLoading(false);
    }
  }

  /**
   * Handle Cancel button click
   * Clears form fields
   */
  function handleCancel() {
    setEmail("");
    setPassword("");
    setError("");
  }

  return (
    <div className="jw-screen">
      {/* Top White Header */}
      <header className="jw-topbar">
        <div className="jw-brand">JeetOWin</div>
        <button
          className="jw-iconbtn"
          type="button"
          aria-label="Home"
          onClick={() => navigate("/")}
        >
          <Home size={22} />
        </button>
      </header>

      {/* Banner Image Section */}
      <section
        className="jw-banner"
        style={{
          backgroundImage: `url(${bannerUrl}), url(/banner1.jpg)`,
        }}
      >
        <div className="jw-bannerOverlay" />
      </section>

      {/* Tabs Row */}
      <div className="jw-tabs">
        <div className="jw-tab jw-tabActive">Login</div>
        <NavLink className="jw-tab" to="/signup">
          Sign Up
        </NavLink>
      </div>

      {/* Main Form Content */}
      <main className="jw-main">
        <form className="jw-form" onSubmit={handleSubmit}>
          {/* Username Input (maps to email) */}
          <label className="jw-field">
            <input
              className="jw-input"
              type="text"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              disabled={loading}
            />
          </label>

          {/* Password Input */}
          <label className="jw-field">
            <input
              className="jw-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </label>

          {/* Forgot Password Link */}
          <button
            type="button"
            className="jw-link"
            onClick={() => alert("Forgot password feature coming soon")}
          >
            Forgot Username or Password?
          </button>

          {/* Error Message */}
          {error && <div className="jw-error">{error}</div>}

          {/* Action Buttons */}
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
      </main>

      {/* Bottom Fixed Navigation Bar */}
      <footer className="jw-bottomnav">
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

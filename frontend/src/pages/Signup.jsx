// frontend/src/pages/Signup.jsx
// Sign Up page with full form implementation

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register as registerApi } from "../services/authService";
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

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Auto-redirect if already logged in (client)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role === "client") {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  // Handle mobile input: strip non-digits, limit to 10 chars, must start with "3"
  function handleMobileChange(e) {
    const value = e.target.value;
    // Strip all non-digit characters
    const digitsOnly = value.replace(/\D/g, "");
    // Limit to 10 digits
    const limited = digitsOnly.slice(0, 10);
    setMobile(limited);
  }

  // Client-side validation
  function validateForm() {
    setError("");

    // Full Name validation: >= 3 chars
    if (!fullName || fullName.trim().length < 3) {
      setError("Full name must be at least 3 characters");
      return false;
    }

    // Username validation: >= 3 chars
    if (!username || username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return false;
    }

    // Mobile validation: exactly 10 digits, numeric only, must start with "3"
    if (!mobile || mobile.length !== 10) {
      setError("Mobile number must be exactly 10 digits");
      return false;
    }
    if (!/^3/.test(mobile)) {
      setError("Mobile number must start with 3");
      return false;
    }
    if (!/^\d{10}$/.test(mobile)) {
      setError("Mobile number must contain only digits");
      return false;
    }

    // Password validation: >= 6 chars
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    // Confirm Password must match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Checkbox must be checked
    if (!agreeToTerms) {
      setError("Please agree to the Terms & Conditions");
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Format mobile to E.164: "+92" + 10digits
      const mobileE164 = `+92${mobile}`;

      // Call register API (referral_code is optional, send only if provided)
      const data = await registerApi({
        fullName: fullName.trim(),
        username: username.trim(),
        mobile: mobileE164,
        password,
        referral_code: referralCode.trim() || undefined,
      });

      // Show success message
      setSuccess(data?.message || "Registration successful! Redirecting to login...");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="jw-page">
      {/* HEADER */}
      <header className="jw-header">
        <div className="jw-headerLeft">
          {/* <button
            className="jw-iconBtn jw-hamburger"
            type="button"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button> */}


          <Logo />

          <div 
            className="jw-logo" 
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            JeetOWin
          </div>
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
              {/* Full Name */}
              <label className="jw-field">
                <input
                  className="jw-input"
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  disabled={loading}
                />
              </label>

              {/* Username */}
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

              {/* Mobile with +92 prefix */}
              <label className="jw-field">
                <div className="jw-mobileWrapper">
                  <span className="jw-mobilePrefix">+92</span>
                  <input
                    className="jw-input jw-mobileInput"
                    type="tel"
                    placeholder="3XXXXXXXXX"
                    value={mobile}
                    onChange={handleMobileChange}
                    autoComplete="tel"
                    inputMode="numeric"
                    disabled={loading}
                    maxLength={10}
                  />
                </div>
              </label>

              {/* Referral Code (Optional) */}
              <label className="jw-field">
                <input
                  className="jw-input"
                  type="text"
                  placeholder="Referral Code (Optional)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  autoComplete="off"
                  disabled={loading}
                />
              </label>

              {/* Password */}
              <label className="jw-field">
                <input
                  className="jw-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </label>

              {/* Confirm Password */}
              <label className="jw-field">
                <input
                  className="jw-input"
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </label>

              {/* Terms & Conditions Checkbox */}
              <div className="jw-checkboxWrapper">
                <label className="jw-checkboxLabel">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    disabled={loading}
                    className="jw-checkbox"
                  />
                  <span className="jw-checkboxText">
                    I confirm I'm 18+ and agree to the{" "}
                    <Link to="/terms" className="jw-termsLink">
                      Terms & Conditions
                    </Link>
                  </span>
                </label>
              </div>

              {/* Error message */}
              {error ? <div className="jw-error">{error}</div> : null}

              {/* Success message */}
              {success ? <div className="jw-success">{success}</div> : null}

              {/* Submit button (full width) */}
              <div className="jw-actions jw-actionsColumn">
                <button
                  type="submit"
                  className="jw-btn jw-btnLogin jw-btnFull"
                  disabled={loading}
                >
                  {loading ? "Signing up..." : "Sign Up"}
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

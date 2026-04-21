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
  Eye,
  EyeOff,
} from "lucide-react";
import AuthTabs from "../components/AuthTabs";
import Logo from "../components/Logo";
import "./login.css";
import usePageTitle from "../hooks/usePageTitle";

/** Password specials allowed (no @ — avoids email-like passwords; no spaces). */
const PASSWORD_SPECIALS = `!#$%^&*()_+-=[]{}|;:'",.<>/?\`~\\`;

function buildPasswordAllowedSet() {
  const s = new Set();
  for (let i = 0; i < 26; i += 1) {
    s.add(String.fromCharCode(97 + i));
    s.add(String.fromCharCode(65 + i));
  }
  for (let i = 0; i < 10; i += 1) s.add(String(i));
  for (const ch of PASSWORD_SPECIALS) s.add(ch);
  return s;
}
const PASSWORD_ALLOWED = buildPasswordAllowedSet();

function sanitizeUsernameInput(raw) {
  const lower = raw.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9]/g, "");
  const hadInvalid = [...raw].some((ch) => {
    const c = ch.toLowerCase();
    return !((c >= "a" && c <= "z") || (c >= "0" && c <= "9"));
  });
  return { value: cleaned, hadInvalid };
}

function sanitizePasswordInput(raw) {
  let out = "";
  let hadInvalid = false;
  for (const ch of raw) {
    if (PASSWORD_ALLOWED.has(ch)) {
      out += ch;
      continue;
    }
    hadInvalid = true;
  }
  return { value: out, hadInvalid };
}

function sanitizeFullNameInput(raw) {
  const cleaned = raw.replace(/[^a-zA-Z ]/g, "");
  const hadInvalid = raw !== cleaned;
  return { value: cleaned, hadInvalid };
}

export default function Signup() {
  const navigate = useNavigate();
  usePageTitle("Signup");
  const [loginBanners, setLoginBanners] = useState({ desktop: "", mobile: "" });

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fullNameHint, setFullNameHint] = useState("");
  const [usernameHint, setUsernameHint] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [confirmPasswordHint, setConfirmPasswordHint] = useState("");
  const hasLoginBanner = !!(loginBanners.mobile || loginBanners.desktop);

  // Auto-redirect if already logged in (client)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role === "client") {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let ignore = false;
    fetch("/api/home-banner-slides/login-banners")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        setLoginBanners({
          desktop: String(data?.desktop || ""),
          mobile: String(data?.mobile || ""),
        });
      })
      .catch(() => {
        if (!ignore) setLoginBanners({ desktop: "", mobile: "" });
      });
    return () => {
      ignore = true;
    };
  }, []);

  function handleFullNameChange(e) {
    setError("");
    const raw = e.target.value;
    const { value, hadInvalid } = sanitizeFullNameInput(raw);
    setFullName(value);
    if (hadInvalid) {
      setFullNameHint("Only letters and spaces are allowed (no numbers or symbols).");
    } else if (value.trim().length > 0 && value.trim().length < 3) {
      setFullNameHint("Full name must be at least 3 letters (not counting extra spaces).");
    } else {
      setFullNameHint("");
    }
  }

  function handleUsernameChange(e) {
    setError("");
    const raw = e.target.value;
    const { value, hadInvalid } = sanitizeUsernameInput(raw);
    setUsername(value);
    if (hadInvalid) {
      setUsernameHint("Only lowercase letters and numbers. Spaces and symbols are not allowed.");
    } else if (value.length > 0 && value.length < 3) {
      setUsernameHint("Username must be at least 3 characters.");
    } else {
      setUsernameHint("");
    }
  }

  function handlePasswordChange(e) {
    setError("");
    const { value, hadInvalid } = sanitizePasswordInput(e.target.value);
    setPassword(value);
    if (hadInvalid) {
      setPasswordHint(
        "Only letters (upper or lower case), numbers, and allowed symbols. No spaces or @."
      );
    } else if (value.length > 0 && value.length < 6) {
      setPasswordHint("Password must be at least 6 characters.");
    } else {
      setPasswordHint("");
    }
    if (confirmPassword.length > 0) {
      setConfirmPasswordHint(value !== confirmPassword ? "Passwords do not match." : "");
    }
  }

  function handleConfirmPasswordChange(e) {
    setError("");
    const { value, hadInvalid } = sanitizePasswordInput(e.target.value);
    setConfirmPassword(value);
    if (hadInvalid) {
      setConfirmPasswordHint(
        "Only letters (upper or lower case), numbers, and allowed symbols. No spaces or @."
      );
    } else if (value.length > 0 && value !== password) {
      setConfirmPasswordHint("Passwords do not match.");
    } else {
      setConfirmPasswordHint("");
    }
  }

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

    // Full Name: letters and spaces only, >= 3 non-space chars worth of letters
    if (!fullName || fullName.trim().length < 3) {
      setError("Full name must be at least 3 characters (letters and spaces only).");
      return false;
    }
    if (!/^[a-zA-Z ]+$/.test(fullName)) {
      setError("Full name may only contain letters and spaces.");
      return false;
    }

    // Username: lowercase a–z and digits only, min 3
    if (!username || username.length < 3) {
      setError("Username must be at least 3 characters (letters and numbers only).");
      return false;
    }
    if (!/^[a-z0-9]+$/.test(username)) {
      setError("Username may only contain lowercase letters and numbers.");
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

    // Password: letters (any case), digits, allowed symbols; min 6; no @ / space
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    for (let i = 0; i < password.length; i += 1) {
      if (!PASSWORD_ALLOWED.has(password[i])) {
        setError("Password contains a character that is not allowed.");
        return false;
      }
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
        username,
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

          {/* <div 
            className="jw-logo" 
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            JeetOWin
          </div> */}
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

        <main
          className="jw-mainArea"
          style={{
            "--jw-login-desktop-bg": loginBanners.desktop ? `url("${loginBanners.desktop}")` : "none",
          }}
        >
          <section className="jw-bannerStage">
            {hasLoginBanner ? (
              <picture>
                <source media="(min-width: 769px)" srcSet={loginBanners.desktop || undefined} />
                <img className="jw-bannerImg" src={loginBanners.mobile || loginBanners.desktop || undefined} alt="Banner" />
              </picture>
            ) : null}
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
                  placeholder="Full Name (letters & spaces)"
                  value={fullName}
                  onChange={handleFullNameChange}
                  autoComplete="name"
                  spellCheck={false}
                  disabled={loading}
                />
                {fullNameHint ? <span className="jw-fieldHint">{fullNameHint}</span> : null}
              </label>

              {/* Username */}
              <label className="jw-field">
                <input
                  className="jw-input"
                  type="text"
                  placeholder="Username (lowercase letters & numbers)"
                  value={username}
                  onChange={handleUsernameChange}
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={loading}
                />
                {usernameHint ? <span className="jw-fieldHint">{usernameHint}</span> : null}
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
                <div className="jw-passwordWrap">
                  <input
                    className="jw-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (letters, numbers & symbols)"
                    value={password}
                    onChange={handlePasswordChange}
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="jw-passwordToggle"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
                  </button>
                </div>
                {passwordHint ? <span className="jw-fieldHint">{passwordHint}</span> : null}
              </label>

              {/* Confirm Password */}
              <label className="jw-field">
                <div className="jw-passwordWrap">
                  <input
                    className="jw-input"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="jw-passwordToggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    disabled={loading}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
                  </button>
                </div>
                {confirmPasswordHint ? (
                  <span className="jw-fieldHint">{confirmPasswordHint}</span>
                ) : null}
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

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import "../../admin/components/adminHeader.css";

export default function AffiliateHeader({ userName, onMenu, onCloseMenu, isMenuOpen }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("jw:fullName");
    localStorage.removeItem("jw:username");
    navigate("/login", { replace: true });
  }

  const displayName = String(userName || "Affiliate").toLowerCase();

  return (
    <header className="jw-adminHeader">
      <div className="jw-adminHeaderLeft">
        <button
          type="button"
          className="jw-adminHeaderIconBtn jw-adminHeaderMenuBtn"
          onClick={isMenuOpen ? onCloseMenu : onMenu}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? "✕" : "☰"}
        </button>
        <div
          className="jw-adminHeaderLogo"
          onClick={() => navigate("/affiliate/dashboard")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate("/affiliate/dashboard");
          }}
          role="button"
          tabIndex={0}
        >
          <Logo />
        </div>
      </div>

      <div className="jw-adminHeaderRight">
        <div className="jw-adminProfileWrap" ref={dropdownRef}>
          <button
            type="button"
            className="jw-adminHeaderProfileBtn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <span className="jw-adminHeaderAvatar" aria-hidden="true">👤</span>
            <span className="jw-adminHeaderName">{displayName}</span>
            <span className="jw-adminHeaderCaret" aria-hidden="true">▾</span>
          </button>

          {open ? (
            <div className="jw-adminDropdown" role="menu">
              <button
                type="button"
                className="jw-adminDropdownItem"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate("/affiliate/profile");
                }}
              >
                Profile
              </button>
              <button
                type="button"
                className="jw-adminDropdownItem jw-adminDropdownItemDanger"
                role="menuitem"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

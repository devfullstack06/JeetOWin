import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import "./adminHeader.css";

export default function AdminHeader({
  userName,
  onMenu,
  onCloseMenu,
  isMenuOpen,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdatePassword = () => {
    setOpen(false);
    navigate("/admin/update-password");
  };

  const handleLogout = () => {
    setOpen(false);
  
    // Clear auth
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("jw:fullName");
    localStorage.removeItem("jw:username");
  
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
  
    if (isLocal) {
      // Local development
      navigate("/home", { replace: true });
    } else {
      // Production
      window.location.href = "https://jeetowin.com/home";
    }
  };

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

        <Logo />
      </div>

      <div className="jw-adminHeaderRight">
        <div className="jw-adminProfileWrap" ref={dropdownRef}>
          <button
            type="button"
            className="jw-adminHeaderProfileBtn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span className="jw-adminHeaderAvatar">👤</span>
            <span className="jw-adminHeaderName">
              {String(userName || "admin").toLowerCase()}
            </span>
            <span className="jw-adminHeaderCaret">▾</span>
          </button>

          {open && (
            <div className="jw-adminDropdown">
              <button
                type="button"
                className="jw-adminDropdownItem"
                onClick={handleUpdatePassword}
              >
                Update Password
              </button>

              <button
                type="button"
                className="jw-adminDropdownItem jw-adminDropdownItemDanger"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
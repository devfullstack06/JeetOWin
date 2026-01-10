// frontend/src/components/AuthTabs.jsx
// Route-based auth tabs: /login and /signup

import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./authTabs.css";

export default function AuthTabs() {
  const { pathname } = useLocation();
  const active = pathname === "/signup" ? "signup" : "login";

  return (
    <div className="authTabs">
      <div className="authTabsRow">
        <NavLink
          to="/login"
          className={({ isActive }) => `authTab ${isActive ? "isActive" : ""}`}
        >
          Login
        </NavLink>

        <div className="authDivider">|</div>

        <NavLink
          to="/signup"
          className={({ isActive }) => `authTab ${isActive ? "isActive" : ""}`}
        >
          Sign Up
        </NavLink>
      </div>

      <div className="authRule" />
      <div className={`authActiveLine ${active}`} />
    </div>
  );
}

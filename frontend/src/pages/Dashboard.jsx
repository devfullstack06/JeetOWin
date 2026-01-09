// frontend/src/pages/Dashboard.jsx
// Minimal Dashboard page placeholder
// This will be built out in future tasks

import React from "react";
import { useNavigate } from "react-router-dom";
import { logout as logoutUser } from "../services/authService";

export default function Dashboard() {
  const navigate = useNavigate();

  // Get user info from localStorage
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  /**
   * Handle logout button click
   * Calls logout service and navigates to login page
   */
  function handleLogout() {
    logoutUser();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ padding: "20px", minHeight: "100vh", background: "#0b2a6d", color: "#fff" }}>
      <h1>Dashboard</h1>
      <p>Welcome! You are logged in as: {role || "client"}</p>
      <p>Token stored: {token ? "Yes" : "No"}</p>
      <button
        onClick={handleLogout}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          background: "#c5352f",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}

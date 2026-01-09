// frontend/src/pages/ComingSoon.jsx
// Coming Soon placeholder page for Sign Up

import React from "react";
import { Link } from "react-router-dom";

export default function ComingSoon() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "linear-gradient(180deg, #0b2a6d 0%, #0b4aa0 60%, #0b2a6d 100%)",
        color: "#fff",
      }}
    >
      <h2 style={{ marginBottom: "16px" }}>Coming Soon</h2>
      <p style={{ marginBottom: "24px", opacity: 0.9 }}>
        We'll build this page next.
      </p>
      <Link
        to="/login"
        style={{
          color: "#fff",
          textDecoration: "underline",
          fontSize: "14px",
        }}
      >
        Back to Login
      </Link>
    </div>
  );
}

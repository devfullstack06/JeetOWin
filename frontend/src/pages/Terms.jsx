// frontend/src/pages/Terms.jsx
// Terms & Conditions placeholder page

import React from "react";
import { Link } from "react-router-dom";

export default function Terms() {
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
      <h2 style={{ marginBottom: "16px" }}>Terms & Conditions</h2>
      <p style={{ marginBottom: "24px", opacity: 0.9, maxWidth: "600px", textAlign: "center" }}>
        Terms & Conditions page coming soon.
      </p>
      <Link
        to="/signup"
        style={{
          color: "#fff",
          textDecoration: "underline",
          fontSize: "14px",
        }}
      >
        Back to Sign Up
      </Link>
    </div>
  );
}

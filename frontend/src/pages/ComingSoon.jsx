import React from "react";
import { Link } from "react-router-dom";

export default function ComingSoon() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Coming soon</h2>
      <p>We’ll build this page next.</p>
      <Link to="/login">Back to Login</Link>
    </div>
  );
}

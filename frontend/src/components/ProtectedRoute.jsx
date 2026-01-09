// frontend/src/components/ProtectedRoute.jsx
// Route protection component that checks authentication and role

import React from "react";
import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute - Wraps routes that require authentication
 * 
 * @param {React.ReactNode} children - The component to render if authenticated
 * @param {string} allowedRole - Required role to access (e.g., "client", "admin")
 * @returns {React.ReactNode} - Either the protected component or redirect to login
 */
export default function ProtectedRoute({ children, allowedRole = null }) {
  // Get token and role from localStorage
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If role is required and doesn't match, redirect to login
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated and has correct role (if required)
  return children;
}

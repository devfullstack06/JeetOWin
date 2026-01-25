import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Terms from "./pages/Terms";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import AccountsPage from "./pages/Accounts/AccountsPage";

export default function App() {
  return (
    <Routes>
      {/* Entry - Home page is now the default landing page */}
      <Route path="/" element={<Home />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/terms" element={<Terms />} />

      {/* Logged-in pages */}
      <Route path="/home" element={<Home />} />
      <Route path="/accounts" element={<AccountsPage />} />

      {/* Existing protected dashboard (unchanged) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRole="client">
            <Home />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Terms from "./pages/Terms";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav/BottomNav";

import Home from "./pages/Home";
import AccountsPage from "./pages/Accounts/AccountsPage";

function MobileNavLayout() {
  return (
    <>
      <div className="jw-hasBottomNav">
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Auth (no bottom nav) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/terms" element={<Terms />} />

      {/* Pages wrapped so BottomNav can show on mobile when logged in */}
      <Route element={<MobileNavLayout />}>
        {/* ✅ IMPORTANT: "/" must be inside this layout */}
        <Route path="/" element={<Home />} />

        <Route path="home" element={<Home />} />
        <Route path="accounts" element={<AccountsPage />} />

        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRole="client">
              <Home />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

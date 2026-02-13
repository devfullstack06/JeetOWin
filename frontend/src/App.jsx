import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Terms from "./pages/Terms";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav/BottomNav";

import Home from "./pages/Home";
import AccountsPage from "./pages/Accounts/AccountsPage";
import TransfersPage from "./pages/Transfers/TransfersPage";

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

// ✅ Global guard wrapper for all client pages
function ClientProtectedLayout() {
  return (
    <ProtectedRoute allowedRole="client">
      <Outlet />
    </ProtectedRoute>
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
        {/* Public landing */}
        <Route path="/" element={<Home />} />

        {/* ✅ Everything inside here is protected (client only) */}
        <Route element={<ClientProtectedLayout />}>
          <Route path="home" element={<Home />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="dashboard" element={<Home />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

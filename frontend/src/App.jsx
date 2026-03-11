// frontend/src/App.jsx
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
import WalletsPage from "./pages/Wallets/WalletsPage";
import ContactUsPage from "./pages/contactUs/ContactUsPage";
import PromotionsPage from "./pages/Promotions/PromotionsPage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import TransactionsPage from "./pages/Transactions/TransactionsPage";

// ==========================
// ADMIN
// ==========================
import AdminLayout from "./admin/AdminLayout";
import AdminPlaceholder from "./admin/components/AdminPlaceholder";
import UpdatePassword from "./admin/pages/UpdatePassword";
import UsersPage from "./admin/pages/Users/UsersPage";
import { adminNavGroups } from "./admin/adminNav";

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

// ==========================
// ROLE GUARDS
// ==========================

function ClientProtectedLayout() {
  return (
    <ProtectedRoute allowedRole="client">
      <Outlet />
    </ProtectedRoute>
  );
}

function AdminProtectedLayout() {
  return (
    <ProtectedRoute allowedRole="admin">
      <Outlet />
    </ProtectedRoute>
  );
}

// Flatten admin nav items for route generation
function getAdminItems() {
  const items = [];
  for (const g of adminNavGroups) {
    for (const it of g.items) items.push(it);
  }
  return items;
}

// Role helpers
function getRole() {
  return localStorage.getItem("role") || "";
}

function RedirectIfAdmin() {
  const role = getRole();
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Outlet />;
}

function RedirectIfClient() {
  const role = getRole();
  if (role === "client") return <Navigate to="/home" replace />;
  return <Outlet />;
}

// ==========================
// APP
// ==========================

export default function App() {
  const adminItems = getAdminItems();

  return (
    <Routes>
      {/* ===================== */}
      {/* AUTH ROUTES */}
      {/* ===================== */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/terms" element={<Terms />} />

      {/* ===================== */}
      {/* ADMIN ROUTES */}
      {/* ===================== */}
      <Route element={<RedirectIfClient />}>
        <Route element={<AdminProtectedLayout />}>
          <Route path="/admin" element={<AdminLayout />}>
            {/* Real admin pages */}
            <Route index element={<AdminPlaceholder title="Dashboard" crumb="Admin > Dashboard" />} />
            <Route path="users/user-info" element={<UsersPage />} />
            <Route path="update-password" element={<UpdatePassword />} />

            {/* Auto placeholders for remaining admin routes */}
            {adminItems.map((it) => {
              if (it.path === "/admin") return null;

              const nestedPath = it.path.replace("/admin/", "");

              // skip real implemented routes
              if (nestedPath === "users/user-info") return null;
              if (nestedPath === "update-password") return null;

              return (
                <Route
                  key={it.id}
                  path={nestedPath}
                  element={
                    <AdminPlaceholder
                      title={it.label}
                      crumb={it.crumb}
                    />
                  }
                />
              );
            })}

            {/* Admin fallback */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
      </Route>

      {/* ===================== */}
      {/* CLIENT ROUTES */}
      {/* ===================== */}
      <Route element={<MobileNavLayout />}>
        {/* Public landing */}
        <Route element={<RedirectIfAdmin />}>
          <Route path="/" element={<Home />} />
        </Route>

        {/* Client protected routes */}
        <Route element={<RedirectIfAdmin />}>
          <Route element={<ClientProtectedLayout />}>
            <Route path="home" element={<Home />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="wallets" element={<WalletsPage />} />
            <Route path="dashboard" element={<Home />} />
            <Route path="contact" element={<ContactUsPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route
              path="deposit"
              element={<TransactionsPage initialTab="deposit" />}
            />
            <Route
              path="withdraw"
              element={<TransactionsPage initialTab="withdraw" />}
            />
          </Route>
        </Route>
      </Route>

      {/* Global fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
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
import HistoryPage from "./pages/History/HistoryPage";
import ClientChatWidget from "./components/chat/ClientChatWidget";

// ==========================
// ADMIN
// ==========================
import AdminLayout from "./admin/AdminLayout";
import AdminPlaceholder from "./admin/components/AdminPlaceholder";
import AdminDashboardPage from "./admin/pages/Dashboard/DashboardPage";
import UpdatePassword from "./admin/pages/UpdatePassword";
import UsersPage from "./admin/pages/Users/UsersPage";
import AdminWalletsPage from "./admin/pages/Wallets/WalletsPage";
import AdminReportsPage from "./admin/pages/Reports/ReportsPage";
import AdminContentPage from "./admin/pages/Content/ContentPage";
import AdminBrandsPage from "./admin/pages/Brands/BrandsPage";
import AdminAccountsPage from "./admin/pages/Accounts/AccountsPage";
import AdminTransactionsPage from "./admin/pages/Transactions/TransactionsPage";
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
    <>
      <ClientChatWidget />
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
            <Route index element={<AdminDashboardPage />} />
            <Route path="users/user-info" element={<UsersPage />} />
            <Route path="update-password" element={<UpdatePassword />} />
            <Route path="wallets/company" element={<AdminWalletsPage />} />
            <Route path="wallets/wallets" element={<AdminWalletsPage />} />
            <Route path="reports/general-entries" element={<AdminReportsPage />} />
            <Route path="reports/general-ledger" element={<AdminReportsPage />} />
            <Route path="reports/balance-sheet" element={<AdminReportsPage />} />

            {/* Content: single ContentPage with tabs; all content/* paths render it */}
            <Route path="content" element={<AdminContentPage />} />
            <Route path="content/:contentTab" element={<AdminContentPage />} />

            {/* Brands: single BrandsPage with tabs Website + Master */}
            <Route path="brands" element={<AdminBrandsPage />} />
            <Route path="brands/website" element={<AdminBrandsPage />} />
            <Route path="brands/company" element={<AdminBrandsPage />} />

            {/* Accounts: single AccountsPage with tabs List + Tickets */}
            <Route path="accounts" element={<Navigate to="/admin/accounts/list" replace />} />
            <Route path="accounts/list" element={<AdminAccountsPage />} />
            <Route path="accounts/tickets" element={<AdminAccountsPage />} />

            {/* Transactions: single TransactionsPage with tabs Deposit, Withdraw, Transfers */}
            <Route path="transactions" element={<Navigate to="/admin/transactions/deposit" replace />} />
            <Route path="transactions/deposit" element={<AdminTransactionsPage />} />
            <Route path="transactions/withdraw" element={<AdminTransactionsPage />} />
            <Route path="transactions/transfers" element={<AdminTransactionsPage />} />

            {/* Auto placeholders for remaining admin routes */}
            {adminItems.map((it) => {
              if (it.path === "/admin") return null;

              const nestedPath = it.path.replace("/admin/", "");

              // skip real implemented routes
              if (nestedPath === "users/user-info") return null;
              if (nestedPath === "update-password") return null;
              if (nestedPath === "wallets/company") return null;
              if (nestedPath === "wallets/wallets") return null;
              if (nestedPath === "reports/general-entries") return null;
              if (nestedPath === "reports/general-ledger") return null;
              if (nestedPath === "reports/balance-sheet") return null;
              if (nestedPath === "content") return null;
              if (nestedPath.startsWith("content/")) return null;
              if (nestedPath === "brands") return null;
              if (nestedPath === "brands/website") return null;
              if (nestedPath === "brands/company") return null;
              if (nestedPath === "accounts/list") return null;
              if (nestedPath === "accounts/tickets") return null;
              if (nestedPath === "transactions") return null;
              if (nestedPath === "transactions/deposit") return null;
              if (nestedPath === "transactions/withdraw") return null;
              if (nestedPath === "transactions/transfers") return null;

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
              <Route path="history" element={<HistoryPage />} />
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
    </>
  );
}
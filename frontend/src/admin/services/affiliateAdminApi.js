function getToken() {
  return localStorage.getItem("token") || "";
}

async function adminAffiliateFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${getToken()}`,
  };
  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  const res = await fetch(`/api/admin${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
  return data;
}

export const affiliateAdminApi = {
  getAffiliates: (q) => adminAffiliateFetch(`/affiliates?${new URLSearchParams(q || {})}`),
  createAffiliate: (body) => adminAffiliateFetch("/affiliates", { method: "POST", body: JSON.stringify(body) }),
  getAffiliate: (id) => adminAffiliateFetch(`/affiliates/${id}`),
  patchAffiliate: (id, body) => adminAffiliateFetch(`/affiliates/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getPlans: () => adminAffiliateFetch("/affiliate-plans"),
  createPlan: (body) => adminAffiliateFetch("/affiliate-plans", { method: "POST", body: JSON.stringify(body) }),
  patchPlan: (id, body) => adminAffiliateFetch(`/affiliate-plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getCommissions: (q) => adminAffiliateFetch(`/affiliate-commissions?${new URLSearchParams(q || {})}`),
  getCommissionAdjustments: (id) => adminAffiliateFetch(`/affiliate-commissions/${id}/adjustments`),
  patchCommissionStatus: (id, body) => adminAffiliateFetch(`/affiliate-commissions/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
  adjustCommission: (id, body) => adminAffiliateFetch(`/affiliate-commissions/${id}/adjust`, { method: "POST", body: JSON.stringify(body) }),
  getWithdrawals: () => adminAffiliateFetch("/affiliate-withdrawals"),
  patchWithdrawalStatus: (id, body) => adminAffiliateFetch(`/affiliate-withdrawals/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
  getWallets: () => adminAffiliateFetch("/affiliate-wallets"),
  patchWalletStatus: (id, body) => adminAffiliateFetch(`/affiliate-wallets/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
  getAssets: () => adminAffiliateFetch("/affiliate-assets"),
  createAsset: (fd) => adminAffiliateFetch("/affiliate-assets", { method: "POST", body: fd }),
  patchAsset: (id, fd) => adminAffiliateFetch(`/affiliate-assets/${id}`, { method: "PATCH", body: fd }),
  deleteAsset: (id) => adminAffiliateFetch(`/affiliate-assets/${id}`, { method: "DELETE" }),
  getReports: (q) => adminAffiliateFetch(`/affiliate-reports?${new URLSearchParams(q || {})}`),
  getSettings: () => adminAffiliateFetch("/affiliate-settings"),
  patchSettings: (body) => adminAffiliateFetch("/affiliate-settings", { method: "PATCH", body: JSON.stringify(body) }),
};

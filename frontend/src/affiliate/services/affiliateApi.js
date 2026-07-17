function getToken() {
  return localStorage.getItem("token") || "";
}

async function affiliateFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${getToken()}`,
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  const res = await fetch(`/api/affiliate${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = "/login";
    }
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const affiliateApi = {
  getDashboard: (query) => affiliateFetch(`/dashboard?${new URLSearchParams(query || {})}`),
  getLinks: () => affiliateFetch("/links"),
  createCampaign: (body) => affiliateFetch("/links/campaign", { method: "POST", body: JSON.stringify(body) }),
  getPlayers: (query) => affiliateFetch(`/players?${new URLSearchParams(query || {})}`),
  getCommissions: () => affiliateFetch("/commissions"),
  getWalletCompanies: () => affiliateFetch("/wallets/companies"),
  getWallets: () => affiliateFetch("/wallets"),
  createWallet: (body) => affiliateFetch("/wallets", { method: "POST", body: JSON.stringify(body) }),
  patchWallet: (id, body) => affiliateFetch(`/wallets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getWithdrawals: () => affiliateFetch("/withdrawals"),
  createWithdrawal: (body) => affiliateFetch("/withdrawals", { method: "POST", body: JSON.stringify(body) }),
  getAssets: () => affiliateFetch("/assets"),
  getReports: (query) => affiliateFetch(`/reports?${new URLSearchParams(query || {})}`),
  downloadReportsCsv: async (query) => {
    const qs = new URLSearchParams({ ...(query || {}), format: "csv" });
    const res = await fetch(`/api/affiliate/reports?${qs}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || data.message || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "affiliate-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
  getProfile: () => affiliateFetch("/profile"),
  patchProfile: (body) => affiliateFetch("/profile", { method: "PATCH", body: JSON.stringify(body) }),
  getNotifications: () => affiliateFetch("/notifications"),
  getSupport: () => affiliateFetch("/support"),
  postSupport: (body) => affiliateFetch("/support", { method: "POST", body: JSON.stringify(body) }),
};

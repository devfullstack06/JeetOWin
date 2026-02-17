function getToken() {
    return localStorage.getItem("token");
  }
  
  async function apiFetch(url, options = {}) {
    const token = getToken();
  
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
    });
  
    const data = await res.json().catch(() => ({}));
  
    if (!res.ok) {
      const msg = data?.error || "Request failed";
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
  
    return data;
  }
  
  export function fetchWalletCompanies() {
    return apiFetch("/api/wallets/companies", { method: "GET" });
  }
  
  export function fetchMyWallets(companyId = null) {
    const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
    return apiFetch(`/api/wallets${qs}`, { method: "GET" });
  }
  
  export function createWallet({ walletCompanyId, accountTitle, accountNumber }) {
    return apiFetch("/api/wallets", {
      method: "POST",
      body: JSON.stringify({ walletCompanyId, accountTitle, accountNumber }),
    });
  }
  
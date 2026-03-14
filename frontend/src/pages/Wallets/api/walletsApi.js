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
  
  /**
   * @param forType - "deposit" | "withdraw" | undefined. If set, only companies available for that flow are returned.
   */
  export function fetchWalletCompanies(forType) {
    const qs = forType === "deposit" || forType === "withdraw" ? `?for=${forType}` : "";
    return apiFetch(`/api/wallets/companies${qs}`, { method: "GET" });
  }
  
  export function fetchMyWallets(companyId = null) {
    const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
    return apiFetch(`/api/wallets${qs}`, { method: "GET" });
  }

  /**
   * Payment wallets for deposit (per wallet company).
   * Returns active, available-for-deposit payment wallets.
   */
  export function fetchPaymentWallets(companyId) {
    if (!companyId) return Promise.resolve({ paymentWallets: [] });
    return apiFetch(
      `/api/wallets/payment-wallets?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" }
    );
  }
  
  export function createWallet({ walletCompanyId, accountTitle, accountNumber }) {
    return apiFetch("/api/wallets", {
      method: "POST",
      body: JSON.stringify({ walletCompanyId, accountTitle, accountNumber }),
    });
  }
  
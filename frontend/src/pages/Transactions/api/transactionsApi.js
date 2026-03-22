function getToken() {
  return localStorage.getItem("token") || "";
}

/**
 * Create deposit ticket via API.
 * payload: { walletCompanyId, paymentWalletId, amount, slip? (File) }
 * Returns { ticketId, createdAt, amount, status, slipPath, createdByUsername? }.
 */
export async function createDepositTicket(payload) {
  const formData = new FormData();
  formData.append("walletCompanyId", String(payload.walletCompanyId));
  formData.append("paymentWalletId", String(payload.paymentWalletId));
  formData.append("amount", String(Number(payload.amount)));
  if (payload.slip instanceof File) {
    formData.append("slip", payload.slip);
  }
  const token = getToken();
  const res = await fetch("/api/deposits", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || "Failed to create deposit ticket.");
    throw err;
  }
  return data;
}

/**
 * Fetch deposit ticket status for polling. GET /api/deposits/:id
 * Returns { ticketId, status, createdAt, updatedAt, trxId, reason, slipPath, createdByUsername? }.
 */
export async function fetchDepositTicketStatus(ticketId) {
  const token = getToken();
  const res = await fetch(`/api/deposits/${encodeURIComponent(ticketId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to fetch ticket.");
  return data;
}

// --- Withdraw: real API ---

/**
 * Create withdraw ticket via API.
 * payload: { clientWalletId, amount }
 * Returns { ticketId, ticket }.
 */
export async function createWithdrawTicket(payload) {
  const token = getToken();
  const res = await fetch("/api/withdraws", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      clientWalletId: payload.clientWalletId,
      amount: Number(payload.amount),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || "Failed to create withdraw ticket.");
    throw err;
  }
  return data;
}

/**
 * Fetch withdraw ticket status for polling. GET /api/withdraws/:id
 * Returns { ticket } or null if 404.
 */
export async function fetchTransactionTicket(ticketId) {
  const token = getToken();
  const res = await fetch(`/api/withdraws/${encodeURIComponent(ticketId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to fetch ticket.");
  return data;
}

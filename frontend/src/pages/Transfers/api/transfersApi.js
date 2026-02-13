// frontend/src/pages/Transfers/api/transfersApi.js

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: "Bearer " + token } : {};
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...authHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error || data?.message || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return data;
}

export async function fetchTransferHistory(limit = 10) {
  return jsonFetch(`/api/transfers/history?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
  });
}

export async function fetchTransferBrands() {
  return jsonFetch("/api/transfers/brands", { method: "GET" });
}

export async function fetchTransferAccountsByBrand(brand) {
  return jsonFetch(`/api/transfers/accounts?brand=${encodeURIComponent(brand)}`, {
    method: "GET",
  });
}

export async function createTransferTicket(payload) {
  return jsonFetch("/api/transfers/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchTransferTicketStatus(ticketId) {
  return jsonFetch(`/api/transfers/tickets/${encodeURIComponent(ticketId)}`, {
    method: "GET",
  });
}

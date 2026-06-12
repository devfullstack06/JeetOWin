function clientAuthHeaders() {
  const token = localStorage.getItem("token") || "";
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchReferralOverview() {
  const res = await fetch("/api/client/referral/overview", {
    headers: clientAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load referral overview.");
  return data.overview;
}

export async function fetchReferralStats({ tier = 1, month } = {}) {
  const q = new URLSearchParams({ tier: String(tier) });
  if (month) q.set("month", month);
  const res = await fetch(`/api/client/referral/stats?${q}`, {
    headers: clientAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load referral stats.");
  return data;
}

export async function fetchReferralCommission() {
  const res = await fetch("/api/client/referral/commission", {
    headers: clientAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load commission data.");
  return data;
}

export function formatReferralAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

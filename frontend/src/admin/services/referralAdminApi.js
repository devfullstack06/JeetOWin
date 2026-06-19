function adminHeaders(json = true) {
  const token = localStorage.getItem("token") || "";
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchReferralSettings() {
  const res = await fetch("/api/admin/referral/settings", { headers: adminHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load settings.");
  return data.settings;
}

export async function patchReferralSettings(body) {
  const res = await fetch("/api/admin/referral/settings", {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to save settings.");
  return data.settings;
}

export async function fetchAdminReferrers({ q = "", limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (q) params.set("q", q);
  const res = await fetch(`/api/admin/referral/referrers?${params}`, { headers: adminHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load referrers.");
  return data;
}

export async function patchAdminReferrer(clientId, body) {
  const res = await fetch(`/api/admin/referral/referrers/${clientId}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to update referrer.");
  return data;
}

export async function fetchAdminReferrerCommission(clientId) {
  const res = await fetch(`/api/admin/referral/referrers/${clientId}/commission`, {
    headers: adminHeaders(false),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load commission data.");
  return data;
}

export async function fetchAdminReferrerStats(clientId, { tier = 1, month } = {}) {
  const params = new URLSearchParams({ tier: String(tier) });
  if (month) params.set("month", month);
  const res = await fetch(`/api/admin/referral/referrers/${clientId}/stats?${params}`, {
    headers: adminHeaders(false),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load referral stats.");
  return data;
}

export async function fetchAdminReferrerDownline(clientId) {
  const res = await fetch(`/api/admin/referral/referrers/${clientId}/downline`, {
    headers: adminHeaders(false),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load referral downline.");
  return data;
}

export async function fetchAdminBrandRules({ clientId } = {}) {
  const q = clientId ? `?clientId=${clientId}` : "";
  const res = await fetch(`/api/admin/referral/brand-rules${q}`, { headers: adminHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load brand rules.");
  return data.items || [];
}

export async function postAdminBrandRule(body) {
  const res = await fetch("/api/admin/referral/brand-rules", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to create brand rule.");
  return data;
}

export async function fetchAdminAccrualPreview(month) {
  const res = await fetch(`/api/admin/referral/accruals?month=${encodeURIComponent(month)}`, {
    headers: adminHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load accruals.");
  return data;
}

export async function runAdminAccrual(month) {
  const res = await fetch("/api/admin/referral/accruals/run", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ month }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Accrual run failed.");
  return data;
}

export async function fetchReleaseQueue() {
  const res = await fetch("/api/admin/referral/releases/queue", { headers: adminHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load release queue.");
  return data.items || [];
}

export async function postReleaseCommission(body) {
  const res = await fetch("/api/admin/referral/releases", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Release failed.");
  return data;
}

export async function fetchReleaseHistory(clientId) {
  const q = clientId ? `?clientId=${clientId}` : "";
  const res = await fetch(`/api/admin/referral/releases/history${q}`, { headers: adminHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load history.");
  return data.items || [];
}

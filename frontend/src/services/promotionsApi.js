const PROMO_SESSION_LS = "jw:promoSessionId";

function getOrCreatePromoSessionId() {
  try {
    const existing = localStorage.getItem(PROMO_SESSION_LS);
    if (existing) return existing;
    const id = `ps-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PROMO_SESSION_LS, id);
    return id;
  } catch {
    return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function fetchClientPromotions({ placement = "home_rail" } = {}) {
  const res = await fetch(`/api/client/promotions?placement=${encodeURIComponent(placement)}`, {
    method: "GET",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Failed to load promotions.");
  return Array.isArray(data?.items) ? data.items : [];
}

export async function logPromotionClick({ promotionId, source = "unknown" }) {
  if (!promotionId) return;
  const token = localStorage.getItem("token") || "";
  const sessionId = getOrCreatePromoSessionId();
  await fetch(`/api/client/promotions/${promotionId}/click`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ source, sessionId }),
  }).catch(() => {});
}

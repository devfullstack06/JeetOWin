import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { CHAT_DEFAULTS, CHAT_PROVIDER, TAWK_SRC } from "../../config/chatConfig";

const CLIENT_PATHS = new Set([
  "/",
  "/home",
  "/accounts",
  "/transfers",
  "/history",
  "/wallets",
  "/dashboard",
  "/contact",
  "/promotions",
  "/notifications",
  "/transactions",
  "/deposit",
  "/withdraw",
]);

function isAuthPath(pathname) {
  return pathname === "/login" || pathname === "/signup" || pathname === "/terms";
}

function isAdminPath(pathname) {
  return pathname.startsWith("/admin");
}

function canShowOnPath(pathname, opts = CHAT_DEFAULTS) {
  if (!pathname) return false;
  if (opts.hideOnAdmin && isAdminPath(pathname)) return false;
  if (opts.hideOnAuth && isAuthPath(pathname)) return false;
  return CLIENT_PATHS.has(pathname);
}

const ENV_FALLBACK_SETTINGS = {
  provider: CHAT_PROVIDER,
  scriptSrc: TAWK_SRC,
  enabled: CHAT_PROVIDER !== "none" && !!TAWK_SRC,
  startMinimized: CHAT_DEFAULTS.startMinimized,
  hideOnAdmin: CHAT_DEFAULTS.hideOnAdmin,
  hideOnAuth: CHAT_DEFAULTS.hideOnAuth,
};

function normalizeSettings(raw) {
  const provider = String(raw?.provider || "none").trim().toLowerCase();
  return {
    provider: ["none", "tawk", "textcom"].includes(provider) ? provider : "none",
    scriptSrc: String(raw?.scriptSrc || "").trim(),
    enabled: !!raw?.enabled,
    startMinimized: raw?.startMinimized !== undefined ? !!raw.startMinimized : CHAT_DEFAULTS.startMinimized,
    hideOnAdmin: raw?.hideOnAdmin !== undefined ? !!raw.hideOnAdmin : CHAT_DEFAULTS.hideOnAdmin,
    hideOnAuth: raw?.hideOnAuth !== undefined ? !!raw.hideOnAuth : CHAT_DEFAULTS.hideOnAuth,
  };
}

function isLocallyDisabled() {
  try {
    return localStorage.getItem(CHAT_DEFAULTS.localDisableKey) === "1";
  } catch {
    return false;
  }
}

export default function ClientChatWidget() {
  const location = useLocation();
  const [settings, setSettings] = useState(() => normalizeSettings(ENV_FALLBACK_SETTINGS));
  const loadedScriptRef = useRef("");
  const effective = useMemo(() => normalizeSettings(settings), [settings]);
  const enabledForRoute = useMemo(
    () =>
      canShowOnPath(location.pathname, {
        hideOnAdmin: effective.hideOnAdmin,
        hideOnAuth: effective.hideOnAuth,
      }),
    [location.pathname, effective.hideOnAdmin, effective.hideOnAuth]
  );
  const shouldShow = effective.enabled && effective.provider !== "none" && enabledForRoute && !isLocallyDisabled();

  useEffect(() => {
    let ignore = false;
    fetch("/api/chat-widget/settings", { method: "GET" })
      .then((r) => r.json())
      .then((body) => {
        if (ignore || !body || typeof body !== "object") return;
        setSettings(normalizeSettings(body));
      })
      .catch(() => {
        if (!ignore) setSettings(normalizeSettings(ENV_FALLBACK_SETTINGS));
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (effective.provider !== "tawk" || !effective.scriptSrc || !effective.enabled) {
      window.Tawk_API?.hideWidget?.();
      return;
    }
    if (!shouldShow) {
      // Do not inject/load widget on routes where it must stay hidden.
      window.Tawk_API?.hideWidget?.();
      return;
    }

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

    // Keep widget as a floating bubble by default.
    window.Tawk_API.onLoad = () => {
      if (effective.startMinimized) window.Tawk_API.minimize?.();
      if (!shouldShow) window.Tawk_API.hideWidget?.();
    };

    if (loadedScriptRef.current === effective.scriptSrc) return;
    const existing = document.querySelector('script[data-chat-provider="tawk"]');
    if (existing && existing.getAttribute("src") === effective.scriptSrc) {
      loadedScriptRef.current = effective.scriptSrc;
      return;
    }

    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = effective.scriptSrc;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s1.setAttribute("data-chat-provider", "tawk");
    s0?.parentNode?.insertBefore(s1, s0);
    loadedScriptRef.current = effective.scriptSrc;
  }, [effective.provider, effective.scriptSrc, effective.startMinimized, effective.enabled, shouldShow]);

  useEffect(() => {
    const api = window.Tawk_API;
    if (effective.provider !== "tawk") {
      api?.hideWidget?.();
      return;
    }
    if (!api) return;

    if (shouldShow) {
      api.showWidget?.();
      if (effective.startMinimized) api.minimize?.();
      return;
    }
    api.hideWidget?.();
  }, [effective.provider, effective.startMinimized, shouldShow]);

  return null;
}

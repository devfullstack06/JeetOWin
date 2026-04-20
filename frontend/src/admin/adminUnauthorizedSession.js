/**
 * When an admin API returns 401 (expired/invalid token), clear auth and send the user to login.
 * Installed only while AdminLoggedInLayout is mounted so client/public fetch is unchanged.
 */

let redirectInProgress = false;

export function clearAdminSessionAndRedirectToLogin() {
  if (redirectInProgress) return;
  redirectInProgress = true;
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("jw:fullName");
    localStorage.removeItem("jw:username");
  } catch {
    /* ignore */
  }
  window.location.replace("/login?reason=session_expired");
}

function requestUrlString(input) {
  if (typeof input === "string") return input;
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  if (input && typeof input === "object" && "url" in input) return String(input.url);
  return "";
}

function isAdminApiUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.startsWith("/api/admin");
  } catch {
    return String(url).includes("/api/admin");
  }
}

/**
 * Wraps window.fetch: 401 on /api/admin/* triggers logout + redirect.
 * @returns {() => void} restore native fetch
 */
export function installAdminUnauthorizedFetchInterceptor() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await nativeFetch(...args);
    if (res.status !== 401) return res;
    const url = requestUrlString(args[0]);
    if (!isAdminApiUrl(url)) return res;
    clearAdminSessionAndRedirectToLogin();
    return res;
  };
  return () => {
    window.fetch = nativeFetch;
  };
}

/**
 * Check if user is authenticated (has token and client role).
 */
export function isAuthenticated() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  return !!token && role === "client";
}

/**
 * Logout user (global)
 */
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");

  // 🔔 notify other tabs
  localStorage.setItem("jw:logout", Date.now().toString());
}

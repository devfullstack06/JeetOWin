// frontend/src/services/authService.js
// Authentication service for API calls

/**
 * Login user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<object>} - Response data containing token and role
 */
export async function login({ email, password }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error || data?.message || "Login failed";
    throw new Error(msg);
  }

  // Store token in localStorage if provided
  if (data?.token) {
    localStorage.setItem("token", data.token);
  }

  // Store role if provided
  if (data?.role) {
    localStorage.setItem("role", data.role);
  }

  return data;
}

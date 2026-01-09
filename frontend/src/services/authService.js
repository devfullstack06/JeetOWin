// frontend/src/services/authService.js
// Authentication service for API calls

/**
 * Login user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<object>} - Response data containing token and role
 */
export async function login({ email, password }) {
  console.log("[authService] Starting login API call");
  console.log("[authService] URL: /api/auth/login");
  console.log("[authService] Method: POST");
  console.log("[authService] Body:", { email, password: "***" });

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  console.log("[authService] Fetch completed");
  console.log("[authService] HTTP Status:", res.status, res.statusText);
  console.log("[authService] Response OK:", res.ok);
  console.log("[authService] Response Headers:", Object.fromEntries(res.headers.entries()));

  // Get raw response text first for logging
  const responseText = await res.text();
  console.log("[authService] Raw response text:", responseText);

  // Parse JSON from the text
  let data;
  try {
    data = JSON.parse(responseText);
    console.log("[authService] Parsed JSON data:", data);
  } catch (parseError) {
    console.error("[authService] Failed to parse JSON:", parseError);
    console.error("[authService] Response text was:", responseText);
    throw new Error("Invalid response from server. Please try again.");
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Login failed (${res.status})`;
    console.error("[authService] Login failed:", msg);
    throw new Error(msg);
  }

  // Store token in localStorage if provided
  if (data?.token) {
    console.log("[authService] Storing token in localStorage");
    localStorage.setItem("token", data.token);
  }

  // Store role if provided
  if (data?.role) {
    console.log("[authService] Storing role in localStorage:", data.role);
    localStorage.setItem("role", data.role);
  }

  console.log("[authService] Login successful, returning data");
  return data;
}

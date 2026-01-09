// frontend/src/services/authService.js
// Authentication service for API calls

/**
 * Login user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<object>} - Response data containing token and role
 * @throws {Error} - Throws error with readable message if login fails
 */
export async function login({ email, password }) {
  let res;
  let responseText;

  try {
    // Attempt to fetch from server
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (networkError) {
    // Handle network errors (server not reachable, CORS, etc.)
    console.error("[authService] Network error:", networkError);
    throw new Error("Server not reachable. Please check your connection and try again.");
  }

  // Get raw response text for safe parsing
  try {
    responseText = await res.text();
  } catch (readError) {
    // Handle errors reading response body
    console.error("[authService] Failed to read response:", readError);
    throw new Error("Failed to read server response. Please try again.");
  }

  // Safely parse JSON response
  let data;
  try {
    // Handle empty responses
    if (!responseText.trim()) {
      data = {};
    } else {
      data = JSON.parse(responseText);
    }
  } catch (parseError) {
    // Handle non-JSON responses (HTML error pages, plain text, etc.)
    console.error("[authService] Failed to parse JSON:", parseError);
    console.error("[authService] Response was:", responseText.substring(0, 200));
    
    // If response is not OK, provide context
    if (!res.ok) {
      throw new Error(`Server error (${res.status}). Please try again later.`);
    }
    
    // If response is OK but not JSON, it's unexpected
    throw new Error("Invalid response from server. Please try again.");
  }

  // Check if response indicates an error
  if (!res.ok) {
    // Extract error message from response data
    const errorMessage =
      data?.error ||
      data?.message ||
      `Login failed (${res.status})`;

    throw new Error(errorMessage);
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

/**
 * Logout user by clearing authentication data from localStorage
 * Removes token and role from localStorage
 */
export function logout() {
  console.log("[authService] Logging out user");
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  console.log("[authService] Token and role removed from localStorage");
}

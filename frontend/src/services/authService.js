// frontend/src/services/authService.js
// Authentication service for API calls

/**
 * Login user with username and password
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<object>} - Response data containing token and role
 * @throws {Error} - Throws error with readable message if login fails
 */
export async function login({ username, password }) {
  let res;
  let responseText;

  try {
    // Attempt to fetch from server
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
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
 * Register a new user account
 * @param {object} userData - Registration data
 * @param {string} userData.fullName - User's full name
 * @param {string} userData.username - User's username
 * @param {string} userData.mobile - Mobile number in E.164 format (e.g., "+923001234567")
 * @param {string} userData.password - User's password
 * @param {string} [userData.referral_code] - Optional referral code
 * @returns {Promise<object>} - Response data from server
 * @throws {Error} - Throws error with readable message if registration fails
 */
export async function register({ fullName, username, mobile, password, referral_code }) {
  let res;
  let responseText;

  try {
    // Attempt to fetch from server
    res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, username, mobile, password, referral_code }),
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
      `Registration failed (${res.status})`;

    throw new Error(errorMessage);
  }

  // Return response data (typically { message: "User registered successfully" })
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

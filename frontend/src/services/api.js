// frontend/src/services/api.js
// Reusable authenticated fetch helper for API calls

/**
 * Authenticated fetch helper that automatically attaches JWT token
 * and handles JSON parsing and error responses
 * 
 * @param {string} path - API endpoint path (e.g., "/api/client/dashboard")
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<object>} - Parsed JSON response data
 * @throws {Error} - Throws error with readable message if request fails
 */
export async function apiFetch(path, options = {}) {
  // Get token from localStorage
  const token = localStorage.getItem("token");

  // Prepare headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers, // Allow custom headers to override defaults
  };

  // Attach Authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Merge options with headers
  const fetchOptions = {
    ...options,
    headers,
  };

  // Make the fetch request
  const res = await fetch(path, fetchOptions);

  // Get raw response text for safe JSON parsing
  const responseText = await res.text();

  // Parse JSON safely
  let data;
  try {
    // If response is empty, return empty object
    if (!responseText.trim()) {
      data = {};
    } else {
      data = JSON.parse(responseText);
    }
  } catch (parseError) {
    // If JSON parsing fails, throw readable error
    console.error("[apiFetch] Failed to parse JSON:", parseError);
    console.error("[apiFetch] Response text:", responseText);
    throw new Error("Invalid response from server. Please try again.");
  }

  // Check if response is OK
  if (!res.ok) {
    // Extract error message from response data
    const errorMessage =
      data?.error ||
      data?.message ||
      `Request failed with status ${res.status}`;

    // Log error for debugging
    console.error(`[apiFetch] Request failed: ${path}`, {
      status: res.status,
      statusText: res.statusText,
      error: errorMessage,
    });

    // Throw readable error
    throw new Error(errorMessage);
  }

  // Return parsed data
  return data;
}

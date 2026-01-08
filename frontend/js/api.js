// frontend/js/api.js
// Helper functions for making API requests to the backend
// Handles authentication headers and error responses

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Make an API request to the backend
 * 
 * @param {string} path - API endpoint path (e.g., '/auth/login')
 * @param {string} method - HTTP method ('GET', 'POST', 'PUT', 'DELETE')
 * @param {object} body - Request body (optional, will be JSON stringified)
 * @returns {Promise<object>} - Response data as JSON
 */
async function apiRequest(path, method = 'GET', body = null) {
  // Build full URL
  const url = `${API_BASE_URL}${path}`;

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json'
  };

  // Add Authorization header if we have a token in localStorage
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Prepare fetch options
  const options = {
    method: method,
    headers: headers
  };

  // Add body if provided (for POST, PUT requests)
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    // Make the request
    const response = await fetch(url, options);

    // Parse JSON response
    const data = await response.json();

    // Check if response is not OK (status 200-299)
    if (!response.ok) {
      // Extract error message from response
      const errorMessage = data.error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Return the data if successful
    return data;

  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.message) {
      throw error;
    }

    // Otherwise, handle network errors
    throw new Error('Network error. Please check your connection.');
  }
}

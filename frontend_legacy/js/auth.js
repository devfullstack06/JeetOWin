// frontend/js/auth.js
// Authentication functions for login and logout
// Handles token storage and role checking

/**
 * Login a client user
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<void>}
 */
async function loginClient(email, password) {
  try {
    // Call the login API endpoint
    const response = await apiRequest('/auth/login', 'POST', {
      email: email,
      password: password
    });

    // Check if the user is a client
    // Only clients should access the client dashboard
    if (response.role !== 'client') {
      throw new Error('Access denied. This login is for clients only.');
    }

    // Save token and role to localStorage
    // localStorage persists data even after browser closes
    localStorage.setItem('token', response.token);
    localStorage.setItem('role', response.role);

    // Redirect to client dashboard
    window.location.href = '/frontend/client/dashboard.html';

  } catch (error) {
    // Re-throw the error so the caller can handle it
    throw error;
  }
}

/**
 * Logout the current user
 * Clears stored authentication data and redirects to login page
 */
function logout() {
  // Clear all stored authentication data
  localStorage.removeItem('token');
  localStorage.removeItem('role');

  // Redirect to login page
  window.location.href = '/frontend/client/login.html';
}

/**
 * Check if user is currently logged in
 * 
 * @returns {boolean} - True if token exists, false otherwise
 */
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

/**
 * Get the stored authentication token
 * 
 * @returns {string|null} - Token if exists, null otherwise
 */
function getToken() {
  return localStorage.getItem('token');
}

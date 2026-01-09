// frontend/js/dark-mode.js
// Dark/Light mode toggle functionality
// Persists theme preference to localStorage

/**
 * Initialize theme on page load
 * Loads saved theme or defaults to dark
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);
}

/**
 * Toggle between dark and light theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcon(newTheme);
}

/**
 * Update theme toggle button icon
 */
function updateThemeToggleIcon(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = theme === 'dark' ? '🌓' : '🌙';
    }
}

/**
 * Get current theme
 */
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
}

// Initialize theme when script loads
initTheme();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.toggleTheme = toggleTheme;
    window.initTheme = initTheme;
    window.getCurrentTheme = getCurrentTheme;
}

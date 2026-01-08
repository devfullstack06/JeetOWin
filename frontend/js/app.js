// frontend/js/app.js
// App shell functionality - sidebar, header, navigation
// This file handles the main app layout and navigation

/**
 * Initialize the app shell
 * Sets up sidebar, header, and navigation
 */
function initApp() {
    setupSidebar();
    setupHeader();
    setupThemeToggle();
    checkAuth();
}

/**
 * Setup sidebar navigation
 */
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuItems = sidebar?.querySelectorAll('.menu-item');
    
    if (menuItems) {
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                const href = this.getAttribute('data-href');
                if (href) {
                    e.preventDefault();
                    navigateTo(href);
                }
            });
        });
    }

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar?.classList.add('active');
        });
    }
    
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', () => {
            sidebar?.classList.remove('active');
        });
    }
}

/**
 * Setup header with balance display
 */
function setupHeader() {
    // Load balance from API if on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        loadBalance();
    }
}

/**
 * Load balance from API and display in header
 */
async function loadBalance() {
    try {
        const data = await apiRequest('/client/dashboard', 'GET');
        const balanceElement = document.getElementById('header-balance');
        if (balanceElement && data.balance !== undefined) {
            balanceElement.textContent = `Rs. ${formatCurrency(data.balance)}`;
        }
    } catch (error) {
        console.error('Failed to load balance:', error);
        const balanceElement = document.getElementById('header-balance');
        if (balanceElement) {
            balanceElement.textContent = 'Rs. 0.00';
        }
    }
}

/**
 * Navigate to a page
 */
function navigateTo(path) {
    window.location.href = path;
}

/**
 * Check authentication and redirect if not logged in
 */
function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/frontend/client/login.html';
    }
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Setup theme toggle
 */
function setupThemeToggle() {
    // Initialize theme from dark-mode.js
    if (typeof initTheme === 'function') {
        initTheme();
    }
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            if (typeof toggleTheme === 'function') {
                toggleTheme();
            } else {
                // Fallback if dark-mode.js not loaded
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            }
        });
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

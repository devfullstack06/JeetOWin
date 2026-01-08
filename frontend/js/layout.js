// frontend/js/layout.js
// Shared layout HTML generator to reduce duplication

function getSidebarHTML(activeItem) {
    const menuItems = [
        { icon: '📊', text: 'Dashboard', href: '/frontend/client/dashboard.html' },
        { icon: '💳', text: 'Transactions', href: '/frontend/client/transactions.html' },
        { icon: '👤', text: 'My Accounts', href: '/frontend/client/accounts.html' },
        { icon: '💰', text: 'My Wallets', href: '/frontend/client/wallets.html' },
        { icon: '🎁', text: 'Promotions', href: '/frontend/client/promotions.html' },
        { icon: '🔗', text: 'Referral Program', href: '/frontend/client/referral.html' },
        { icon: '🔔', text: 'Notifications', href: '/frontend/client/notifications.html' },
        { icon: '📞', text: 'Contact Us', href: '/frontend/client/contact.html' }
    ];

    return `
        <aside class="sidebar" id="sidebar">
            <button class="mobile-menu-close" id="mobile-menu-close">×</button>
            <div class="sidebar-header">
                <div class="sidebar-logo">JeetOWin</div>
            </div>
            <nav class="sidebar-menu">
                ${menuItems.map(item => `
                    <a href="${item.href}" class="menu-item ${activeItem === item.text ? 'active' : ''}" data-href="${item.href}">
                        <span class="menu-item-icon">${item.icon}</span>
                        <span>${item.text}</span>
                    </a>
                `).join('')}
                <a href="#" class="menu-item" onclick="logout(); return false;">
                    <span class="menu-item-icon">🚪</span>
                    <span>Logout</span>
                </a>
            </nav>
        </aside>
    `;
}

function getHeaderHTML() {
    return `
        <header class="header">
            <div class="header-left">
                <button class="mobile-menu-toggle" id="mobile-menu-toggle">☰</button>
                <h1 class="header-title">JeetOWin</h1>
            </div>
            <div class="header-right">
                <div class="header-balance" id="header-balance">Rs. 0.00</div>
                <button class="theme-toggle" id="theme-toggle">🌓</button>
            </div>
        </header>
    `;
}

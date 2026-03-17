// Single source of truth for Admin sidebar + routing labels

export const adminNavGroups = [
    {
      group: "Dashboard",
      items: [
        { id: "admin-dashboard", label: "Dashboard", path: "/admin", crumb: "Admin > Dashboard" },
      ],
    },
    {
      group: "Users",
      items: [
        { id: "admin-users-info", label: "User Info", path: "/admin/users/user-info", crumb: "Admin > Users > User Info" },
      ],
    },
    {
      group: "Transactions",
      items: [
        { id: "admin-tx-deposit", label: "Deposit", path: "/admin/transactions/deposit", crumb: "Admin > Transactions > Deposit" },
        { id: "admin-tx-withdraw", label: "Withdraw", path: "/admin/transactions/withdraw", crumb: "Admin > Transactions > Withdraw" },
        { id: "admin-tx-transfers", label: "Transfers", path: "/admin/transactions/transfers", crumb: "Admin > Transactions > Transfers" },
      ],
    },
    {
      group: "Wallets",
      items: [
        { id: "admin-wallets-company", label: "Company", path: "/admin/wallets/company", crumb: "Admin > Wallets > Company" },
        { id: "admin-wallets-wallets", label: "Wallets", path: "/admin/wallets/wallets", crumb: "Admin > Wallets > Wallets" },
      ],
    },
    {
      group: "Reports",
      items: [
        { id: "admin-reports-general-entries", label: "General Entries", path: "/admin/reports/general-entries", crumb: "Admin > Reports > General Entries" },
        { id: "admin-reports-general-ledger", label: "General Ledger", path: "/admin/reports/general-ledger", crumb: "Admin > Reports > General Ledger" },
        { id: "admin-reports-balance-sheet", label: "Balance Sheet", path: "/admin/reports/balance-sheet", crumb: "Admin > Reports > Balance Sheet" },
      ],
    },
    {
      group: "Accounts",
      items: [
        { id: "admin-accounts-info", label: "Accounts Info", path: "/admin/accounts/accounts-info", crumb: "Admin > Accounts > Accounts Info" },
      ],
    },
    {
      group: "Brands",
      items: [
        { id: "admin-brands-website", label: "Website", path: "/admin/brands/website", crumb: "Admin > Brands > Website" },
        { id: "admin-brands-master", label: "Master", path: "/admin/brands/company", crumb: "Admin > Brands > Master" },
      ],
    },
    {
      group: "Content",
      items: [
        { id: "admin-content-main-banner", label: "Main Banner", path: "/admin/content/main-banner", crumb: "Admin > Content > Main Banner" },
        { id: "admin-content-promos", label: "Promos", path: "/admin/content/promos", crumb: "Admin > Content > Promos" },
        { id: "admin-content-top-sports", label: "Top Sports", path: "/admin/content/top-sports", crumb: "Admin > Content > Top Sports" },
        { id: "admin-content-trending", label: "Trending", path: "/admin/content/trending", crumb: "Admin > Content > Trending" },
        { id: "admin-content-brands", label: "Brands", path: "/admin/content/brands", crumb: "Admin > Content > Brands" },
        { id: "admin-content-banks", label: "Banks", path: "/admin/content/banks", crumb: "Admin > Content > Banks" },
        { id: "admin-content-social-media", label: "Social Media", path: "/admin/content/social-media", crumb: "Admin > Content > Social Media" },
        { id: "admin-content-tc", label: "T&C", path: "/admin/content/terms", crumb: "Admin > Content > T&C" },
        { id: "admin-content-privacy", label: "Privacy Policy", path: "/admin/content/privacy-policy", crumb: "Admin > Content > Privacy Policy" },
        { id: "admin-content-help", label: "Help Center", path: "/admin/content/help-center", crumb: "Admin > Content > Help Center" },
        { id: "admin-content-faqs", label: "FAQs", path: "/admin/content/faqs", crumb: "Admin > Content > FAQs" },
        { id: "admin-content-leaderboard", label: "Leader Board", path: "/admin/content/leader-board", crumb: "Admin > Content > Leader Board" },
      ],
    },
    {
      group: "Promotions",
      items: [
        { id: "admin-promos-manage", label: "Manage Promos", path: "/admin/promotions/manage-promos", crumb: "Admin > Promotions > Manage Promos" },
      ],
    },
    {
      group: "Notifications",
      items: [
        { id: "admin-notif-ann", label: "Announcements", path: "/admin/notifications/announcements", crumb: "Admin > Notifications > Announcements" },
        { id: "admin-notif-inbox", label: "Inbox", path: "/admin/notifications/inbox", crumb: "Admin > Notifications > Inbox" },
      ],
    },
    {
      group: "Referral Program",
      items: [
        { id: "admin-ref-manage", label: "Manage Referrer", path: "/admin/referral/manage-referrer", crumb: "Admin > Referral Program > Manage Referrer" },
        { id: "admin-ref-release", label: "Release Commission", path: "/admin/referral/release-commission", crumb: "Admin > Referral Program > Release Commission" },
      ],
    },
  ];
  
  export function findAdminItemByPath(pathname) {
    for (const g of adminNavGroups) {
      for (const item of g.items) {
        if (item.path === pathname) return item;
      }
    }
    return null;
  }
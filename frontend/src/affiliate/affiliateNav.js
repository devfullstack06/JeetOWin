export const affiliateNavGroups = [
  {
    group: "Affiliate Portal",
    items: [
      { id: "aff-dashboard", label: "Dashboard", path: "/affiliate/dashboard", crumb: "Affiliate > Dashboard" },
      { id: "aff-links", label: "My Links", path: "/affiliate/links", crumb: "Affiliate > My Links" },
      { id: "aff-players", label: "Players", path: "/affiliate/players", crumb: "Affiliate > Players" },
      { id: "aff-commissions", label: "Commissions", path: "/affiliate/commissions", crumb: "Affiliate > Commissions" },
      { id: "aff-wallets", label: "Wallets", path: "/affiliate/wallets", crumb: "Affiliate > Wallets" },
      { id: "aff-withdrawals", label: "Withdrawals", path: "/affiliate/withdrawals", crumb: "Affiliate > Withdrawals" },
      { id: "aff-marketing", label: "Marketing Tools", path: "/affiliate/marketing-tools", crumb: "Affiliate > Marketing Tools" },
      { id: "aff-reports", label: "Reports", path: "/affiliate/reports", crumb: "Affiliate > Reports" },
      { id: "aff-profile", label: "Profile", path: "/affiliate/profile", crumb: "Affiliate > Profile" },
      { id: "aff-notifications", label: "Notifications", path: "/affiliate/notifications", crumb: "Affiliate > Notifications" },
      { id: "aff-support", label: "Support", path: "/affiliate/support", crumb: "Affiliate > Support" },
    ],
  },
];

export function findAffiliateItemByPath(pathname) {
  for (const g of affiliateNavGroups) {
    for (const item of g.items) {
      if (item.path === pathname) return item;
    }
  }
  return null;
}

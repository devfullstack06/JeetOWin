// Data-driven now; DB-driven later (same shape).
export const PROMOTIONS = [
    {
      id: "promo-1",
      title: "Fast Payouts Guaranteed",
      description: "Withdraw your winnings instantly with no delay.",
      tag: "LIMITED OFFER",
      image: "/offers-promotions/p (1).avif",
      buttonLabel: "Read More",
      ctaLink: "#",
      isActive: true,
      sortOrder: 10,
    },
    {
      id: "promo-2",
      title: "Welcome Bonus Awaits",
      description: "Sign up today and unlock exciting rewards.",
      tag: "NEW USERS",
      image: "/offers-promotions/p (2).avif",
      buttonLabel: "Read More",
      ctaLink: "#",
      isActive: true,
      sortOrder: 20,
    },
    {
      id: "promo-3",
      title: "Bet More, Win More",
      description: "Higher odds on selected games.",
      tag: "HOT DEAL",
      image: "/offers-promotions/p (3).avif",
      buttonLabel: "Read More",
      ctaLink: "#",
      isActive: true,
      sortOrder: 30,
    },
    {
      id: "promo-4",
      title: "VIP Promotions",
      description: "Special perks for our top players.",
      tag: "EXCLUSIVE",
      image: "/offers-promotions/p (4).avif",
      buttonLabel: "Read More",
      ctaLink: "#",
      isActive: true,
      sortOrder: 40,
    },
  ];
  
  export function getActivePromotions(list = PROMOTIONS) {
    return (list || [])
      .filter((p) => p && p.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  
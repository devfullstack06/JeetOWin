/** Placeholder data until client referral API is wired. */

export const referralMonthSummary = {
  totalReferrals: 12,
  totalCommission: 598,
  totalDeposit: 100500,
  totalWithdraw: 50900,
};

export const referralDetails = [
  { id: 1, username: "abc1234", brand: "BPExch", deposit: 10200, withdraw: 25000, commission: 950 },
  { id: 2, username: "abc1234", brand: "BPExch", deposit: 10200, withdraw: 25000, commission: 950 },
  { id: 3, username: "abc1234", brand: "BPExch", deposit: 10200, withdraw: 25000, commission: 950 },
  { id: 4, username: "abc1234", brand: "BPExch", deposit: 10200, withdraw: 25000, commission: 950 },
];

export const commissionOverall = {
  earned: 30000,
  withdrawn: 25000,
  balance: 5000,
};

export const commissionByMonth = [
  { id: 1, month: "Oct'25", commission: 10500 },
  { id: 2, month: "Sep'25", commission: 20500 },
  { id: 3, month: "Aug'25", commission: 1100 },
];

export function formatReferralAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

/** Placeholder until client referral overview API is wired. */
export const referralOverview = {
  referralCode: "JW-ALI2026",
  infoParagraph:
    "Earn commission when friends you invite register and place bets on supported brands. Rewards are calculated automatically and shown in the Commission tab. Terms may be updated from time to time.",
  detailsModalTitle: "Referral program details",
  detailsModalBody:
    "Full referral terms, commission rates, and payout rules will be managed from the admin panel. This is placeholder copy until that content is published.",
};

export const referralEarnSteps = [
  {
    id: 1,
    title: "Send an invitation",
    subtitle: "to start your referral journey",
  },
  {
    id: 2,
    title: "Let friend register",
    subtitle: "then places bets",
  },
  {
    id: 3,
    title: "Start earning for lifetime",
    subtitle: "without doing a thing",
  },
];

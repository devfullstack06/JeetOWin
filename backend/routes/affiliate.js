const express = require("express");
const authenticateToken = require("../middleware/auth");
const { requireActiveAffiliate } = require("../controllers/affiliate/affiliateHelpers");
const { getAffiliateDashboard } = require("../controllers/affiliate/affiliateDashboardController");
const {
  getAffiliateLinks,
  postAffiliateCampaign,
  trackAffiliateClick,
} = require("../controllers/affiliate/affiliateLinksController");
const {
  getAffiliatePlayers,
  getAffiliateCommissions,
} = require("../controllers/affiliate/affiliatePlayersController");
const {
  getAffiliateWallets,
  postAffiliateWallet,
  patchAffiliateWallet,
  getAffiliateWalletCompanies,
  getAffiliateWithdrawals,
  postAffiliateWithdrawal,
  getAffiliateProfile,
  patchAffiliateProfile,
} = require("../controllers/affiliate/affiliateWalletsController");
const {
  getAffiliateAssets,
  getAffiliateReports,
  getAffiliateNotifications,
  postAffiliateSupport,
  getAffiliateSupport,
} = require("../controllers/affiliate/affiliateMiscController");

const router = express.Router();

// Public
router.post("/track-click", trackAffiliateClick);
router.get("/track-click", trackAffiliateClick);

// Authenticated affiliate portal
router.use(authenticateToken);
router.use(requireActiveAffiliate);

router.get("/dashboard", getAffiliateDashboard);
router.get("/links", getAffiliateLinks);
router.post("/links/campaign", postAffiliateCampaign);
router.get("/players", getAffiliatePlayers);
router.get("/commissions", getAffiliateCommissions);
router.get("/wallets/companies", getAffiliateWalletCompanies);
router.get("/wallets", getAffiliateWallets);
router.post("/wallets", postAffiliateWallet);
router.patch("/wallets/:id", patchAffiliateWallet);
router.get("/withdrawals", getAffiliateWithdrawals);
router.post("/withdrawals", postAffiliateWithdrawal);
router.get("/assets", getAffiliateAssets);
router.get("/reports", getAffiliateReports);
router.get("/profile", getAffiliateProfile);
router.patch("/profile", patchAffiliateProfile);
router.get("/notifications", getAffiliateNotifications);
router.get("/support", getAffiliateSupport);
router.post("/support", postAffiliateSupport);

module.exports = router;

const express = require("express");
const fs = require("fs");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const { optionalWalletIconUpload } = require("../middleware/uploadWalletIcon");
const {
  updateAdminPassword,
} = require("../controllers/admin/updatePasswordController");
const {
  getAdminUsers,
  getAdminUserDetail,
  updateAdminUser,
} = require("../controllers/admin/usersController");
const {
  getAdminWalletCompanies,
  getAdminWalletCompaniesActive,
  createAdminWalletCompany,
  updateAdminWalletCompany,
} = require("../controllers/admin/walletCompaniesController");
const {
  getAdminPaymentWallets,
  createAdminPaymentWallet,
  updateAdminPaymentWallet,
  topUpAdminPaymentWallet,
  deductAdminPaymentWallet,
} = require("../controllers/admin/paymentWalletsController");
const {
  getAdminGeneralEntries,
  getAdminGeneralEntryAccountTypes,
  getAdminGeneralEntryById,
  updateAdminGeneralEntryNarration,
  getAdminAccountBalance,
} = require("../controllers/admin/generalEntriesController");
const {
  getAdminGeneralLedgerAccounts,
  getAdminGeneralLedgerStatement,
} = require("../controllers/admin/generalLedgerController");
const { getAdminBalanceSheet } = require("../controllers/admin/balanceSheetController");
const {
  getAdminSocialLinks,
  createAdminSocialLink,
  updateAdminSocialLink,
} = require("../controllers/admin/socialLinksController");
const { optionalSocialIconUpload } = require("../middleware/uploadSocialIcon");
const { optionalHomeBannerImagesUpload, optionalLoginBannerImagesUpload } = require("../middleware/uploadHomeBannerImages");
const { optionalTopSportsImageUpload } = require("../middleware/uploadTopSportsImage");
const { optionalTrendingGamesImageUpload } = require("../middleware/uploadTrendingGamesImage");
const {
  getAdminHomeBannerSlides,
  createAdminHomeBannerSlide,
  updateAdminHomeBannerSlide,
  deleteAdminHomeBannerSlide,
  updateAdminLoginBanners,
} = require("../controllers/admin/homeBannerSlidesController");
const {
  getAdminTopSportsItems,
  createAdminTopSportsItem,
  updateAdminTopSportsItem,
  deleteAdminTopSportsItem,
} = require("../controllers/admin/topSportsController");
const {
  getAdminTrendingGamesItems,
  createAdminTrendingGamesItem,
  updateAdminTrendingGamesItem,
  deleteAdminTrendingGamesItem,
} = require("../controllers/admin/trendingGamesController");
const {
  getAdminLeaderboardMocks,
  getAdminLeaderboardMockById,
  createAdminLeaderboardMock,
  checkLeaderboardMockUsername,
  previewLeaderboardMockBalance,
  getLeaderboardMockUsernames,
  getLeaderboardMockDetailView,
} = require("../controllers/admin/leaderboardMocksController");
const {
  getAdminBrands,
  createAdminBrand,
  updateAdminBrand,
} = require("../controllers/admin/brandsController");
const {
  getAdminBrandCompanies,
  getAdminBrandsForAccounts,
  createAdminBrandCompany,
  updateAdminBrandCompany,
} = require("../controllers/admin/brandCompaniesController");
const {
  getAdminClientAccounts,
  getAdminClientAccountById,
  createAdminClientAccount,
  updateAdminClientAccount,
} = require("../controllers/admin/clientAccountsController");
const {
  getAdminAccountTickets,
  approveAdminAccountTicket,
  patchAdminAccountTicket,
  rejectAdminAccountTicket,
} = require("../controllers/admin/accountTicketsController");
const {
  getAdminDepositTickets,
  getAdminDepositTicketsReadiness,
  getAdminDepositTicketById,
  createAdminDepositTicket,
  approveAdminDepositTicket,
  rejectAdminDepositTicket,
  patchAdminDepositTicket,
} = require("../controllers/admin/depositTicketsController");
const {
  getAdminWithdrawTickets,
  getAdminWithdrawTicketById,
  getAdminClientWallets,
  createAdminWithdrawTicket,
  approveAdminWithdrawTicket,
  rejectAdminWithdrawTicket,
  patchAdminWithdrawTicket,
} = require("../controllers/admin/withdrawTicketsController");
const { optionalDepositFilesUpload } = require("../middleware/uploadDepositFiles");
const {
  optionalWithdrawEvidenceUpload,
  optionalWithdrawApproveFilesUpload,
} = require("../middleware/uploadWithdrawEvidence");
const {
  optionalTransferRejectEvidenceUpload,
  optionalTransferApproveEvidenceUpload,
} = require("../middleware/uploadTransferEvidence");
const { optionalBrandIconUpload } = require("../middleware/uploadBrandIcon");
const {
  getAdminTransferTickets,
  getAdminTransferTicketById,
  getAdminTransferBrandCompaniesForBrand,
  getAdminTransferClientAccountsForClient,
  createAdminTransferTicket,
  approveAdminTransferTicket,
  rejectAdminTransferTicket,
  patchAdminTransferTicket,
} = require("../controllers/admin/transferTicketsController");
const {
  getAdminDashboard,
  getAdminPendingTicketNotifications,
} = require("../controllers/admin/dashboardController");
const {
  getAdminChatWidgetSettings,
  patchAdminChatWidgetSettings,
} = require("../controllers/admin/chatWidgetSettingsController");
const {
  getAdminChatWidgetEvents,
  getAdminChatWidgetEventsSummary,
} = require("../controllers/admin/chatWidgetEventsController");
const {
  getAdminNotificationGroupNames,
  getAdminNotificationGroups,
  getAdminNotificationGroupById,
  createAdminNotificationGroup,
  updateAdminNotificationGroup,
  getAdminNotificationGroupAudienceBrands,
  getAdminNotificationGroupAudienceWalletCompanies,
  postAdminNotificationGroupAudienceResolve,
} = require("../controllers/admin/notificationGroupsController");
const {
  getAdminAnnouncementFilterOptions,
  getAdminAnnouncements,
  getAdminAnnouncementById,
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminAnnouncementAudience,
  getAdminAnnouncementSeenBy,
  postAdminAnnouncementMemberCountPreview,
} = require("../controllers/admin/announcementsController");
const {
  getAdminInboxFilterOptions,
  postAdminInboxMemberCountPreview,
  getAdminInboxMessages,
  getAdminInboxMessageById,
  createAdminInboxMessage,
  deleteAdminInboxMessage,
  getAdminInboxAudience,
  getAdminInboxSeenBy,
} = require("../controllers/admin/inboxController");
const { uploadAnnouncementImages } = require("../middleware/uploadAnnouncementImages");
const { uploadInboxImages } = require("../middleware/uploadInboxImages");

const router = express.Router();

router.get("/dashboard", requireAdminAuth, getAdminDashboard);
router.get(
  "/notifications/pending-tickets",
  requireAdminAuth,
  getAdminPendingTicketNotifications
);
router.get("/chat-widget-settings", requireAdminAuth, getAdminChatWidgetSettings);
router.patch("/chat-widget-settings", requireAdminAuth, patchAdminChatWidgetSettings);
router.get("/chat-widget-events", requireAdminAuth, getAdminChatWidgetEvents);
router.get("/chat-widget-events/summary", requireAdminAuth, getAdminChatWidgetEventsSummary);

router.post("/update-password", requireAdminAuth, updateAdminPassword);
router.get("/users", requireAdminAuth, getAdminUsers);
router.get("/users/:id/detail", requireAdminAuth, getAdminUserDetail);
router.patch("/users/:id", requireAdminAuth, updateAdminUser);

router.get("/notification-groups/names", requireAdminAuth, getAdminNotificationGroupNames);
router.get("/notification-groups/audience/brands", requireAdminAuth, getAdminNotificationGroupAudienceBrands);
router.get(
  "/notification-groups/audience/wallet-companies",
  requireAdminAuth,
  getAdminNotificationGroupAudienceWalletCompanies
);
router.post("/notification-groups/audience/resolve", requireAdminAuth, postAdminNotificationGroupAudienceResolve);
router.get("/notification-groups", requireAdminAuth, getAdminNotificationGroups);
router.get("/notification-groups/:id", requireAdminAuth, getAdminNotificationGroupById);
router.post("/notification-groups", requireAdminAuth, createAdminNotificationGroup);
router.patch("/notification-groups/:id", requireAdminAuth, updateAdminNotificationGroup);
router.get("/announcements/options", requireAdminAuth, getAdminAnnouncementFilterOptions);
router.post(
  "/announcements/member-count-preview",
  requireAdminAuth,
  postAdminAnnouncementMemberCountPreview
);
router.get("/announcements", requireAdminAuth, getAdminAnnouncements);
router.get("/announcements/:id", requireAdminAuth, getAdminAnnouncementById);
router.get("/announcements/:id/audience", requireAdminAuth, getAdminAnnouncementAudience);
router.get("/announcements/:id/seen", requireAdminAuth, getAdminAnnouncementSeenBy);
router.post("/announcements", requireAdminAuth, createAdminAnnouncement);
router.delete("/announcements/:id", requireAdminAuth, deleteAdminAnnouncement);
const ANNOUNCEMENT_UPLOAD_MAX_TOTAL_BYTES = 25 * 1024 * 1024;

router.post(
  "/announcements/upload-images",
  requireAdminAuth,
  uploadAnnouncementImages,
  (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const totalBytes = files.reduce((s, f) => s + Number(f.size || 0), 0);
    if (totalBytes > ANNOUNCEMENT_UPLOAD_MAX_TOTAL_BYTES) {
      for (const f of files) {
        try {
          if (f.path) fs.unlinkSync(f.path);
        } catch (_) {
          /* ignore */
        }
      }
      return res.status(400).json({
        message: "Total upload size cannot exceed 25MB for this batch.",
      });
    }
    return res.json({
      items: files.map((f) => ({
        path: `/uploads/announcements/${f.filename}`,
        originalName: f.originalname || "",
        mime: f.mimetype || "",
        sizeBytes: Number(f.size || 0),
      })),
    });
  }
);

router.get("/inbox/options", requireAdminAuth, getAdminInboxFilterOptions);
router.post("/inbox/member-count-preview", requireAdminAuth, postAdminInboxMemberCountPreview);
router.get("/inbox", requireAdminAuth, getAdminInboxMessages);
router.get("/inbox/:id", requireAdminAuth, getAdminInboxMessageById);
router.get("/inbox/:id/audience", requireAdminAuth, getAdminInboxAudience);
router.get("/inbox/:id/seen", requireAdminAuth, getAdminInboxSeenBy);
router.post("/inbox", requireAdminAuth, createAdminInboxMessage);
router.delete("/inbox/:id", requireAdminAuth, deleteAdminInboxMessage);
router.post(
  "/inbox/upload-images",
  requireAdminAuth,
  uploadInboxImages,
  (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const totalBytes = files.reduce((s, f) => s + Number(f.size || 0), 0);
    if (totalBytes > ANNOUNCEMENT_UPLOAD_MAX_TOTAL_BYTES) {
      for (const f of files) {
        try {
          if (f.path) fs.unlinkSync(f.path);
        } catch (_) {
          /* ignore */
        }
      }
      return res.status(400).json({
        message: "Total upload size cannot exceed 25MB for this batch.",
      });
    }
    return res.json({
      items: files.map((f) => ({
        path: `/uploads/inbox/${f.filename}`,
        originalName: f.originalname || "",
        mime: f.mimetype || "",
        sizeBytes: Number(f.size || 0),
      })),
    });
  }
);

router.get("/wallet-companies/active", requireAdminAuth, getAdminWalletCompaniesActive);
router.get("/wallet-companies", requireAdminAuth, getAdminWalletCompanies);
router.post("/wallet-companies", requireAdminAuth, optionalWalletIconUpload, createAdminWalletCompany);
router.patch("/wallet-companies/:id", requireAdminAuth, optionalWalletIconUpload, updateAdminWalletCompany);

router.get("/payment-wallets", requireAdminAuth, getAdminPaymentWallets);
router.post("/payment-wallets", requireAdminAuth, createAdminPaymentWallet);
router.patch("/payment-wallets/:id", requireAdminAuth, updateAdminPaymentWallet);
router.post("/payment-wallets/:id/topup", requireAdminAuth, topUpAdminPaymentWallet);
router.post("/payment-wallets/:id/deduct", requireAdminAuth, deductAdminPaymentWallet);

router.get("/admin-account-balance", requireAdminAuth, getAdminAccountBalance);
router.get("/general-entries", requireAdminAuth, getAdminGeneralEntries);
router.get(
  "/general-entries/account-types",
  requireAdminAuth,
  getAdminGeneralEntryAccountTypes
);
router.get("/general-entries/:id", requireAdminAuth, getAdminGeneralEntryById);
router.patch("/general-entries/:id", requireAdminAuth, updateAdminGeneralEntryNarration);

router.get("/reports/general-ledger/accounts", requireAdminAuth, getAdminGeneralLedgerAccounts);
router.get("/reports/general-ledger/statement", requireAdminAuth, getAdminGeneralLedgerStatement);
router.get("/reports/balance-sheet", requireAdminAuth, getAdminBalanceSheet);

router.get("/social-links", requireAdminAuth, getAdminSocialLinks);
router.post("/social-links", requireAdminAuth, optionalSocialIconUpload, createAdminSocialLink);
router.patch("/social-links/:id", requireAdminAuth, optionalSocialIconUpload, updateAdminSocialLink);

router.get("/home-banner-slides", requireAdminAuth, getAdminHomeBannerSlides);
router.post("/home-banner-slides", requireAdminAuth, optionalHomeBannerImagesUpload, createAdminHomeBannerSlide);
router.patch("/home-banner-slides/:id", requireAdminAuth, optionalHomeBannerImagesUpload, updateAdminHomeBannerSlide);
router.delete("/home-banner-slides/:id", requireAdminAuth, deleteAdminHomeBannerSlide);
router.post("/login-banners", requireAdminAuth, optionalLoginBannerImagesUpload, updateAdminLoginBanners);
router.patch("/login-banners", requireAdminAuth, optionalLoginBannerImagesUpload, updateAdminLoginBanners);
router.get("/top-sports", requireAdminAuth, getAdminTopSportsItems);
router.post("/top-sports", requireAdminAuth, optionalTopSportsImageUpload, createAdminTopSportsItem);
router.patch("/top-sports/:id", requireAdminAuth, optionalTopSportsImageUpload, updateAdminTopSportsItem);
router.delete("/top-sports/:id", requireAdminAuth, deleteAdminTopSportsItem);

router.get("/trending-games", requireAdminAuth, getAdminTrendingGamesItems);
router.post("/trending-games", requireAdminAuth, optionalTrendingGamesImageUpload, createAdminTrendingGamesItem);
router.patch("/trending-games/:id", requireAdminAuth, optionalTrendingGamesImageUpload, updateAdminTrendingGamesItem);
router.delete("/trending-games/:id", requireAdminAuth, deleteAdminTrendingGamesItem);

router.get("/leaderboard-mocks/check-username", requireAdminAuth, checkLeaderboardMockUsername);
router.get("/leaderboard-mocks/preview-balance", requireAdminAuth, previewLeaderboardMockBalance);
router.get("/leaderboard-mocks/mock-usernames", requireAdminAuth, getLeaderboardMockUsernames);
router.get("/leaderboard-mocks/detail-view", requireAdminAuth, getLeaderboardMockDetailView);
router.get("/leaderboard-mocks", requireAdminAuth, getAdminLeaderboardMocks);
router.get("/leaderboard-mocks/:id", requireAdminAuth, getAdminLeaderboardMockById);
router.post("/leaderboard-mocks", requireAdminAuth, createAdminLeaderboardMock);

router.get("/brands", requireAdminAuth, getAdminBrands);
router.get("/brands/for-accounts", requireAdminAuth, getAdminBrandsForAccounts);
router.post("/brands", requireAdminAuth, optionalBrandIconUpload, createAdminBrand);
router.patch("/brands/:id", requireAdminAuth, optionalBrandIconUpload, updateAdminBrand);

router.get("/brand-companies", requireAdminAuth, getAdminBrandCompanies);
router.post("/brand-companies", requireAdminAuth, createAdminBrandCompany);
router.patch("/brand-companies/:id", requireAdminAuth, updateAdminBrandCompany);

router.get("/client-accounts", requireAdminAuth, getAdminClientAccounts);
router.get("/client-accounts/:id", requireAdminAuth, getAdminClientAccountById);
router.post("/client-accounts", requireAdminAuth, createAdminClientAccount);
router.patch("/client-accounts/:id", requireAdminAuth, updateAdminClientAccount);

router.get("/account-tickets", requireAdminAuth, getAdminAccountTickets);
router.post("/account-tickets/:id/approve", requireAdminAuth, approveAdminAccountTicket);
router.patch("/account-tickets/:id/reject", requireAdminAuth, rejectAdminAccountTicket);
router.patch("/account-tickets/:id", requireAdminAuth, patchAdminAccountTicket);

router.get("/deposit-tickets", requireAdminAuth, getAdminDepositTickets);
router.get("/deposit-tickets/readiness", requireAdminAuth, getAdminDepositTicketsReadiness);
router.get("/deposit-tickets/:id", requireAdminAuth, getAdminDepositTicketById);
router.post("/deposit-tickets", requireAdminAuth, optionalDepositFilesUpload, createAdminDepositTicket);
router.post("/deposit-tickets/:id/approve", requireAdminAuth, optionalDepositFilesUpload, approveAdminDepositTicket);
router.patch("/deposit-tickets/:id/reject", requireAdminAuth, optionalDepositFilesUpload, rejectAdminDepositTicket);
router.patch("/deposit-tickets/:id", requireAdminAuth, patchAdminDepositTicket);

router.get("/withdraw-tickets", requireAdminAuth, getAdminWithdrawTickets);
router.get("/withdraw-tickets/client-wallets", requireAdminAuth, getAdminClientWallets);
router.get("/withdraw-tickets/:id", requireAdminAuth, getAdminWithdrawTicketById);
router.post("/withdraw-tickets", requireAdminAuth, createAdminWithdrawTicket);
router.post("/withdraw-tickets/:id/approve", requireAdminAuth, optionalWithdrawApproveFilesUpload, approveAdminWithdrawTicket);
router.patch("/withdraw-tickets/:id/reject", requireAdminAuth, optionalWithdrawEvidenceUpload, rejectAdminWithdrawTicket);
router.patch("/withdraw-tickets/:id", requireAdminAuth, patchAdminWithdrawTicket);

router.get(
  "/transfer-tickets/brand-companies",
  requireAdminAuth,
  getAdminTransferBrandCompaniesForBrand
);
router.get(
  "/transfer-tickets/client-accounts",
  requireAdminAuth,
  getAdminTransferClientAccountsForClient
);
router.get("/transfer-tickets", requireAdminAuth, getAdminTransferTickets);
router.get("/transfer-tickets/:id", requireAdminAuth, getAdminTransferTicketById);
router.post("/transfer-tickets", requireAdminAuth, createAdminTransferTicket);
router.post(
  "/transfer-tickets/:id/approve",
  requireAdminAuth,
  optionalTransferApproveEvidenceUpload,
  approveAdminTransferTicket
);
router.patch(
  "/transfer-tickets/:id/reject",
  requireAdminAuth,
  optionalTransferRejectEvidenceUpload,
  rejectAdminTransferTicket
);
router.patch("/transfer-tickets/:id", requireAdminAuth, patchAdminTransferTicket);

module.exports = router;
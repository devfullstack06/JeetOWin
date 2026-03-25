const express = require("express");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const { optionalWalletIconUpload } = require("../middleware/uploadWalletIcon");
const {
  updateAdminPassword,
} = require("../controllers/admin/updatePasswordController");
const {
  getAdminUsers,
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
  getAdminSocialLinks,
  createAdminSocialLink,
  updateAdminSocialLink,
} = require("../controllers/admin/socialLinksController");
const { optionalSocialIconUpload } = require("../middleware/uploadSocialIcon");
const { optionalHomeBannerImagesUpload, optionalLoginBannerImagesUpload } = require("../middleware/uploadHomeBannerImages");
const {
  getAdminHomeBannerSlides,
  createAdminHomeBannerSlide,
  updateAdminHomeBannerSlide,
  deleteAdminHomeBannerSlide,
  updateAdminLoginBanners,
} = require("../controllers/admin/homeBannerSlidesController");
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

const router = express.Router();

router.post("/update-password", requireAdminAuth, updateAdminPassword);
router.get("/users", requireAdminAuth, getAdminUsers);
router.patch("/users/:id", requireAdminAuth, updateAdminUser);

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

router.get("/social-links", requireAdminAuth, getAdminSocialLinks);
router.post("/social-links", requireAdminAuth, optionalSocialIconUpload, createAdminSocialLink);
router.patch("/social-links/:id", requireAdminAuth, optionalSocialIconUpload, updateAdminSocialLink);

router.get("/home-banner-slides", requireAdminAuth, getAdminHomeBannerSlides);
router.post("/home-banner-slides", requireAdminAuth, optionalHomeBannerImagesUpload, createAdminHomeBannerSlide);
router.patch("/home-banner-slides/:id", requireAdminAuth, optionalHomeBannerImagesUpload, updateAdminHomeBannerSlide);
router.delete("/home-banner-slides/:id", requireAdminAuth, deleteAdminHomeBannerSlide);
router.patch("/login-banners", requireAdminAuth, optionalLoginBannerImagesUpload, updateAdminLoginBanners);

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
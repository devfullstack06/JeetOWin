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
const {
  getAdminBrands,
  createAdminBrand,
  updateAdminBrand,
} = require("../controllers/admin/brandsController");
const { optionalBrandIconUpload } = require("../middleware/uploadBrandIcon");

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
router.get("/general-entries/:id", requireAdminAuth, getAdminGeneralEntryById);
router.patch("/general-entries/:id", requireAdminAuth, updateAdminGeneralEntryNarration);

router.get("/social-links", requireAdminAuth, getAdminSocialLinks);
router.post("/social-links", requireAdminAuth, optionalSocialIconUpload, createAdminSocialLink);
router.patch("/social-links/:id", requireAdminAuth, optionalSocialIconUpload, updateAdminSocialLink);

router.get("/brands", requireAdminAuth, getAdminBrands);
router.post("/brands", requireAdminAuth, optionalBrandIconUpload, createAdminBrand);
router.patch("/brands/:id", requireAdminAuth, optionalBrandIconUpload, updateAdminBrand);

module.exports = router;
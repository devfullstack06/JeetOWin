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

module.exports = router;
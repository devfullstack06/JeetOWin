// backend/routes/client.js
// Client router - Protected routes for clients only

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getDashboard, getTransactions } = require('../controllers/clientController');
const { getClientHistory } = require('../controllers/clientHistoryController');
const { getClientHistoryTickets } = require('../controllers/clientHistoryTicketsController');
const {
  getClientAnnouncements,
  getClientAnnouncementUnreadCount,
  markClientAnnouncementRead,
} = require('../controllers/admin/announcementsController');
const {
  getClientInboxMessages,
  getClientInboxUnreadCount,
  markClientInboxMessageRead,
} = require('../controllers/admin/inboxController');
const {
  getClientPromotions,
  logPromotionClick,
} = require("../controllers/admin/promotionsController");
const {
  getClientReferralOverview,
  getClientReferralStats,
  getClientReferralCommission,
  getClientReferralDownline,
} = require("../controllers/client/referralController");

/**
 * GET /api/client/dashboard
 * Get client dashboard data (username, status, balance)
 * 
 * Middleware chain:
 * 1. authenticateToken - Verifies JWT token, sets req.user = { userId, role }
 * 2. roleCheck('client') - Ensures user role is 'client'
 * 3. getDashboard - Fetches real data from database and returns it
 */
router.get('/dashboard', authenticateToken, roleCheck('client'), getDashboard);

/**
 * GET /api/client/transactions
 * Get client's transaction history
 * 
 * Middleware chain:
 * 1. authenticateToken - Verifies JWT token, sets req.user = { userId, role }
 * 2. roleCheck('client') - Ensures user role is 'client'
 * 3. getTransactions - Fetches transactions from database and returns them
 */
router.get('/transactions', authenticateToken, roleCheck('client'), getTransactions);

/**
 * GET /api/client/history/tickets
 * Deposit / withdraw / transfer tickets for History page (Deposits, Withdraws, Transfers tabs).
 */
router.get('/history/tickets', authenticateToken, roleCheck('client'), getClientHistoryTickets);

/**
 * GET /api/client/history
 * Ledger history (DP / WD / TRI / TRO) for History page.
 */
router.get('/history', authenticateToken, roleCheck('client'), getClientHistory);
router.get(
  '/notifications/announcements/unread-count',
  authenticateToken,
  roleCheck('client'),
  getClientAnnouncementUnreadCount
);
router.get(
  '/notifications/announcements',
  authenticateToken,
  roleCheck('client'),
  getClientAnnouncements
);
router.post(
  '/notifications/announcements/:id/read',
  authenticateToken,
  roleCheck('client'),
  markClientAnnouncementRead
);
router.get(
  '/notifications/inbox/unread-count',
  authenticateToken,
  roleCheck('client'),
  getClientInboxUnreadCount
);
router.get(
  '/notifications/inbox',
  authenticateToken,
  roleCheck('client'),
  getClientInboxMessages
);
router.post(
  '/notifications/inbox/:id/read',
  authenticateToken,
  roleCheck('client'),
  markClientInboxMessageRead
);

router.get("/promotions", getClientPromotions);
router.post("/promotions/:id/click", logPromotionClick);

router.get("/referral/overview", authenticateToken, roleCheck("client"), getClientReferralOverview);
router.get("/referral/stats", authenticateToken, roleCheck("client"), getClientReferralStats);
router.get("/referral/downline", authenticateToken, roleCheck("client"), getClientReferralDownline);
router.get("/referral/commission", authenticateToken, roleCheck("client"), getClientReferralCommission);

/**
 * Example: Route accessible by multiple roles
 * GET /api/client/profile
 * 
 * This allows both 'client' and 'admin' roles to access
 */
router.get('/profile', authenticateToken, roleCheck('client', 'admin'), (req, res) => {
  res.json({ 
    message: 'Profile page',
    userId: req.user.userId,
    role: req.user.role
  });
});

// Example placeholder route (no protection - for testing)
router.get('/', (req, res) => {
  res.json({ message: 'Client route is working (placeholder).' });
});

module.exports = router;

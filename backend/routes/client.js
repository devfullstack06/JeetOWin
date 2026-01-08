// backend/routes/client.js
// Client router - Protected routes for clients only

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getDashboard, getTransactions } = require('../controllers/clientController');

/**
 * GET /api/client/dashboard
 * Get client dashboard data (email, status, balance)
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

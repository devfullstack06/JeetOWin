// backend/routes/partner.js
// Partner/IB router - Protected routes for partners only
// Partners can view their referred clients, commissions, and export reports

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getReferredClients } = require('../controllers/partnerController');

/**
 * GET /api/partner/clients
 * Get list of clients referred by this partner
 * 
 * Middleware chain:
 * 1. authenticateToken - Verifies JWT token, sets req.user = { userId, role }
 * 2. roleCheck('partner') - Ensures user role is 'partner'
 * 3. getReferredClients - Fetches referred clients from database and returns them
 */
router.get('/clients', authenticateToken, roleCheck('partner'), getReferredClients);

// Example placeholder route (no protection - for testing)
router.get('/', (req, res) => {
  res.json({ message: 'Partner route is working (placeholder).' });
});

module.exports = router;

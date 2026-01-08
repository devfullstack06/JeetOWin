// backend/routes/backoffice.js
// Back office router - Protected routes for admin/manager/support staff

const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getAllClients, adjustBalance } = require('../controllers/backofficeController');

// GET /api/backoffice/clients (admin/manager/support only)
router.get(
  '/clients',
  authenticateToken,
  roleCheck('admin', 'manager', 'support'),
  getAllClients
);

// POST /api/backoffice/clients/:clientId/adjust-balance (admin only)
// Adjust a client's balance (add or subtract money)
// Body: { "amount": 100.50, "reason": "manual adjustment" }
router.post(
  '/clients/:clientId/adjust-balance',
  authenticateToken,
  roleCheck('admin'), // Only admins can adjust balances
  adjustBalance
);

// Optional: confirm router works
router.get('/', (req, res) => {
  res.json({ message: 'Backoffice route is working.' });
});

module.exports = router;

// backend/routes/auth.js
// Authentication routes: register and login

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

/**
 * POST /api/auth/register
 * Register a new client account
 * Body: { email, password, referral_code? }
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Login and get JWT token
 * Body: { email, password }
 */
router.post('/login', login);

module.exports = router;

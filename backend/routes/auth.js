// backend/routes/auth.js
// Authentication routes: register, login, logout

const jwt = require("jsonwebtoken");
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

/**
 * POST /api/auth/register
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 */
router.post('/login', login);

/**
 * POST /api/auth/logout
 * Requires valid JWT
 */


// {
//     removed for the below given code

//     router.post('/logout', authenticateToken, (req, res) => {
//       return res.json({ success: true });
//     });
// }


const { pool } = require("../config/database");
const { hashToken } = require("../utils/token");

router.post("/logout", authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader.split(" ")[1];

        const tokenHash = hashToken(token);

        // token expiry comes from JWT payload
        const decoded = jwt.decode(token);
        const expiresAt = new Date(decoded.exp * 1000);

        await pool.execute(
            `INSERT INTO revoked_tokens (token_hash, expires_at)
       VALUES (?, ?)`,
            [tokenHash, expiresAt]
        );

        return res.json({ success: true });
    } catch (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
    }
});


module.exports = router;

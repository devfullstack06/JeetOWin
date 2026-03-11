// backend/middleware/auth.js
// JWT authentication middleware + revoked token check (Option A)

const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { hashToken } = require("../utils/token");

/**
 * Middleware to verify JWT token from Authorization header
 *
 * Usage: Add this middleware to protected routes
 * Example: router.get('/dashboard', authenticateToken, controllerFunction)
 *
 * If token is valid AND not revoked:
 *   adds req.user = { userId, role }
 * else returns 401 Unauthorized
 */
async function authenticateToken(req, res, next) {
  // Format: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // If no token provided, return 401
  if (!token) {
    return res.status(401).json({
      error: "Access denied. No token provided.",
    });
  }

  try {
    // 1) Verify JWT (signature + expiry)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2) Check if this token was revoked (blacklisted)
    const tokenHash = hashToken(token);

    const [rows] = await pool.query(
      "SELECT id FROM revoked_tokens WHERE token_hash = ? LIMIT 1",
      [tokenHash]
    );

    if (rows.length > 0) {
      return res.status(401).json({
        error: "Token has been revoked. Please login again.",
      });
    }

    // 3) Attach user info to request object
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    // 4) For client role: block if account is suspended (force logout)
    if (decoded.role === "client") {
      const [clientRows] = await pool.query(
        "SELECT status FROM clients WHERE user_id = ? LIMIT 1",
        [decoded.userId]
      );
      const clientStatus =
        clientRows.length > 0
          ? String(clientRows[0].status || "").toLowerCase()
          : "";
      if (clientStatus === "suspended") {
        return res.status(401).json({
          error: "Your account has been suspended. Please contact support.",
        });
      }
    }

    // Continue to route handler
    next();
  } catch (error) {
    // Token is invalid or expired
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}

module.exports = authenticateToken;

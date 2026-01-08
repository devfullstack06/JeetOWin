// backend/middleware/auth.js
// JWT authentication middleware
// This checks if a request has a valid JWT token and extracts user info

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token from Authorization header
 * 
 * Usage: Add this middleware to protected routes
 * Example: router.get('/dashboard', authenticateToken, controllerFunction)
 * 
 * If token is valid, adds req.user = { userId, role }
 * If token is missing or invalid, returns 401 Unauthorized
 */
function authenticateToken(req, res, next) {
  // Get token from Authorization header
  // Format: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Split "Bearer <token>" and take the token part

  // If no token provided, return 401
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.' 
    });
  }

  try {
    // Verify the token using the secret key
    // If valid, decoded will contain the payload: { userId, role }
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET // || 'your-secret-key-change-in-production'
    );

    // Attach user info to request object
    // Now controllers can access req.user.userId and req.user.role
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    // Continue to the next middleware or route handler
    next();

  } catch (error) {
    // Token is invalid or expired
    return res.status(401).json({ 
      error: 'Invalid or expired token' 
    });
  }
}

module.exports = authenticateToken;

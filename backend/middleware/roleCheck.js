// backend/middleware/roleCheck.js
// Role-based access control (RBAC) middleware
// This ensures only users with specific roles can access certain routes

/**
 * roleCheck - Returns middleware that checks if user's role is allowed
 * 
 * Usage:
 *   router.get('/admin-only', authenticateToken, roleCheck('admin'), controllerFunction)
 *   router.get('/staff-only', authenticateToken, roleCheck('admin', 'manager', 'support'), controllerFunction)
 * 
 * IMPORTANT: Use authenticateToken middleware BEFORE roleCheck
 * This ensures req.user exists with req.user.role
 * 
 * @param {...string} allowedRoles - One or more role names that are allowed
 * @returns {Function} Express middleware function
 */
function roleCheck(...allowedRoles) {
  // Return the actual middleware function
  return (req, res, next) => {
    // Check if req.user exists (should be set by authenticateToken middleware)
    if (!req.user || !req.user.role) {
      return res.status(401).json({ 
        error: 'Authentication required. Please login first.' 
      });
    }

    // Get the user's role from req.user (set by authenticateToken middleware)
    const userRole = req.user.role;

    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }

    // User has the correct role, continue to the next middleware/route handler
    next();
  };
}

module.exports = roleCheck;

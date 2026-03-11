const jwt = require("jsonwebtoken");

function getTokenFromHeader(authHeader = "") {
  if (!authHeader || typeof authHeader !== "string") return "";
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") return parts[1];
  return "";
}

module.exports = function requireAdminAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized. Token missing.",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        message: "JWT secret is not configured on server.",
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    const role = decoded?.role || "";
    const userId = decoded?.id || decoded?.userId || null;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized. Invalid token payload.",
      });
    }

    if (role && role !== "admin") {
      return res.status(403).json({
        message: "Forbidden. Admin access only.",
      });
    }

    req.authUser = {
      id: userId,
      role,
      email: decoded?.email || "",
      username: decoded?.username || "",
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized. Invalid or expired token.",
    });
  }
};
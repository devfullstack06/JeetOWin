// backend/server.js
// Entry point for the backend API server.
// Sets up Express, CORS, JSON parsing, routes, and DB connection test.

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const adminRouter = require("./routes/admin");

// Load environment variables from .env file
dotenv.config();

// Import DB connection test helper
const { testDbConnection } = require("./config/database");

// Import routers (we will create minimal routers so the app runs)
const authRouter = require("./routes/auth");
const clientRouter = require("./routes/client");
const partnerRouter = require("./routes/partner");
const backofficeRouter = require("./routes/backoffice");
const accountsRouter = require("./routes/accounts");
const transfersRouter = require("./routes/transfers");
const walletsRouter = require("./routes/wallets");
const depositsRouter = require("./routes/deposits");
const withdrawsRouter = require("./routes/withdraws");
const socialLinksRouter = require("./routes/socialLinks");

const app = express();

// Enable CORS so the frontend (running on another port) can call this API
app.use(cors());

// Parse incoming JSON and URL-encoded bodies (limit 10mb to avoid 413 errors)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static: uploaded files (wallet icons, QR) from backend/uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/frontend", express.static(path.join(__dirname, "..", "frontend")));

// Simple health check endpoint
// You can hit this in the browser: GET http://localhost:3000/health
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Mount API routers
// Example: /api/auth/login, /api/client/dashboard, etc.
app.use("/api/auth", authRouter);
app.use("/api/client", clientRouter);
app.use("/api/partner", partnerRouter);
app.use("/api/backoffice", backofficeRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/wallets", walletsRouter);
app.use("/api/deposits", depositsRouter);
app.use("/api/withdraws", withdrawsRouter);
app.use("/api/social-links", socialLinksRouter);
app.use("/api/admin", adminRouter);
// Choose port from environment or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);

  // Test the database connection once when the server starts
  testDbConnection();
});

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


const app = express();

// Enable CORS so the frontend (running on another port) can call this API
app.use(cors());

// Parse incoming JSON bodies (for POST/PUT requests)
app.use(express.json());

// ✅ If you really want static serving, register BEFORE listen
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
app.use("/api/admin", adminRouter);
// Choose port from environment or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);

  // Test the database connection once when the server starts
  testDbConnection();
});

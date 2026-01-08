// backend/config/database.js
// This file creates and exports a MySQL connection pool using mysql2.
// We use a pool so the app can efficiently share connections.

const mysql = require('mysql2/promise'); // promise-based API
const dotenv = require('dotenv');

// Load environment variables from .env file (if present)
dotenv.config();

// Create a connection pool using values from environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jeetowin',
  waitForConnections: true,
  connectionLimit: 10, // good default for small/medium apps
  queueLimit: 0
});

/**
 * Simple helper to test the database connection.
 * It runs "SELECT 1" and logs the result.
 * Call this once when the server starts.
 */
async function testDbConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 AS result');
    console.log('✅ Database connection successful:', rows[0]);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

module.exports = {
  pool,
  testDbConnection
};


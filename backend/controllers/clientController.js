// backend/controllers/clientController.js
// Business logic for client-related operations
// All functions here handle client data retrieval and manipulation

const { pool } = require('../config/database');

/**
 * GET DASHBOARD - Get client dashboard data
 * GET /api/client/dashboard
 * 
 * Returns client's username, status, and balance from the database
 * Uses req.user.userId (set by authenticateToken middleware)
 */
async function getDashboard(req, res) {
  try {
    // Get userId from req.user (set by authenticateToken middleware)
    const userId = req.user.userId;

    // Query database: Join users and clients tables
    // We join to get username from users and status/balance from clients
    const [rows] = await pool.query(
      `SELECT u.username, c.status, c.balance
       FROM users u
       JOIN clients c ON c.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    // Check if client record exists
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Client record not found' 
      });
    }

    // Extract data from first row (should only be one row)
    const clientData = rows[0];

    // Return client dashboard data
    res.json({
      username: clientData.username,
      status: clientData.status,
      balance: parseFloat(clientData.balance) // Convert DECIMAL to number for JSON
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data' 
    });
  }
}

/**
 * GET TRANSACTIONS - Get client's transaction history
 * GET /api/client/transactions
 * 
 * Returns list of client's transactions (deposits, withdrawals, trades)
 * Uses req.user.userId (set by authenticateToken middleware)
 * Returns up to 100 most recent transactions, ordered by date (newest first)
 */
async function getTransactions(req, res) {
  try {
    // Get userId from req.user (set by authenticateToken middleware)
    const userId = req.user.userId;

    // Step 1: Find the client_id for this user
    // We need client_id because transactions table references clients.id, not users.id
    const [clientRows] = await pool.query(
      'SELECT id FROM clients WHERE user_id = ?',
      [userId]
    );

    // Check if client record exists
    if (clientRows.length === 0) {
      return res.status(404).json({ 
        error: 'Client record not found' 
      });
    }

    // Get the client_id from the query result
    const clientId = clientRows[0].id;

    // Step 2: Fetch transactions for this client
    // ORDER BY created_at DESC = newest transactions first
    // LIMIT 100 = return maximum 100 transactions
    const [transactionRows] = await pool.query(
      `SELECT id, type, amount, pnl, balance_after, created_at
       FROM transactions
       WHERE client_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [clientId]
    );

    // Convert DECIMAL fields to numbers for JSON response
    // MySQL returns DECIMAL as strings, so we parse them to numbers
    const transactions = transactionRows.map(transaction => ({
      id: transaction.id,
      type: transaction.type, // 'deposit', 'withdrawal', or 'trade'
      amount: parseFloat(transaction.amount),
      pnl: parseFloat(transaction.pnl), // Profit/Loss (0 for deposits/withdrawals)
      balance_after: parseFloat(transaction.balance_after),
      created_at: transaction.created_at // MySQL TIMESTAMP
    }));

    // Return transactions array
    res.json({
      transactions: transactions
    });

  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions' 
    });
  }
}

module.exports = {
  getDashboard,
  getTransactions
};

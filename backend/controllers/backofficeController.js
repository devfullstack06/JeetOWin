// backend/controllers/backofficeController.js
// Business logic for back office operations
// Admin, Manager, and Support staff can manage clients, balances, and system data

const { pool } = require('../config/database');

/**
 * GET ALL CLIENTS - Get list of all clients in the system
 * GET /api/backoffice/clients
 * 
 * Returns list of all clients (read-only view)
 * Only accessible by admin, manager, and support roles
 * Shows client details including their referring partner (if any)
 */
async function getAllClients(req, res) {
  try {
    // Query database to get all clients
    // We join multiple tables:
    // - clients c: main client data (balance, status)
    // - users u: client username
    // - partners p: referral code (LEFT JOIN because not all clients have a partner)
    // 
    // LEFT JOIN partners: Returns clients even if they don't have a partner
    // ORDER BY c.created_at DESC: Newest clients first
    // LIMIT 200: Maximum 200 clients per request
    const [clientRows] = await pool.query(
      `SELECT c.id AS client_id, u.username, c.status, c.balance,
              p.referral_code
       FROM clients c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN partners p ON p.id = c.partner_id
       ORDER BY c.created_at DESC
       LIMIT 200`,
      []
    );

    // Convert DECIMAL balance to number for JSON response
    // MySQL returns DECIMAL as strings, so we parse them to numbers
    // referral_code can be NULL if client wasn't referred by a partner
    const clients = clientRows.map(client => ({
      client_id: client.client_id,
      username: client.username,
      status: client.status, // 'active' or 'suspended'
      balance: parseFloat(client.balance),
      referral_code: client.referral_code || null // null if no partner
    }));

    // Return clients array
    res.json({
      clients: clients
    });

  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch clients' 
    });
  }
}

/**
 * ADJUST CLIENT BALANCE - Admin-only function to adjust a client's balance
 * POST /api/backoffice/clients/:clientId/adjust-balance
 * 
 * This is a critical operation that:
 * - Updates client balance
 * - Logs the action in audit_logs
 * - Creates a transaction record
 * 
 * Uses database transactions to ensure data integrity (all or nothing)
 * Only accessible by admin role
 */
async function adjustBalance(req, res) {
  try {
    // Extract data from request
    const clientId = parseInt(req.params.clientId); // From URL parameter
    const { amount, reason } = req.body; // From request body

    // Validation: Check required fields (do this BEFORE getting connection)
    if (amount === undefined || amount === null) {
      return res.status(400).json({ 
        error: 'Amount is required' 
      });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Reason is required and must be at least 3 characters' 
      });
    }

    // Validation: Check amount is a valid number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return res.status(400).json({ 
        error: 'Amount must be a valid number' 
      });
    }

    // Get connection from pool for transaction
    // We do this AFTER validation to avoid connection leaks
    const connection = await pool.getConnection();

    // Start database transaction
    // This ensures all operations succeed or all fail (atomicity)
    await connection.beginTransaction();

    try {
      // Step 1: Get current balance with row lock (FOR UPDATE)
      // FOR UPDATE locks the row so no other transaction can modify it
      // This prevents race conditions when multiple admins adjust balance simultaneously
      const [clientRows] = await connection.query(
        'SELECT balance FROM clients WHERE id = ? FOR UPDATE',
        [clientId]
      );

      // Check if client exists
      if (clientRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ 
          error: 'Client not found' 
        });
      }

      // Get current balance
      const currentBalance = parseFloat(clientRows[0].balance);
      
      // Step 2: Calculate new balance
      // amount can be positive (add money) or negative (subtract money)
      const newBalance = currentBalance + amountNum;

      // Validation: Prevent negative balance (optional - you might want to allow this)
      // Uncomment if you want to prevent negative balances:
      // if (newBalance < 0) {
      //   await connection.rollback();
      //   connection.release();
      //   return res.status(400).json({ 
      //     error: 'Balance cannot be negative' 
      //   });
      // }

      // Step 3: Update client balance
      await connection.query(
        'UPDATE clients SET balance = ? WHERE id = ?',
        [newBalance, clientId]
      );

      // Step 4: Insert audit log
      // This records WHO did WHAT, WHEN, and WHY
      // Important for security and compliance
      const auditDetails = {
        clientId: clientId,
        amount: amountNum,
        oldBalance: currentBalance,
        newBalance: newBalance,
        reason: reason.trim()
      };

      await connection.query(
        `INSERT INTO audit_logs (user_id, action, details) 
         VALUES (?, 'balance_adjust', ?)`,
        [req.user.userId, JSON.stringify(auditDetails)]
      );

      // Step 5: Insert transaction record
      // This creates a history entry in the transactions table
      // Type is 'deposit' if amount is positive, 'withdrawal' if negative
      const transactionType = amountNum > 0 ? 'deposit' : 'withdrawal';
      const absoluteAmount = Math.abs(amountNum); // Store absolute value

      await connection.query(
        `INSERT INTO transactions (client_id, type, amount, balance_after) 
         VALUES (?, ?, ?, ?)`,
        [clientId, transactionType, absoluteAmount, newBalance]
      );

      // Step 6: Commit transaction
      // If we reach here, all operations succeeded
      // Commit makes all changes permanent
      await connection.commit();
      connection.release();

      // Return success response
      res.json({
        clientId: clientId,
        oldBalance: currentBalance,
        newBalance: newBalance
      });

    } catch (error) {
      // If any step fails, rollback the entire transaction
      // This undoes all changes (balance update, audit log, transaction record)
      await connection.rollback();
      connection.release();
      throw error; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error('Adjust balance error:', error);
    res.status(500).json({ 
      error: 'Failed to adjust balance. Please try again.' 
    });
  }
}

module.exports = {
  getAllClients,
  adjustBalance
};

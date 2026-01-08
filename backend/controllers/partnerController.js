// backend/controllers/partnerController.js
// Business logic for partner/IB operations
// Partners can view their referred clients, commissions, and reports

const { pool } = require('../config/database');

/**
 * GET REFERRED CLIENTS - Get list of clients referred by this partner
 * GET /api/partner/clients
 * 
 * Returns list of all clients that were referred by this partner
 * Uses req.user.userId (set by authenticateToken middleware)
 * Partners can only see clients they referred (via referral_code during registration)
 */
async function getReferredClients(req, res) {
  try {
    // Get userId from req.user (set by authenticateToken middleware)
    const userId = req.user.userId;

    // Step 1: Find the partner record for this user
    // We need partner.id because clients.partner_id references partners.id, not users.id
    const [partnerRows] = await pool.query(
      'SELECT id FROM partners WHERE user_id = ?',
      [userId]
    );

    // Check if partner record exists
    if (partnerRows.length === 0) {
      return res.status(404).json({ 
        error: 'Partner profile not found' 
      });
    }

    // Get the partner_id from the query result
    const partnerId = partnerRows[0].id;

    // Step 2: Find all clients referred by this partner
    // We join clients with users to get client email
    // WHERE c.partner_id = ? ensures we only get THIS partner's clients
    // ORDER BY c.created_at DESC = newest clients first
    // LIMIT 200 = return maximum 200 clients
    const [clientRows] = await pool.query(
      `SELECT c.id as client_id, u.email, c.balance, c.status, c.created_at
       FROM clients c
       JOIN users u ON u.id = c.user_id
       WHERE c.partner_id = ?
       ORDER BY c.created_at DESC
       LIMIT 200`,
      [partnerId]
    );

    // Convert DECIMAL balance to number for JSON response
    // MySQL returns DECIMAL as strings, so we parse them to numbers
    const clients = clientRows.map(client => ({
      client_id: client.client_id,
      email: client.email,
      balance: parseFloat(client.balance),
      status: client.status, // 'active' or 'suspended'
      created_at: client.created_at // MySQL TIMESTAMP
    }));

    // Return clients array
    res.json({
      clients: clients
    });

  } catch (error) {
    console.error('Get referred clients error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch referred clients' 
    });
  }
}

module.exports = {
  getReferredClients
};

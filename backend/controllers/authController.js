// backend/controllers/authController.js
// This file contains the business logic for authentication:
// - Register new clients
// - Login existing users

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * REGISTER - Create a new client account
 * POST /api/auth/register
 * Body: { email, password, referral_code? }
 */
async function register(req, res) {
  try {
    const { email, password, referral_code } = req.body;

    // Validation: Check required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Validation: Password minimum length
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Check if email already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }

    // Get role_id for 'client' role
    const [roles] = await pool.query(
      'SELECT id FROM roles WHERE name = ?',
      ['client']
    );

    if (roles.length === 0) {
      return res.status(500).json({ 
        error: 'Client role not found in database' 
      });
    }

    const roleId = roles[0].id;

    // Hash the password using bcrypt (10 rounds is a good default)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Start a database transaction (we need to insert into multiple tables)
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert into users table
      const [userResult] = await connection.query(
        `INSERT INTO users (email, password_hash, role_id, status) 
         VALUES (?, ?, ?, 'active')`,
        [email, passwordHash, roleId]
      );

      const userId = userResult.insertId;
      let partnerId = null;

      // If referral_code is provided, find the partner and link them
      if (referral_code) {
        const [partners] = await connection.query(
          'SELECT id FROM partners WHERE referral_code = ?',
          [referral_code]
        );

        if (partners.length > 0) {
          partnerId = partners[0].id;

          // Create client with partner_id
          await connection.query(
            `INSERT INTO clients (user_id, partner_id, balance, status) 
             VALUES (?, ?, 0.00, 'active')`,
            [userId, partnerId]
          );

          // Get the client_id we just created
          const [clients] = await connection.query(
            'SELECT id FROM clients WHERE user_id = ?',
            [userId]
          );
          const clientId = clients[0].id;

          // Create referral record (commission starts at 0)
          await connection.query(
            `INSERT INTO referrals (partner_id, client_id, commission_earned) 
             VALUES (?, ?, 0.00)`,
            [partnerId, clientId]
          );
        } else {
          // Referral code invalid, but we'll still create the client
          // (you might want to reject registration instead - your choice)
          await connection.query(
            `INSERT INTO clients (user_id, partner_id, balance, status) 
             VALUES (?, NULL, 0.00, 'active')`,
            [userId]
          );
        }
      } else {
        // No referral code, create client without partner
        await connection.query(
          `INSERT INTO clients (user_id, partner_id, balance, status) 
           VALUES (?, NULL, 0.00, 'active')`,
          [userId]
        );
      }

      // Commit the transaction (all inserts succeeded)
      await connection.commit();
      connection.release();

      res.status(201).json({ 
        message: 'User registered successfully' 
      });

    } catch (error) {
      // If anything fails, rollback the transaction
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.' 
    });
  }
}

/**
 * LOGIN - Authenticate user and return JWT token
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validation: Check required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email (join with roles to get role name)
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.status, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    // Check if user exists
    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({ 
        error: 'Account is suspended. Please contact support.' 
      });
    }

    // Compare provided password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Create JWT token
    // Payload contains userId and role (used later for authorization)
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role_name 
      },
      process.env.JWT_SECRET, // || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    // Return token and role to frontend
    res.json({
      token,
      role: user.role_name
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
}

module.exports = {
  register,
  login
};

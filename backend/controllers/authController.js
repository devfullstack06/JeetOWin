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
 * Body: { username, password, referral_code? }
 * Note: Also accepts fullName and mobile from frontend, but they are stored separately if needed
 */
async function register(req, res) {
  try {
    const { username, password, referral_code, fullName, mobile } = req.body;

    // Validation: Check required fields
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Validation: Username minimum length
    if (username.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Username must be at least 3 characters' 
      });
    }

    // Validation: Password minimum length
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Check if username already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username.trim()]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        error: 'Username already registered' 
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
      // Insert into users table (username is used for authentication)
      // Explicitly set status to 'active' (schema has DEFAULT, but being explicit is safer)
      const [userResult] = await connection.query(
        `INSERT INTO users (username, password_hash, role_id, status) 
         VALUES (?, ?, ?, 'active')`,
        [username.trim(), passwordHash, roleId]
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

          // Create client with partner_id, full_name, and mobile
          await connection.query(
            `INSERT INTO clients (user_id, partner_id, full_name, mobile, balance, status) 
             VALUES (?, ?, ?, ?, 0.00, 'active')`,
            [userId, partnerId, fullName?.trim() || null, mobile || null]
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
            `INSERT INTO clients (user_id, partner_id, full_name, mobile, balance, status) 
             VALUES (?, NULL, ?, ?, 0.00, 'active')`,
            [userId, fullName?.trim() || null, mobile || null]
          );
        }
      } else {
        // No referral code, create client without partner
        await connection.query(
          `INSERT INTO clients (user_id, partner_id, full_name, mobile, balance, status) 
           VALUES (?, NULL, ?, ?, 0.00, 'active')`,
          [userId, fullName?.trim() || null, mobile || null]
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
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
      connection.release();
      // Re-throw the original error so outer catch can handle it
      throw error;
    }

  } catch (error) {
    // Log full error details for debugging
    console.error('Registration error details:');
    console.error('  Error code:', error.code);
    console.error('  SQL Message:', error.sqlMessage);
    console.error('  SQL State:', error.sqlState);
    console.error('  Error message:', error.message);
    console.error('  Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // If this is a known validation/error response, it was already sent, don't send again
    if (res.headersSent) {
      return;
    }
    
    // Extract meaningful error message from database errors
    let errorMessage = 'Registration failed. Please try again.';
    
    // MySQL2 uses errno (numeric) and sometimes code (string or numeric)
    // Common MySQL error codes: 1062=ER_DUP_ENTRY, 1054=ER_BAD_FIELD_ERROR, 1048=ER_BAD_NULL_ERROR
    const errno = error.errno || (typeof error.code === 'number' ? error.code : null);
    const errorCode = error.code;
    
    // Check for MySQL error codes (both string and numeric formats)
    if (errorCode === 'ER_DUP_ENTRY' || errno === 1062) {
      // Duplicate entry (e.g., username already exists - though we check this earlier)
      errorMessage = 'Username already registered. Please choose a different username.';
    } else if (errorCode === 'ER_NO_REFERENCED_ROW_2' || errorCode === 'ER_NO_REFERENCED_ROW' || errno === 1452) {
      // Foreign key constraint violation
      errorMessage = 'Invalid data provided. Please check your information and try again.';
    } else if (errorCode === 'ER_BAD_NULL_ERROR' || errno === 1048) {
      // Required field is null
      errorMessage = 'Required fields are missing. Please check your information and try again.';
    } else if (errorCode === 'ER_BAD_FIELD_ERROR' || errno === 1054) {
      // Unknown column error - schema mismatch
      errorMessage = `Database schema error: ${error.sqlMessage || 'Missing required columns. Please run database migrations.'}`;
    } else if (error.message && error.message.includes('ECONNREFUSED')) {
      // Database connection error
      errorMessage = 'Database connection failed. Please try again later.';
    }
    
    // Priority: Always try to show sqlMessage first (most specific MySQL error)
    if (error.sqlMessage) {
      errorMessage = `Registration error: ${error.sqlMessage}`;
    } 
    // Then check for error.message (should catch most other errors)
    else if (error.message && !error.message.includes('Registration failed')) {
      errorMessage = error.message;
    }
    // If we have errno/code but no message, show that
    else if (errno || errorCode) {
      errorMessage = `Database error (code: ${errno || errorCode}). Check server logs for details.`;
    }
    
    // Final fallback: if we still have generic message, try to extract ANY info
    if (errorMessage === 'Registration failed. Please try again.') {
      // For debugging: try to get any useful info from the error
      const errorStr = error.toString();
      if (errorStr && errorStr !== '[object Object]') {
        errorMessage = `Registration failed: ${errorStr}`;
      } else {
        // Include error properties for debugging (temporarily)
        const errorInfo = {
          hasCode: !!error.code,
          hasErrno: !!error.errno,
          hasSqlMessage: !!error.sqlMessage,
          hasMessage: !!error.message,
          codeValue: error.code,
          errnoValue: error.errno,
          messageValue: error.message?.substring(0, 100),
          sqlMessageValue: error.sqlMessage?.substring(0, 100)
        };
        errorMessage = `Registration failed. Debug info: ${JSON.stringify(errorInfo)}. Check server console for full error.`;
      }
    }
    
    res.status(500).json({ 
      error: errorMessage 
    });
  }
}

/**
 * LOGIN - Authenticate user and return JWT token
 * POST /api/auth/login
 * Body: { username, password }
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validation: Check required fields
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Find user by username (join with roles to get role name)
    const [users] = await pool.query(
      `SELECT u.id, u.username, u.password_hash, u.status, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = ?`,
      [username.trim()]
    );

    // Check if user exists
    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
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
        error: 'Invalid username or password' 
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
    
    // If response was already sent (e.g., validation error), don't send again
    if (res.headersSent) {
      return;
    }
    
    // Extract meaningful error message
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Database connection failed. Please try again later.';
    } else if (error.sqlMessage) {
      errorMessage = `Login error: ${error.sqlMessage}`;
    } else if (error.message && !error.message.includes('Login failed')) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage 
    });
  }
}

module.exports = {
  register,
  login
};

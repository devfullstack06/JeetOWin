// Migration script to change email to username and fix status column
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jeetowin',
      multipleStatements: true
    });

    console.log('✅ Connected to database\n');

    // Check if username column exists
    const [usernameCols] = await connection.query(
      "SHOW COLUMNS FROM users LIKE 'username'"
    );

    if (usernameCols.length === 0) {
      console.log('📋 Step 1: Adding username column...');
      await connection.query(
        "ALTER TABLE users ADD COLUMN username VARCHAR(150) NULL AFTER email"
      );
      console.log('  ✅ Added username column\n');

      console.log('📋 Step 2: Copying email data to username...');
      const [updated] = await connection.query(
        "UPDATE users SET username = email WHERE username IS NULL AND email IS NOT NULL"
      );
      console.log(`  ✅ Updated ${updated.affectedRows} rows\n`);

      console.log('📋 Step 3: Making username NOT NULL and UNIQUE...');
      // First ensure no NULL usernames
      await connection.query(
        "UPDATE users SET username = CONCAT('user_', id) WHERE username IS NULL"
      );
      // Make it NOT NULL
      await connection.query(
        "ALTER TABLE users MODIFY COLUMN username VARCHAR(150) NOT NULL"
      );
      // Add unique constraint
      try {
        await connection.query(
          "ALTER TABLE users ADD UNIQUE KEY username_unique (username)"
        );
      } catch (err) {
        if (err.code !== 'ER_DUP_KEY_NAME') throw err;
        console.log('  ⚠️  Unique key already exists, skipping...\n');
      }
      console.log('  ✅ Username column is now NOT NULL and UNIQUE\n');
    } else {
      console.log('✅ Username column already exists\n');
    }

    // Fix status column type
    console.log('📋 Step 4: Checking status column type...');
    const [statusCol] = await connection.query(
      "SHOW COLUMNS FROM users WHERE Field = 'status'"
    );
    
    if (statusCol.length > 0 && statusCol[0].Type.includes('varchar')) {
      console.log('  ⚠️  Status is VARCHAR, converting to ENUM...');
      
      // First, ensure all status values are valid
      await connection.query(
        "UPDATE users SET status = 'active' WHERE status NOT IN ('active', 'suspended') OR status IS NULL OR status = ''"
      );
      
      // Change to ENUM
      await connection.query(
        "ALTER TABLE users MODIFY COLUMN status ENUM('active', 'suspended') DEFAULT 'active'"
      );
      console.log('  ✅ Status column converted to ENUM\n');
    } else {
      console.log('  ✅ Status column is already ENUM type\n');
    }

    console.log('✅ Migration complete!');
    console.log('\n📝 The database schema now matches the code.');
    console.log('   You can now test registration with username instead of email.\n');

  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    if (error.sqlMessage) {
      console.error('   SQL Error:', error.sqlMessage);
    }
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

migrateSchema();

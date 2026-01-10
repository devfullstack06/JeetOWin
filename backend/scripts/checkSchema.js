// Quick script to check and fix database schema
// Run with: node backend/scripts/checkSchema.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAndFixSchema() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jeetowin',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Check users table structure
    console.log('\n📋 Checking users table...');
    const [userColumns] = await connection.query(
      "SHOW COLUMNS FROM users LIKE 'status'"
    );
    
    if (userColumns.length === 0) {
      console.log('  ⚠️  status column missing - adding it...');
      await connection.query(
        "ALTER TABLE users ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active'"
      );
      console.log('  ✅ Added status column to users table');
    } else {
      console.log('  ✅ status column exists');
    }

    // Check clients table structure
    console.log('\n📋 Checking clients table...');
    const [fullNameCols] = await connection.query(
      "SHOW COLUMNS FROM clients LIKE 'full_name'"
    );
    const [mobileCols] = await connection.query(
      "SHOW COLUMNS FROM clients LIKE 'mobile'"
    );

    if (fullNameCols.length === 0) {
      console.log('  ⚠️  full_name column missing - adding it...');
      await connection.query(
        "ALTER TABLE clients ADD COLUMN full_name VARCHAR(150) NULL"
      );
      console.log('  ✅ Added full_name column to clients table');
    } else {
      console.log('  ✅ full_name column exists');
    }

    if (mobileCols.length === 0) {
      console.log('  ⚠️  mobile column missing - adding it...');
      await connection.query(
        "ALTER TABLE clients ADD COLUMN mobile VARCHAR(20) NULL"
      );
      console.log('  ✅ Added mobile column to clients table');
    } else {
      console.log('  ✅ mobile column exists');
    }

    // Update existing users to have status 'active' if NULL
    const [nullStatusUsers] = await connection.query(
      "SELECT COUNT(*) as count FROM users WHERE status IS NULL"
    );
    
    if (nullStatusUsers[0].count > 0) {
      console.log(`\n  ⚠️  Found ${nullStatusUsers[0].count} users with NULL status - updating...`);
      await connection.query(
        "UPDATE users SET status = 'active' WHERE status IS NULL"
      );
      console.log('  ✅ Updated users with NULL status to "active"');
    }

    console.log('\n✅ Database schema check complete! All columns are present.');
    console.log('\n📝 You can now restart the server and test registration.');

  } catch (error) {
    console.error('\n❌ Error checking/fixing schema:', error.message);
    if (error.sqlMessage) {
      console.error('   SQL Error:', error.sqlMessage);
    }
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Hint: Database might not exist. Run the schema.sql file first.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Hint: Check your database credentials in .env file or use default (root, empty password)');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkAndFixSchema();

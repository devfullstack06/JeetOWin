// Quick fix: Make email column nullable or drop it
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixEmailColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jeetowin',
    });

    console.log('✅ Connected to database\n');

    // Option 1: Make email nullable (safer, keeps data)
    console.log('📋 Making email column nullable...');
    try {
      await connection.query(
        "ALTER TABLE users MODIFY COLUMN email VARCHAR(150) NULL"
      );
      console.log('  ✅ Email column is now nullable\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  ⚠️  Email column already nullable, skipping...\n');
      } else {
        throw err;
      }
    }

    // Option 2: Drop email column entirely (cleaner, but loses data)
    // Uncomment if you want to completely remove email column:
    /*
    console.log('📋 Dropping email column...');
    await connection.query("ALTER TABLE users DROP COLUMN email");
    console.log('  ✅ Email column removed\n');
    */

    console.log('✅ Email column fix complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sqlMessage) console.error('SQL:', error.sqlMessage);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

fixEmailColumn();

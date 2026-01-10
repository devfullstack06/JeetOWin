// Check actual database table structure
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jeetowin',
    });

    console.log('✅ Connected to database\n');

    // Check users table structure
    console.log('📋 USERS table columns:');
    const [userCols] = await connection.query('SHOW COLUMNS FROM users');
    userCols.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `KEY: ${col.Key}` : ''}`);
    });

    console.log('\n📋 CLIENTS table columns:');
    const [clientCols] = await connection.query('SHOW COLUMNS FROM clients');
    clientCols.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `KEY: ${col.Key}` : ''}`);
    });

    console.log('\n📋 ROLES table columns:');
    const [roleCols] = await connection.query('SHOW COLUMNS FROM roles');
    roleCols.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sqlMessage) console.error('SQL:', error.sqlMessage);
  } finally {
    if (connection) await connection.end();
  }
}

checkTables();

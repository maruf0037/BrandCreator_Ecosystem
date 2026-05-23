const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/db');

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    const pool = await poolPromise;
    
    const sqlPath = path.join(__dirname, 'migration_013_wallet_security_audit.sql');
    const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration 013...');
    await pool.request().query(sqlQuery.replace(/\bGO\b/gi, ''));
    
    console.log('Migration 013 applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();

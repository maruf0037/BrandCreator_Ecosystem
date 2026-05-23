const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/db');

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    const pool = await poolPromise;
    
    const sqlPath = path.join(__dirname, 'migration_011_whatsapp_crm.sql');
    const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration 011...');
    await pool.request().query(sqlQuery.replace(/\bGO\b/gi, ''));
    
    console.log('Migration 011 applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();

const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/db'); // Adjust path based on execution directory

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    const pool = await poolPromise;
    
    const sqlPath = path.join(__dirname, 'migration_010_campaign_plans.sql');
    const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration 010...');
    // Removing GO statements as node-mssql doesn't support them in a single batch
    await pool.request().query(sqlQuery.replace(/\bGO\b/gi, ''));
    
    console.log('Migration 010 applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
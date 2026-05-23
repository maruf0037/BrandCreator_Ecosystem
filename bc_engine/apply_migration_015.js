const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/db');

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    const pool = await poolPromise;

    const rawPath = path.join(__dirname, 'migration_015_shared_stock_sale_channel.sql');
    const sqlPath = path.normalize(rawPath);
    
    // Ensure the path is inside our directory to avoid path traversal
    if (!sqlPath.startsWith(__dirname)) {
      throw new Error('Invalid migration path detected!');
    }

    const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

    // Split the SQL query by the 'GO' statement (case-insensitive, on word boundaries)
    const batches = sqlQuery
      .split(/\bGO\b/i)
      .map(b => b.trim())
      .filter(b => b.length > 0);

    console.log(`Executing migration 015 in ${batches.length} batches...`);
    
    let batchIndex = 1;
    for (const batch of batches) {
      console.log(`Executing batch ${batchIndex}/${batches.length}...`);
      await pool.request().query(batch);
      batchIndex += 1;
    }

    console.log('Migration 015 applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();

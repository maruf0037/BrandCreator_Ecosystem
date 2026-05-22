const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/db');

async function run() {
  try {
    console.log("Connecting to database...");
    const pool = await poolPromise;
    console.log("Reading migration_009_location_ads_suggestion.sql...");
    
    const sqlFilePath = path.join(__dirname, 'migration_009_location_ads_suggestion.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8').replace(/^\uFEFF/, '');
    
    console.log("Executing SQL migration script...");
    await pool.request().query(sqlScript);
    
    console.log("Migration 009 executed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration 009 failed:", err);
    process.exit(1);
  }
}

run();

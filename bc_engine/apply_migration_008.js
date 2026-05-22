const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./config/db');

async function run() {
  try {
    console.log("Connecting to database...");
    const pool = await poolPromise;
    console.log("Reading migration_008_product_intake.sql...");
    
    const sqlFilePath = path.join(__dirname, 'migration_008_product_intake.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log("Executing SQL migration script...");
    await pool.request().query(sqlScript);
    
    console.log("Migration 008 executed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration 008 failed:", err);
    process.exit(1);
  }
}

run();

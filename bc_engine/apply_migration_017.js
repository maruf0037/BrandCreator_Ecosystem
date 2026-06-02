// apply_migration_017.js
// Applies the UTM Campaign Tracking & Fabrics Schema migration to SQL Server.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_CERT === 'true'
  }
};

async function run() {
  console.log('=== Migration 017: UTM Campaign Tracking & Fabrics Attributes ===');
  console.log(`Target: ${dbConfig.server}/${dbConfig.database}`);

  const pool = await sql.connect(dbConfig);
  const migrationPath = path.join(__dirname, 'migration_017_utm_attribution.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // Split by GO statements to execute each batch separately
  const batches = migrationSql
    .split(/^\s*GO\s*$/im)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  console.log(`Found ${batches.length} SQL batches to execute.`);

  for (let i = 0; i < batches.length; i++) {
    try {
      console.log(`\nExecuting batch ${i + 1}/${batches.length}...`);
      await pool.request().batch(batches[i]);
      console.log(`  ✅ Batch ${i + 1} completed.`);
    } catch (err) {
      console.error(`  ❌ Batch ${i + 1} failed: ${err.message}`);
    }
  }

  // Verify the migration results
  console.log('\n--- Verification ---');

  try {
    const utmOrders = await pool.request().query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'UtmSource'"
    );
    console.log(`Orders.UtmSource: ${utmOrders.recordset.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    const utmProfit = await pool.request().query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrderProfitBreakdowns' AND COLUMN_NAME = 'UtmSource'"
    );
    console.log(`OrderProfitBreakdowns.UtmSource: ${utmProfit.recordset.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    const fabricsCols = ['FabricMaterial', 'FabricTexture', 'FabricWidth', 'ThreadCount', 'WeavingType'];
    for (const col of fabricsCols) {
      const colCheck = await pool.request().query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = '${col}'`
      );
      console.log(`Products.${col}: ${colCheck.recordset.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    }

  } catch (err) {
    console.error('Verification error:', err.message);
  }

  await pool.close();
  console.log('\n=== Migration 017 Complete ===');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

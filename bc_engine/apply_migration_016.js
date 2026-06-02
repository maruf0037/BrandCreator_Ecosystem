// apply_migration_016.js
// Applies the Hybrid Ownership & Commission schema migration to SQL Server.

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
  console.log('=== Migration 016: Hybrid Ownership & Commission ===');
  console.log(`Target: ${dbConfig.server}/${dbConfig.database}`);

  const pool = await sql.connect(dbConfig);
  const migrationPath = path.join(__dirname, 'migration_016_hybrid_ownership_commission.sql');
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
      // Continue with other batches (idempotent design)
    }
  }

  // Verify the migration results
  console.log('\n--- Verification ---');

  try {
    const ownershipCol = await pool.request().query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'OwnershipType'"
    );
    console.log(`Products.OwnershipType: ${ownershipCol.recordset.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    const commRateCol = await pool.request().query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'CommissionRate'"
    );
    console.log(`Products.CommissionRate: ${commRateCol.recordset.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    const tables = ['SupplierCommissionRates', 'CommissionLedger', 'GlobalSettings'];
    for (const table of tables) {
      const exists = await pool.request().query(
        `SELECT OBJECT_ID('dbo.${table}', 'U') AS id`
      );
      console.log(`dbo.${table}: ${exists.recordset[0].id ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    const defaultRate = await pool.request().query(
      "SELECT SettingValue FROM dbo.GlobalSettings WHERE SettingKey = 'DEFAULT_COMMISSION_RATE'"
    );
    if (defaultRate.recordset.length > 0) {
      console.log(`Default Commission Rate: ✅ ${defaultRate.recordset[0].SettingValue}%`);
    }

    // Count existing products that got backfilled
    const productCount = await pool.request().query(
      "SELECT COUNT(*) AS total, OwnershipType FROM dbo.Products GROUP BY OwnershipType"
    );
    console.log('\nProduct Distribution:');
    for (const row of productCount.recordset) {
      console.log(`  ${row.OwnershipType}: ${row.total} products`);
    }

  } catch (err) {
    console.error('Verification error:', err.message);
  }

  await pool.close();
  console.log('\n=== Migration 016 Complete ===');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

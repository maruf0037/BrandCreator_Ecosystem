const { poolPromise, sql } = require('./config/db');

async function run() {
  try {
    console.log("Connecting to database...");
    const pool = await poolPromise;
    console.log("Checking columns for Products table...");
    
    await pool.request().query(`
      IF COL_LENGTH('dbo.Products', 'BasePrice') IS NULL
      BEGIN
          ALTER TABLE dbo.Products ADD BasePrice DECIMAL(18,2) NULL;
          PRINT 'Added BasePrice column';
      END
      ELSE
      BEGIN
          PRINT 'BasePrice column already exists';
      END

      IF COL_LENGTH('dbo.Products', 'SupplierNotes') IS NULL
      BEGIN
          ALTER TABLE dbo.Products ADD SupplierNotes NVARCHAR(1000) NULL;
          PRINT 'Added SupplierNotes column';
      END
      ELSE
      BEGIN
          PRINT 'SupplierNotes column already exists';
      END
    `);
    
    console.log("Migration successful!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();

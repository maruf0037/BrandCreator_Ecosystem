const { poolPromise, sql } = require('./config/db');

async function run() {
  try {
    console.log("Connecting to database...");
    const pool = await poolPromise;
    console.log("Applying Migration 007: Payment Verification Layer on dbo.Orders table...");

    const statements = [
      {
        check: "IF COL_LENGTH('dbo.Orders', 'PaymentEvidence') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD PaymentEvidence NVARCHAR(1000) NULL",
        msg: "Added PaymentEvidence column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'PaymentProvider') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD PaymentProvider VARCHAR(50) NULL",
        msg: "Added PaymentProvider column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'TransactionId') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD TransactionId VARCHAR(100) NULL",
        msg: "Added TransactionId column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'PaidAmount') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00",
        msg: "Added PaidAmount column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'PaymentStatus') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD PaymentStatus VARCHAR(50) NOT NULL DEFAULT 'PENDING_PAYMENT'",
        msg: "Added PaymentStatus column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'GatewaySignatureStatus') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD GatewaySignatureStatus VARCHAR(50) NULL",
        msg: "Added GatewaySignatureStatus column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'ManualReviewNote') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD ManualReviewNote NVARCHAR(1000) NULL",
        msg: "Added ManualReviewNote column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'PaymentSubmittedByEmail') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD PaymentSubmittedByEmail NVARCHAR(255) NULL",
        msg: "Added PaymentSubmittedByEmail column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'PaymentReviewedByEmail') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD PaymentReviewedByEmail NVARCHAR(255) NULL",
        msg: "Added PaymentReviewedByEmail column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'PaidAt') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD PaidAt DATETIME2 NULL",
        msg: "Added PaidAt column"
      },
      {
        check: "IF COL_LENGTH('dbo.Orders', 'PaymentReviewedAt') IS NULL SELECT 1 ELSE SELECT 0",
        apply: "ALTER TABLE dbo.Orders ADD PaymentReviewedAt DATETIME2 NULL",
        msg: "Added PaymentReviewedAt column"
      }
    ];

    for (const stmt of statements) {
      const checkRes = await pool.request().query(stmt.check);
      const shouldApply = Object.values(checkRes.recordset[0])[0] === 1;
      if (shouldApply) {
        await pool.request().query(stmt.apply);
        console.log(stmt.msg);
      }
    }

    // Now check and create the unique index
    const indexCheck = await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_Orders_TransactionId' AND object_id = OBJECT_ID('dbo.Orders'))
      SELECT 1
      ELSE
      SELECT 0
    `);
    
    const indexExists = Object.values(indexCheck.recordset[0])[0] === 1;
    if (!indexExists) {
      await pool.request().query(`
        CREATE UNIQUE NONCLUSTERED INDEX UX_Orders_TransactionId
        ON dbo.Orders(TransactionId)
        WHERE TransactionId IS NOT NULL
      `);
      console.log("Created unique index UX_Orders_TransactionId");
    }

    console.log("Migration 007 successful!");
    process.exit(0);
  } catch (err) {
    console.error("Migration 007 failed:", err);
    process.exit(1);
  }
}

run();

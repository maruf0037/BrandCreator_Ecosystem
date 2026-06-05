require('dotenv').config({ path: require('path').join(__dirname, '../bc_engine/.env') });
const sql = require('mssql');
const path = require('path');

const config = {
  server: process.env.SQL_SERVER || 'localhost',
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true }
};

const query = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SupplierLicenses')
BEGIN
  CREATE TABLE dbo.SupplierLicenses (
    LicenseId     INT IDENTITY(1,1) PRIMARY KEY,
    LicenseKey    NVARCHAR(50)  NOT NULL UNIQUE,
    SupplierEmail NVARCHAR(255) NOT NULL,
    IsActive      BIT           NOT NULL DEFAULT 1,
    IssuedAt      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpiresAt     DATETIME2     NULL,
    RevokedAt     DATETIME2     NULL,
    MonthlyFee    DECIMAL(10,2) NOT NULL DEFAULT 0,
    Notes         NVARCHAR(500) NULL
  );
  CREATE INDEX IX_SL_Email ON dbo.SupplierLicenses(SupplierEmail);
  SELECT 'Created' AS Result
END
ELSE
  SELECT 'AlreadyExists' AS Result
`;

sql.connect(config)
  .then(pool => pool.request().query(query))
  .then(result => {
    console.log('Migration result:', result.recordset[0]?.Result || 'OK');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });

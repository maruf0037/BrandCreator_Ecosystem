-- migration_012_wallets_profit_locking.sql
-- SQL Server (BrandCreator_HUBDB)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- Create WalletTransactions Table
IF OBJECT_ID('dbo.WalletTransactions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WalletTransactions (
        TransactionId INT IDENTITY(1,1) PRIMARY KEY,
        TxnType NVARCHAR(50) NOT NULL CHECK (TxnType IN ('ADMIN_TOP_UP', 'SUPPLIER_CAMPAIGN_DEPOSIT')),
        Amount DECIMAL(18,2) NOT NULL,
        Notes NVARCHAR(500) NULL,
        Source NVARCHAR(100) NULL, -- 'TEST_ADMIN_TOPUP' or 'REAL'
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Created WalletTransactions table';
END

COMMIT;
GO

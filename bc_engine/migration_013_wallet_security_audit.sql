-- migration_013_wallet_security_audit.sql
-- SQL Server (BrandCreator_HUBDB)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

IF COL_LENGTH('dbo.WalletTransactions', 'CreatedByEmail') IS NULL
BEGIN
    ALTER TABLE dbo.WalletTransactions ADD CreatedByEmail NVARCHAR(255) NULL;
    PRINT 'Added CreatedByEmail to WalletTransactions';
END

COMMIT;
GO

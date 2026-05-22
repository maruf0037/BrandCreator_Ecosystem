-- Migration 007: Payment Verification Layer
-- Path: D:\Workspace\01_Projects\Active\BrandCreator_Ecosystem\bc_engine\migration_007_payment_verification.sql

IF COL_LENGTH('dbo.Orders', 'PaymentEvidence') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PaymentEvidence NVARCHAR(1000) NULL;
END

IF COL_LENGTH('dbo.Orders', 'PaymentProvider') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PaymentProvider VARCHAR(50) NULL;
END

IF COL_LENGTH('dbo.Orders', 'TransactionId') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD TransactionId VARCHAR(100) NULL;
END

IF COL_LENGTH('dbo.Orders', 'PaidAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00;
END

IF COL_LENGTH('dbo.Orders', 'PaymentStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PaymentStatus VARCHAR(50) NOT NULL DEFAULT 'PENDING_PAYMENT';
END

IF COL_LENGTH('dbo.Orders', 'GatewaySignatureStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD GatewaySignatureStatus VARCHAR(50) NULL;
END

IF COL_LENGTH('dbo.Orders', 'ManualReviewNote') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD ManualReviewNote NVARCHAR(1000) NULL;
END

IF COL_LENGTH('dbo.Orders', 'PaymentSubmittedByEmail') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PaymentSubmittedByEmail NVARCHAR(255) NULL;
END

IF COL_LENGTH('dbo.Orders', 'PaymentReviewedByEmail') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PaymentReviewedByEmail NVARCHAR(255) NULL;
END

IF COL_LENGTH('dbo.Orders', 'PaidAt') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PaidAt DATETIME2 NULL;
END

IF COL_LENGTH('dbo.Orders', 'PaymentReviewedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PaymentReviewedAt DATETIME2 NULL;
END

-- Create unique index on TransactionId if not exists to avoid duplicate claims
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_Orders_TransactionId' AND object_id = OBJECT_ID('dbo.Orders'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_Orders_TransactionId
    ON dbo.Orders(TransactionId)
    WHERE TransactionId IS NOT NULL;
END

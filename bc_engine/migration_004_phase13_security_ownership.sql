-- migration_004_phase13_security_ownership.sql
-- SQL Server (BrandCreator_HUBDB)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- Supplier ownership map
IF OBJECT_ID('dbo.ProductOwnership','U') IS NULL
CREATE TABLE dbo.ProductOwnership (
  OwnershipId BIGINT IDENTITY(1,1) PRIMARY KEY,
  ProductId INT NOT NULL,
  SupplierEmail NVARCHAR(255) NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_ProductOwnership_Product_Supplier UNIQUE (ProductId, SupplierEmail),
  CONSTRAINT FK_ProductOwnership_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
);

-- Webhook idempotency + signature audit
IF OBJECT_ID('dbo.WebhookReceipts','U') IS NULL
CREATE TABLE dbo.WebhookReceipts (
  ReceiptId BIGINT IDENTITY(1,1) PRIMARY KEY,
  Provider NVARCHAR(50) NOT NULL,          -- BKASH/NAGAD
  EventRef NVARCHAR(150) NOT NULL,
  SignatureHash NVARCHAR(255) NOT NULL,
  PayloadHash NVARCHAR(255) NOT NULL,
  Verified BIT NOT NULL DEFAULT 0,
  VerificationError NVARCHAR(500) NULL,
  ReceivedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_WebhookReceipts_Provider_EventRef UNIQUE (Provider, EventRef)
);

-- Outbox delivery attempts + DLQ support
IF OBJECT_ID('dbo.OutboxAttempts','U') IS NULL
CREATE TABLE dbo.OutboxAttempts (
  AttemptId BIGINT IDENTITY(1,1) PRIMARY KEY,
  OutboxId BIGINT NOT NULL,
  AttemptNo INT NOT NULL,
  Status NVARCHAR(20) NOT NULL,            -- SENT/FAILED
  ErrorMessage NVARCHAR(1000) NULL,
  AttemptedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_OutboxAttempts_Outbox FOREIGN KEY (OutboxId) REFERENCES dbo.OutboxEvents(OutboxId)
);

IF COL_LENGTH('dbo.OutboxEvents','NextRetryAt') IS NULL
ALTER TABLE dbo.OutboxEvents ADD NextRetryAt DATETIME2 NULL;

IF COL_LENGTH('dbo.OutboxEvents','DeadLetteredAt') IS NULL
ALTER TABLE dbo.OutboxEvents ADD DeadLetteredAt DATETIME2 NULL;

IF OBJECT_ID('dbo.OutboxEvents','U') IS NOT NULL
BEGIN
  -- ensure status supports DEAD_LETTER
  IF OBJECT_ID('dbo.CK_OutboxEvents_Status','C') IS NOT NULL
    ALTER TABLE dbo.OutboxEvents DROP CONSTRAINT CK_OutboxEvents_Status;
  
  -- Check if constraint name is lowercase or default
  IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.OutboxEvents') AND name LIKE '%Status%')
  BEGIN
    DECLARE @drop_sql NVARCHAR(MAX);
    SELECT @drop_sql = 'ALTER TABLE dbo.OutboxEvents DROP CONSTRAINT ' + name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.OutboxEvents') AND name LIKE '%Status%';
    EXEC sp_executesql @drop_sql;
  END

  ALTER TABLE dbo.OutboxEvents
    ADD CONSTRAINT CK_OutboxEvents_Status CHECK (Status IN ('PENDING','SENT','FAILED','DEAD_LETTER'));
END

-- Low-stock thresholds per product
IF OBJECT_ID('dbo.ProductStockPolicies','U') IS NULL
CREATE TABLE dbo.ProductStockPolicies (
  PolicyId BIGINT IDENTITY(1,1) PRIMARY KEY,
  ProductId INT NOT NULL UNIQUE,
  SellLowStockThreshold INT NOT NULL DEFAULT 10,
  MasterLowStockThreshold INT NOT NULL DEFAULT 20,
  IsAlertEnabled BIT NOT NULL DEFAULT 1,
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_ProductStockPolicies_Thresholds CHECK (SellLowStockThreshold >= 0 AND MasterLowStockThreshold >= 0),
  CONSTRAINT FK_ProductStockPolicies_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
);

COMMIT;
GO

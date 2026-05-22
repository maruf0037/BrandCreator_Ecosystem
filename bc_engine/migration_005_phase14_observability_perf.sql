-- migration_005_phase14_observability_perf.sql
-- SQL Server (BrandCreator_HUBDB)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- Active secret keys versioning table
IF OBJECT_ID('dbo.SecretVersions','U') IS NULL
CREATE TABLE dbo.SecretVersions (
  SecretId BIGINT IDENTITY(1,1) PRIMARY KEY,
  SecretType NVARCHAR(50) NOT NULL,         -- WEBHOOK
  KeyId NVARCHAR(50) NOT NULL,              -- kid
  SecretValue NVARCHAR(500) NOT NULL,       -- store secret value
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  RotatedAt DATETIME2 NULL,
  CONSTRAINT UQ_SecretVersions UNIQUE (SecretType, KeyId)
);

-- Webhook receipts lookup speed optimization index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_WebhookReceipts_Provider_EventRef')
CREATE INDEX IX_WebhookReceipts_Provider_EventRef
ON dbo.WebhookReceipts(Provider, EventRef);

-- Outbox worker hot path index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_OutboxEvents_Status_NextRetryAt')
CREATE INDEX IX_OutboxEvents_Status_NextRetryAt
ON dbo.OutboxEvents(Status, NextRetryAt, CreatedAt);

-- Order lookup hot path index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_OrderRef_Status')
CREATE INDEX IX_Orders_OrderRef_Status
ON dbo.Orders(OrderRef, Status);

-- Ownership filter hot path index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ProductOwnership_Supplier_Active')
CREATE INDEX IX_ProductOwnership_Supplier_Active
ON dbo.ProductOwnership(SupplierEmail, IsActive, ProductId);

-- Transaction history API hot path index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_InventoryTransactions_Product_CreatedAt')
CREATE INDEX IX_InventoryTransactions_Product_CreatedAt
ON dbo.InventoryTransactions(ProductId, CreatedAt DESC);

COMMIT;
GO

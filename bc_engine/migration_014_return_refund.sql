-- migration_014_return_refund.sql
-- SQL Server (BrandCreator_HUBDB)
-- Creates ReturnRequests, ReturnRequestItems tables for the return/refund workflow.
-- Extends WalletTransactions CHECK to support RETURN_REFUND tracking.

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- ============================================================
-- 1. ReturnRequests Table
-- ============================================================
IF OBJECT_ID('dbo.ReturnRequests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReturnRequests (
        ReturnRequestId   BIGINT IDENTITY(1,1) PRIMARY KEY,
        OrderId           BIGINT NOT NULL,
        CustomerEmail     NVARCHAR(255) NOT NULL,
        Status            NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
        RefundTotal       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Reason            NVARCHAR(1000) NULL,
        RequestedByEmail  NVARCHAR(255) NOT NULL,
        ApprovedByEmail   NVARCHAR(255) NULL,
        RejectReason      NVARCHAR(500) NULL,
        RefundedAt        DATETIME2 NULL,
        CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_ReturnRequests_OrderId FOREIGN KEY (OrderId)
            REFERENCES dbo.Orders(OrderId),

        CONSTRAINT CK_ReturnRequests_Status CHECK (
            Status IN ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED')
        )
    );

    CREATE INDEX IX_ReturnRequests_OrderId ON dbo.ReturnRequests(OrderId);
    CREATE INDEX IX_ReturnRequests_Status ON dbo.ReturnRequests(Status);
    CREATE INDEX IX_ReturnRequests_CustomerEmail ON dbo.ReturnRequests(CustomerEmail);

    PRINT 'Created ReturnRequests table';
END

-- ============================================================
-- 2. ReturnRequestItems Table
-- ============================================================
IF OBJECT_ID('dbo.ReturnRequestItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReturnRequestItems (
        ReturnItemId      BIGINT IDENTITY(1,1) PRIMARY KEY,
        ReturnRequestId   BIGINT NOT NULL,
        OrderItemId       BIGINT NOT NULL,
        ProductId         INT NOT NULL,
        Qty               INT NOT NULL,
        RefundLineAmount  DECIMAL(18,2) NOT NULL DEFAULT 0.00,

        CONSTRAINT FK_ReturnRequestItems_ReturnRequestId FOREIGN KEY (ReturnRequestId)
            REFERENCES dbo.ReturnRequests(ReturnRequestId),

        CONSTRAINT FK_ReturnRequestItems_OrderItemId FOREIGN KEY (OrderItemId)
            REFERENCES dbo.OrderItems(OrderItemId),

        CONSTRAINT FK_ReturnRequestItems_ProductId FOREIGN KEY (ProductId)
            REFERENCES dbo.Products(ProductId),

        CONSTRAINT CK_ReturnRequestItems_Qty CHECK (Qty > 0)
    );

    CREATE INDEX IX_ReturnRequestItems_ReturnRequestId ON dbo.ReturnRequestItems(ReturnRequestId);

    PRINT 'Created ReturnRequestItems table';
END

-- ============================================================
-- 3. Add RETURN_REFUND to WalletTransactions CHECK constraint
-- ============================================================
-- Drop the existing auto-named CHECK on TxnType, then recreate with RETURN_REFUND added
DECLARE @dropCheckSql NVARCHAR(MAX);
SELECT @dropCheckSql = 'ALTER TABLE dbo.WalletTransactions DROP CONSTRAINT ' + QUOTENAME(name)
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.WalletTransactions')
  AND OBJECT_DEFINITION(object_id) LIKE '%TxnType%';

IF @dropCheckSql IS NOT NULL
BEGIN
    EXEC sp_executesql @dropCheckSql;
END

ALTER TABLE dbo.WalletTransactions
ADD CONSTRAINT CK_WalletTransactions_TxnType
CHECK (TxnType IN ('ADMIN_TOP_UP', 'SUPPLIER_CAMPAIGN_DEPOSIT', 'RETURN_REFUND'));

PRINT 'Extended WalletTransactions CHECK to include RETURN_REFUND';

COMMIT;
GO
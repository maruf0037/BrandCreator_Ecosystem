-- migration_020_advanced_pos_modules.sql
-- SQL Server Schema Upgrades for:
-- 1. Product Receive / Inbound Logistics (GoodsReceivedNotes, GRNItems)
-- 2. Advanced Discount & Promotions (Promotions, PromotionProducts, PromotionUsageHistory)
-- 3. Sales Cancellation & Return Extensions

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- ============================================================
-- 1. Inbound Logistics & Goods Received Notes (GRN)
-- ============================================================

IF OBJECT_ID('dbo.GoodsReceivedNotes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GoodsReceivedNotes (
        GRNId             BIGINT IDENTITY(1,1) PRIMARY KEY,
        GRNNumber         NVARCHAR(100) UNIQUE NOT NULL, -- GRN-YYYYMMDD-XXXX
        SupplierEmail     NVARCHAR(255) NOT NULL,
        InvoiceNumber     NVARCHAR(100) NULL,
        ReceivedDate      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        Status            NVARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, QC_PROGRESS, COMPLETED, REJECTED
        TotalQtyReceived  INT NOT NULL DEFAULT 0,
        ReceivedByEmail   NVARCHAR(255) NOT NULL,
        Notes             NVARCHAR(500) NULL,
        CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT CK_GRN_Status CHECK (Status IN ('PENDING', 'QC_PROGRESS', 'COMPLETED', 'REJECTED'))
    );

    CREATE INDEX IX_GRN_Supplier ON dbo.GoodsReceivedNotes(SupplierEmail);
    CREATE INDEX IX_GRN_Status ON dbo.GoodsReceivedNotes(Status);

    PRINT 'Created GoodsReceivedNotes table';
END

IF OBJECT_ID('dbo.GRNItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GRNItems (
        GRNItemId         BIGINT IDENTITY(1,1) PRIMARY KEY,
        GRNId             BIGINT NOT NULL,
        ProductId         INT NOT NULL,
        BatchNumber       NVARCHAR(100) NOT NULL,
        ExpiryDate        DATETIME2 NULL,
        QtyReceived       INT NOT NULL,
        QtyAccepted       INT NOT NULL DEFAULT 0,
        QtyRejected       INT NOT NULL DEFAULT 0,
        QCStatus          NVARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, PASSED, FAILED
        QCNotes           NVARCHAR(500) NULL,

        CONSTRAINT FK_GRNItems_GRNId FOREIGN KEY (GRNId) REFERENCES dbo.GoodsReceivedNotes(GRNId) ON DELETE CASCADE,
        CONSTRAINT FK_GRNItems_ProductId FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId),
        CONSTRAINT CK_GRNItems_Qty CHECK (QtyReceived > 0),
        CONSTRAINT CK_GRNItems_QCStatus CHECK (QCStatus IN ('PENDING', 'PASSED', 'FAILED'))
    );

    CREATE INDEX IX_GRNItems_GRNId ON dbo.GRNItems(GRNId);

    PRINT 'Created GRNItems table';
END

-- Alter SupplierStockBatches to link with GRN Items and add batch properties
IF COL_LENGTH('dbo.SupplierStockBatches', 'GRNItemId') IS NULL
BEGIN
    ALTER TABLE dbo.SupplierStockBatches ADD GRNItemId BIGINT NULL FOREIGN KEY REFERENCES dbo.GRNItems(GRNItemId);
    PRINT 'Added GRNItemId column to SupplierStockBatches';
END

IF COL_LENGTH('dbo.SupplierStockBatches', 'BatchNumber') IS NULL
BEGIN
    ALTER TABLE dbo.SupplierStockBatches ADD BatchNumber NVARCHAR(100) NULL;
    PRINT 'Added BatchNumber column to SupplierStockBatches';
END

IF COL_LENGTH('dbo.SupplierStockBatches', 'ExpiryDate') IS NULL
BEGIN
    ALTER TABLE dbo.SupplierStockBatches ADD ExpiryDate DATETIME2 NULL;
    PRINT 'Added ExpiryDate column to SupplierStockBatches';
END


-- ============================================================
-- 2. Advanced Discount & Promotions
-- ============================================================

IF OBJECT_ID('dbo.Promotions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Promotions (
        PromoId           BIGINT IDENTITY(1,1) PRIMARY KEY,
        PromoCode         NVARCHAR(50) UNIQUE NOT NULL,
        PromoName         NVARCHAR(255) NOT NULL,
        PromoType         NVARCHAR(30) NOT NULL, -- PERCENTAGE, FIXED, BOGO, TIERED
        DiscountValue     DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        MinOrderAmount    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        MinOrderQty       INT NOT NULL DEFAULT 0,
        StartDate         DATETIME2 NOT NULL,
        EndDate           DATETIME2 NOT NULL,
        MaxUsageLimit     INT NULL,
        UsageCount        INT NOT NULL DEFAULT 0,
        IsActive          BIT NOT NULL DEFAULT 1,
        CreatedByEmail    NVARCHAR(255) NOT NULL,
        CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT CK_Promotions_PromoType CHECK (PromoType IN ('PERCENTAGE', 'FIXED', 'BOGO', 'TIERED'))
    );

    CREATE INDEX IX_Promotions_Code ON dbo.Promotions(PromoCode);
    CREATE INDEX IX_Promotions_IsActive ON dbo.Promotions(IsActive);

    PRINT 'Created Promotions table';
END

IF OBJECT_ID('dbo.PromotionProducts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PromotionProducts (
        PromoProductId    BIGINT IDENTITY(1,1) PRIMARY KEY,
        PromoId           BIGINT NOT NULL,
        ProductId         INT NOT NULL,

        CONSTRAINT FK_PromoProducts_PromoId FOREIGN KEY (PromoId) REFERENCES dbo.Promotions(PromoId) ON DELETE CASCADE,
        CONSTRAINT FK_PromoProducts_ProductId FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
    );

    CREATE INDEX IX_PromotionProducts_PromoId ON dbo.PromotionProducts(PromoId);

    PRINT 'Created PromotionProducts table';
END

IF OBJECT_ID('dbo.PromotionUsageHistory', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PromotionUsageHistory (
        UsageId           BIGINT IDENTITY(1,1) PRIMARY KEY,
        PromoId           BIGINT NOT NULL,
        OrderId           BIGINT NOT NULL,
        CustomerEmail     NVARCHAR(255) NOT NULL,
        DiscountApplied   DECIMAL(18,2) NOT NULL,
        UsedAt            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_PromoUsage_PromoId FOREIGN KEY (PromoId) REFERENCES dbo.Promotions(PromoId),
        CONSTRAINT FK_PromoUsage_OrderId FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId)
    );

    CREATE INDEX IX_PromoUsage_PromoId ON dbo.PromotionUsageHistory(PromoId);
    CREATE INDEX IX_PromoUsage_Customer ON dbo.PromotionUsageHistory(CustomerEmail);

    PRINT 'Created PromotionUsageHistory table';
END

-- Alter Orders to track promotion code and discount amount
IF COL_LENGTH('dbo.Orders', 'PromoCodeApplied') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD PromoCodeApplied NVARCHAR(50) NULL;
    PRINT 'Added PromoCodeApplied column to Orders';
END

IF COL_LENGTH('dbo.Orders', 'DiscountAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00;
    PRINT 'Added DiscountAmount column to Orders';
END


-- ============================================================
-- 3. Return Requests Extensions
-- ============================================================

IF COL_LENGTH('dbo.ReturnRequests', 'RefundMethod') IS NULL
BEGIN
    ALTER TABLE dbo.ReturnRequests ADD RefundMethod NVARCHAR(30) NOT NULL DEFAULT 'STORE_CREDIT';
    PRINT 'Added RefundMethod column to ReturnRequests';
END

IF COL_LENGTH('dbo.ReturnRequests', 'CancellationType') IS NULL
BEGIN
    ALTER TABLE dbo.ReturnRequests ADD CancellationType NVARCHAR(30) NOT NULL DEFAULT 'PARTIAL_RETURN';
    PRINT 'Added CancellationType column to ReturnRequests';
END

IF COL_LENGTH('dbo.ReturnRequests', 'AuditLogJson') IS NULL
BEGIN
    ALTER TABLE dbo.ReturnRequests ADD AuditLogJson NVARCHAR(MAX) NULL;
    PRINT 'Added AuditLogJson column to ReturnRequests';
END

COMMIT;
PRINT 'Migration 020 completed successfully!';
GO

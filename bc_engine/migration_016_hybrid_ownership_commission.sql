-- migration_016_hybrid_ownership_commission.sql
-- SQL Server (BrandCreator_HUBDB)
-- Adds Hybrid Ownership Model: OWN vs SUPPLIER products, commission tracking, global settings.

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- ============================================================
-- 1. Add OwnershipType column to Products
-- ============================================================
IF COL_LENGTH('dbo.Products', 'OwnershipType') IS NULL
BEGIN
    ALTER TABLE dbo.Products
    ADD OwnershipType NVARCHAR(20) NOT NULL CONSTRAINT DF_Products_OwnershipType DEFAULT 'SUPPLIER';
    PRINT 'Added OwnershipType column to Products (default: SUPPLIER)';
END

-- ============================================================
-- 2. Add product-level CommissionRate override column
-- ============================================================
IF COL_LENGTH('dbo.Products', 'CommissionRate') IS NULL
BEGIN
    ALTER TABLE dbo.Products
    ADD CommissionRate DECIMAL(5,2) NULL;
    PRINT 'Added CommissionRate column to Products (NULL = use default)';
END

COMMIT;
GO

-- ============================================================
-- 3. Add CHECK constraint on OwnershipType
-- ============================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.Products')
      AND name = 'CK_Products_OwnershipType'
)
BEGIN
    ALTER TABLE dbo.Products
    ADD CONSTRAINT CK_Products_OwnershipType
    CHECK (OwnershipType IN ('OWN', 'SUPPLIER'));
    PRINT 'Added CK_Products_OwnershipType check constraint';
END

COMMIT;
GO

-- ============================================================
-- 4. Create SupplierCommissionRates table
-- ============================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

IF OBJECT_ID('dbo.SupplierCommissionRates', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SupplierCommissionRates (
        RateId INT IDENTITY(1,1) PRIMARY KEY,
        SupplierEmail NVARCHAR(255) NOT NULL,
        Category NVARCHAR(150) NULL,
        CommissionRate DECIMAL(5,2) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_SupplierCommRate UNIQUE (SupplierEmail, Category)
    );
    PRINT 'Created SupplierCommissionRates table';
END

COMMIT;
GO

-- ============================================================
-- 5. Create CommissionLedger table
-- ============================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

IF OBJECT_ID('dbo.CommissionLedger', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CommissionLedger (
        EntryId BIGINT IDENTITY(1,1) PRIMARY KEY,
        OrderId BIGINT NOT NULL,
        ProductId INT NOT NULL,
        SupplierEmail NVARCHAR(255) NOT NULL,
        SaleAmount DECIMAL(18,2) NOT NULL,
        CommissionRate DECIMAL(5,2) NOT NULL,
        CommissionAmount DECIMAL(18,2) NOT NULL,
        SupplierPayable DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
        PaidAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_CommissionLedger_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId),
        CONSTRAINT FK_CommissionLedger_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId),
        CONSTRAINT CK_CommissionLedger_Status CHECK (Status IN ('PENDING', 'PAID', 'CANCELLED'))
    );

    CREATE INDEX IX_CommissionLedger_Supplier ON dbo.CommissionLedger (SupplierEmail, Status);
    CREATE INDEX IX_CommissionLedger_Order ON dbo.CommissionLedger (OrderId);

    PRINT 'Created CommissionLedger table with indexes';
END

COMMIT;
GO

-- ============================================================
-- 6. Create GlobalSettings table
-- ============================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

IF OBJECT_ID('dbo.GlobalSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GlobalSettings (
        SettingKey NVARCHAR(100) PRIMARY KEY,
        SettingValue NVARCHAR(500) NOT NULL,
        Description NVARCHAR(500) NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    INSERT INTO dbo.GlobalSettings (SettingKey, SettingValue, Description)
    VALUES ('DEFAULT_COMMISSION_RATE', '10.00', 'Default commission percentage for supplier products');

    PRINT 'Created GlobalSettings table with default commission rate (10%)';
END

COMMIT;
GO

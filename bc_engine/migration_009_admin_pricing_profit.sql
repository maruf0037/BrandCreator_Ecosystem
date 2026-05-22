-- Migration 009: Admin Pricing & Profit Engine
-- Path: D:\Workspace\01_Projects\Active\BrandCreator_Ecosystem\bc_engine\migration_009_admin_pricing_profit.sql

-- 1. Create dbo.AdminPricingPlans table if it does not exist
IF OBJECT_ID('dbo.AdminPricingPlans', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdminPricingPlans (
        PlanId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId),
        AdminSellingPrice DECIMAL(18,2) NOT NULL,
        AdBudgetPlanned DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        PlatformCommission DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        DeliveryOpsCost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        CreatedByAdmin NVARCHAR(255) NOT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Created AdminPricingPlans table';
END

-- 2. Create dbo.ProductProfitSnapshots table if it does not exist
IF OBJECT_ID('dbo.ProductProfitSnapshots', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductProfitSnapshots (
        SnapshotId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId),
        SupplierRpuMrp DECIMAL(18,2) NOT NULL,
        AdminSellingPrice DECIMAL(18,2) NOT NULL,
        AdBudgetPlanned DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        AdSpendActual DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        NetBrandCreatorProfit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Status NVARCHAR(50) NOT NULL DEFAULT 'OK',
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Created ProductProfitSnapshots table';
END

-- 3. Create dbo.OrderProfitBreakdowns table if it does not exist
IF OBJECT_ID('dbo.OrderProfitBreakdowns', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderProfitBreakdowns (
        BreakdownId BIGINT IDENTITY(1,1) PRIMARY KEY,
        OrderId BIGINT NOT NULL FOREIGN KEY REFERENCES dbo.Orders(OrderId),
        ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId),
        Qty INT NOT NULL,
        GrossRevenue DECIMAL(18,2) NOT NULL,
        SupplierPayable DECIMAL(18,2) NOT NULL,
        PlatformCommission DECIMAL(18,2) NOT NULL,
        AdSpendShare DECIMAL(18,2) NOT NULL,
        DeliveryOpsCost DECIMAL(18,2) NOT NULL,
        DiscountAmount DECIMAL(18,2) NOT NULL,
        NetBrandCreatorProfit DECIMAL(18,2) NOT NULL,
        ReturnLoss DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        ProfitAfterReturn DECIMAL(18,2) NOT NULL,
        PaymentStatus NVARCHAR(50) NOT NULL DEFAULT 'UNPAID',
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Created OrderProfitBreakdowns table';
END

-- 4. Create dbo.AdsBudgetLedgers table if it does not exist
IF OBJECT_ID('dbo.AdsBudgetLedgers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdsBudgetLedgers (
        LedgerId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId),
        AdBudgetPlanned DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        AdSpendActual DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        Note NVARCHAR(500) NULL,
        CreatedByAdmin NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Created AdsBudgetLedgers table';
END

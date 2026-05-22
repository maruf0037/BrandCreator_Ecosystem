-- Migration 008: Product Intake Upgrades
-- Path: D:\Workspace\01_Projects\Active\BrandCreator_Ecosystem\bc_engine\migration_008_product_intake.sql

-- 1. Check and add upgraded product columns to dbo.Products
IF COL_LENGTH('dbo.Products', 'Barcode') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD Barcode NVARCHAR(100) NULL;
END

IF COL_LENGTH('dbo.Products', 'Brand') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD Brand NVARCHAR(150) NULL;
END

IF COL_LENGTH('dbo.Products', 'Category') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD Category NVARCHAR(150) NULL;
END

IF COL_LENGTH('dbo.Products', 'RPU_MRP') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD RPU_MRP DECIMAL(18,2) NULL;
END

IF COL_LENGTH('dbo.Products', 'SuggestedRetailPrice') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD SuggestedRetailPrice DECIMAL(18,2) NULL;
END

IF COL_LENGTH('dbo.Products', 'CostNote') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD CostNote NVARCHAR(500) NULL;
END

IF COL_LENGTH('dbo.Products', 'VariantsJson') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD VariantsJson NVARCHAR(MAX) NULL;
END

IF COL_LENGTH('dbo.Products', 'SupplierLocation') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD SupplierLocation NVARCHAR(255) NULL;
END

IF COL_LENGTH('dbo.Products', 'DeliveryCoverageJson') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD DeliveryCoverageJson NVARCHAR(MAX) NULL;
END

IF COL_LENGTH('dbo.Products', 'OnlineSellingRequested') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD OnlineSellingRequested BIT NOT NULL DEFAULT 1;
END

IF COL_LENGTH('dbo.Products', 'ProductReadinessStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD ProductReadinessStatus NVARCHAR(50) NOT NULL DEFAULT 'NEEDS_REVIEW';
END


-- 2. Create ProductImages table if it does not exist
IF OBJECT_ID('dbo.ProductImages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductImages (
        ImageId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId),
        ImageUrl NVARCHAR(500) NOT NULL,
        IsPrimary BIT NOT NULL DEFAULT 0,
        AltText NVARCHAR(255) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Created ProductImages table';
END


-- 3. Create SupplierStockBatches table if it does not exist
IF OBJECT_ID('dbo.SupplierStockBatches', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SupplierStockBatches (
        BatchId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId),
        SupplierEmail NVARCHAR(255) NOT NULL,
        Qty INT NOT NULL,
        RPU_MRP DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        BatchNote NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    PRINT 'Created SupplierStockBatches table';
END

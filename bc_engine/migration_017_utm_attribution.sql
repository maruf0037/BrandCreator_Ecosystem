/* Migration 017: UTM Campaign Tracking & Fabrics Attributes Schema */

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;

BEGIN TRAN;

-- ============================================================
-- 1. Add UtmSource to dbo.Orders
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Orders') AND name = 'UtmSource'
)
BEGIN
    ALTER TABLE dbo.Orders ADD UtmSource NVARCHAR(150) NULL;
    PRINT 'Added UtmSource to dbo.Orders';
END

-- ============================================================
-- 2. Add UtmSource to dbo.OrderProfitBreakdowns
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.OrderProfitBreakdowns') AND name = 'UtmSource'
)
BEGIN
    ALTER TABLE dbo.OrderProfitBreakdowns ADD UtmSource NVARCHAR(150) NULL;
    PRINT 'Added UtmSource to dbo.OrderProfitBreakdowns';
END

-- ============================================================
-- 3. Add Fabrics Attributes to dbo.Products
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'FabricMaterial'
)
BEGIN
    ALTER TABLE dbo.Products ADD FabricMaterial NVARCHAR(100) NULL;
    PRINT 'Added FabricMaterial to dbo.Products';
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'FabricTexture'
)
BEGIN
    ALTER TABLE dbo.Products ADD FabricTexture NVARCHAR(100) NULL;
    PRINT 'Added FabricTexture to dbo.Products';
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'FabricWidth'
)
BEGIN
    ALTER TABLE dbo.Products ADD FabricWidth NVARCHAR(50) NULL;
    PRINT 'Added FabricWidth to dbo.Products';
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'ThreadCount'
)
BEGIN
    ALTER TABLE dbo.Products ADD ThreadCount NVARCHAR(50) NULL;
    PRINT 'Added ThreadCount to dbo.Products';
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'WeavingType'
)
BEGIN
    ALTER TABLE dbo.Products ADD WeavingType NVARCHAR(100) NULL;
    PRINT 'Added WeavingType to dbo.Products';
END

COMMIT;
GO

BEGIN TRAN;

-- ============================================================
-- 4. Create Index on UtmSource for high-performance ROI analytics
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_OrderProfitBreakdowns_UtmSource'
      AND object_id = OBJECT_ID('dbo.OrderProfitBreakdowns')
)
BEGIN
    CREATE INDEX IX_OrderProfitBreakdowns_UtmSource
    ON dbo.OrderProfitBreakdowns(UtmSource)
    WHERE UtmSource IS NOT NULL;
    PRINT 'Created Index IX_OrderProfitBreakdowns_UtmSource';
END

COMMIT;
GO

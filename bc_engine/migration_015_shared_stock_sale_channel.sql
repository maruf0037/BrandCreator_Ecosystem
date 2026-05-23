-- migration_015_shared_stock_sale_channel.sql
-- SQL Server (BrandCreator_HUBDB)
-- Adds SaleChannel column to Orders and adds CHECK constraint.

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- ============================================================
-- 1. Add SaleChannel Column to Orders with NOT NULL and DEFAULT
-- ============================================================
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Orders') 
      AND name = 'SaleChannel'
)
BEGIN
    ALTER TABLE dbo.Orders
    ADD SaleChannel NVARCHAR(50) NOT NULL CONSTRAINT DF_Orders_SaleChannel DEFAULT 'ONLINE';

    PRINT 'Added SaleChannel column to Orders';
END

COMMIT;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- ============================================================
-- 2. Add CHECK constraint on SaleChannel
-- ============================================================
IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.Orders')
      AND name = 'CK_Orders_SaleChannel'
)
BEGIN
    ALTER TABLE dbo.Orders
    ADD CONSTRAINT CK_Orders_SaleChannel
    CHECK (SaleChannel IN ('ONLINE', 'PHYSICAL_SHOP'));

    PRINT 'Added CK_Orders_SaleChannel check constraint to Orders';
END

COMMIT;
GO

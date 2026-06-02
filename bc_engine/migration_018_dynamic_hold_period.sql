-- ============================================================
-- Migration 018: Dynamic Hold Period & Supplier Trust System
-- ============================================================
-- Purpose: Implement dynamic hold periods based on supplier trust levels
--          Trusted suppliers get faster payouts (3 days vs 7 days)
--          New suppliers get 0% commission for first 3 months
-- ============================================================

-- 1. Add TrustLevel column to Suppliers table (or Users table if suppliers are stored there)
--    Trust Levels: Bronze (new), Silver (established), Gold (trusted), Platinum (elite)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'TrustLevel')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [TrustLevel] VARCHAR(20) NOT NULL DEFAULT 'Bronze';
    -- Bronze: New suppliers (0-9 orders)
    -- Silver: Established (10-49 orders, <5% return rate)
    -- Gold: Trusted (50-199 orders, <2% return rate)
    -- Platinum: Elite (200+ orders, <1% return rate)
END
GO

-- 2. Add CustomHoldDays column - overrides default 7-day hold
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'CustomHoldDays')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [CustomHoldDays] INT NULL;
    -- NULL = use default (7 days for Bronze, 5 for Silver, 3 for Gold/Platinum)
    -- Can be manually overridden by admin
END
GO

-- 3. Add OnboardedAt timestamp for new supplier tracking (0% commission for first 3 months)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'OnboardedAt')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [OnboardedAt] DATETIME NULL;
    -- Set automatically when supplier creates first product
    -- Used to calculate 0% commission period (first 90 days)
END
GO

-- 4. Add TotalOrders count for trust level calculation
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'TotalSuccessfulOrders')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [TotalSuccessfulOrders] INT NOT NULL DEFAULT 0;
    -- Updated after each successful order (payment confirmed + return window passed)
END
GO

-- 5. Add ReturnRate for trust level calculation
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'ReturnRate')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [ReturnRate] DECIMAL(5,2) NOT NULL DEFAULT 0.00;
    -- Calculated as (returns / total_orders) * 100
    -- Updated after each order completion or return
END
GO

-- 6. Add TrustedBadge display flag
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'ShowTrustedBadge')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [ShowTrustedBadge] BIT NOT NULL DEFAULT 0;
    -- 1 = show "Trusted Supplier" badge on dashboard and product pages
    -- Automatically set when TrustLevel >= Silver
END
GO

-- 7. Create SupplierTrustHistory table for audit trail
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SupplierTrustHistory')
BEGIN
    CREATE TABLE [dbo].[SupplierTrustHistory] (
        [Id] INT PRIMARY KEY IDENTITY(1,1),
        [SupplierId] INT NOT NULL,
        [PreviousTrustLevel] VARCHAR(20) NOT NULL,
        [NewTrustLevel] VARCHAR(20) NOT NULL,
        [Reason] NVARCHAR(500) NULL,
        [ChangedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [ChangedBy] VARCHAR(50) NOT NULL DEFAULT 'SYSTEM', -- 'SYSTEM' or 'ADMIN'
        FOREIGN KEY ([SupplierId]) REFERENCES [dbo].[Users]([Id])
    );
    
    CREATE INDEX [IX_SupplierTrustHistory_SupplierId] ON [dbo].[SupplierTrustHistory] ([SupplierId]);
    CREATE INDEX [IX_SupplierTrustHistory_ChangedAt] ON [dbo].[SupplierTrustHistory] ([ChangedAt]);
END
GO

-- 8. Create CommissionTiers table for volume-based commission rates
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CommissionTiers')
BEGIN
    CREATE TABLE [dbo].[CommissionTiers] (
        [Id] INT PRIMARY KEY IDENTITY(1,1),
        [TierName] VARCHAR(50) NOT NULL, -- 'Bronze', 'Silver', 'Gold', 'Platinum'
        [MinMonthlySales] DECIMAL(12,2) NOT NULL DEFAULT 0, -- Minimum monthly sales to qualify
        [MaxMonthlySales] DECIMAL(12,2) NULL, -- NULL = no upper limit
        [CommissionRate] DECIMAL(5,2) NOT NULL, -- Commission percentage
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );
    
    -- Insert default commission tiers
    INSERT INTO [dbo].[CommissionTiers] ([TierName], [MinMonthlySales], [MaxMonthlySales], [CommissionRate]) VALUES
    ('Bronze', 0, 50000, 10.00),        -- 0-50k sales: 10% commission
    ('Silver', 50000.01, 200000, 8.00), -- 50k-200k sales: 8% commission
    ('Gold', 200000.01, 500000, 6.00),  -- 200k-500k sales: 6% commission
    ('Platinum', 500000.01, NULL, 5.00); -- 500k+ sales: 5% commission
END
GO

-- 9. Create stored procedure to update supplier trust level
IF OBJECT_ID('[dbo].[sp_UpdateSupplierTrustLevel]', 'P') IS NULL
BEGIN
    EXEC('CREATE PROCEDURE [dbo].[sp_UpdateSupplierTrustLevel]
        @SupplierId INT,
        @NewTotalOrders INT,
        @NewReturnRate DECIMAL(5,2)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @OldTrustLevel VARCHAR(20);
        DECLARE @NewTrustLevel VARCHAR(20);
        DECLARE @CustomHoldDays INT;
        DECLARE @ShowBadge BIT;
        
        -- Get current trust level
        SELECT @OldTrustLevel = [TrustLevel] 
        FROM [dbo].[Users] 
        WHERE [Id] = @SupplierId;
        
        -- Calculate new trust level based on orders and return rate
        IF @NewTotalOrders >= 200 AND @NewReturnRate < 1.0
            SET @NewTrustLevel = ''Platinum'';
        ELSE IF @NewTotalOrders >= 50 AND @NewReturnRate < 2.0
            SET @NewTrustLevel = ''Gold'';
        ELSE IF @NewTotalOrders >= 10 AND @NewReturnRate < 5.0
            SET @NewTrustLevel = ''Silver'';
        ELSE
            SET @NewTrustLevel = ''Bronze'';
        
        -- Set custom hold days based on trust level
        IF @NewTrustLevel = ''Platinum'' OR @NewTrustLevel = ''Gold''
            SET @CustomHoldDays = 3;
        ELSE IF @NewTrustLevel = ''Silver''
            SET @CustomHoldDays = 5;
        ELSE
            SET @CustomHoldDays = 7;
        
        -- Set badge visibility
        SET @ShowBadge = CASE WHEN @NewTrustLevel IN (''Silver'', ''Gold'', ''Platinum'') THEN 1 ELSE 0 END;
        
        -- Update supplier record
        UPDATE [dbo].[Users] 
        SET [TrustLevel] = @NewTrustLevel,
            [CustomHoldDays] = @CustomHoldDays,
            [ShowTrustedBadge] = @ShowBadge,
            [TotalSuccessfulOrders] = @NewTotalOrders,
            [ReturnRate] = @NewReturnRate
        WHERE [Id] = @SupplierId;
        
        -- Log trust level change if it changed
        IF @OldTrustLevel <> @NewTrustLevel
        BEGIN
            INSERT INTO [dbo].[SupplierTrustHistory] 
            ([SupplierId], [PreviousTrustLevel], [NewTrustLevel], [Reason])
            VALUES (@SupplierId, @OldTrustLevel, @NewTrustLevel, 
                   ''Auto-updated based on '' + CAST(@NewTotalOrders AS VARCHAR) + '' orders and '' + 
                   CAST(@NewReturnRate AS VARCHAR) + ''% return rate'');
        END
    END');
END
GO

-- 10. Create function to calculate dynamic commission rate
IF OBJECT_ID('[dbo].[fn_CalculateCommissionRate]', 'FN') IS NULL
BEGIN
    EXEC('CREATE FUNCTION [dbo].[fn_CalculateCommissionRate]
    (
        @SupplierId INT,
        @OrderAmount DECIMAL(12,2)
    )
    RETURNS DECIMAL(5,2)
    AS
    BEGIN
        DECLARE @CommissionRate DECIMAL(5,2);
        DECLARE @OnboardedAt DATETIME;
        DECLARE @TrustLevel VARCHAR(20);
        
        -- Get supplier info
        SELECT @OnboardedAt = [OnboardedAt], @TrustLevel = [TrustLevel]
        FROM [dbo].[Users]
        WHERE [Id] = @SupplierId;
        
        -- Check if within first 3 months (0% commission for new suppliers)
        IF @OnboardedAt IS NOT NULL AND DATEDIFF(DAY, @OnboardedAt, GETDATE()) <= 90
        BEGIN
            RETURN 0.00;
        END
        
        -- Get commission rate based on trust level (fallback to volume-based if needed)
        SELECT TOP 1 @CommissionRate = [CommissionRate]
        FROM [dbo].[CommissionTiers]
        WHERE [IsActive] = 1 
          AND @OrderAmount >= [MinMonthlySales]
          AND ([MaxMonthlySales] IS NULL OR @OrderAmount <= [MaxMonthlySales])
        ORDER BY [MinMonthlySales] DESC;
        
        RETURN ISNULL(@CommissionRate, 10.00); -- Default to 10% if no tier matches
    END');
END
GO

-- 11. Create function to get hold days for supplier
IF OBJECT_ID('[dbo].[fn_GetHoldDays]', 'FN') IS NULL
BEGIN
    EXEC('CREATE FUNCTION [dbo].[fn_GetHoldDays]
    (
        @SupplierId INT
    )
    RETURNS INT
    AS
    BEGIN
        DECLARE @HoldDays INT;
        
        SELECT @HoldDays = ISNULL([CustomHoldDays], 
            CASE [TrustLevel]
                WHEN ''Platinum'' THEN 3
                WHEN ''Gold'' THEN 3
                WHEN ''Silver'' THEN 5
                ELSE 7
            END)
        FROM [dbo].[Users]
        WHERE [Id] = @SupplierId;
        
        RETURN @HoldDays;
    END');
END
GO

-- 12. Update existing suppliers with initial trust level based on order history
-- This will be run once during migration
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
BEGIN
    -- Set OnboardedAt to account creation date for existing suppliers
    UPDATE [dbo].[Users] 
    SET [OnboardedAt] = GETUTCDATE()
    WHERE [OnboardedAt] IS NULL 
      AND [Role] = 'SUPPLIER'; -- Assuming there's a Role column
    
    -- Calculate initial trust levels for existing suppliers
    -- This is a simplified version - actual implementation would need order history
    UPDATE [dbo].[Users]
    SET [TrustLevel] = 'Bronze',
        [CustomHoldDays] = 7,
        [ShowTrustedBadge] = 0
    WHERE [Role] = 'SUPPLIER' 
      AND [TrustLevel] = 'Bronze'; -- Default for all existing suppliers
END
GO

-- ============================================================
-- Migration Complete
-- ============================================================
-- Next Steps:
-- 1. Update backend APIs to use new trust level functions
-- 2. Update commission calculation logic
-- 3. Add frontend UI for Trusted Supplier badge
-- 4. Test with sample data
-- ============================================================

PRINT 'Migration 018: Dynamic Hold Period & Supplier Trust System - COMPLETED';
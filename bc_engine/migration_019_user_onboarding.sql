-- migration_019_user_onboarding.sql

-- 1. Create SupplierProfiles table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SupplierProfiles')
BEGIN
  CREATE TABLE dbo.SupplierProfiles (
    Email         NVARCHAR(255) PRIMARY KEY,
    ShopName      NVARCHAR(255) NOT NULL,
    ShopLocation  NVARCHAR(255) NOT NULL,
    PhoneNumber   NVARCHAR(50)  NOT NULL,
    NID           NVARCHAR(50)  NOT NULL,
    TradeLicense  NVARCHAR(100) NOT NULL,
    Status        VARCHAR(20)   NOT NULL DEFAULT 'PENDING_APPROVAL',
    RejectReason  NVARCHAR(500) NULL,
    SubmittedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ReviewedAt    DATETIME2     NULL
  );
  
  CREATE INDEX IX_SupplierProfiles_Status ON dbo.SupplierProfiles(Status);
  PRINT 'Table SupplierProfiles created successfully.'
END
ELSE
  PRINT 'Table SupplierProfiles already exists.'
GO

-- 2. Create CustomerProfiles table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CustomerProfiles')
BEGIN
  CREATE TABLE dbo.CustomerProfiles (
    Email           NVARCHAR(255) PRIMARY KEY,
    PhoneNumber     NVARCHAR(50)  NOT NULL,
    DeliveryAddress NVARCHAR(500) NOT NULL,
    UpdatedAt       DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
  );
  PRINT 'Table CustomerProfiles created successfully.'
END
ELSE
  PRINT 'Table CustomerProfiles already exists.'
GO

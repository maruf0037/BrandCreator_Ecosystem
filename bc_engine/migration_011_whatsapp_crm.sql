-- migration_011_whatsapp_crm.sql
-- SQL Server (BrandCreator_HUBDB)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- 1. Add CustomerPhone field to dbo.Orders if not exists
IF COL_LENGTH('dbo.Orders', 'CustomerPhone') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD CustomerPhone NVARCHAR(50) NULL;
END;

-- 2. Create WhatsAppContacts Table
IF OBJECT_ID('dbo.WhatsAppContacts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WhatsAppContacts (
        ContactId INT IDENTITY(1,1) PRIMARY KEY,
        Phone NVARCHAR(50) NOT NULL UNIQUE,
        Name NVARCHAR(255) NULL,
        OptedIn BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

-- 3. Create WhatsAppMessages Table
IF OBJECT_ID('dbo.WhatsAppMessages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WhatsAppMessages (
        MessageId INT IDENTITY(1,1) PRIMARY KEY,
        ContactId INT NULL FOREIGN KEY REFERENCES dbo.WhatsAppContacts(ContactId),
        OrderId BIGINT NULL FOREIGN KEY REFERENCES dbo.Orders(OrderId),
        Direction NVARCHAR(20) NOT NULL CHECK (Direction IN ('SENT', 'RECEIVED')),
        MessageSid NVARCHAR(150) NULL, -- Meta API message SID
        TemplateName NVARCHAR(150) NULL,
        BodyText NVARCHAR(MAX) NOT NULL,
        DeliveryStatus NVARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (DeliveryStatus IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED_CONFIG_MISSING')),
        ErrorMessage NVARCHAR(500) NULL,
        SentAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

-- 4. Create WhatsAppWebhookEvents Table
IF OBJECT_ID('dbo.WhatsAppWebhookEvents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.WhatsAppWebhookEvents (
        EventId INT IDENTITY(1,1) PRIMARY KEY,
        EventType NVARCHAR(100) NOT NULL, -- 'status_update' | 'incoming_message'
        EventRef NVARCHAR(250) NULL,
        PayloadJson NVARCHAR(MAX) NOT NULL,
        Processed BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

COMMIT;

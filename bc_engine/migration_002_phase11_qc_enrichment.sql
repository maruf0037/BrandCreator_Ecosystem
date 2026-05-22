-- migration_002_phase11_qc_enrichment.sql
-- SQL Server (BrandCreator_HUBDB)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- If columns already exist, drop them or alter. Since it's a clean migrate, we'll alter or add.
-- Check if QCStatus column already exists. If not, add them.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Products') AND name = 'QCStatus')
BEGIN
    ALTER TABLE dbo.Products
    ADD QCStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_Products_QCStatus DEFAULT 'DRAFT',
        QCReason NVARCHAR(1000) NULL,
        EnrichmentJson NVARCHAR(MAX) NULL,
        LastEnrichedAt DATETIME2 NULL;
END;

IF OBJECT_ID('dbo.ProductQCEvents','U') IS NULL
CREATE TABLE dbo.ProductQCEvents (
  EventId BIGINT IDENTITY(1,1) PRIMARY KEY,
  ProductId INT NOT NULL,
  Action NVARCHAR(30) NOT NULL, -- SUBMIT/APPROVE/REJECT
  Reason NVARCHAR(1000) NULL,
  PerformedByEmail NVARCHAR(255) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ProductQCEvents_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
);

IF OBJECT_ID('dbo.ProductEnrichmentJobs','U') IS NULL
CREATE TABLE dbo.ProductEnrichmentJobs (
  JobId BIGINT IDENTITY(1,1) PRIMARY KEY,
  ProductId INT NOT NULL,
  Status NVARCHAR(30) NOT NULL DEFAULT 'QUEUED', -- QUEUED/RUNNING/SUCCEEDED/FAILED
  Provider NVARCHAR(50) NOT NULL DEFAULT 'GEMINI',
  PromptVersion NVARCHAR(50) NOT NULL DEFAULT 'v1',
  ErrorMessage NVARCHAR(1000) NULL,
  RequestedByEmail NVARCHAR(255) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  FinishedAt DATETIME2 NULL,
  CONSTRAINT FK_ProductEnrichmentJobs_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProductQCEvents_ProductId_CreatedAt' AND object_id = OBJECT_ID('dbo.ProductQCEvents'))
  CREATE INDEX IX_ProductQCEvents_ProductId_CreatedAt ON dbo.ProductQCEvents(ProductId, CreatedAt DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProductEnrichmentJobs_ProductId_CreatedAt' AND object_id = OBJECT_ID('dbo.ProductEnrichmentJobs'))
  CREATE INDEX IX_ProductEnrichmentJobs_ProductId_CreatedAt ON dbo.ProductEnrichmentJobs(ProductId, CreatedAt DESC);

COMMIT;
GO

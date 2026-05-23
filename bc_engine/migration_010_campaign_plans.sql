IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CampaignPlans]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.CampaignPlans (
        CampaignId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        PlanId INT NOT NULL,
        SuggestionId INT NOT NULL,
        SelectedLocation NVARCHAR(150) NOT NULL,
        Platform NVARCHAR(100) NOT NULL,
        DailyBudgetBDT DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalBudgetBDT DECIMAL(18,2) NOT NULL DEFAULT 0,
        ExpectedOrderRange NVARCHAR(50) NOT NULL,
        FitScore INT NOT NULL DEFAULT 0,
        RiskLevel NVARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
        SellingPrice DECIMAL(18,2) NOT NULL,
        ProjectedMarginPct DECIMAL(6,2) NOT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        ApprovedByAdmin NVARCHAR(255) NULL,
        ApprovedAt DATETIME2 NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO
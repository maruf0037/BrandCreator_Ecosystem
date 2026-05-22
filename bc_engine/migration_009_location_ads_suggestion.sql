/* Migration 009: Location-wise Ads Suggestion Engine */

IF OBJECT_ID('dbo.LocationMarketProfiles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LocationMarketProfiles (
        ProfileId INT IDENTITY(1,1) PRIMARY KEY,
        LocationName NVARCHAR(150) NOT NULL,
        City NVARCHAR(100) NOT NULL,
        AudienceType NVARCHAR(255) NULL,
        AvgPurchasePower NVARCHAR(50) NULL,
        CommonInterestsJson NVARCHAR(MAX) NULL,
        DeliveryDifficulty NVARCHAR(50) NULL,
        CompetitionLevel NVARCHAR(50) NULL,
        NotesBangla NVARCHAR(1000) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_LocationMarketProfiles_LocationName'
      AND object_id = OBJECT_ID('dbo.LocationMarketProfiles')
)
BEGIN
    CREATE UNIQUE INDEX UX_LocationMarketProfiles_LocationName
    ON dbo.LocationMarketProfiles(LocationName)
    WHERE IsActive = 1;
END

IF OBJECT_ID('dbo.ProductLocationSuggestions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductLocationSuggestions (
        SuggestionId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        TestedLocation NVARCHAR(150) NOT NULL,
        FitScore INT NULL,
        SuggestedAreasJson NVARCHAR(MAX) NULL,
        NearbyExpansionAreasJson NVARCHAR(MAX) NULL,
        InterestTagsJson NVARCHAR(MAX) NULL,
        PlatformSuggestionJson NVARCHAR(MAX) NULL,
        BudgetSuggestionJson NVARCHAR(MAX) NULL,
        ExpectedResultJson NVARCHAR(MAX) NULL,
        RiskLevel NVARCHAR(50) NULL,
        ReasonBangla NVARCHAR(MAX) NULL,
        ReasonEnglish NVARCHAR(MAX) NULL,
        ConfidenceScore INT NULL,
        FreshnessStatus NVARCHAR(50) NULL,
        LastAnalyzedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ProductLocationSuggestions_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_ProductLocationSuggestions_Product_Location'
      AND object_id = OBJECT_ID('dbo.ProductLocationSuggestions')
)
BEGIN
    CREATE INDEX IX_ProductLocationSuggestions_Product_Location
    ON dbo.ProductLocationSuggestions(ProductId, TestedLocation, CreatedAt DESC);
END

IF OBJECT_ID('dbo.LocationSuggestionSyncEvents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LocationSuggestionSyncEvents (
        SyncEventId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        RequestedByEmail NVARCHAR(255) NOT NULL,
        RequestedLocation NVARCHAR(150) NOT NULL,
        Status NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_LocationSuggestionSyncEvents_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
    );
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_LocationSuggestionSyncEvents_Product'
      AND object_id = OBJECT_ID('dbo.LocationSuggestionSyncEvents')
)
BEGIN
    CREATE INDEX IX_LocationSuggestionSyncEvents_Product
    ON dbo.LocationSuggestionSyncEvents(ProductId, CreatedAt DESC);
END

DECLARE @profiles TABLE (
    LocationName NVARCHAR(150),
    City NVARCHAR(100),
    AudienceType NVARCHAR(255),
    AvgPurchasePower NVARCHAR(50),
    CommonInterestsJson NVARCHAR(MAX),
    DeliveryDifficulty NVARCHAR(50),
    CompetitionLevel NVARCHAR(50),
    NotesBangla NVARCHAR(1000)
);

INSERT INTO @profiles VALUES
('Uttara','Dhaka','Urban family and middle-upper income','High','["women fashion","boutique clothing","family shopping","online shopping","Eid fashion","modest fashion"]','Medium','Medium','Uttara te family shopping, fashion, boutique, online delivery offer bhalo kaj korte pare.'),
('Mirpur','Dhaka','High-volume mixed audience','Medium','["value fashion","household","electronics","family shopping"]','Low','High','Mirpur price-sensitive high-volume audience er jonno strong testing zone.'),
('Dhanmondi','Dhaka','Student and lifestyle audience','High','["student lifestyle","food","fashion","education","online shopping"]','Medium','High','Dhanmondi te lifestyle, student, education, food, fashion offer bhalo fit.'),
('Gulshan','Dhaka','Premium corporate audience','High','["premium fashion","beauty","lifestyle","imported goods","corporate audience"]','High','High','Gulshan premium positioning, beauty, lifestyle, imported goods er jonno useful.'),
('Banani','Dhaka','Premium young professional audience','High','["premium lifestyle","beauty","fashion","corporate shopping"]','High','High','Banani te premium lifestyle and corporate audience targeting strong.'),
('Mohammadpur','Dhaka','Family and mid-range market','Medium','["family shopping","value fashion","household"]','Low','Medium','Mohammadpur family shopping and mid-range value offer er jonno practical.'),
('Narayanganj','Dhaka','Industrial and value buyer market','Low','["price-sensitive fashion","volume sales","household","wholesale value"]','Medium','High','Narayanganj price-sensitive volume selling er jonno useful.'),
('Gazipur','Dhaka','Industrial and factory worker market','Low','["volume fashion","household","price-sensitive offers","factory worker audience"]','Medium','High','Gazipur volume fashion and value household offer er jonno useful.'),
('Tongi','Dhaka','Value-oriented commuter audience','Low','["value fashion","household","online shopping","family shopping"]','Medium','High','Tongi Uttara-Gazipur bridge market hisebe low-cost test er jonno useful.'),
('Khilgaon','Dhaka','Mixed residential audience','Medium','["urban families","mid-range fashion","household"]','Low','Medium','Khilgaon residential family shopping targeting er jonno bhalo.'),
('Badda','Dhaka','Young professional and residential audience','Medium','["young professionals","online shopping","fashion","home goods"]','Low','Medium','Badda young professional and online shopping audience test er jonno useful.'),
('Chittagong','Chattogram','Port city urban market','Medium','["port city consumers","textile","fashion","family shopping"]','Medium','High','Chittagong port city urban market, fashion and textile demand er jonno strong.'),
('Sylhet','Sylhet','Urban and diaspora-influenced market','Medium','["diaspora family","premium gift","fashion","online shopping"]','Medium','Medium','Sylhet diaspora-influenced premium/value mixed audience er jonno useful.');

MERGE dbo.LocationMarketProfiles AS target
USING @profiles AS source
ON LOWER(target.LocationName) = LOWER(source.LocationName)
WHEN MATCHED THEN
    UPDATE SET
        City = source.City,
        AudienceType = source.AudienceType,
        AvgPurchasePower = source.AvgPurchasePower,
        CommonInterestsJson = source.CommonInterestsJson,
        DeliveryDifficulty = source.DeliveryDifficulty,
        CompetitionLevel = source.CompetitionLevel,
        NotesBangla = source.NotesBangla,
        IsActive = 1
WHEN NOT MATCHED THEN
    INSERT (LocationName, City, AudienceType, AvgPurchasePower, CommonInterestsJson, DeliveryDifficulty, CompetitionLevel, NotesBangla, IsActive)
    VALUES (source.LocationName, source.City, source.AudienceType, source.AvgPurchasePower, source.CommonInterestsJson, source.DeliveryDifficulty, source.CompetitionLevel, source.NotesBangla, 1);

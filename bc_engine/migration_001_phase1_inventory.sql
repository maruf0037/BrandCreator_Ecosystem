-- migration_001_phase1_inventory.sql
-- SQL Server (BrandCreator_HUBDB)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRAN;

IF OBJECT_ID('dbo.TransferRequests','U') IS NOT NULL DROP TABLE dbo.TransferRequests;
IF OBJECT_ID('dbo.InventoryTransactions','U') IS NOT NULL DROP TABLE dbo.InventoryTransactions;
IF OBJECT_ID('dbo.InventoryLedgers','U') IS NOT NULL DROP TABLE dbo.InventoryLedgers;
IF OBJECT_ID('dbo.Products','U') IS NOT NULL DROP TABLE dbo.Products;

CREATE TABLE dbo.Products (
  ProductId INT IDENTITY(1,1) PRIMARY KEY,
  SupplierUserId INT NOT NULL,
  SKU NVARCHAR(100) NOT NULL UNIQUE,
  ProductName NVARCHAR(255) NOT NULL,
  Status NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.InventoryLedgers (
  LedgerId INT IDENTITY(1,1) PRIMARY KEY,
  ProductId INT NOT NULL,
  LedgerType NVARCHAR(20) NOT NULL,
  OnHandQty INT NOT NULL DEFAULT 0,
  ReservedQty INT NOT NULL DEFAULT 0,
  VersionNo INT NOT NULL DEFAULT 1,
  UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_InventoryLedgers_Product_Ledger UNIQUE (ProductId, LedgerType),
  CONSTRAINT CK_InventoryLedgers_LedgerType CHECK (LedgerType IN ('MASTER','SELL')),
  CONSTRAINT CK_InventoryLedgers_NonNegative CHECK (OnHandQty >= 0 AND ReservedQty >= 0),
  CONSTRAINT FK_InventoryLedgers_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
);

CREATE TABLE dbo.InventoryTransactions (
  TxnId BIGINT IDENTITY(1,1) PRIMARY KEY,
  ProductId INT NOT NULL,
  LedgerType NVARCHAR(20) NOT NULL,
  TxnType NVARCHAR(30) NOT NULL,
  Qty INT NOT NULL,
  RefType NVARCHAR(50) NULL,
  RefId NVARCHAR(100) NULL,
  Note NVARCHAR(500) NULL,
  CreatedByEmail NVARCHAR(255) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_InventoryTransactions_LedgerType CHECK (LedgerType IN ('MASTER','SELL')),
  CONSTRAINT CK_InventoryTransactions_QtyPositive CHECK (Qty > 0),
  CONSTRAINT FK_InventoryTransactions_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
);

CREATE TABLE dbo.TransferRequests (
  TransferId BIGINT IDENTITY(1,1) PRIMARY KEY,
  ProductId INT NOT NULL,
  Qty INT NOT NULL,
  Status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
  RequestedByEmail NVARCHAR(255) NOT NULL,
  ApprovedByEmail NVARCHAR(255) NULL,
  RequestedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  ApprovedAt DATETIME2 NULL,
  Note NVARCHAR(500) NULL,
  CONSTRAINT CK_TransferRequests_QtyPositive CHECK (Qty > 0),
  CONSTRAINT CK_TransferRequests_Status CHECK (Status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
  CONSTRAINT FK_TransferRequests_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId)
);

-- Optional idempotency guard
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InventoryTransactions_Ref_Dedupe' AND object_id = OBJECT_ID('dbo.InventoryTransactions'))
  DROP INDEX IX_InventoryTransactions_Ref_Dedupe ON dbo.InventoryTransactions;

CREATE UNIQUE INDEX IX_InventoryTransactions_Ref_Dedupe
ON dbo.InventoryTransactions (ProductId, LedgerType, TxnType, RefType, RefId)
WHERE RefType IS NOT NULL AND RefId IS NOT NULL;

COMMIT;
GO

-- Create Stored Procedure for atomic transaction processing
IF OBJECT_ID('dbo.sp_InventoryApplyTransaction', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_InventoryApplyTransaction;
GO

CREATE PROCEDURE dbo.sp_InventoryApplyTransaction
  @ProductId INT,
  @LedgerType NVARCHAR(20),
  @TxnType NVARCHAR(30),
  @Qty INT,
  @RefType NVARCHAR(50) = NULL,
  @RefId NVARCHAR(100) = NULL,
  @Note NVARCHAR(500) = NULL,
  @CreatedByEmail NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  -- Ensure valid ledger type
  IF @LedgerType NOT IN ('MASTER', 'SELL')
  BEGIN
    RAISERROR('INVALID_LEDGER_TYPE: Ledger type must be MASTER or SELL', 16, 1);
    RETURN;
  END;

  -- Ensure valid txn type
  IF @TxnType NOT IN ('IN', 'OUT', 'RESERVE', 'RELEASE', 'COMMIT')
  BEGIN
    RAISERROR('INVALID_TXN_TYPE: Transaction type must be IN, OUT, RESERVE, RELEASE, or COMMIT', 16, 1);
    RETURN;
  END;

  -- Ensure qty is positive
  IF @Qty <= 0
  BEGIN
    RAISERROR('INVALID_QTY: Quantity must be positive', 16, 1);
    RETURN;
  END;

  BEGIN TRAN;

  -- Ensure ledger exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM dbo.InventoryLedgers WHERE ProductId = @ProductId AND LedgerType = @LedgerType)
  BEGIN
    INSERT INTO dbo.InventoryLedgers (ProductId, LedgerType, OnHandQty, ReservedQty, VersionNo)
    VALUES (@ProductId, @LedgerType, 0, 0, 1);
  END;

  -- Lock the row for update to prevent race conditions
  DECLARE @CurrentOnHand INT;
  DECLARE @CurrentReserved INT;
  DECLARE @CurrentVersion INT;

  SELECT 
    @CurrentOnHand = OnHandQty, 
    @CurrentReserved = ReservedQty,
    @CurrentVersion = VersionNo
  FROM dbo.InventoryLedgers WITH (UPDLOCK, ROWLOCK)
  WHERE ProductId = @ProductId AND LedgerType = @LedgerType;

  DECLARE @NewOnHand INT = @CurrentOnHand;
  DECLARE @NewReserved INT = @CurrentReserved;

  IF @TxnType = 'IN'
  BEGIN
    SET @NewOnHand = @CurrentOnHand + @Qty;
  END
  ELSE IF @TxnType = 'OUT'
  BEGIN
    IF (@CurrentOnHand - @CurrentReserved) < @Qty
    BEGIN
      DECLARE @AvailableQty INT = @CurrentOnHand - @CurrentReserved;
      DECLARE @ErrorMsg NVARCHAR(500) = 'INSUFFICIENT_STOCK: Requested qty (' + CAST(@Qty AS NVARCHAR(10)) + ') exceeds available (' + CAST(@AvailableQty AS NVARCHAR(10)) + ')';
      RAISERROR(@ErrorMsg, 16, 1);
      ROLLBACK TRAN;
      RETURN;
    END;
    SET @NewOnHand = @CurrentOnHand - @Qty;
  END
  ELSE IF @TxnType = 'RESERVE'
  BEGIN
    IF (@CurrentOnHand - @CurrentReserved) < @Qty
    BEGIN
      DECLARE @Avail INT = @CurrentOnHand - @CurrentReserved;
      DECLARE @Err NVARCHAR(500) = 'INSUFFICIENT_STOCK: Cannot reserve (' + CAST(@Qty AS NVARCHAR(10)) + '), available is (' + CAST(@Avail AS NVARCHAR(10)) + ')';
      RAISERROR(@Err, 16, 1);
      ROLLBACK TRAN;
      RETURN;
    END;
    SET @NewReserved = @CurrentReserved + @Qty;
  END
  ELSE IF @TxnType = 'RELEASE'
  BEGIN
    IF @CurrentReserved < @Qty
    BEGIN
      DECLARE @ErrRelease NVARCHAR(500) = 'INSUFFICIENT_RESERVATION: Cannot release (' + CAST(@Qty AS NVARCHAR(10)) + '), current reserved is (' + CAST(@CurrentReserved AS NVARCHAR(10)) + ')';
      RAISERROR(@ErrRelease, 16, 1);
      ROLLBACK TRAN;
      RETURN;
    END;
    SET @NewReserved = @CurrentReserved - @Qty;
  END
  ELSE IF @TxnType = 'COMMIT'
  BEGIN
    IF @CurrentOnHand < @Qty OR @CurrentReserved < @Qty
    BEGIN
      RAISERROR('INSUFFICIENT_STOCK_OR_RESERVATION: Cannot commit transaction due to negative balance', 16, 1);
      ROLLBACK TRAN;
      RETURN;
    END;
    SET @NewOnHand = @CurrentOnHand - @Qty;
    SET @NewReserved = @CurrentReserved - @Qty;
  END;

  -- Update ledger with incremented version
  UPDATE dbo.InventoryLedgers
  SET 
    OnHandQty = @NewOnHand,
    ReservedQty = @NewReserved,
    VersionNo = VersionNo + 1,
    UpdatedAt = SYSUTCDATETIME()
  WHERE ProductId = @ProductId AND LedgerType = @LedgerType;

  -- Record the transaction
  INSERT INTO dbo.InventoryTransactions (ProductId, LedgerType, TxnType, Qty, RefType, RefId, Note, CreatedByEmail)
  VALUES (@ProductId, @LedgerType, @TxnType, @Qty, @RefType, @RefId, @Note, @CreatedByEmail);

  -- Return the new state
  SELECT 
    SCOPE_IDENTITY() AS TxnId,
    @ProductId AS ProductId,
    @LedgerType AS LedgerType,
    @TxnType AS TxnType,
    @Qty AS Qty,
    @NewOnHand AS NewOnHandQty,
    @NewReserved AS NewReservedQty;

  COMMIT TRAN;
END;
GO

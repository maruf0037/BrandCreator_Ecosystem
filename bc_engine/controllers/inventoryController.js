const { poolPromise, sql } = require('../config/db');

// POST /api/products
exports.createProduct = async (req, res) => {
  const { 
    supplierUserId, sku, productName, basePrice, supplierNotes,
    barcode, brand, category, rpuMrp, suggestedRetailPrice, costNote,
    variantsJson, supplierLocation, deliveryCoverageJson, onlineSellingRequested,
    productReadinessStatus, imageUrl
  } = req.body;

  if (!supplierUserId || !sku || !productName) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'supplierUserId, sku, and productName are required' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Insert product
      const productResult = await transaction.request()
        .input('supplierUserId', sql.Int, supplierUserId)
        .input('sku', sql.NVarChar(100), sku)
        .input('productName', sql.NVarChar(255), productName)
        .input('basePrice', sql.Decimal(18, 2), basePrice ? parseFloat(basePrice) : null)
        .input('supplierNotes', sql.NVarChar(1000), supplierNotes || null)
        .input('barcode', sql.NVarChar(100), barcode || null)
        .input('brand', sql.NVarChar(150), brand || null)
        .input('category', sql.NVarChar(150), category || null)
        .input('rpuMrp', sql.Decimal(18, 2), rpuMrp ? parseFloat(rpuMrp) : null)
        .input('suggestedRetailPrice', sql.Decimal(18, 2), suggestedRetailPrice ? parseFloat(suggestedRetailPrice) : null)
        .input('costNote', sql.NVarChar(500), costNote || null)
        .input('variantsJson', sql.NVarChar(sql.MAX), variantsJson || null)
        .input('supplierLocation', sql.NVarChar(255), supplierLocation || null)
        .input('deliveryCoverageJson', sql.NVarChar(sql.MAX), deliveryCoverageJson || null)
        .input('onlineSellingRequested', sql.Bit, onlineSellingRequested !== undefined ? (onlineSellingRequested ? 1 : 0) : 1)
        .input('productReadinessStatus', sql.NVarChar(50), productReadinessStatus || 'NEEDS_REVIEW')
        .query(`
          INSERT INTO dbo.Products (
            SupplierUserId, SKU, ProductName, BasePrice, SupplierNotes,
            Barcode, Brand, Category, RPU_MRP, SuggestedRetailPrice, CostNote,
            VariantsJson, SupplierLocation, DeliveryCoverageJson, OnlineSellingRequested,
            ProductReadinessStatus
          )
          OUTPUT 
            inserted.ProductId, inserted.SKU, inserted.ProductName, inserted.BasePrice, inserted.SupplierNotes,
            inserted.Barcode, inserted.Brand, inserted.Category, inserted.RPU_MRP, inserted.SuggestedRetailPrice,
            inserted.CostNote, inserted.VariantsJson, inserted.SupplierLocation, inserted.DeliveryCoverageJson,
            inserted.OnlineSellingRequested, inserted.ProductReadinessStatus
          VALUES (
            @supplierUserId, @sku, @productName, @basePrice, @supplierNotes,
            @barcode, @brand, @category, @rpuMrp, @suggestedRetailPrice, @costNote,
            @variantsJson, @supplierLocation, @deliveryCoverageJson, @onlineSellingRequested,
            @productReadinessStatus
          )
        `);

      const product = productResult.recordset[0];

      // 1b. Insert image if provided
      if (imageUrl && imageUrl.trim() !== '') {
        await transaction.request()
          .input('productId', sql.Int, product.ProductId)
          .input('imageUrl', sql.NVarChar(500), imageUrl.trim())
          .query(`
            INSERT INTO dbo.ProductImages (ProductId, ImageUrl, IsPrimary, AltText)
            VALUES (@productId, @imageUrl, 1, 'Primary Image')
          `);
      }

      // 2. Initialize ledgers (MASTER and SELL)
      await transaction.request()
        .input('productId', sql.Int, product.ProductId)
        .query(`
          INSERT INTO dbo.InventoryLedgers (ProductId, LedgerType, OnHandQty, ReservedQty, VersionNo)
          VALUES 
            (@productId, 'MASTER', 0, 0, 1),
            (@productId, 'SELL', 0, 0, 1)
        `);

      // 3. Auto-assign ownership if supplierEmail is available
      const supplierEmail = req.user?.email || req.body.supplierEmail;
      if (supplierEmail) {
        await transaction.request()
          .input('productId', sql.Int, product.ProductId)
          .input('email', sql.NVarChar(255), supplierEmail)
          .query(`
            INSERT INTO dbo.ProductOwnership (ProductId, SupplierEmail, IsActive)
            VALUES (@productId, @email, 1)
          `);
      }

      await transaction.commit();

      res.status(201).json({
        productId: product.ProductId,
        sku: product.SKU,
        productName: product.ProductName,
        basePrice: product.BasePrice,
        supplierNotes: product.SupplierNotes,
        barcode: product.Barcode,
        brand: product.Brand,
        category: product.Category,
        rpuMrp: product.RPU_MRP,
        suggestedRetailPrice: product.SuggestedRetailPrice,
        costNote: product.CostNote,
        variantsJson: product.VariantsJson,
        supplierLocation: product.SupplierLocation,
        deliveryCoverageJson: product.DeliveryCoverageJson,
        onlineSellingRequested: product.OnlineSellingRequested === 1 || product.OnlineSellingRequested === true,
        productReadinessStatus: product.ProductReadinessStatus,
        imageUrl: imageUrl || null,
        ledgers: [
          { ledgerType: 'MASTER', onHandQty: 0, reservedQty: 0 },
          { ledgerType: 'SELL', onHandQty: 0, reservedQty: 0 }
        ]
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    if (err.message.includes('UNIQUE KEY') || err.message.includes('UQ_') || err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'DUPLICATE_SKU', message: 'Product SKU already exists' });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/products/:productId/ledgers
exports.getProductLedgers = async (req, res) => {
  const { productId } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('productId', sql.Int, productId)
      .query('SELECT * FROM dbo.InventoryLedgers WHERE ProductId = @productId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found or ledgers not initialized' });
    }

    const masterLedger = result.recordset.find(l => l.LedgerType === 'MASTER') || { OnHandQty: 0, ReservedQty: 0 };
    const sellLedger = result.recordset.find(l => l.LedgerType === 'SELL') || { OnHandQty: 0, ReservedQty: 0 };

    res.json({
      productId: parseInt(productId),
      master: {
        onHandQty: masterLedger.OnHandQty,
        reservedQty: masterLedger.ReservedQty,
        availableQty: masterLedger.OnHandQty - masterLedger.ReservedQty
      },
      sell: {
        onHandQty: sellLedger.OnHandQty,
        reservedQty: sellLedger.ReservedQty,
        availableQty: sellLedger.OnHandQty - sellLedger.ReservedQty
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/inventory/transactions
exports.applyTransaction = async (req, res) => {
  const { productId, ledgerType, txnType, qty, refType, refId, note } = req.body;
  const createdByEmail = req.user?.email || 'unknown@brandcreator.com';

  if (!productId || !ledgerType || !txnType || !qty) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'productId, ledgerType, txnType, and qty are required' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ProductId', sql.Int, productId)
      .input('LedgerType', sql.NVarChar(20), ledgerType)
      .input('TxnType', sql.NVarChar(30), txnType)
      .input('Qty', sql.Int, qty)
      .input('RefType', sql.NVarChar(50), refType || null)
      .input('RefId', sql.NVarChar(100), refId || null)
      .input('Note', sql.NVarChar(500), note || null)
      .input('CreatedByEmail', sql.NVarChar(255), createdByEmail)
      .execute('dbo.sp_InventoryApplyTransaction');

    const txn = result.recordset[0];
    res.json({
      txnId: parseInt(txn.TxnId),
      productId: txn.ProductId,
      ledgerType: txn.LedgerType,
      txnType: txn.TxnType,
      qty: txn.Qty,
      newOnHandQty: txn.NewOnHandQty,
      newReservedQty: txn.NewReservedQty
    });
  } catch (err) {
    if (err.message.includes('INSUFFICIENT_STOCK') || err.message.includes('INSUFFICIENT_RESERVATION')) {
      // Parse available vs requested qty if possible
      const availableMatch = err.message.match(/available.*?\((-?\d+)\)/);
      const availableQty = availableMatch ? parseInt(availableMatch[1]) : 0;
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: 'Requested qty exceeds available balance',
        details: {
          availableQty: Math.max(0, availableQty),
          requestedQty: qty
        }
      });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/inventory/transfers
exports.createTransfer = async (req, res) => {
  const { productId, qty, note } = req.body;
  const requestedByEmail = req.user?.email || 'unknown@brandcreator.com';

  if (!productId || !qty) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'productId and qty are required' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Check current unreserved MASTER balance
      const ledgerResult = await transaction.request()
        .input('productId', sql.Int, productId)
        .query("SELECT OnHandQty, ReservedQty FROM dbo.InventoryLedgers WHERE ProductId = @productId AND LedgerType = 'MASTER'");

      if (ledgerResult.recordset.length === 0) {
        throw new Error('PRODUCT_NOT_FOUND: Product ledger not initialized');
      }

      const { OnHandQty, ReservedQty } = ledgerResult.recordset[0];
      const available = OnHandQty - ReservedQty;

      if (available < qty) {
        return res.status(400).json({
          error: 'INSUFFICIENT_STOCK',
          message: 'Requested qty exceeds available balance',
          details: { availableQty: available, requestedQty: qty }
        });
      }

      // 2. Insert Transfer Request
      const transferResult = await transaction.request()
        .input('productId', sql.Int, productId)
        .input('qty', sql.Int, qty)
        .input('requestedByEmail', sql.NVarChar(255), requestedByEmail)
        .input('note', sql.NVarChar(500), note || null)
        .query(`
          INSERT INTO dbo.TransferRequests (ProductId, Qty, Status, RequestedByEmail, Note)
          OUTPUT inserted.TransferId, inserted.Status, inserted.ProductId, inserted.Qty
          VALUES (@productId, @qty, 'PENDING', @requestedByEmail, @note)
        `);

      const transfer = transferResult.recordset[0];

      // 3. RESERVE the quantity in the MASTER ledger via Stored Procedure
      await transaction.request()
        .input('ProductId', sql.Int, productId)
        .input('LedgerType', sql.NVarChar(20), 'MASTER')
        .input('TxnType', sql.NVarChar(30), 'RESERVE')
        .input('Qty', sql.Int, qty)
        .input('RefType', sql.NVarChar(50), 'TRANSFER')
        .input('RefId', sql.NVarChar(100), transfer.TransferId.toString())
        .input('Note', sql.NVarChar(500), 'Reserve for transfer request #' + transfer.TransferId)
        .input('CreatedByEmail', sql.NVarChar(255), requestedByEmail)
        .execute('dbo.sp_InventoryApplyTransaction');

      await transaction.commit();

      res.status(201).json({
        transferId: parseInt(transfer.TransferId),
        status: transfer.Status,
        productId: transfer.ProductId,
        qty: transfer.Qty
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/inventory/transfers/:id/approve
exports.approveTransfer = async (req, res) => {
  const { id } = req.params;
  const approvedByEmail = req.user?.email || 'admin@brandcreator.com';

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Get Transfer Request details
      const transferResult = await transaction.request()
        .input('id', sql.BigInt, id)
        .query('SELECT * FROM dbo.TransferRequests WHERE TransferId = @id');

      if (transferResult.recordset.length === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Transfer request not found' });
      }

      const transfer = transferResult.recordset[0];

      if (transfer.Status !== 'PENDING') {
        return res.status(400).json({ error: 'INVALID_STATUS', message: `Transfer request is already ${transfer.Status}` });
      }

      // 2. Commit the reservation on MASTER (subtract from OnHand and Reserved)
      await transaction.request()
        .input('ProductId', sql.Int, transfer.ProductId)
        .input('LedgerType', sql.NVarChar(20), 'MASTER')
        .input('TxnType', sql.NVarChar(30), 'COMMIT')
        .input('Qty', sql.Int, transfer.Qty)
        .input('RefType', sql.NVarChar(50), 'TRANSFER_APPROVE')
        .input('RefId', sql.NVarChar(100), id.toString())
        .input('Note', sql.NVarChar(500), 'Commit transfer stock')
        .input('CreatedByEmail', sql.NVarChar(255), approvedByEmail)
        .execute('dbo.sp_InventoryApplyTransaction');

      // 3. Receive the stock in SELL (add to OnHand)
      await transaction.request()
        .input('ProductId', sql.Int, transfer.ProductId)
        .input('LedgerType', sql.NVarChar(20), 'SELL')
        .input('TxnType', sql.NVarChar(30), 'IN')
        .input('Qty', sql.Int, transfer.Qty)
        .input('RefType', sql.NVarChar(50), 'TRANSFER_APPROVE')
        .input('RefId', sql.NVarChar(100), id.toString())
        .input('Note', sql.NVarChar(500), 'Receive transfer stock')
        .input('CreatedByEmail', sql.NVarChar(255), approvedByEmail)
        .execute('dbo.sp_InventoryApplyTransaction');

      // 4. Update the Transfer Request status
      await transaction.request()
        .input('id', sql.BigInt, id)
        .input('approvedByEmail', sql.NVarChar(255), approvedByEmail)
        .query(`
          UPDATE dbo.TransferRequests
          SET Status = 'COMPLETED', ApprovedByEmail = @approvedByEmail, ApprovedAt = SYSUTCDATETIME()
          WHERE TransferId = @id
        `);

      // 5. Get updated ledger status for output
      const ledgersResult = await transaction.request()
        .input('productId', sql.Int, transfer.ProductId)
        .query('SELECT LedgerType, OnHandQty, ReservedQty FROM dbo.InventoryLedgers WHERE ProductId = @productId');

      await transaction.commit();

      const masterLedger = ledgersResult.recordset.find(l => l.LedgerType === 'MASTER') || { OnHandQty: 0, ReservedQty: 0 };
      const sellLedger = ledgersResult.recordset.find(l => l.LedgerType === 'SELL') || { OnHandQty: 0, ReservedQty: 0 };

      res.json({
        transferId: parseInt(id),
        status: 'COMPLETED',
        productId: transfer.ProductId,
        movedQty: transfer.Qty,
        master: { onHandQty: masterLedger.OnHandQty, reservedQty: masterLedger.ReservedQty },
        sell: { onHandQty: sellLedger.OnHandQty, reservedQty: sellLedger.ReservedQty }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/inventory/transactions
exports.getTransactions = async (req, res) => {
  const productId = req.query.productId ? parseInt(req.query.productId) : null;
  const ledgerType = req.query.ledgerType || null;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 20;
  const offset = (page - 1) * limit;

  try {
    const pool = await poolPromise;
    let query = 'FROM dbo.InventoryTransactions WHERE 1=1';

    if (productId) {
      query += ' AND ProductId = @productId';
    }
    if (ledgerType) {
      query += ' AND LedgerType = @ledgerType';
    }

    // Count query
    const countRequest = pool.request();
    if (productId) countRequest.input('productId', sql.Int, productId);
    if (ledgerType) countRequest.input('ledgerType', sql.NVarChar(20), ledgerType);
    
    const countResult = await countRequest.query(`SELECT COUNT(*) AS total ${query}`);
    const total = countResult.recordset[0].total;

    // Items query
    const itemsRequest = pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset);
    if (productId) itemsRequest.input('productId', sql.Int, productId);
    if (ledgerType) itemsRequest.input('ledgerType', sql.NVarChar(20), ledgerType);

    const itemsResult = await itemsRequest.query(`
      SELECT TxnId AS txnId, ProductId AS productId, LedgerType AS ledgerType, TxnType AS txnType, 
             Qty AS qty, RefType AS refType, RefId AS refId, Note AS note, 
             CreatedByEmail AS createdByEmail, CreatedAt AS createdAt
      ${query}
      ORDER BY TxnId DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      items: itemsResult.recordset,
      pagination: { page, limit, total }
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/inventory/reconcile/:productId
exports.reconcileProduct = async (req, res) => {
  const { productId } = req.params;

  try {
    const pool = await poolPromise;

    // 1. Get ledger records
    const ledgerResult = await pool.request()
      .input('productId', sql.Int, productId)
      .query('SELECT LedgerType, OnHandQty FROM dbo.InventoryLedgers WHERE ProductId = @productId');

    if (ledgerResult.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ledger records not found for this product' });
    }

    // 2. Get transactional aggregates
    // OnHand derived formula: SUM(IN) - SUM(OUT) - SUM(COMMIT)
    const txnResult = await pool.request()
      .input('productId', sql.Int, productId)
      .query(`
        SELECT 
          LedgerType,
          SUM(CASE WHEN TxnType = 'IN' THEN Qty ELSE 0 END) AS TotalIn,
          SUM(CASE WHEN TxnType IN ('OUT', 'COMMIT') THEN Qty ELSE 0 END) AS TotalOut
        FROM dbo.InventoryTransactions
        WHERE ProductId = @productId
        GROUP BY LedgerType
      `);

    const checks = ['MASTER', 'SELL'].map(type => {
      const ledger = ledgerResult.recordset.find(l => l.LedgerType === type) || { OnHandQty: 0 };
      const txns = txnResult.recordset.find(t => t.LedgerType === type) || { TotalIn: 0, TotalOut: 0 };
      
      const ledgerOnHand = ledger.OnHandQty;
      const derivedOnHand = txns.TotalIn - txns.TotalOut;
      const diff = ledgerOnHand - derivedOnHand;

      return {
        ledgerType: type,
        ledgerOnHand,
        derivedOnHand,
        diff
      };
    });

    const ok = checks.every(c => c.diff === 0);

    res.json({
      productId: parseInt(productId),
      ok,
      checks
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/products
exports.getProducts = async (req, res) => {
  const userEmail = req.user?.email || 'customer@test.com';
  const userRole = req.user?.role || 'Customer';
 
  try {
    const pool = await poolPromise;
 
    if (userRole === 'SuperAdmin' || userRole === 'Admin') {
      const result = await pool.request()
        .query(`
          SELECT p.ProductId AS productId, p.SKU AS sku, p.ProductName AS productName, 
                 p.Status AS status, p.QCStatus AS qcStatus, p.QCReason AS qcReason,
                 p.EnrichmentJson AS enrichmentJson, p.LastEnrichedAt AS lastEnrichedAt, p.CreatedAt AS createdAt,
                 p.BasePrice AS basePrice, p.SupplierNotes AS supplierNotes,
                 p.Barcode AS barcode, p.Brand AS brand, p.Category AS category,
                 p.RPU_MRP AS rpuMrp, p.SuggestedRetailPrice AS suggestedRetailPrice,
                 p.CostNote AS costNote, p.VariantsJson AS variantsJson,
                 p.SupplierLocation AS supplierLocation, p.DeliveryCoverageJson AS deliveryCoverageJson,
                 p.OnlineSellingRequested AS onlineSellingRequested, p.ProductReadinessStatus AS productReadinessStatus,
                 pi.ImageUrl AS imageUrl,
                 COALESCE(lm.OnHandQty, 0) AS masterOnHand, COALESCE(lm.ReservedQty, 0) AS masterReserved,
                 COALESCE(ls.OnHandQty, 0) AS sellOnHand, COALESCE(ls.ReservedQty, 0) AS sellReserved,
                 (
                   SELECT STRING_AGG(o.SupplierEmail, ', ') 
                   FROM dbo.ProductOwnership o 
                   WHERE o.ProductId = p.ProductId AND o.IsActive = 1
                 ) AS owners
          FROM dbo.Products p
          LEFT JOIN dbo.ProductImages pi ON p.ProductId = pi.ProductId AND pi.IsPrimary = 1
          LEFT JOIN dbo.InventoryLedgers lm ON p.ProductId = lm.ProductId AND lm.LedgerType = 'MASTER'
          LEFT JOIN dbo.InventoryLedgers ls ON p.ProductId = ls.ProductId AND ls.LedgerType = 'SELL'
          ORDER BY p.ProductId DESC
        `);
 
      const items = result.recordset.map(row => {
        let enrichment = null;
        if (row.enrichmentJson) {
          try { enrichment = JSON.parse(row.enrichmentJson); } catch (e) {}
        }
        return {
          ...row,
          enrichmentJson: undefined,
          enrichment,
          onlineSellingRequested: row.onlineSellingRequested === 1 || row.onlineSellingRequested === true
        };
      });
 
      return res.json({ items });
    } 
    else if (userRole === 'Supplier') {
      const result = await pool.request()
        .input('email', sql.NVarChar(255), userEmail)
        .query(`
          SELECT p.ProductId AS productId, p.SKU AS sku, p.ProductName AS productName, 
                 p.Status AS status, p.QCStatus AS qcStatus, p.QCReason AS qcReason,
                 p.EnrichmentJson AS enrichmentJson, p.LastEnrichedAt AS lastEnrichedAt, p.CreatedAt AS createdAt,
                 p.BasePrice AS basePrice, p.SupplierNotes AS supplierNotes,
                 p.Barcode AS barcode, p.Brand AS brand, p.Category AS category,
                 p.RPU_MRP AS rpuMrp, p.SuggestedRetailPrice AS suggestedRetailPrice,
                 p.CostNote AS costNote, p.VariantsJson AS variantsJson,
                 p.SupplierLocation AS supplierLocation, p.DeliveryCoverageJson AS deliveryCoverageJson,
                 p.OnlineSellingRequested AS onlineSellingRequested, p.ProductReadinessStatus AS productReadinessStatus,
                 pi.ImageUrl AS imageUrl,
                 COALESCE(lm.OnHandQty, 0) AS masterOnHand, COALESCE(lm.ReservedQty, 0) AS masterReserved,
                 COALESCE(ls.OnHandQty, 0) AS sellOnHand, COALESCE(ls.ReservedQty, 0) AS sellReserved
          FROM dbo.Products p
          INNER JOIN dbo.ProductOwnership o ON p.ProductId = o.ProductId
          LEFT JOIN dbo.ProductImages pi ON p.ProductId = pi.ProductId AND pi.IsPrimary = 1
          LEFT JOIN dbo.InventoryLedgers lm ON p.ProductId = lm.ProductId AND lm.LedgerType = 'MASTER'
          LEFT JOIN dbo.InventoryLedgers ls ON p.ProductId = ls.ProductId AND ls.LedgerType = 'SELL'
          WHERE o.SupplierEmail = @email AND o.IsActive = 1
          ORDER BY p.ProductId DESC
        `);
 
      const items = result.recordset.map(row => {
        let enrichment = null;
        if (row.enrichmentJson) {
          try { enrichment = JSON.parse(row.enrichmentJson); } catch (e) {}
        }
        return {
          ...row,
          enrichmentJson: undefined,
          enrichment,
          onlineSellingRequested: row.onlineSellingRequested === 1 || row.onlineSellingRequested === true
        };
      });
 
      return res.json({ items });
    } 
    else {
      // Customer view
      const result = await pool.request()
        .query(`
          SELECT p.ProductId AS productId, p.SKU AS sku, p.ProductName AS productName, 
                 p.Status AS status, p.QCStatus AS qcStatus, p.QCReason AS qcReason,
                 p.EnrichmentJson AS enrichmentJson, p.LastEnrichedAt AS lastEnrichedAt,
                 p.BasePrice AS basePrice, p.SupplierNotes AS supplierNotes,
                 p.Barcode AS barcode, p.Brand AS brand, p.Category AS category,
                 p.RPU_MRP AS rpuMrp, p.SuggestedRetailPrice AS suggestedRetailPrice,
                 p.VariantsJson AS variantsJson, p.SupplierLocation AS supplierLocation,
                 pi.ImageUrl AS imageUrl,
                 COALESCE(ls.OnHandQty, 0) AS sellOnHand, COALESCE(ls.ReservedQty, 0) AS sellReserved
          FROM dbo.Products p
          LEFT JOIN dbo.ProductImages pi ON p.ProductId = pi.ProductId AND pi.IsPrimary = 1
          LEFT JOIN dbo.InventoryLedgers ls ON p.ProductId = ls.ProductId AND ls.LedgerType = 'SELL'
          WHERE p.Status = 'ACTIVE' AND p.QCStatus = 'APPROVED'
          ORDER BY p.ProductId DESC
        `);
 
      const items = result.recordset.map(row => {
        let enrichment = null;
        if (row.enrichmentJson) {
          try { enrichment = JSON.parse(row.enrichmentJson); } catch (e) {}
        }
        return {
          ...row,
          enrichmentJson: undefined,
          enrichment
        };
      });
 
      return res.json({ items });
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};
 
// GET /api/inventory/transfers
exports.getTransfers = async (req, res) => {
  const userEmail = req.user?.email || 'supplier@test.com';
  const userRole = req.user?.role || 'Supplier';
 
  try {
    const pool = await poolPromise;
    let query = `
      SELECT t.TransferId AS transferId, t.ProductId AS productId, t.Qty AS qty, 
             t.Status AS status, t.RequestedByEmail AS requestedByEmail, 
             t.ApprovedByEmail AS approvedByEmail, t.RequestedAt AS requestedAt, 
             t.ApprovedAt AS approvedAt, t.Note AS note,
             p.ProductName AS productName, p.SKU AS sku
      FROM dbo.TransferRequests t
      INNER JOIN dbo.Products p ON t.ProductId = p.ProductId
    `;
 
    const requestObj = pool.request();
 
    if (userRole === 'Supplier') {
      query += ` WHERE t.RequestedByEmail = @email`;
      requestObj.input('email', sql.NVarChar(255), userEmail);
    }
 
    query += ` ORDER BY t.TransferId DESC`;
 
    const result = await requestObj.query(query);
    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

const { poolPromise, sql } = require('../config/db');

// POST /api/products
exports.createProduct = async (req, res) => {
  const { 
    supplierUserId, sku, productName, basePrice, supplierNotes,
    barcode, brand, category, rpuMrp, suggestedRetailPrice, costNote,
    variantsJson, supplierLocation, deliveryCoverageJson, onlineSellingRequested,
    productReadinessStatus, imageUrl, ownershipType
  } = req.body;

  // OWN products are created by Admin and auto-approved (skip QC)
  const ownership = (ownershipType === 'OWN') ? 'OWN' : 'SUPPLIER';

  if (!supplierUserId || !sku || !productName) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'supplierUserId, sku, and productName are required' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Insert product — OWN products auto-approve and skip QC
      const isOwn = ownership === 'OWN';
      const effectiveStatus = isOwn ? 'ACTIVE' : 'PENDING';
      const effectiveQCStatus = isOwn ? 'APPROVED' : null;
      const effectiveReadiness = isOwn ? 'CAMPAIGN_READY' : (productReadinessStatus || 'NEEDS_REVIEW');

      const productResult = await transaction.request()
        .input('supplierUserId', sql.Int, supplierUserId || 0)
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
        .input('productReadinessStatus', sql.NVarChar(50), effectiveReadiness)
        .input('ownershipType', sql.NVarChar(20), ownership)
        .query(`
          INSERT INTO dbo.Products (
            SupplierUserId, SKU, ProductName, BasePrice, SupplierNotes,
            Barcode, Brand, Category, RPU_MRP, SuggestedRetailPrice, CostNote,
            VariantsJson, SupplierLocation, DeliveryCoverageJson, OnlineSellingRequested,
            ProductReadinessStatus, OwnershipType
            ${isOwn ? ', Status, QCStatus' : ''}
          )
          OUTPUT 
            inserted.ProductId, inserted.SKU, inserted.ProductName, inserted.BasePrice, inserted.SupplierNotes,
            inserted.Barcode, inserted.Brand, inserted.Category, inserted.RPU_MRP, inserted.SuggestedRetailPrice,
            inserted.CostNote, inserted.VariantsJson, inserted.SupplierLocation, inserted.DeliveryCoverageJson,
            inserted.OnlineSellingRequested, inserted.ProductReadinessStatus, inserted.OwnershipType
          VALUES (
            @supplierUserId, @sku, @productName, @basePrice, @supplierNotes,
            @barcode, @brand, @category, @rpuMrp, @suggestedRetailPrice, @costNote,
            @variantsJson, @supplierLocation, @deliveryCoverageJson, @onlineSellingRequested,
            @productReadinessStatus, @ownershipType
            ${isOwn ? ", 'ACTIVE', 'APPROVED'" : ''}
          )
        `);

      const product = productResult.recordset[0];

      // 1b. Insert multiple images if provided, fallback to single imageUrl
      if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
        for (const img of req.body.images) {
          await transaction.request()
            .input('productId', sql.Int, product.ProductId)
            .input('imageUrl', sql.NVarChar(500), img.imageUrl.trim())
            .input('isPrimary', sql.Bit, img.isPrimary ? 1 : 0)
            .input('altText', sql.NVarChar(255), (img.altText || '').trim() || 'Product Image')
            .query(`
              INSERT INTO dbo.ProductImages (ProductId, ImageUrl, IsPrimary, AltText)
              VALUES (@productId, @imageUrl, @isPrimary, @altText)
            `);
        }
      } else if (imageUrl && imageUrl.trim() !== '') {
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

      // 3. Auto-assign ownership if supplierEmail is available (skip for OWN products)
      if (!isOwn) {
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
        ownershipType: product.OwnershipType || ownership,
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

      // 3. (NO-OP/DEPRECATED in shared stock mode) Reserve is no longer needed on MASTER
      // keeping the TransferRequest log for system tracking/compatibility.
      
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

      // 2. Check MASTER ledger has sufficient available stock
      const masterLedgerCheck = await transaction.request()
        .input('productId', sql.Int, transfer.ProductId)
        .query("SELECT OnHandQty, ReservedQty FROM dbo.InventoryLedgers WHERE ProductId = @productId AND LedgerType = 'MASTER'");

      const masterLedgerData = masterLedgerCheck.recordset[0];
      const masterAvailable = masterLedgerData.OnHandQty - masterLedgerData.ReservedQty;

      if (masterAvailable < transfer.Qty) {
        return res.status(400).json({
          error: 'INSUFFICIENT_STOCK',
          message: 'MASTER ledger has insufficient stock for transfer',
          details: { availableQty: masterAvailable, requestedQty: transfer.Qty }
        });
      }

      // 3. Debit from MASTER ledger (OUT transaction)
      await transaction.request()
        .input('ProductId', sql.Int, transfer.ProductId)
        .input('LedgerType', sql.NVarChar(20), 'MASTER')
        .input('TxnType', sql.NVarChar(30), 'OUT')
        .input('Qty', sql.Int, transfer.Qty)
        .input('RefType', sql.NVarChar(50), 'TRANSFER')
        .input('RefId', sql.NVarChar(100), `TRANSFER_${id}`)
        .input('Note', sql.NVarChar(500), `Transfer to SELL (TransferId: ${id})`)
        .input('CreatedByEmail', sql.NVarChar(255), approvedByEmail)
        .execute('dbo.sp_InventoryApplyTransaction');

      // 4. Credit to SELL ledger (IN transaction)
      await transaction.request()
        .input('ProductId', sql.Int, transfer.ProductId)
        .input('LedgerType', sql.NVarChar(20), 'SELL')
        .input('TxnType', sql.NVarChar(30), 'IN')
        .input('Qty', sql.Int, transfer.Qty)
        .input('RefType', sql.NVarChar(50), 'TRANSFER')
        .input('RefId', sql.NVarChar(100), `TRANSFER_${id}`)
        .input('Note', sql.NVarChar(500), `Transfer from MASTER (TransferId: ${id})`)
        .input('CreatedByEmail', sql.NVarChar(255), approvedByEmail)
        .execute('dbo.sp_InventoryApplyTransaction');

      // 5. Update the Transfer Request status
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

    // Fetch all product images to group them by ProductId in memory
    const imagesResult = await pool.request().query("SELECT * FROM dbo.ProductImages ORDER BY IsPrimary DESC, ImageId ASC");
    const imagesByProduct = new Map();
    imagesResult.recordset.forEach(img => {
      const pid = img.ProductId;
      if (!imagesByProduct.has(pid)) {
        imagesByProduct.set(pid, []);
      }
      imagesByProduct.get(pid).push({
        imageId: img.ImageId,
        imageUrl: img.ImageUrl,
        isPrimary: img.IsPrimary === 1 || img.IsPrimary === true,
        altText: img.AltText
      });
    });
 
    if (userRole === 'SuperAdmin' || userRole === 'Admin') {
      // Build ownership filter if provided
      const ownershipFilter = req.query.ownershipType;
      let adminWhereClause = '';
      const adminReq = pool.request();
      if (ownershipFilter && ['OWN', 'SUPPLIER'].includes(ownershipFilter)) {
        adminWhereClause = 'WHERE p.OwnershipType = @ownershipFilter';
        adminReq.input('ownershipFilter', sql.NVarChar(20), ownershipFilter);
      }

      const result = await adminReq
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
                 p.OwnershipType AS ownershipType, p.CommissionRate AS commissionRate,
                 pi.ImageUrl AS imageUrl,
                 COALESCE(lm.OnHandQty, 0) AS masterOnHand, COALESCE(lm.ReservedQty, 0) AS masterReserved,
                 COALESCE(ls.OnHandQty, 0) AS sellOnHand, COALESCE(ls.ReservedQty, 0) AS sellReserved,
                 ap.AdminSellingPrice AS adminSellingPrice,
                 ap.AdBudgetPlanned AS adBudgetPlanned,
                 ap.PlatformCommission AS platformCommission,
                 ap.DeliveryOpsCost AS deliveryOpsCost,
                 ap.DiscountAmount AS discountAmount,
                 (
                   SELECT STRING_AGG(o.SupplierEmail, ', ') 
                   FROM dbo.ProductOwnership o 
                   WHERE o.ProductId = p.ProductId AND o.IsActive = 1
                 ) AS owners
          FROM dbo.Products p
          LEFT JOIN dbo.ProductImages pi ON p.ProductId = pi.ProductId AND pi.IsPrimary = 1
          LEFT JOIN dbo.InventoryLedgers lm ON p.ProductId = lm.ProductId AND lm.LedgerType = 'MASTER'
          LEFT JOIN dbo.InventoryLedgers ls ON p.ProductId = ls.ProductId AND ls.LedgerType = 'SELL'
          LEFT JOIN dbo.AdminPricingPlans ap ON p.ProductId = ap.ProductId AND ap.Status = 'ACTIVE'
          ${adminWhereClause}
          ORDER BY p.ProductId DESC
        `);
 
      const items = result.recordset.map(row => {
        let enrichment = null;
        if (row.enrichmentJson) {
          try { enrichment = JSON.parse(row.enrichmentJson); } catch (e) {}
        }
        const prodImages = imagesByProduct.get(row.productId) || [];
        const primaryImage = prodImages.find(img => img.isPrimary) || prodImages[0] || null;

        return {
          ...row,
          enrichmentJson: undefined,
          enrichment,
          onlineSellingRequested: row.onlineSellingRequested === 1 || row.onlineSellingRequested === true,
          images: prodImages,
          imageUrl: primaryImage ? primaryImage.imageUrl : row.imageUrl
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
                 p.OwnershipType AS ownershipType,
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
        const prodImages = imagesByProduct.get(row.productId) || [];
        const primaryImage = prodImages.find(img => img.isPrimary) || prodImages[0] || null;

        return {
          ...row,
          enrichmentJson: undefined,
          enrichment,
          onlineSellingRequested: row.onlineSellingRequested === 1 || row.onlineSellingRequested === true,
          images: prodImages,
          imageUrl: primaryImage ? primaryImage.imageUrl : row.imageUrl
        };
      });
 
      return res.json({ items });
    } 
    else {
      // Customer view (prioritize adminSellingPrice once configured)
      const result = await pool.request()
        .query(`
          SELECT p.ProductId AS productId, p.SKU AS sku, p.ProductName AS productName, 
                 p.Status AS status, p.QCStatus AS qcStatus, p.QCReason AS qcReason,
                 p.EnrichmentJson AS enrichmentJson, p.LastEnrichedAt AS lastEnrichedAt,
                 COALESCE(ap.AdminSellingPrice, p.BasePrice) AS basePrice, p.SupplierNotes AS supplierNotes,
                 p.Barcode AS barcode, p.Brand AS brand, p.Category AS category,
                 p.RPU_MRP AS rpuMrp, p.SuggestedRetailPrice AS suggestedRetailPrice,
                 p.VariantsJson AS variantsJson, p.SupplierLocation AS supplierLocation,
                 p.OwnershipType AS ownershipType,
                 pi.ImageUrl AS imageUrl,
                 COALESCE(ls.OnHandQty, 0) AS sellOnHand, COALESCE(ls.ReservedQty, 0) AS sellReserved,
                 ap.AdminSellingPrice AS adminSellingPrice
          FROM dbo.Products p
          LEFT JOIN dbo.ProductImages pi ON p.ProductId = pi.ProductId AND pi.IsPrimary = 1
          LEFT JOIN dbo.InventoryLedgers ls ON p.ProductId = ls.ProductId AND ls.LedgerType = 'SELL'
          LEFT JOIN dbo.AdminPricingPlans ap ON p.ProductId = ap.ProductId AND ap.Status = 'ACTIVE'
          WHERE p.Status = 'ACTIVE' AND p.QCStatus = 'APPROVED'
          ORDER BY p.ProductId DESC
        `);
 
      const items = result.recordset.map(row => {
        let enrichment = null;
        if (row.enrichmentJson) {
          try { enrichment = JSON.parse(row.enrichmentJson); } catch (e) {}
        }
        const prodImages = imagesByProduct.get(row.productId) || [];
        const primaryImage = prodImages.find(img => img.isPrimary) || prodImages[0] || null;

        return {
          ...row,
          enrichmentJson: undefined,
          enrichment,
          images: prodImages,
          imageUrl: primaryImage ? primaryImage.imageUrl : row.imageUrl
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
 
// PUT /api/products/:productId/images
exports.updateProductImages = async (req, res) => {
  const { productId } = req.params;
  const { images } = req.body;
  const userEmail = req.user?.email || '';
  const userRole = req.user?.role || 'Supplier';
 
  if (!images || !Array.isArray(images)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'images array is required' });
  }
 
  try {
    const pool = await poolPromise;
    const parsedProductId = parseInt(productId, 10);
 
    // Verify product exists
    const prodCheck = await pool.request()
      .input('productId', sql.Int, parsedProductId)
      .query('SELECT ProductId FROM dbo.Products WHERE ProductId = @productId');
 
    if (prodCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }
 
    // Check ownership for Suppliers
    if (userRole === 'Supplier') {
      const ownerCheck = await pool.request()
        .input('productId', sql.Int, parsedProductId)
        .input('email', sql.NVarChar(255), userEmail)
        .query("SELECT TOP 1 1 FROM dbo.ProductOwnership WHERE ProductId = @productId AND SupplierEmail = @email AND IsActive = 1");
 
      if (ownerCheck.recordset.length === 0) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Supplier does not own this product' });
      }
    }
 
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
 
    try {
      // 1. Delete all existing images
      await transaction.request()
        .input('productId', sql.Int, parsedProductId)
        .query('DELETE FROM dbo.ProductImages WHERE ProductId = @productId');
 
      // 2. Insert new images
      for (const img of images) {
        if (!img.imageUrl || img.imageUrl.trim() === '') continue;
        
        await transaction.request()
          .input('productId', sql.Int, parsedProductId)
          .input('imageUrl', sql.NVarChar(500), img.imageUrl.trim())
          .input('isPrimary', sql.Bit, img.isPrimary ? 1 : 0)
          .input('altText', sql.NVarChar(255), (img.altText || '').trim() || 'Product Image')
          .query(`
            INSERT INTO dbo.ProductImages (ProductId, ImageUrl, IsPrimary, AltText)
            VALUES (@productId, @imageUrl, @isPrimary, @altText)
          `);
      }
 
      await transaction.commit();
      res.json({ success: true, message: 'Product images updated successfully' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// GET /api/catalog/fb-feed
// ==========================================
exports.getFacebookCatalogFeed = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        p.ProductId AS productId,
        p.ProductName AS productName,
        p.SKU AS sku,
        p.BasePrice AS basePrice,
        p.SuggestedRetailPrice AS srp,
        p.Brand AS brand,
        p.Category AS category,
        p.OwnershipType AS ownershipType,
        p.FabricMaterial AS material,
        p.FabricTexture AS texture,
        p.FabricWidth AS width,
        p.ThreadCount AS threadCount,
        p.WeavingType AS weavingType,
        p.SupplierNotes AS notes,
        (
          SELECT TOP 1 ImageUrl FROM dbo.ProductImages 
          WHERE ProductId = p.ProductId 
          ORDER BY IsPrimary DESC, ImageId ASC
        ) AS imageUrl,
        COALESCE(
          (SELECT SUM(OnHandQty - ReservedQty) FROM dbo.InventoryLedgers WHERE ProductId = p.ProductId AND LedgerType = 'MASTER'), 0
        ) AS availableQty
      FROM dbo.Products p
      WHERE p.Status = 'ACTIVE' AND p.QCStatus = 'APPROVED'
    `);

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.secure ? 'https' : 'http';
    const storefrontUrl = process.env.STOREFRONT_URL || 'http://localhost:8080';

    // Escape XML characters
    const escapeXml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    let xml = '<?xml version="1.0"?>\n';
    xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n';
    xml += '  <channel>\n';
    xml += '    <title>BrandCreator Product Catalog</title>\n';
    xml += '    <link>' + escapeXml(storefrontUrl) + '</link>\n';
    xml += '    <description>Dynamic Facebook Product Feed for BrandCreator Ecosystem (Fabrics &amp; Boutique Catalog)</description>\n';

    for (const p of result.recordset) {
      const price = p.srp ? parseFloat(p.srp) : (p.basePrice ? parseFloat(p.basePrice) * 1.15 : 1000);
      const formattedPrice = price.toFixed(2) + ' BDT';
      const availability = p.availableQty > 0 ? 'in stock' : 'out of stock';
      
      let pImg = p.imageUrl || '';
      if (pImg && !pImg.startsWith('http') && !pImg.startsWith('https')) {
        pImg = protocol + '://' + host + pImg;
      }

      xml += '    <item>\n';
      xml += '      <g:id>' + p.productId + '</g:id>\n';
      xml += '      <g:title>' + escapeXml(p.productName) + '</g:title>\n';
      xml += '      <g:description>' + escapeXml(p.notes || (p.productName + ' in ' + (p.category || 'Boutique'))) + '</g:description>\n';
      xml += '      <g:link>' + escapeXml(storefrontUrl) + '/shop?productId=' + p.productId + '</g:link>\n';
      if (pImg) xml += '      <g:image_link>' + escapeXml(pImg) + '</g:image_link>\n';
      xml += '      <g:brand>' + escapeXml(p.brand || 'BrandCreator') + '</g:brand>\n';
      xml += '      <g:condition>new</g:condition>\n';
      xml += '      <g:availability>' + availability + '</g:availability>\n';
      xml += '      <g:price>' + escapeXml(formattedPrice) + '</g:price>\n';
      if (p.category) xml += '      <g:google_product_category>' + escapeXml(p.category) + '</g:google_product_category>\n';
      xml += '      <g:custom_label_0>' + escapeXml(p.ownershipType) + '</g:custom_label_0>\n';
      if (p.material) xml += '      <g:custom_label_1>' + escapeXml(p.material) + '</g:custom_label_1>\n';
      if (p.texture) xml += '      <g:custom_label_2>' + escapeXml(p.texture) + '</g:custom_label_2>\n';
      if (p.width) xml += '      <g:custom_label_3>' + escapeXml(p.width) + '</g:custom_label_3>\n';
      xml += '    </item>\n';
    }

    xml += '  </channel>\n';
    xml += '</rss>\n';

    res.header('Content-Type', 'text/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

const { poolPromise, sql } = require('../config/db');

// POST /api/products/:id/ownership/assign
exports.assignOwnership = async (req, res) => {
  const { id } = req.params;
  const { supplierEmail } = req.body;

  if (!supplierEmail) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'supplierEmail is required' });
  }

  try {
    const pool = await poolPromise;
    
    // 1. Verify product exists
    const prodResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ProductId FROM dbo.Products WHERE ProductId = @id');

    if (prodResult.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }

    // 2. Upsert ProductOwnership mapping
    await pool.request()
      .input('productId', sql.Int, id)
      .input('email', sql.NVarChar(255), supplierEmail)
      .query(`
        MERGE dbo.ProductOwnership AS target
        USING (SELECT @productId AS ProductId, @email AS SupplierEmail) AS source
        ON (target.ProductId = source.ProductId AND target.SupplierEmail = source.SupplierEmail)
        WHEN MATCHED THEN
          UPDATE SET IsActive = 1
        WHEN NOT MATCHED THEN
          INSERT (ProductId, SupplierEmail, IsActive)
          VALUES (source.ProductId, source.SupplierEmail, 1);
      `);

    res.json({
      productId: parseInt(id),
      supplierEmail,
      isActive: true
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/products/:id/ownership
exports.getOwnership = async (req, res) => {
  const { id } = req.params;
  const userEmail = req.user?.email || 'admin@test.com';
  const userRole = req.user?.role || 'Admin';

  try {
    const pool = await poolPromise;

    // 1. Verify product exists
    const prodResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ProductId FROM dbo.Products WHERE ProductId = @id');

    if (prodResult.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }

    // 2. If user is a Supplier, enforce ownership check
    if (userRole === 'Supplier') {
      const ownerCheck = await pool.request()
        .input('productId', sql.Int, id)
        .input('email', sql.NVarChar(255), userEmail)
        .query("SELECT TOP 1 1 FROM dbo.ProductOwnership WHERE ProductId = @productId AND SupplierEmail = @email AND IsActive = 1");

      if (ownerCheck.recordset.length === 0) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'You do not own this product' });
      }
    }

    // 3. Query owners
    const ownersResult = await pool.request()
      .input('productId', sql.Int, id)
      .query('SELECT SupplierEmail AS supplierEmail, IsActive AS isActive FROM dbo.ProductOwnership WHERE ProductId = @productId');

    res.json({
      productId: parseInt(id),
      owners: ownersResult.recordset.map(o => ({
        supplierEmail: o.supplierEmail,
        isActive: o.isActive === true || o.isActive === 1
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/products/:id/stock-policy
exports.setStockPolicy = async (req, res) => {
  const { id } = req.params;
  const { sellLowStockThreshold, masterLowStockThreshold, isAlertEnabled } = req.body;

  const sellThreshold = sellLowStockThreshold !== undefined ? parseInt(sellLowStockThreshold) : 10;
  const masterThreshold = masterLowStockThreshold !== undefined ? parseInt(masterLowStockThreshold) : 20;
  const alertEnabled = isAlertEnabled !== undefined ? (isAlertEnabled ? 1 : 0) : 1;

  try {
    const pool = await poolPromise;

    // 1. Verify product exists
    const prodResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ProductId FROM dbo.Products WHERE ProductId = @id');

    if (prodResult.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }

    // 2. Upsert dynamic Stock Policy
    await pool.request()
      .input('productId', sql.Int, id)
      .input('sell', sql.Int, sellThreshold)
      .input('master', sql.Int, masterThreshold)
      .input('enabled', sql.Bit, alertEnabled)
      .query(`
        MERGE dbo.ProductStockPolicies AS target
        USING (SELECT @productId AS ProductId) AS source
        ON (target.ProductId = source.ProductId)
        WHEN MATCHED THEN
          UPDATE SET SellLowStockThreshold = @sell, MasterLowStockThreshold = @master, IsAlertEnabled = @enabled, UpdatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (ProductId, SellLowStockThreshold, MasterLowStockThreshold, IsAlertEnabled)
          VALUES (source.ProductId, @sell, @master, @enabled);
      `);

    res.json({
      productId: parseInt(id),
      sellLowStockThreshold: sellThreshold,
      masterLowStockThreshold: masterThreshold,
      isAlertEnabled: alertEnabled === 1
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/alerts/low-stock
exports.getLowStockAlerts = async (req, res) => {
  const userEmail = req.user?.email || 'admin@test.com';
  const userRole = req.user?.role || 'Admin';

  try {
    const pool = await poolPromise;

    // 1. Core query to cross thresholds
    let query = `
      SELECT 
        p.ProductId AS productId,
        p.SKU AS sku,
        lsell.OnHandQty AS sellOnHand,
        lmaster.OnHandQty AS masterOnHand,
        policy.SellLowStockThreshold AS sellThreshold,
        policy.MasterLowStockThreshold AS masterThreshold
      FROM dbo.Products p
      INNER JOIN dbo.ProductStockPolicies policy ON p.ProductId = policy.ProductId
      LEFT JOIN dbo.InventoryLedgers lsell ON p.ProductId = lsell.ProductId AND lsell.LedgerType = 'MASTER'
      LEFT JOIN dbo.InventoryLedgers lmaster ON p.ProductId = lmaster.ProductId AND lmaster.LedgerType = 'MASTER'
      WHERE policy.IsAlertEnabled = 1
        AND (
          COALESCE(lsell.OnHandQty, 0) < policy.SellLowStockThreshold
          OR COALESCE(lmaster.OnHandQty, 0) < policy.MasterLowStockThreshold
        )
    `;

    // 2. Supplier dynamic filter strictly to products they actively own
    const requestObj = pool.request();
    if (userRole === 'Supplier') {
      query += ` AND EXISTS (
        SELECT 1 FROM dbo.ProductOwnership o 
        WHERE o.ProductId = p.ProductId 
          AND o.SupplierEmail = @email 
          AND o.IsActive = 1
      )`;
      requestObj.input('email', sql.NVarChar(255), userEmail);
    }

    const result = await requestObj.query(query);

    const items = result.recordset.map(row => {
      const sellOnHand = row.sellOnHand !== null ? row.sellOnHand : 0;
      const sellThreshold = row.sellThreshold;
      
      // Calculate severity
      let severity = 'MEDIUM';
      if (sellOnHand === 0) {
        severity = 'CRITICAL';
      } else if (sellOnHand < (sellThreshold * 0.5)) {
        severity = 'HIGH';
      }

      return {
        productId: row.productId,
        sku: row.sku,
        sellOnHand: sellOnHand,
        threshold: sellThreshold,
        severity: severity
      };
    });

    res.json({
      items
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

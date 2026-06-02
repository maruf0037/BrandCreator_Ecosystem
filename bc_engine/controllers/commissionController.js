// controllers/commissionController.js
// Manages supplier commission rates, commission ledger, and payout tracking.

const { poolPromise, sql } = require('../config/db');

// ==========================================
// Commission Rate Resolution Helper
// ==========================================
// Waterfall priority:
// 1. Product-level CommissionRate (if set)
// 2. Supplier + Category rate from SupplierCommissionRates
// 3. Supplier-wide rate from SupplierCommissionRates (Category IS NULL)
// 4. Global default from GlobalSettings
async function resolveCommissionRate(pool, productId, supplierEmail, category) {
  // 0. Check New Supplier Promo (0% for first 90 days)
  if (supplierEmail) {
    const userRes = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .query("SELECT Id, OnboardedAt FROM dbo.Users WHERE Email = @email");

    if (userRes.recordset.length > 0) {
      const user = userRes.recordset[0];
      if (user.OnboardedAt === null) {
        // If first transaction/creation and onboardedAt is null, initialize it
        await pool.request()
          .input('id', sql.Int, user.Id)
          .query("UPDATE dbo.Users SET OnboardedAt = SYSUTCDATETIME() WHERE Id = @id");
        return { rate: 0.00, source: 'NEW_SUPPLIER_PROMO' };
      } else {
        const diffTime = Math.abs(new Date() - new Date(user.OnboardedAt));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 90) {
          return { rate: 0.00, source: 'NEW_SUPPLIER_PROMO' };
        }
      }
    }
  }

  // 1. Product-level override
  if (productId) {
    const productRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query('SELECT CommissionRate FROM dbo.Products WHERE ProductId = @productId AND CommissionRate IS NOT NULL');

    if (productRes.recordset.length > 0 && productRes.recordset[0].CommissionRate !== null) {
      return { rate: parseFloat(productRes.recordset[0].CommissionRate), source: 'PRODUCT_OVERRIDE' };
    }
  }

  // 2. Supplier + Category rate
  if (supplierEmail && category) {
    const catRes = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .input('category', sql.NVarChar(150), category)
      .query(`
        SELECT CommissionRate FROM dbo.SupplierCommissionRates 
        WHERE SupplierEmail = @email AND Category = @category AND IsActive = 1
      `);

    if (catRes.recordset.length > 0) {
      return { rate: parseFloat(catRes.recordset[0].CommissionRate), source: 'SUPPLIER_CATEGORY' };
    }
  }

  // 3. Supplier-wide rate (Category IS NULL)
  if (supplierEmail) {
    const supplierRes = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .query(`
        SELECT CommissionRate FROM dbo.SupplierCommissionRates 
        WHERE SupplierEmail = @email AND Category IS NULL AND IsActive = 1
      `);

    if (supplierRes.recordset.length > 0) {
      return { rate: parseFloat(supplierRes.recordset[0].CommissionRate), source: 'SUPPLIER_DEFAULT' };
    }
  }

  // 4. Volume-based commission tier (rolling 30-day sales volume)
  if (supplierEmail) {
    const volumeRes = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .query(`
        SELECT COALESCE(SUM(SaleAmount), 0) AS monthlySales
        FROM dbo.CommissionLedger
        WHERE SupplierEmail = @email 
          AND CreatedAt >= DATEADD(day, -30, SYSUTCDATETIME())
      `);
    const monthlySales = volumeRes.recordset[0]?.monthlySales || 0;

    const tierRes = await pool.request()
      .input('monthlySales', sql.Decimal(18, 2), monthlySales)
      .query(`
        SELECT TOP 1 CommissionRate 
        FROM dbo.CommissionTiers 
        WHERE IsActive = 1 AND @monthlySales >= MinMonthlySales
        ORDER BY MinMonthlySales DESC
      `);

    if (tierRes.recordset.length > 0) {
      return { rate: parseFloat(tierRes.recordset[0].CommissionRate), source: 'VOLUME_TIER' };
    }
  }

  // 5. Global default
  const globalRes = await pool.request()
    .query("SELECT SettingValue FROM dbo.GlobalSettings WHERE SettingKey = 'DEFAULT_COMMISSION_RATE'");

  const globalRate = globalRes.recordset.length > 0 ? parseFloat(globalRes.recordset[0].SettingValue) : 10.00;
  return { rate: globalRate, source: 'GLOBAL_DEFAULT' };
}

// ==========================================
// GET /api/admin/commission/rates
// ==========================================
exports.getCommissionRates = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT RateId AS rateId, SupplierEmail AS supplierEmail, Category AS category,
             CommissionRate AS commissionRate, IsActive AS isActive, 
             CreatedAt AS createdAt, UpdatedAt AS updatedAt
      FROM dbo.SupplierCommissionRates
      ORDER BY SupplierEmail, Category
    `);

    // Also fetch global default
    const globalRes = await pool.request()
      .query("SELECT SettingValue FROM dbo.GlobalSettings WHERE SettingKey = 'DEFAULT_COMMISSION_RATE'");
    const globalDefault = globalRes.recordset.length > 0 ? parseFloat(globalRes.recordset[0].SettingValue) : 10.00;

    res.json({
      globalDefault,
      items: result.recordset
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// POST /api/admin/commission/rates
// ==========================================
exports.setCommissionRate = async (req, res) => {
  const { supplierEmail, category, commissionRate } = req.body;

  if (!supplierEmail || commissionRate === undefined) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'supplierEmail and commissionRate are required' });
  }

  const rate = parseFloat(commissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'commissionRate must be between 0 and 100' });
  }

  try {
    const pool = await poolPromise;

    // Upsert: check if rate exists for this supplier+category combo
    const existing = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .input('category', sql.NVarChar(150), category || null)
      .query(`
        SELECT RateId FROM dbo.SupplierCommissionRates 
        WHERE SupplierEmail = @email AND (
          (@category IS NULL AND Category IS NULL) OR Category = @category
        )
      `);

    if (existing.recordset.length > 0) {
      // Update existing
      await pool.request()
        .input('rateId', sql.Int, existing.recordset[0].RateId)
        .input('rate', sql.Decimal(5, 2), rate)
        .query(`
          UPDATE dbo.SupplierCommissionRates 
          SET CommissionRate = @rate, IsActive = 1, UpdatedAt = SYSUTCDATETIME() 
          WHERE RateId = @rateId
        `);

      res.json({ success: true, action: 'UPDATED', rateId: existing.recordset[0].RateId, commissionRate: rate });
    } else {
      // Insert new
      const insertRes = await pool.request()
        .input('email', sql.NVarChar(255), supplierEmail)
        .input('category', sql.NVarChar(150), category || null)
        .input('rate', sql.Decimal(5, 2), rate)
        .query(`
          INSERT INTO dbo.SupplierCommissionRates (SupplierEmail, Category, CommissionRate)
          OUTPUT inserted.RateId
          VALUES (@email, @category, @rate)
        `);

      res.status(201).json({ success: true, action: 'CREATED', rateId: insertRes.recordset[0].RateId, commissionRate: rate });
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// DELETE /api/admin/commission/rates/:rateId
// ==========================================
exports.deactivateCommissionRate = async (req, res) => {
  const { rateId } = req.params;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('rateId', sql.Int, rateId)
      .query('UPDATE dbo.SupplierCommissionRates SET IsActive = 0, UpdatedAt = SYSUTCDATETIME() WHERE RateId = @rateId');

    res.json({ success: true, rateId: parseInt(rateId), status: 'DEACTIVATED' });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// GET /api/admin/commission/global-default
// ==========================================
exports.getGlobalDefault = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT SettingValue, UpdatedAt FROM dbo.GlobalSettings WHERE SettingKey = 'DEFAULT_COMMISSION_RATE'");

    res.json({
      commissionRate: result.recordset.length > 0 ? parseFloat(result.recordset[0].SettingValue) : 10.00,
      updatedAt: result.recordset.length > 0 ? result.recordset[0].UpdatedAt : null
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// PUT /api/admin/commission/global-default
// ==========================================
exports.updateGlobalDefault = async (req, res) => {
  const { commissionRate } = req.body;

  const rate = parseFloat(commissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'commissionRate must be between 0 and 100' });
  }

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('val', sql.NVarChar(500), rate.toFixed(2))
      .query(`
        UPDATE dbo.GlobalSettings 
        SET SettingValue = @val, UpdatedAt = SYSUTCDATETIME() 
        WHERE SettingKey = 'DEFAULT_COMMISSION_RATE'
      `);

    res.json({ success: true, commissionRate: rate });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// GET /api/admin/commission/ledger
// ==========================================
exports.getCommissionLedger = async (req, res) => {
  const { supplierEmail, status, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const returnWindowSeconds = parseInt(process.env.RETURN_WINDOW_SECONDS || '604800');

  try {
    const pool = await poolPromise;

    let whereClause = '1=1';
    const request = pool.request()
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, offset)
      .input('returnWindowSeconds', sql.Int, returnWindowSeconds);

    if (supplierEmail) {
      whereClause += ' cl.SupplierEmail = @email';
      request.input('email', sql.NVarChar(255), supplierEmail);
    }
    if (status) {
      whereClause += ' cl.Status = @status';
      request.input('status', sql.NVarChar(30), status);
    }

    const result = await request.query(`
      SELECT cl.EntryId AS entryId, cl.OrderId AS orderId, o.OrderRef AS orderRef,
             cl.ProductId AS productId, p.ProductName AS productName,
             cl.SupplierEmail AS supplierEmail, cl.SaleAmount AS saleAmount,
             cl.CommissionRate AS commissionRate, cl.CommissionAmount AS commissionAmount,
             cl.SupplierPayable AS supplierPayable, cl.Status AS status,
             cl.PaidAt AS paidAt, cl.CreatedAt AS createdAt, o.PaidAt AS orderPaidAt,
             CASE WHEN o.PaidAt IS NOT NULL AND DATEADD(day, ISNULL(dbo.fn_GetHoldDays(u.Id), 7), o.PaidAt) > SYSUTCDATETIME() THEN 1 ELSE 0 END AS isLocked
      FROM dbo.CommissionLedger cl
      INNER JOIN dbo.Orders o ON cl.OrderId = o.OrderId
      INNER JOIN dbo.Products p ON cl.ProductId = p.ProductId
      LEFT JOIN dbo.Users u ON cl.SupplierEmail = u.Email
      WHERE ${whereClause}
      ORDER BY cl.EntryId DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    // Summary aggregation
    const summaryReq = pool.request();
    if (supplierEmail) summaryReq.input('email', sql.NVarChar(255), supplierEmail);
    if (status) summaryReq.input('status', sql.NVarChar(30), status);

    const summaryRes = await summaryReq.query(`
      SELECT 
        COALESCE(SUM(SaleAmount), 0) AS totalSales,
        COALESCE(SUM(CommissionAmount), 0) AS totalCommission,
        COALESCE(SUM(SupplierPayable), 0) AS totalPayable,
        COALESCE(SUM(CASE WHEN Status = 'PENDING' THEN CommissionAmount ELSE 0 END), 0) AS pendingCommission,
        COALESCE(SUM(CASE WHEN Status = 'PAID' THEN CommissionAmount ELSE 0 END), 0) AS paidCommission,
        COUNT(*) AS totalEntries
      FROM dbo.CommissionLedger cl
      WHERE ${whereClause}
    `);

    res.json({
      items: result.recordset,
      summary: summaryRes.recordset[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// GET /api/supplier/commission/summary
// ==========================================
exports.getSupplierCommissionSummary = async (req, res) => {
  const supplierEmail = req.user?.email || req.headers['x-user-email'];
  const returnWindowSeconds = parseInt(process.env.RETURN_WINDOW_SECONDS || '604800');

  if (!supplierEmail) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Supplier email required' });
  }

  try {
    const pool = await poolPromise;

    // Get applicable commission rate
    const rateInfo = await resolveCommissionRate(pool, null, supplierEmail, null);

    // Aggregate commission data
    const summary = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .query(`
        SELECT 
          COALESCE(SUM(SaleAmount), 0) AS totalSales,
          COALESCE(SUM(CommissionAmount), 0) AS totalCommission,
          COALESCE(SUM(SupplierPayable), 0) AS totalPayable,
          COALESCE(SUM(CASE WHEN Status = 'PENDING' THEN SupplierPayable ELSE 0 END), 0) AS pendingPayable,
          COALESCE(SUM(CASE WHEN Status = 'PAID' THEN SupplierPayable ELSE 0 END), 0) AS paidPayable,
          COUNT(*) AS totalOrders
        FROM dbo.CommissionLedger
        WHERE SupplierEmail = @email
      `);

    // Recent entries with dynamic hold locks
    const recent = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .query(`
        SELECT TOP 20
          cl.EntryId AS entryId, o.OrderRef AS orderRef, p.ProductName AS productName,
          cl.SaleAmount AS saleAmount, cl.CommissionRate AS commissionRate,
          cl.CommissionAmount AS commissionAmount, cl.SupplierPayable AS supplierPayable,
          cl.Status AS status, cl.CreatedAt AS createdAt, o.PaidAt AS orderPaidAt,
          CASE WHEN o.PaidAt IS NOT NULL AND DATEADD(day, ISNULL(dbo.fn_GetHoldDays(u.Id), 7), o.PaidAt) > SYSUTCDATETIME() THEN 1 ELSE 0 END AS isLocked
        FROM dbo.CommissionLedger cl
        INNER JOIN dbo.Orders o ON cl.OrderId = o.OrderId
        INNER JOIN dbo.Products p ON cl.ProductId = p.ProductId
        LEFT JOIN dbo.Users u ON cl.SupplierEmail = u.Email
        WHERE cl.SupplierEmail = @email
        ORDER BY cl.EntryId DESC
      `);

    // Fetch supplier trust/onboarding metadata
    const supplierInfo = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .query(`
        SELECT TrustLevel, CustomHoldDays, OnboardedAt, 
               TotalSuccessfulOrders, ReturnRate, ShowTrustedBadge
        FROM dbo.Users
        WHERE Email = @email
      `);

    res.json({
      currentRate: rateInfo,
      summary: summary.recordset[0],
      recentEntries: recent.recordset,
      supplier: supplierInfo.recordset[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// POST /api/admin/commission/ledger/:entryId/mark-paid
// ==========================================
exports.markCommissionPaid = async (req, res) => {
  const { entryId } = req.params;
  try {
    const pool = await poolPromise;

    // 1. Fetch entry with order PaidAt and dynamic hold days
    const entryRes = await pool.request()
      .input('entryId', sql.BigInt, entryId)
      .query(`
        SELECT cl.Status, o.PaidAt AS orderPaidAt,
               ISNULL(dbo.fn_GetHoldDays(u.Id), 7) AS holdDays
        FROM dbo.CommissionLedger cl
        INNER JOIN dbo.Orders o ON cl.OrderId = o.OrderId
        LEFT JOIN dbo.Users u ON cl.SupplierEmail = u.Email
        WHERE cl.EntryId = @entryId
      `);

    const entry = entryRes.recordset[0];
    if (!entry) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Ledger entry not found' });
    }

    if (entry.Status !== 'PENDING') {
      return res.status(400).json({ error: 'INVALID_STATE', message: 'Only PENDING payouts can be settled' });
    }

    // 2. Validate Return Window Lock dynamically
    if (entry.orderPaidAt) {
      const holdDays = entry.holdDays || 7;
      const deadline = new Date(new Date(entry.orderPaidAt).getTime() + holdDays * 24 * 60 * 60 * 1000);
      if (new Date() < deadline) {
        return res.status(400).json({ 
          error: 'LOCK_ACTIVE', 
          message: `Payout is currently locked during the return window. Return window expires at ${deadline.toISOString()}.` 
        });
      }
    }

    // 3. Mark PAID
    const result = await pool.request()
      .input('entryId', sql.BigInt, entryId)
      .query(`
        UPDATE dbo.CommissionLedger 
        SET Status = 'PAID', PaidAt = SYSUTCDATETIME() 
        WHERE EntryId = @entryId AND Status = 'PENDING'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ error: 'INVALID_STATE', message: 'Entry not found or already paid' });
    }

    res.json({ success: true, entryId: parseInt(entryId), status: 'PAID' });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// Export the helper for use in orderController
exports.resolveCommissionRate = resolveCommissionRate;

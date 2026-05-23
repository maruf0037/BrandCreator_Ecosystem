// controllers/pricingController.js
const { poolPromise, sql } = require('../config/db');

// GET /api/admin/pricing/products
exports.getAdminPricingProducts = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        p.ProductId AS productId,
        p.SKU AS sku,
        p.ProductName AS productName,
        p.BasePrice AS basePrice,
        p.RPU_MRP AS rpuMrp,
        p.SuggestedRetailPrice AS suggestedRetailPrice,
        p.Brand AS brand,
        p.Category AS category,
        p.ProductReadinessStatus AS productReadinessStatus,
        ap.PlanId AS planId,
        ap.AdminSellingPrice AS adminSellingPrice,
        ap.AdBudgetPlanned AS adBudgetPlanned,
        ap.PlatformCommission AS platformCommission,
        ap.DeliveryOpsCost AS deliveryOpsCost,
        ap.DiscountAmount AS discountAmount,
        ap.Status AS planStatus,
        pps.NetBrandCreatorProfit AS netBrandCreatorProfit,
        pps.AdSpendActual AS adSpendActual
      FROM dbo.Products p
      LEFT JOIN dbo.AdminPricingPlans ap ON p.ProductId = ap.ProductId AND ap.Status = 'ACTIVE'
      LEFT JOIN dbo.ProductProfitSnapshots pps ON p.ProductId = pps.ProductId
      ORDER BY p.ProductId DESC
    `);

    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/admin/pricing/products/:productId/plan
exports.saveAdminPricingPlan = async (req, res) => {
  const { productId } = req.params;
  const { 
    adminSellingPrice, 
    adBudgetPlanned = 0.00, 
    platformCommission = 0.00, 
    deliveryOpsCost = 0.00, 
    discountAmount = 0.00 
  } = req.body;

  const email = req.user?.email || 'admin@brandcreator.com';

  if (adminSellingPrice === undefined || isNaN(parseFloat(adminSellingPrice))) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'adminSellingPrice is required and must be a number' });
  }

  try {
    const pool = await poolPromise;

    // 1. Fetch Product info (Supplier cost / base price)
    const productRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query('SELECT ProductId, BasePrice, RPU_MRP, SuggestedRetailPrice FROM dbo.Products WHERE ProductId = @productId');

    if (productRes.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }

    const product = productRes.recordset[0];
    const supplierCost = product.RPU_MRP !== null && parseFloat(product.RPU_MRP) > 0 
      ? parseFloat(product.RPU_MRP) 
      : (product.BasePrice !== null ? parseFloat(product.BasePrice) : 0.00);

    const price = parseFloat(adminSellingPrice);
    const adPlanned = parseFloat(adBudgetPlanned);
    const comm = parseFloat(platformCommission);
    const delivery = parseFloat(deliveryOpsCost);
    const discount = parseFloat(discountAmount);

    // Business profit logic: Selling price minus supplierCost, planned marketing, logistics, and discounts
    const netProfit = price - supplierCost - adPlanned - delivery - discount;
    const isNegative = netProfit <= 0;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 2. Deactivate previous plans for this product
      await transaction.request()
        .input('productId', sql.Int, productId)
        .query("UPDATE dbo.AdminPricingPlans SET Status = 'INACTIVE', UpdatedAt = SYSUTCDATETIME() WHERE ProductId = @productId AND Status = 'ACTIVE'");

      // 3. Insert new active Admin Pricing Plan
      const insertPlanRes = await transaction.request()
        .input('productId', sql.Int, productId)
        .input('price', sql.Decimal(18, 2), price)
        .input('adBudget', sql.Decimal(18, 2), adPlanned)
        .input('commission', sql.Decimal(18, 2), comm)
        .input('delivery', sql.Decimal(18, 2), delivery)
        .input('discount', sql.Decimal(18, 2), discount)
        .input('adminEmail', sql.NVarChar(255), email)
        .query(`
          INSERT INTO dbo.AdminPricingPlans (
            ProductId, AdminSellingPrice, AdBudgetPlanned, PlatformCommission, 
            DeliveryOpsCost, DiscountAmount, CreatedByAdmin, Status
          )
          OUTPUT inserted.PlanId, inserted.AdminSellingPrice, inserted.AdBudgetPlanned, inserted.PlatformCommission,
                 inserted.DeliveryOpsCost, inserted.DiscountAmount, inserted.Status
          VALUES (
            @productId, @price, @adBudget, @commission, 
            @delivery, @discount, @adminEmail, 'ACTIVE'
          )
        `);

      const plan = insertPlanRes.recordset[0];

      // 4. Update or Insert ProductProfitSnapshot
      const snapshotCheck = await transaction.request()
        .input('productId', sql.Int, productId)
        .query('SELECT SnapshotId, AdSpendActual FROM dbo.ProductProfitSnapshots WHERE ProductId = @productId');

      let adSpendActual = 0.00;
      const statusVal = isNegative ? 'WARNING' : 'OK';

      if (snapshotCheck.recordset.length > 0) {
        adSpendActual = parseFloat(snapshotCheck.recordset[0].AdSpendActual);
        await transaction.request()
          .input('productId', sql.Int, productId)
          .input('supplierCost', sql.Decimal(18, 2), supplierCost)
          .input('price', sql.Decimal(18, 2), price)
          .input('adBudget', sql.Decimal(18, 2), adPlanned)
          .input('netProfit', sql.Decimal(18, 2), netProfit)
          .input('status', sql.NVarChar(50), statusVal)
          .query(`
            UPDATE dbo.ProductProfitSnapshots
            SET SupplierRpuMrp = @supplierCost,
                AdminSellingPrice = @price,
                AdBudgetPlanned = @adBudget,
                NetBrandCreatorProfit = @netProfit,
                Status = @status,
                UpdatedAt = SYSUTCDATETIME()
            WHERE ProductId = @productId
          `);
      } else {
        await transaction.request()
          .input('productId', sql.Int, productId)
          .input('supplierCost', sql.Decimal(18, 2), supplierCost)
          .input('price', sql.Decimal(18, 2), price)
          .input('adBudget', sql.Decimal(18, 2), adPlanned)
          .input('netProfit', sql.Decimal(18, 2), netProfit)
          .input('status', sql.NVarChar(50), statusVal)
          .query(`
            INSERT INTO dbo.ProductProfitSnapshots (
              ProductId, SupplierRpuMrp, AdminSellingPrice, AdBudgetPlanned, 
              AdSpendActual, NetBrandCreatorProfit, Status
            )
            VALUES (
              @productId, @supplierCost, @price, @adBudget, 
              0.00, @netProfit, @status
            )
          `);
      }

      // 5. Append to AdsBudgetLedger
      await transaction.request()
        .input('productId', sql.Int, productId)
        .input('adBudget', sql.Decimal(18, 2), adPlanned)
        .input('adminEmail', sql.NVarChar(255), email)
        .query(`
          INSERT INTO dbo.AdsBudgetLedgers (ProductId, AdBudgetPlanned, AdSpendActual, Note, CreatedByAdmin)
          VALUES (@productId, @adBudget, 0.00, 'Pricing plan created/updated by Admin', @adminEmail)
        `);

      // 6. Update Product readiness status to CAMPAIGN_READY
      await transaction.request()
        .input('productId', sql.Int, productId)
        .input('readiness', sql.NVarChar(50), 'CAMPAIGN_READY')
        .query("UPDATE dbo.Products SET ProductReadinessStatus = @readiness WHERE ProductId = @productId");

      await transaction.commit();

      res.status(201).json({
        success: true,
        plan,
        warning: isNegative ? 'Projected net profit margin is negative or zero!' : null
      });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/admin/profit/products/:productId
exports.getProductProfitDetails = async (req, res) => {
  const { productId } = req.params;

  try {
    const pool = await poolPromise;

    const planRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query('SELECT TOP 1 * FROM dbo.AdminPricingPlans WHERE ProductId = @productId AND Status = \'ACTIVE\'');

    const snapshotRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query('SELECT TOP 1 * FROM dbo.ProductProfitSnapshots WHERE ProductId = @productId');

    const ordersRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query(`
        SELECT 
          COALESCE(SUM(Qty), 0) AS totalQtySold,
          COALESCE(SUM(GrossRevenue), 0) AS totalGrossRevenue,
          COALESCE(SUM(SupplierPayable), 0) AS totalSupplierPayable,
          COALESCE(SUM(PlatformCommission), 0) AS totalPlatformCommissionRealized,
          COALESCE(SUM(NetBrandCreatorProfit), 0) AS totalNetProfitRealized,
          COALESCE(SUM(ReturnLoss), 0) AS totalReturnLoss
        FROM dbo.OrderProfitBreakdowns
        WHERE ProductId = @productId AND PaymentStatus = 'PAID'
      `);

    res.json({
      productId: parseInt(productId),
      plan: planRes.recordset[0] || null,
      snapshot: snapshotRes.recordset[0] || null,
      realizedStats: ordersRes.recordset[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/admin/profit-ledger
exports.getProfitLedger = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        b.BreakdownId AS breakdownId,
        b.OrderId AS orderId,
        o.OrderRef AS orderRef,
        b.ProductId AS productId,
        p.ProductName AS productName,
        b.Qty AS qty,
        b.GrossRevenue AS grossRevenue,
        b.SupplierPayable AS supplierPayable,
        b.PlatformCommission AS platformCommission,
        b.AdSpendShare AS adSpendShare,
        b.DeliveryOpsCost AS deliveryOpsCost,
        b.DiscountAmount AS discountAmount,
        b.NetBrandCreatorProfit AS netBrandCreatorProfit,
        b.ReturnLoss AS returnLoss,
        b.ProfitAfterReturn AS profitAfterReturn,
        b.PaymentStatus AS paymentStatus,
        b.CreatedAt AS createdAt
      FROM dbo.OrderProfitBreakdowns b
      INNER JOIN dbo.Orders o ON b.OrderId = o.OrderId
      INNER JOIN dbo.Products p ON b.ProductId = p.ProductId
      ORDER BY b.BreakdownId DESC
    `);

    // Calculate dynamic ledger sums
    const sumsRes = await pool.request().query(`
      SELECT 
        COALESCE(SUM(GrossRevenue), 0) AS totalGrossRevenue,
        COALESCE(SUM(SupplierPayable), 0) AS totalSupplierPayable,
        COALESCE(SUM(PlatformCommission), 0) AS totalPlatformCommissionRealized,
        COALESCE(SUM(NetBrandCreatorProfit), 0) AS totalNetProfitRealized,
        COALESCE(SUM(ReturnLoss), 0) AS totalReturnLoss,
        COALESCE(SUM(ProfitAfterReturn), 0) AS totalProfitAfterReturn
      FROM dbo.OrderProfitBreakdowns
      WHERE PaymentStatus = 'PAID'
    `);

    res.json({ 
      items: result.recordset,
      summary: sumsRes.recordset[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/admin/orders/:orderRef/profit-breakdown
exports.getOrderProfitBreakdown = async (req, res) => {
  const { orderRef } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('orderRef', sql.NVarChar(100), orderRef)
      .query(`
        SELECT 
          b.BreakdownId AS breakdownId,
          b.OrderId AS orderId,
          o.OrderRef AS orderRef,
          b.ProductId AS productId,
          p.ProductName AS productName,
          b.Qty AS qty,
          b.GrossRevenue AS grossRevenue,
          b.SupplierPayable AS supplierPayable,
          b.PlatformCommission AS platformCommission,
          b.AdSpendShare AS adSpendShare,
          b.DeliveryOpsCost AS deliveryOpsCost,
          b.DiscountAmount AS discountAmount,
          b.NetBrandCreatorProfit AS netBrandCreatorProfit,
          b.ReturnLoss AS returnLoss,
          b.ProfitAfterReturn AS profitAfterReturn,
          b.PaymentStatus AS paymentStatus,
          b.CreatedAt AS createdAt
        FROM dbo.OrderProfitBreakdowns b
        INNER JOIN dbo.Orders o ON b.OrderId = o.OrderId
        INNER JOIN dbo.Products p ON b.ProductId = p.ProductId
        WHERE o.OrderRef = @orderRef
      `);

    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/admin/pricing/products/:productId/auto-recommend
exports.getAutoPriceRecommendation = async (req, res) => {
  const { productId } = req.params;
  const {
    deliveryOpsCost = 60,
    paymentFee = 15,
    riskBuffer = 25,
    minimumProfitMargin = 0.15
  } = req.body || {};

  try {
    const pool = await poolPromise;

    // 1. Fetch product (supplier RPU/MRP or BasePrice)
    const productRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query(`
        SELECT TOP 1
          p.ProductId, p.ProductName, p.SKU, p.Category,
          p.RPU_MRP, p.BasePrice, p.SuggestedRetailPrice
        FROM dbo.Products p
        WHERE p.ProductId = @productId
      `);

    if (productRes.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    }

    const product = productRes.recordset[0];
    const supplierCost = (product.RPU_MRP !== null && parseFloat(product.RPU_MRP) > 0)
      ? parseFloat(product.RPU_MRP)
      : (product.BasePrice !== null ? parseFloat(product.BasePrice) : 0);

    // 2. Fetch latest location suggestion for this product
    const suggestionRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query(`
        SELECT TOP 1 BudgetSuggestionJson, ExpectedResultJson, TestedLocation
        FROM dbo.ProductLocationSuggestions
        WHERE ProductId = @productId
        ORDER BY CreatedAt DESC
      `);

    let adsCostPerUnit = 80; // fallback default
    let testedLocation = null;
    let needsLocationSync = false;

    if (suggestionRes.recordset.length === 0) {
      needsLocationSync = true;
    } else {
      const row = suggestionRes.recordset[0];
      testedLocation = row.TestedLocation;

      let budgetSuggestion = {};
      let expectedResult = {};

      try { budgetSuggestion = JSON.parse(row.BudgetSuggestionJson || '{}'); } catch (_) { budgetSuggestion = {}; }
      try { expectedResult = JSON.parse(row.ExpectedResultJson || '{}'); } catch (_) { expectedResult = {}; }

      const dailyBudgetMin = parseFloat(budgetSuggestion.suggestedDailyBudgetMin || 500);
      const testDays = parseInt(budgetSuggestion.testDays || 2, 10);
      const totalBudgetMin = dailyBudgetMin * testDays;

      // Parse expectedOrderRange conservatively: "1-5" → use 1
      const orderRange = String(expectedResult.expectedOrderRange || '1');
      const expectedMinOrders = Math.max(1, parseInt(orderRange.split('-')[0], 10));

      adsCostPerUnit = Math.round(totalBudgetMin / expectedMinOrders);
    }

    // 3. Calculate totals
    const delivery = parseFloat(deliveryOpsCost);
    const fee = parseFloat(paymentFee);
    const buffer = parseFloat(riskBuffer);
    const margin = Math.min(Math.max(parseFloat(minimumProfitMargin), 0.01), 0.99);

    const totalCost = supplierCost + adsCostPerUnit + delivery + fee + buffer;
    const minimumSafePrice = Math.ceil(totalCost / (1 - margin));
    const recommendedSellingPrice = Math.ceil(minimumSafePrice * 1.06); // 6% above minimum
    const expectedProfitPerUnit = recommendedSellingPrice - totalCost;
    const expectedMarginPct = parseFloat(((expectedProfitPerUnit / recommendedSellingPrice) * 100).toFixed(1));

    // 4. Status + warning
    let status = 'PROFIT_GOOD';
    let warning = null;

    if (needsLocationSync) {
      status = 'NEED_LOCATION_SYNC';
      warning = 'No location suggestion found. Run Location Ads Sync first for accurate ads cost estimate. Using BDT 80 fallback.';
    } else if (expectedMarginPct < 0) {
      status = 'LOSS_RISK';
      warning = 'LOSS RISK: Selling price is below total cost. Adjust inputs or reduce costs.';
    } else if (expectedMarginPct < 10) {
      status = 'PRICE_BELOW_SAFE';
      warning = 'PRICE BELOW SAFE PROFIT: Margin is below 10%. Strongly consider a higher selling price.';
    } else if (expectedMarginPct < 15) {
      status = 'LOW_MARGIN';
      warning = 'LOW MARGIN: Margin is below 15% minimum target. Admin override is risky.';
    }

    return res.json({
      productId: product.ProductId,
      productName: product.ProductName,
      sku: product.SKU,
      testedLocation: testedLocation || 'No location synced',
      supplierRpu: supplierCost,
      adsCostPerUnit,
      deliveryOpsCost: delivery,
      paymentFee: fee,
      riskBuffer: buffer,
      totalCost,
      marginTarget: margin,
      minimumSafePrice,
      recommendedSellingPrice,
      expectedProfitPerUnit,
      expectedMarginPct,
      status,
      warning,
      needsLocationSync,
      breakdownNote: needsLocationSync
        ? 'Ads cost is estimated fallback (BDT 80). Sync a location for accurate calculation.'
        : `Based on latest location suggestion for ${testedLocation}.`
    });

  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

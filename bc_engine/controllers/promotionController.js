const { poolPromise, sql } = require('../config/db');
const logger = require('../src/logger');

/**
 * POST /api/admin/promotions
 * Admin creates a new promotion/coupon code.
 * Body: { promoCode, promoName, promoType, discountValue, minOrderAmount, minOrderQty, startDate, endDate, maxUsageLimit, productIds }
 */
exports.createPromotion = async (req, res) => {
  const { 
    promoCode, promoName, promoType, discountValue, 
    minOrderAmount, minOrderQty, startDate, endDate, 
    maxUsageLimit, productIds 
  } = req.body;
  const createdByEmail = req.user?.email || 'admin@test.com';

  if (!promoCode || !promoName || !promoType || discountValue === undefined || !startDate || !endDate) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing required promotion fields.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Insert Promotion Header
      const insertRes = await transaction.request()
        .input('promoCode', sql.NVarChar(50), promoCode.toUpperCase().trim())
        .input('promoName', sql.NVarChar(255), promoName)
        .input('promoType', sql.NVarChar(30), promoType.toUpperCase().trim())
        .input('discountValue', sql.Decimal(18, 2), parseFloat(discountValue))
        .input('minOrderAmount', sql.Decimal(18, 2), parseFloat(minOrderAmount || 0))
        .input('minOrderQty', sql.Int, parseInt(minOrderQty || 0))
        .input('startDate', sql.DateTime2, new Date(startDate))
        .input('endDate', sql.DateTime2, new Date(endDate))
        .input('maxUsageLimit', sql.Int, maxUsageLimit !== undefined && maxUsageLimit !== null ? parseInt(maxUsageLimit) : null)
        .input('createdByEmail', sql.NVarChar(255), createdByEmail)
        .query(`
          INSERT INTO dbo.Promotions (
            PromoCode, PromoName, PromoType, DiscountValue, MinOrderAmount, 
            MinOrderQty, StartDate, EndDate, MaxUsageLimit, CreatedByEmail
          )
          OUTPUT inserted.PromoId
          VALUES (
            @promoCode, @promoName, @promoType, @discountValue, @minOrderAmount, 
            @minOrderQty, @startDate, @endDate, @maxUsageLimit, @createdByEmail
          )
        `);

      const promoId = insertRes.recordset[0].PromoId;

      // 2. Insert Promotion Products scope (if limited to specific products)
      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        for (const pid of productIds) {
          await transaction.request()
            .input('promoId', sql.BigInt, promoId)
            .input('productId', sql.Int, pid)
            .query(`
              INSERT INTO dbo.PromotionProducts (PromoId, ProductId)
              VALUES (@promoId, @productId)
            `);
        }
      }

      await transaction.commit();
      logger.info(`Promotion code ${promoCode} created successfully by ${createdByEmail}`);

      return res.status(201).json({
        success: true,
        promoId,
        promoCode: promoCode.toUpperCase().trim(),
        message: 'Promotion created successfully.'
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    logger.error('Error creating promotion:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * GET /api/admin/promotions
 * Admin lists all promotions.
 */
exports.getPromotions = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        PromoId AS promoId, PromoCode AS promoCode, PromoName AS promoName, 
        PromoType AS promoType, DiscountValue AS discountValue, 
        MinOrderAmount AS minOrderAmount, MinOrderQty AS minOrderQty, 
        StartDate AS startDate, EndDate AS endDate, 
        MaxUsageLimit AS maxUsageLimit, UsageCount AS usageCount, 
        IsActive AS isActive, CreatedByEmail AS createdByEmail, CreatedAt AS createdAt
      FROM dbo.Promotions
      ORDER BY CreatedAt DESC
    `);

    // Fetch products for each promotion
    const items = [];
    for (const row of result.recordset) {
      const prodRes = await pool.request()
        .input('promoId', sql.BigInt, row.promoId)
        .query(`
          SELECT pp.ProductId AS productId, p.ProductName AS productName
          FROM dbo.PromotionProducts pp
          INNER JOIN dbo.Products p ON pp.ProductId = p.ProductId
          WHERE pp.PromoId = @promoId
        `);
      
      items.push({
        ...row,
        discountValue: parseFloat(row.discountValue),
        minOrderAmount: parseFloat(row.minOrderAmount),
        productIds: prodRes.recordset.map(p => p.productId),
        productNames: prodRes.recordset.map(p => p.productName)
      });
    }

    return res.json({ success: true, items });
  } catch (err) {
    logger.error('Error fetching promotions:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * POST /api/promotions/validate
 * Public/Checkout validation of a coupon code against a shopping cart.
 * Body: { promoCode, items: [{ productId, qty, unitPrice }] }
 */
exports.validatePromo = async (req, res) => {
  const { promoCode, items } = req.body;

  if (!promoCode || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'promoCode and a non-empty items array are required.' });
  }

  try {
    const pool = await poolPromise;
    
    // 1. Find the promotion
    const promoRes = await pool.request()
      .input('promoCode', sql.NVarChar(50), promoCode.toUpperCase().trim())
      .query('SELECT * FROM dbo.Promotions WHERE PromoCode = @promoCode');

    const promo = promoRes.recordset[0];
    if (!promo) {
      return res.status(404).json({ valid: false, error: 'PROMO_NOT_FOUND', message: 'Coupon code does not exist.' });
    }

    if (!promo.IsActive) {
      return res.status(400).json({ valid: false, error: 'PROMO_INACTIVE', message: 'Coupon code is inactive.' });
    }

    const now = new Date();
    if (now < new Date(promo.StartDate) || now > new Date(promo.EndDate)) {
      return res.status(400).json({ valid: false, error: 'PROMO_EXPIRED', message: 'Coupon code has expired or is not yet active.' });
    }

    if (promo.MaxUsageLimit !== null && promo.UsageCount >= promo.MaxUsageLimit) {
      return res.status(400).json({ valid: false, error: 'USAGE_LIMIT_EXCEEDED', message: 'Coupon code usage limit exceeded.' });
    }

    // 2. Calculate totals
    let grossTotal = 0;
    let totalQty = 0;
    const cartProductIds = new Set();
    
    for (const item of items) {
      grossTotal += item.qty * item.unitPrice;
      totalQty += item.qty;
      cartProductIds.add(item.productId);
    }

    if (grossTotal < parseFloat(promo.MinOrderAmount)) {
      return res.status(400).json({ 
        valid: false, 
        error: 'MIN_AMOUNT_NOT_MET', 
        message: `Minimum order amount of BDT ${parseFloat(promo.MinOrderAmount).toFixed(2)} is required for this coupon.` 
      });
    }

    if (totalQty < promo.MinOrderQty) {
      return res.status(400).json({ 
        valid: false, 
        error: 'MIN_QTY_NOT_MET', 
        message: `Minimum of ${promo.MinOrderQty} items are required for this coupon.` 
      });
    }

    // 3. Check specific product applicability if promotion is scoped
    const scopeRes = await pool.request()
      .input('promoId', sql.BigInt, promo.PromoId)
      .query('SELECT ProductId FROM dbo.PromotionProducts WHERE PromoId = @promoId');

    const scopedProducts = scopeRes.recordset.map(r => r.ProductId);
    let applicableTotal = grossTotal;

    if (scopedProducts.length > 0) {
      // Calculate total for applicable products only
      applicableTotal = 0;
      let hasEligibleItem = false;
      for (const item of items) {
        if (scopedProducts.includes(item.productId)) {
          applicableTotal += item.qty * item.unitPrice;
          hasEligibleItem = true;
        }
      }

      if (!hasEligibleItem) {
        return res.status(400).json({ 
          valid: false, 
          error: 'NO_ELIGIBLE_ITEMS', 
          message: 'None of the items in your cart are eligible for this coupon.' 
        });
      }
    }

    // 4. Calculate discount
    let discount = 0;
    const promoType = promo.PromoType.toUpperCase();
    const discountVal = parseFloat(promo.DiscountValue);

    if (promoType === 'PERCENTAGE') {
      discount = (applicableTotal * discountVal) / 100.0;
    } else if (promoType === 'FIXED') {
      discount = Math.min(discountVal, applicableTotal);
    } else if (promoType === 'BOGO') {
      // Buy One Get One implementation: discount price of cheapest eligible item
      if (items.length >= 2) {
        let cheapest = Infinity;
        for (const item of items) {
          if (scopedProducts.length === 0 || scopedProducts.includes(item.productId)) {
            if (item.unitPrice < cheapest) {
              cheapest = item.unitPrice;
            }
          }
        }
        discount = cheapest !== Infinity ? cheapest : 0;
      }
    }

    const finalDiscount = parseFloat(discount.toFixed(2));
    const netTotal = parseFloat(Math.max(0, grossTotal - finalDiscount).toFixed(2));

    return res.json({
      valid: true,
      promoCode: promo.PromoCode,
      promoType,
      discountAmount: finalDiscount,
      netTotal,
      message: `Coupon applied! You saved BDT ${finalDiscount.toFixed(2)}.`
    });
  } catch (err) {
    logger.error('Error validating coupon:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * PUT /api/admin/promotions/:promoId/toggle
 * Admin toggles promotion active/inactive status.
 */
exports.togglePromotionStatus = async (req, res) => {
  const { promoId } = req.params;

  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('promoId', sql.BigInt, promoId)
      .query(`
        UPDATE dbo.Promotions
        SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END
        OUTPUT inserted.IsActive AS isActive, inserted.PromoCode AS promoCode
        WHERE PromoId = @promoId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'PROMO_NOT_FOUND', message: 'Promotion not found.' });
    }

    const { isActive, promoCode } = result.recordset[0];
    logger.info(`Promotion ${promoCode} status toggled to ${isActive ? 'ACTIVE' : 'INACTIVE'} by ${req.user?.email || 'admin@test.com'}`);

    return res.json({
      success: true,
      promoId,
      isActive: isActive === 1 || isActive === true,
      message: `Promotion status toggled to ${isActive ? 'ACTIVE' : 'INACTIVE'}`
    });
  } catch (err) {
    logger.error('Error toggling promotion status:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

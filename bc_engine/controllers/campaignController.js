const { poolPromise, sql } = require('../config/db');

// ─── Helper: RBAC guard ────────────────────────────────────────────────────────

// ─── GET /api/admin/campaigns ─────────────────────────────────────────────────
exports.getCampaigns = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 50
        c.CampaignId,
        c.ProductId,
        p.ProductName,
        p.SKU,
        c.SelectedLocation,
        c.Platform,
        c.DailyBudgetBDT,
        c.TotalBudgetBDT,
        c.ExpectedOrderRange,
        c.FitScore,
        c.RiskLevel,
        c.SellingPrice,
        c.ProjectedMarginPct,
        c.Status,
        c.ApprovedByAdmin,
        c.ApprovedAt,
        c.Notes,
        c.CreatedAt,
        c.UpdatedAt
      FROM dbo.CampaignPlans c
      JOIN dbo.Products p ON c.ProductId = p.ProductId
      ORDER BY c.CreatedAt DESC
    `);

    const items = result.recordset.map((row) => ({
      campaignId: row.CampaignId,
      productId: row.ProductId,
      productName: row.ProductName,
      sku: row.SKU,
      selectedLocation: row.SelectedLocation,
      platform: row.Platform,
      dailyBudgetBDT: Number(row.DailyBudgetBDT || 0),
      totalBudgetBDT: Number(row.TotalBudgetBDT || 0),
      expectedOrderRange: row.ExpectedOrderRange,
      fitScore: row.FitScore,
      riskLevel: row.RiskLevel,
      sellingPrice: Number(row.SellingPrice || 0),
      projectedMarginPct: Number(row.ProjectedMarginPct || 0),
      status: row.Status,
      approvedByAdmin: row.ApprovedByAdmin,
      approvedAt: row.ApprovedAt,
      notes: row.Notes,
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt
    }));

    return res.json({ items, total: items.length });
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ─── POST /api/admin/campaigns/approve-test ───────────────────────────────────
const approvalMutexes = {};

exports.approveTestCampaign = async (req, res) => {
  const {
    productId,
    selectedLocation,
    platform,
    dailyBudgetBDT,
    expectedOrderRange,
    suggestionId,
    fitScore,
    riskLevel,
    notes
  } = req.body;

  if (!productId || !selectedLocation || !platform) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'productId, selectedLocation, and platform are required'
    });
  }

  // Acquire concurrency lock to prevent double spend campaign approvals
  const lockKey = `prod_${productId}`;
  while (approvalMutexes[lockKey]) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  approvalMutexes[lockKey] = true;

  try {
    const pool = await poolPromise;
    const blockingReasons = [];

    // ── Guard 1: Pricing plan must exist ─────────────────────────────────────
    const pricingRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query(`
        SELECT TOP 1
          PlanId,
          AdminSellingPrice,
          AdBudgetPlanned,
          DeliveryOpsCost,
          DiscountAmount
        FROM dbo.AdminPricingPlans
        WHERE ProductId = @productId AND Status = 'ACTIVE'
        ORDER BY CreatedAt DESC
      `);

    const pricingPlan = pricingRes.recordset[0];
    if (!pricingPlan) {
      blockingReasons.push({ code: 'NO_PRICING_PLAN', message: 'Admin pricing plan not saved yet. Save a pricing plan first.' });
    }

    // ── Guard 2: Location suggestion must exist ──────────────────────────────
    const suggestionRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query(`
        SELECT TOP 1 SuggestionId, TestedLocation
        FROM dbo.ProductLocationSuggestions
        WHERE ProductId = @productId
        ORDER BY CreatedAt DESC
      `);

    const latestSuggestion = suggestionRes.recordset[0];
    if (!latestSuggestion) {
      blockingReasons.push({ code: 'NO_LOCATION_SYNC', message: 'Location suggestion missing. Run Location Ads Sync first.' });
    }

    // ── Guard 3: SELL stock must be > 0 ─────────────────────────────────────
    const stockRes = await pool.request()
      .input('productId', sql.Int, productId)
      .query(`
        SELECT ISNULL(OnHandQty, 0) - ISNULL(ReservedQty, 0) AS SellAvailable
        FROM dbo.InventoryLedgers
        WHERE ProductId = @productId AND LedgerType = 'MASTER'
      `);

    const sellAvailable = Number(stockRes.recordset[0]?.SellAvailable || 0);
    if (sellAvailable <= 0) {
      blockingReasons.push({ code: 'NO_SELL_STOCK', message: `SELL available stock is ${sellAvailable}. Transfer stock first.` });
    }

    // ── Guard 4: Margin must be >= 15% ───────────────────────────────────────
    let projectedMarginPct = 0;
    let sellingPrice = 0;
    if (pricingPlan) {
      sellingPrice = Number(pricingPlan.AdminSellingPrice || 0);

      // Get supplier cost
      const prodRes = await pool.request()
        .input('productId', sql.Int, productId)
        .query(`
          SELECT TOP 1
            ISNULL(RPU_MRP, ISNULL(BasePrice, 0)) AS SupplierCost
          FROM dbo.Products WHERE ProductId = @productId
        `);
      const supplierCost = Number(prodRes.recordset[0]?.SupplierCost || 0);
      const adsCost = Number(pricingPlan.AdBudgetPlanned || 0);
      const deliveryCost = Number(pricingPlan.DeliveryOpsCost || 0);
      const discount = Number(pricingPlan.DiscountAmount || 0);
      const totalCost = supplierCost + adsCost + deliveryCost + discount;
      const netProfit = sellingPrice - totalCost;
      projectedMarginPct = sellingPrice > 0 ? parseFloat(((netProfit / sellingPrice) * 100).toFixed(2)) : 0;

      if (projectedMarginPct < 15) {
        blockingReasons.push({
          code: 'MARGIN_TOO_LOW',
          message: `Projected margin is ${projectedMarginPct}% (< 15% minimum). Adjust selling price or reduce costs.`
        });
      }
    }

    // ── Guard 5: Spendable Ads Wallet Balance Check ────────────────────────
    const walletService = require('../services/walletService');
    const walletBalances = await walletService.calculateWalletBalances(pool);
    const dailyBudget = Number(dailyBudgetBDT || 0);
    const testDays = 2;
    const totalBudget = dailyBudget * testDays;

    if (totalBudget > walletBalances.adsSpendAvailable) {
      blockingReasons.push({
        code: 'PENDING_PROFIT_BLOCKED',
        message: 'BLOCKED: Profit is still inside return window. Wait until return date passes.'
      });
    }

    // ── If any guard blocked → return 400 ───────────────────────────────────
    if (blockingReasons.length > 0) {
      return res.status(400).json({
        error: 'APPROVAL_BLOCKED',
        message: 'Campaign cannot be approved. Fix the following issues first.',
        blockingReasons,
        guardChecksPassed: 5 - blockingReasons.length,
        guardChecksTotal: 5
      });
    }

    // ── All guards passed — insert campaign ──────────────────────────────────
    const adminEmail = req.user?.email || 'admin@system';

    const insertRes = await pool.request()
      .input('productId', sql.Int, productId)
      .input('planId', sql.Int, pricingPlan.PlanId)
      .input('suggestionId', sql.Int, latestSuggestion.SuggestionId)
      .input('selectedLocation', sql.NVarChar(150), selectedLocation)
      .input('platform', sql.NVarChar(100), platform)
      .input('dailyBudget', sql.Decimal(18, 2), dailyBudget)
      .input('totalBudget', sql.Decimal(18, 2), totalBudget)
      .input('expectedOrderRange', sql.NVarChar(50), expectedOrderRange || 'N/A')
      .input('fitScore', sql.Int, fitScore || 0)
      .input('riskLevel', sql.NVarChar(50), riskLevel || 'MEDIUM')
      .input('sellingPrice', sql.Decimal(18, 2), sellingPrice)
      .input('projectedMarginPct', sql.Decimal(6, 2), projectedMarginPct)
      .input('approvedByAdmin', sql.NVarChar(255), adminEmail)
      .input('notes', sql.NVarChar(1000), notes || null)
      .query(`
        INSERT INTO dbo.CampaignPlans (
          ProductId, PlanId, SuggestionId,
          SelectedLocation, Platform,
          DailyBudgetBDT, TotalBudgetBDT,
          ExpectedOrderRange, FitScore, RiskLevel,
          SellingPrice, ProjectedMarginPct,
          Status, ApprovedByAdmin, ApprovedAt, Notes
        )
        OUTPUT inserted.CampaignId
        VALUES (
          @productId, @planId, @suggestionId,
          @selectedLocation, @platform,
          @dailyBudget, @totalBudget,
          @expectedOrderRange, @fitScore, @riskLevel,
          @sellingPrice, @projectedMarginPct,
          'APPROVED_FOR_TEST', @approvedByAdmin, SYSUTCDATETIME(), @notes
        )
      `);

    const campaignId = insertRes.recordset[0].CampaignId;

    return res.status(201).json({
      success: true,
      campaignId,
      status: 'APPROVED_FOR_TEST',
      selectedLocation,
      platform,
      dailyBudgetBDT: dailyBudget,
      totalBudgetBDT: totalBudget,
      projectedMarginPct,
      approvedByAdmin: adminEmail,
      message: `Campaign #${campaignId} approved for test in ${selectedLocation} on ${platform}.`
    });

  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  } finally {
    approvalMutexes[lockKey] = false;
  }
};

// ─── POST /api/admin/campaigns/:campaignId/status ─────────────────────────────
exports.updateCampaignStatus = async (req, res) => {
  const { campaignId } = req.params;
  const { status, notes } = req.body;

  const ALLOWED_STATUSES = ['DRAFT', 'READY_FOR_ADS', 'APPROVED_FOR_TEST', 'PAUSED', 'COMPLETED'];
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: 'INVALID_STATUS',
      message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`
    });
  }

  try {
    const pool = await poolPromise;

    const checkRes = await pool.request()
      .input('campaignId', sql.Int, campaignId)
      .query(`SELECT TOP 1 CampaignId, Status FROM dbo.CampaignPlans WHERE CampaignId = @campaignId`);

    if (checkRes.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Campaign #${campaignId} not found` });
    }

    await pool.request()
      .input('campaignId', sql.Int, campaignId)
      .input('status', sql.NVarChar(50), status)
      .input('notes', sql.NVarChar(1000), notes || null)
      .query(`
        UPDATE dbo.CampaignPlans
        SET Status = @status,
            Notes = ISNULL(@notes, Notes),
            UpdatedAt = SYSUTCDATETIME()
        WHERE CampaignId = @campaignId
      `);

    return res.json({
      success: true,
      campaignId: Number(campaignId),
      newStatus: status,
      message: `Campaign #${campaignId} status updated to ${status}`
    });

  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// controllers/revenueController.js
// Revenue dashboard APIs for hybrid business model reporting.

const { poolPromise, sql } = require('../config/db');

// ==========================================
// GET /api/admin/revenue/summary
// ==========================================
exports.getRevenueSummary = async (req, res) => {
  try {
    const pool = await poolPromise;

    // Overall revenue split by ownership type
    const result = await pool.request().query(`
      SELECT 
        p.OwnershipType,
        COUNT(DISTINCT opb.OrderId) AS totalOrders,
        COALESCE(SUM(opb.Qty), 0) AS totalUnitsSold,
        COALESCE(SUM(opb.GrossRevenue), 0) AS totalGrossRevenue,
        COALESCE(SUM(opb.SupplierPayable), 0) AS totalSupplierPayable,
        COALESCE(SUM(opb.NetBrandCreatorProfit), 0) AS totalNetProfit,
        COALESCE(SUM(opb.ProfitAfterReturn), 0) AS totalProfitAfterReturn
      FROM dbo.OrderProfitBreakdowns opb
      INNER JOIN dbo.Products p ON opb.ProductId = p.ProductId
      WHERE opb.PaymentStatus = 'PAID'
      GROUP BY p.OwnershipType
    `);

    // Commission summary (for SUPPLIER products only)
    const commissionRes = await pool.request().query(`
      SELECT 
        COALESCE(SUM(CommissionAmount), 0) AS totalCommissionEarned,
        COALESCE(SUM(CASE WHEN Status = 'PENDING' THEN CommissionAmount ELSE 0 END), 0) AS pendingCommission,
        COALESCE(SUM(CASE WHEN Status = 'PAID' THEN CommissionAmount ELSE 0 END), 0) AS paidCommission
      FROM dbo.CommissionLedger
    `);

    // Product counts by type
    const productCounts = await pool.request().query(`
      SELECT OwnershipType, COUNT(*) AS count
      FROM dbo.Products
      GROUP BY OwnershipType
    `);

    const ownRevenue = result.recordset.find(r => r.OwnershipType === 'OWN') || {
      OwnershipType: 'OWN', totalOrders: 0, totalUnitsSold: 0, totalGrossRevenue: 0,
      totalSupplierPayable: 0, totalNetProfit: 0, totalProfitAfterReturn: 0
    };

    const supplierRevenue = result.recordset.find(r => r.OwnershipType === 'SUPPLIER') || {
      OwnershipType: 'SUPPLIER', totalOrders: 0, totalUnitsSold: 0, totalGrossRevenue: 0,
      totalSupplierPayable: 0, totalNetProfit: 0, totalProfitAfterReturn: 0
    };

    const totalGross = parseFloat(ownRevenue.totalGrossRevenue) + parseFloat(supplierRevenue.totalGrossRevenue);

    res.json({
      overview: {
        totalGrossRevenue: totalGross,
        totalNetProfit: parseFloat(ownRevenue.totalNetProfit) + parseFloat(supplierRevenue.totalNetProfit),
        totalOrders: ownRevenue.totalOrders + supplierRevenue.totalOrders,
        totalUnitsSold: ownRevenue.totalUnitsSold + supplierRevenue.totalUnitsSold
      },
      directSales: {
        grossRevenue: parseFloat(ownRevenue.totalGrossRevenue),
        netProfit: parseFloat(ownRevenue.totalNetProfit),
        orders: ownRevenue.totalOrders,
        units: ownRevenue.totalUnitsSold,
        revenueShare: totalGross > 0 ? parseFloat(((parseFloat(ownRevenue.totalGrossRevenue) / totalGross) * 100).toFixed(1)) : 0
      },
      commissionSales: {
        grossRevenue: parseFloat(supplierRevenue.totalGrossRevenue),
        supplierPayable: parseFloat(supplierRevenue.totalSupplierPayable),
        commissionEarned: parseFloat(commissionRes.recordset[0].totalCommissionEarned),
        pendingCommission: parseFloat(commissionRes.recordset[0].pendingCommission),
        paidCommission: parseFloat(commissionRes.recordset[0].paidCommission),
        orders: supplierRevenue.totalOrders,
        units: supplierRevenue.totalUnitsSold,
        revenueShare: totalGross > 0 ? parseFloat(((parseFloat(supplierRevenue.totalGrossRevenue) / totalGross) * 100).toFixed(1)) : 0
      },
      productCounts: {
        own: productCounts.recordset.find(r => r.OwnershipType === 'OWN')?.count || 0,
        supplier: productCounts.recordset.find(r => r.OwnershipType === 'SUPPLIER')?.count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// GET /api/admin/revenue/by-product
// ==========================================
exports.getRevenueByProduct = async (req, res) => {
  const { ownershipType } = req.query;

  try {
    const pool = await poolPromise;
    const request = pool.request();

    let whereClause = "opb.PaymentStatus = 'PAID'";
    if (ownershipType) {
      whereClause += ' AND p.OwnershipType = @ownershipType';
      request.input('ownershipType', sql.NVarChar(20), ownershipType);
    }

    const result = await request.query(`
      SELECT 
        p.ProductId AS productId,
        p.ProductName AS productName,
        p.SKU AS sku,
        p.Category AS category,
        p.OwnershipType AS ownershipType,
        COUNT(DISTINCT opb.OrderId) AS orderCount,
        COALESCE(SUM(opb.Qty), 0) AS totalQty,
        COALESCE(SUM(opb.GrossRevenue), 0) AS grossRevenue,
        COALESCE(SUM(opb.SupplierPayable), 0) AS supplierPayable,
        COALESCE(SUM(opb.NetBrandCreatorProfit), 0) AS netProfit,
        COALESCE(SUM(opb.ProfitAfterReturn), 0) AS profitAfterReturn
      FROM dbo.OrderProfitBreakdowns opb
      INNER JOIN dbo.Products p ON opb.ProductId = p.ProductId
      WHERE ${whereClause}
      GROUP BY p.ProductId, p.ProductName, p.SKU, p.Category, p.OwnershipType
      ORDER BY SUM(opb.GrossRevenue) DESC
    `);

    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// GET /api/admin/revenue/by-supplier
// ==========================================
exports.getRevenueBySupplier = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        cl.SupplierEmail AS supplierEmail,
        COUNT(DISTINCT cl.OrderId) AS orderCount,
        COUNT(DISTINCT cl.ProductId) AS productCount,
        COALESCE(SUM(cl.SaleAmount), 0) AS totalSales,
        COALESCE(SUM(cl.CommissionAmount), 0) AS totalCommission,
        COALESCE(SUM(cl.SupplierPayable), 0) AS totalPayable,
        COALESCE(SUM(CASE WHEN cl.Status = 'PENDING' THEN cl.SupplierPayable ELSE 0 END), 0) AS pendingPayable,
        COALESCE(SUM(CASE WHEN cl.Status = 'PAID' THEN cl.SupplierPayable ELSE 0 END), 0) AS paidPayable,
        AVG(cl.CommissionRate) AS avgCommissionRate,
        u.Id AS supplierUserId,
        COALESCE(u.TrustLevel, 'Bronze') AS trustLevel,
        u.CustomHoldDays AS customHoldDays,
        u.OnboardedAt AS onboardedAt,
        COALESCE(u.TotalSuccessfulOrders, 0) AS totalSuccessfulOrders,
        COALESCE(u.ReturnRate, 0.0) AS returnRate,
        COALESCE(u.ShowTrustedBadge, 0) AS showTrustedBadge
      FROM dbo.CommissionLedger cl
      LEFT JOIN dbo.Users u ON cl.SupplierEmail = u.Email
      GROUP BY cl.SupplierEmail, u.Id, u.TrustLevel, u.CustomHoldDays, u.OnboardedAt, u.TotalSuccessfulOrders, u.ReturnRate, u.ShowTrustedBadge
      ORDER BY SUM(cl.SaleAmount) DESC
    `);

    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// GET /api/admin/revenue/timeline
// ==========================================
exports.getRevenueTimeline = async (req, res) => {
  const { period = 'daily', days = 30 } = req.query;

  try {
    const pool = await poolPromise;

    let dateFormat, groupBy;
    switch (period) {
      case 'weekly':
        dateFormat = "CONVERT(VARCHAR(10), DATEADD(DAY, -(DATEPART(WEEKDAY, opb.CreatedAt) - 1), opb.CreatedAt), 120)";
        groupBy = dateFormat;
        break;
      case 'monthly':
        dateFormat = "FORMAT(opb.CreatedAt, 'yyyy-MM')";
        groupBy = dateFormat;
        break;
      default: // daily
        dateFormat = "CONVERT(VARCHAR(10), opb.CreatedAt, 120)";
        groupBy = dateFormat;
    }

    const result = await pool.request()
      .input('days', sql.Int, parseInt(days))
      .query(`
        SELECT 
          ${dateFormat} AS period,
          p.OwnershipType AS ownershipType,
          COALESCE(SUM(opb.GrossRevenue), 0) AS grossRevenue,
          COALESCE(SUM(opb.NetBrandCreatorProfit), 0) AS netProfit,
          COUNT(DISTINCT opb.OrderId) AS orderCount
        FROM dbo.OrderProfitBreakdowns opb
        INNER JOIN dbo.Products p ON opb.ProductId = p.ProductId
        WHERE opb.PaymentStatus = 'PAID'
          AND opb.CreatedAt >= DATEADD(DAY, -@days, SYSUTCDATETIME())
        GROUP BY ${groupBy}, p.OwnershipType
        ORDER BY ${groupBy} ASC
      `);

    // Reshape into { period, own: {revenue, profit}, supplier: {revenue, profit} }
    const timelineMap = {};
    for (const row of result.recordset) {
      if (!timelineMap[row.period]) {
        timelineMap[row.period] = {
          period: row.period,
          own: { grossRevenue: 0, netProfit: 0, orders: 0 },
          supplier: { grossRevenue: 0, netProfit: 0, orders: 0 },
          total: { grossRevenue: 0, netProfit: 0, orders: 0 }
        };
      }
      const key = row.ownershipType === 'OWN' ? 'own' : 'supplier';
      timelineMap[row.period][key] = {
        grossRevenue: parseFloat(row.grossRevenue),
        netProfit: parseFloat(row.netProfit),
        orders: row.orderCount
      };
      timelineMap[row.period].total.grossRevenue += parseFloat(row.grossRevenue);
      timelineMap[row.period].total.netProfit += parseFloat(row.netProfit);
      timelineMap[row.period].total.orders += row.orderCount;
    }

    res.json({ items: Object.values(timelineMap) });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// GET /api/admin/revenue/campaign-roi
// ==========================================
exports.getCampaignRoiStats = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        opb.UtmSource AS utmSource,
        COUNT(DISTINCT opb.OrderId) AS orderCount,
        COALESCE(SUM(opb.Qty), 0) AS totalQty,
        COALESCE(SUM(opb.GrossRevenue), 0) AS grossRevenue,
        COALESCE(SUM(opb.SupplierPayable), 0) AS supplierPayable,
        COALESCE(SUM(opb.NetBrandCreatorProfit), 0) AS netProfit,
        COALESCE(SUM(opb.ProfitAfterReturn), 0) AS profitAfterReturn
      FROM dbo.OrderProfitBreakdowns opb
      WHERE opb.PaymentStatus = 'PAID' AND opb.UtmSource IS NOT NULL
      GROUP BY opb.UtmSource
      ORDER BY SUM(opb.GrossRevenue) DESC
    `);

    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

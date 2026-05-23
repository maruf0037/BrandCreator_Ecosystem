const { sql } = require('../config/db');

async function calculateWalletBalances(pool) {
  // 1. Get Order Profit Breakdowns joined with Orders to calculate lock dates
  const breakdownsRes = await pool.request().query(`
    SELECT 
      b.NetBrandCreatorProfit AS netBrandCreatorProfit,
      b.SupplierPayable AS supplierPayable,
      b.ReturnLoss AS returnLoss,
      o.PaidAt AS paidAt
    FROM dbo.OrderProfitBreakdowns b
    INNER JOIN dbo.Orders o ON b.OrderId = o.OrderId
    WHERE o.PaymentStatus = 'PAYMENT_VERIFIED' AND o.Status = 'CONFIRMED'
  `);

  // Default return window: 7 days in seconds = 604800
  const returnWindowSeconds = parseInt(process.env.RETURN_WINDOW_SECONDS || '604800');
  const now = new Date();

  let supplierPayableLocked = 0;
  let pendingProfit = 0;
  let stableProfit = 0;

  for (const row of breakdownsRes.recordset) {
    supplierPayableLocked += parseFloat(row.supplierPayable || 0);

    if (row.paidAt) {
      const paidAtTime = new Date(row.paidAt).getTime();
      const returnDeadline = paidAtTime + (returnWindowSeconds * 1000);
      const isReturnWindowPassed = now.getTime() >= returnDeadline;

      if (isReturnWindowPassed) {
        stableProfit += parseFloat(row.netBrandCreatorProfit || 0) - parseFloat(row.returnLoss || 0);
      } else {
        pendingProfit += parseFloat(row.netBrandCreatorProfit || 0);
      }
    } else {
      pendingProfit += parseFloat(row.netBrandCreatorProfit || 0);
    }
  }

  // 2. Query Wallet Transactions for Top-ups & Deposits
  const txRes = await pool.request().query(`
    SELECT 
      TxnType AS txnType,
      Amount AS amount
    FROM dbo.WalletTransactions
  `);

  let adminTopUp = 0;
  let supplierCampaignDeposit = 0;

  for (const row of txRes.recordset) {
    if (row.txnType === 'ADMIN_TOP_UP') {
      adminTopUp += parseFloat(row.amount || 0);
    } else if (row.txnType === 'SUPPLIER_CAMPAIGN_DEPOSIT') {
      supplierCampaignDeposit += parseFloat(row.amount || 0);
    }
  }

  // 3. Query Active campaigns to get actual Ads spend used
  const campRes = await pool.request().query(`
    SELECT 
      COALESCE(SUM(TotalBudgetBDT), 0) AS totalBudgetSpent
    FROM dbo.CampaignPlans
    WHERE Status IN ('APPROVED_FOR_TEST', 'PAUSED', 'COMPLETED')
  `);

  const adsSpendUsed = parseFloat(campRes.recordset[0]?.totalBudgetSpent || 0);

  // 4. Allowed Ads spend calculation: only stable profit, admin topup, and supplier campaign deposits
  const adsSpendAvailable = stableProfit + adminTopUp + supplierCampaignDeposit - adsSpendUsed;

  return {
    supplierPayableLocked,
    pendingProfit,
    stableProfit,
    returnWindowRisk: pendingProfit, // Return Window Risk matches pending profit
    adminTopUp,
    supplierCampaignDeposit,
    adsSpendUsed,
    adsSpendAvailable
  };
}

async function calculateWalletAuditReport(pool) {
  // Compute basic balances first
  const balances = await calculateWalletBalances(pool);

  // Fetch gross sales revenue from CONFIRMED and PAYMENT_VERIFIED orders
  const grossRevRes = await pool.request().query(`
    SELECT 
      COALESCE(SUM(b.GrossRevenue), 0) AS totalGrossRevenue
    FROM dbo.OrderProfitBreakdowns b
    INNER JOIN dbo.Orders o ON b.OrderId = o.OrderId
    WHERE o.PaymentStatus = 'PAYMENT_VERIFIED' AND o.Status = 'CONFIRMED'
  `);
  const totalGrossRevenue = parseFloat(grossRevRes.recordset[0]?.totalGrossRevenue || 0);

  // Set up 7-day Maturation Forecast Calendar
  const returnWindowSeconds = parseInt(process.env.RETURN_WINDOW_SECONDS || '604800');
  const now = new Date();
  
  const forecast = [];
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + i);
    const dateString = targetDate.toISOString().split('T')[0];
    forecast.push({
      date: dateString,
      dayName: targetDate.toLocaleDateString('en-US', { weekday: 'short' }),
      amount: 0,
      ordersCount: 0
    });
  }

  // Fetch all pending breakdowns (still inside return window)
  const pendingBreakdownsRes = await pool.request().query(`
    SELECT 
      b.NetBrandCreatorProfit AS netBrandCreatorProfit,
      o.PaidAt AS paidAt
    FROM dbo.OrderProfitBreakdowns b
    INNER JOIN dbo.Orders o ON b.OrderId = o.OrderId
    WHERE o.PaymentStatus = 'PAYMENT_VERIFIED' AND o.Status = 'CONFIRMED'
  `);

  for (const row of pendingBreakdownsRes.recordset) {
    if (row.paidAt) {
      const paidAtTime = new Date(row.paidAt).getTime();
      const returnDeadline = new Date(paidAtTime + (returnWindowSeconds * 1000));
      const isReturnWindowPassed = now.getTime() >= returnDeadline.getTime();

      if (!isReturnWindowPassed) {
        const deadlineDateString = returnDeadline.toISOString().split('T')[0];
        const bucket = forecast.find(f => f.date === deadlineDateString);
        if (bucket) {
          bucket.amount += parseFloat(row.netBrandCreatorProfit || 0);
          bucket.ordersCount += 1;
        }
      }
    }
  }

  return {
    inflows: {
      adminTopUp: balances.adminTopUp,
      supplierCampaignDeposit: balances.supplierCampaignDeposit,
      grossRevenue: totalGrossRevenue,
      totalInflows: balances.adminTopUp + balances.supplierCampaignDeposit + totalGrossRevenue
    },
    commitments: {
      supplierPayableLocked: balances.supplierPayableLocked,
      returnWindowRisk: balances.returnWindowRisk,
      adsSpendUsed: balances.adsSpendUsed,
      totalCommitments: balances.supplierPayableLocked + balances.returnWindowRisk + balances.adsSpendUsed
    },
    balances,
    maturationForecast: forecast
  };
}

async function getUnifiedWalletHistory(pool) {
  // 1. Fetch Wallet Top-ups & deposits
  const txRes = await pool.request().query(`
    SELECT 
      TransactionId AS id,
      TxnType AS txnType,
      Amount AS amount,
      Notes AS notes,
      Source AS source,
      CreatedByEmail AS createdBy,
      CreatedAt AS timestamp
    FROM dbo.WalletTransactions
  `);

  const txItems = txRes.recordset.map(row => ({
    id: `tx-${row.id}`,
    flowType: 'INFLOW',
    txnType: row.txnType,
    amount: parseFloat(row.amount || 0),
    notes: row.notes || 'Manual top-up funding',
    source: row.source || 'REAL',
    createdBy: row.createdBy || 'Admin',
    reference: `TXN-${row.id}`,
    timestamp: row.timestamp
  }));

  // 2. Fetch Confirmed Order Profits
  const orderRes = await pool.request().query(`
    SELECT 
      b.BreakdownId AS id,
      b.NetBrandCreatorProfit AS amount,
      o.OrderRef AS orderRef,
      o.PaidAt AS timestamp
    FROM dbo.OrderProfitBreakdowns b
    INNER JOIN dbo.Orders o ON b.OrderId = o.OrderId
    WHERE o.PaymentStatus = 'PAYMENT_VERIFIED' AND o.Status = 'CONFIRMED'
  `);

  const orderItems = orderRes.recordset.map(row => ({
    id: `order-${row.id}`,
    flowType: 'INFLOW',
    txnType: 'ORDER_PROFIT',
    amount: parseFloat(row.amount || 0),
    notes: `Customer Order Profit (${row.orderRef})`,
    source: 'REAL',
    createdBy: 'System',
    reference: row.orderRef,
    timestamp: row.timestamp
  }));

  // 3. Fetch Campaign Debits
  const campRes = await pool.request().query(`
    SELECT 
      CampaignPlanId AS id,
      TotalBudgetBDT AS amount,
      PlatformName AS platformName,
      CreatedAt AS timestamp
    FROM dbo.CampaignPlans
    WHERE Status IN ('APPROVED_FOR_TEST', 'PAUSED', 'COMPLETED')
  `);

  const campaignItems = campRes.recordset.map(row => ({
    id: `camp-${row.id}`,
    flowType: 'OUTFLOW',
    txnType: 'CAMPAIGN_DEBIT',
    amount: parseFloat(row.amount || 0),
    notes: `Budget debited for ${row.platformName} Ads campaign`,
    source: 'REAL',
    createdBy: 'Admin',
    reference: `CAMP-${row.id}`,
    timestamp: row.timestamp
  }));

  // Merge and sort in descending order of timestamp
  const allItems = [...txItems, ...orderItems, ...campaignItems];
  allItems.sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tB - tA;
  });

  return allItems;
}

module.exports = {
  calculateWalletBalances,
  calculateWalletAuditReport,
  getUnifiedWalletHistory
};

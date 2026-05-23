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

module.exports = {
  calculateWalletBalances
};

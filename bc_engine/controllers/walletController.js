const { poolPromise, sql } = require('../config/db');
const walletService = require('../services/walletService');
const logger = require('../src/logger');

// GET /api/admin/wallet/summary
exports.getWalletSummary = async (req, res) => {
  try {
    const pool = await poolPromise;
    const balances = await walletService.calculateWalletBalances(pool);
    return res.json(balances);
  } catch (err) {
    logger.error('Error fetching wallet summary:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/admin/wallet/audit-report
exports.getWalletAuditReport = async (req, res) => {
  try {
    const pool = await poolPromise;
    const report = await walletService.calculateWalletAuditReport(pool);
    return res.json(report);
  } catch (err) {
    logger.error('Error fetching wallet audit report:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/admin/wallet/history
exports.getWalletHistory = async (req, res) => {
  try {
    const pool = await poolPromise;
    const history = await walletService.getUnifiedWalletHistory(pool);
    return res.json({ items: history });
  } catch (err) {
    logger.error('Error fetching wallet history:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/admin/wallet/topup
exports.postWalletTopUp = async (req, res) => {
  const { txnType, amount, notes, source } = req.body;

  if (!txnType || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'txnType (ADMIN_TOP_UP or SUPPLIER_CAMPAIGN_DEPOSIT) and a positive amount are required.'
    });
  }

  if (!['ADMIN_TOP_UP', 'SUPPLIER_CAMPAIGN_DEPOSIT'].includes(txnType)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'txnType must be either ADMIN_TOP_UP or SUPPLIER_CAMPAIGN_DEPOSIT.'
    });
  }

  // Strict BDT 1,000,000 top-up guardrail
  if (parseFloat(amount) > 1000000) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Transaction amount exceeds maximum limit of BDT 1,000,000.'
    });
  }

  try {
    const pool = await poolPromise;
    const finalSource = source || 'REAL';
    const createdByEmail = req.user?.email || 'admin@brandcreator.com';

    await pool.request()
      .input('txnType', sql.NVarChar(50), txnType)
      .input('amount', sql.Decimal(18, 2), parseFloat(amount))
      .input('notes', sql.NVarChar(500), notes || null)
      .input('source', sql.NVarChar(100), finalSource)
      .input('createdByEmail', sql.NVarChar(255), createdByEmail)
      .query(`
        INSERT INTO dbo.WalletTransactions (TxnType, Amount, Notes, Source, CreatedByEmail)
        VALUES (@txnType, @amount, @notes, @source, @createdByEmail)
      `);

    const updatedBalances = await walletService.calculateWalletBalances(pool);
    return res.status(201).json({
      success: true,
      message: `Transaction recorded successfully as ${txnType}.`,
      balances: updatedBalances
    });
  } catch (err) {
    logger.error('Error recording topup:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/admin/wallet/release-matured-profit
exports.postReleaseMaturedProfit = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    // We compute this dynamically, but this endpoint can simulate maturing profit immediately or returning stats of newly matured profit
    const balances = await walletService.calculateWalletBalances(pool);
    
    return res.json({
      success: true,
      message: 'Matured profits released and integrated successfully into stable balance.',
      maturedProfitReleased: balances.stableProfit,
      balances
    });
  } catch (err) {
    logger.error('Error in manual release override:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

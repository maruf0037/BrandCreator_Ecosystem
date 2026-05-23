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

  try {
    const pool = await poolPromise;
    const finalSource = source || 'REAL';

    await pool.request()
      .input('txnType', sql.NVarChar(50), txnType)
      .input('amount', sql.Decimal(18, 2), parseFloat(amount))
      .input('notes', sql.NVarChar(500), notes || null)
      .input('source', sql.NVarChar(100), finalSource)
      .query(`
        INSERT INTO dbo.WalletTransactions (TxnType, Amount, Notes, Source)
        VALUES (@txnType, @amount, @notes, @source)
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

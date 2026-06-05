const { poolPromise, sql } = require('../config/db');
const walletService = require('../services/walletService');
const logger = require('../src/logger');

function parseJsonArray(value, fallback = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_err) {
    return fallback;
  }
}

function parseJsonObject(value, fallback = {}) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (_err) {
    return fallback;
  }
}

// GET /api/marketing-budget/suggestions
// Returns target suggestions for a given product or location filtered by the requester's context.
exports.getSiloedSuggestions = async (req, res) => {
  const userEmail = req.user?.email || '';
  const userRole = req.user?.role || 'Customer';
  const productId = req.query.productId ? parseInt(req.query.productId, 10) : null;
  const location = req.query.location ? String(req.query.location).trim() : null;

  try {
    const pool = await poolPromise;
    let query = `
      SELECT DISTINCT 
        s.SuggestionId,
        s.ProductId,
        s.TestedLocation,
        s.FitScore,
        s.SuggestedAreasJson,
        s.NearbyExpansionAreasJson,
        s.InterestTagsJson,
        s.PlatformSuggestionJson,
        s.BudgetSuggestionJson,
        s.ExpectedResultJson,
        s.RiskLevel,
        s.ReasonBangla,
        s.ReasonEnglish,
        s.ConfidenceScore,
        s.FreshnessStatus,
        s.LastAnalyzedAt,
        s.CreatedAt,
        p.ProductName,
        p.SKU
      FROM dbo.ProductLocationSuggestions s
      INNER JOIN dbo.Products p ON s.ProductId = p.ProductId
    `;

    const request = pool.request();

    if (userRole === 'Supplier') {
      query += ` INNER JOIN dbo.ProductOwnership o ON p.ProductId = o.ProductId AND o.IsActive = 1 
                 WHERE o.SupplierEmail = @email`;
      request.input('email', sql.NVarChar(255), userEmail);
    } else {
      query += ` WHERE 1=1`;
    }

    if (productId) {
      query += ` AND s.ProductId = @productId`;
      request.input('productId', sql.Int, productId);
    }

    if (location) {
      query += ` AND LOWER(s.TestedLocation) = LOWER(@location)`;
      request.input('location', sql.NVarChar(150), location);
    }

    query += ` ORDER BY s.CreatedAt DESC`;

    const result = await request.query(query);

    const items = result.recordset.map((row) => ({
      suggestionId: row.SuggestionId,
      productId: row.ProductId,
      productName: row.ProductName,
      sku: row.SKU,
      testedLocation: row.TestedLocation,
      fitScore: row.FitScore,
      suggestedAreas: parseJsonArray(row.SuggestedAreasJson),
      nearbyExpansionAreas: parseJsonArray(row.NearbyExpansionAreasJson),
      interestTags: parseJsonArray(row.InterestTagsJson),
      platformSuggestion: parseJsonArray(row.PlatformSuggestionJson),
      budgetSuggestion: parseJsonObject(row.BudgetSuggestionJson),
      expectedResult: parseJsonObject(row.ExpectedResultJson),
      riskLevel: row.RiskLevel,
      reasonBangla: row.ReasonBangla,
      reasonEnglish: row.ReasonEnglish,
      confidenceScore: row.ConfidenceScore,
      freshnessStatus: row.FreshnessStatus,
      lastAnalyzedAt: row.LastAnalyzedAt,
      createdAt: row.CreatedAt
    }));

    return res.json({ items });
  } catch (err) {
    logger.error('Error fetching siloed suggestions:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/marketing-budget/payment-confirm
// Handles payment record submission/verification (relating to campaign approval or wallet top-ups).
exports.confirmBudgetPayment = async (req, res) => {
  const userEmail = req.user?.email || 'supplier@brandcreator.com';
  const userRole = req.user?.role || 'Supplier';
  const { amount, notes, source, txnType } = req.body;

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'A positive amount is required.'
    });
  }

  // Strict BDT 1,000,000 guardrail
  if (parseFloat(amount) > 1000000) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Transaction amount exceeds maximum limit of BDT 1,000,000.'
    });
  }

  // Determine txnType if not explicitly passed
  let finalTxnType = txnType;
  if (!finalTxnType) {
    finalTxnType = (userRole === 'SuperAdmin' || userRole === 'Admin') 
      ? 'ADMIN_TOP_UP' 
      : 'SUPPLIER_CAMPAIGN_DEPOSIT';
  }

  if (!['ADMIN_TOP_UP', 'SUPPLIER_CAMPAIGN_DEPOSIT'].includes(finalTxnType)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'txnType must be either ADMIN_TOP_UP or SUPPLIER_CAMPAIGN_DEPOSIT.'
    });
  }

  try {
    const pool = await poolPromise;
    const finalSource = source || 'REAL';

    const insertResult = await pool.request()
      .input('txnType', sql.NVarChar(50), finalTxnType)
      .input('amount', sql.Decimal(18, 2), parseFloat(amount))
      .input('notes', sql.NVarChar(500), notes || 'Marketing budget payment confirmation')
      .input('source', sql.NVarChar(100), finalSource)
      .input('createdByEmail', sql.NVarChar(255), userEmail)
      .query(`
        INSERT INTO dbo.WalletTransactions (TxnType, Amount, Notes, Source, CreatedByEmail)
        OUTPUT inserted.TransactionId, inserted.CreatedAt
        VALUES (@txnType, @amount, @notes, @source, @createdByEmail)
      `);

    const newTxn = insertResult.recordset[0];
    const updatedBalances = await walletService.calculateWalletBalances(pool);

    return res.status(201).json({
      success: true,
      message: 'Payment confirmed and credited to marketing wallet successfully.',
      transaction: {
        transactionId: newTxn.TransactionId,
        txnType: finalTxnType,
        amount: parseFloat(amount),
        notes: notes || 'Marketing budget payment confirmation',
        source: finalSource,
        createdAt: newTxn.CreatedAt,
        createdByEmail: userEmail
      },
      balances: updatedBalances
    });
  } catch (err) {
    logger.error('Error confirming budget payment:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

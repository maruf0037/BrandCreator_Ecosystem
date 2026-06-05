const express = require('express');
const router = express.Router();
const marketingBudgetController = require('../controllers/marketingBudgetController');
const { requireSupplier } = require('../src/middleware/auth');

router.get('/marketing-budget/suggestions', requireSupplier, marketingBudgetController.getSiloedSuggestions);
router.post('/marketing-budget/payment-confirm', requireSupplier, marketingBudgetController.confirmBudgetPayment);

module.exports = router;

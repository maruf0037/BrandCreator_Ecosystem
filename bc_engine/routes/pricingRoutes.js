const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { requireAdmin } = require('../src/middleware/auth');

// Route definitions under /admin routing (strictly RBAC Admin and SuperAdmin)
router.get('/admin/pricing/products', requireAdmin, pricingController.getAdminPricingProducts);
router.post('/admin/pricing/products/:productId/plan', requireAdmin, pricingController.saveAdminPricingPlan);
router.post('/admin/pricing/products/:productId/auto-recommend', requireAdmin, pricingController.getAutoPriceRecommendation);
router.get('/admin/profit/products/:productId', requireAdmin, pricingController.getProductProfitDetails);
router.get('/admin/profit-ledger', requireAdmin, pricingController.getProfitLedger);
router.get('/admin/orders/:orderRef/profit-breakdown', requireAdmin, pricingController.getOrderProfitBreakdown);

module.exports = router;
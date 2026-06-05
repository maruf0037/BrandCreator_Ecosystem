// routes/revenueRoutes.js
const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const { requireAdmin } = require('../src/middleware/auth');

router.get('/admin/revenue/summary', requireAdmin, revenueController.getRevenueSummary);
router.get('/admin/revenue/by-product', requireAdmin, revenueController.getRevenueByProduct);
router.get('/admin/revenue/by-supplier', requireAdmin, revenueController.getRevenueBySupplier);
router.get('/admin/revenue/timeline', requireAdmin, revenueController.getRevenueTimeline);
router.get('/admin/revenue/campaign-roi', requireAdmin, revenueController.getCampaignRoiStats);

module.exports = router;
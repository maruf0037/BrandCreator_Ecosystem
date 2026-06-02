// routes/revenueRoutes.js
const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');

// Dev auth middleware
const requireAdmin = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-user-email']) {
    req.user = {
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'] || 'Customer'
    };
  }
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  const role = req.user?.role || 'Customer';
  if (!['SuperAdmin', 'Admin'].includes(role)) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
  }
  next();
};

router.get('/admin/revenue/summary', requireAdmin, revenueController.getRevenueSummary);
router.get('/admin/revenue/by-product', requireAdmin, revenueController.getRevenueByProduct);
router.get('/admin/revenue/by-supplier', requireAdmin, revenueController.getRevenueBySupplier);
router.get('/admin/revenue/timeline', requireAdmin, revenueController.getRevenueTimeline);
router.get('/admin/revenue/campaign-roi', requireAdmin, revenueController.getCampaignRoiStats);

module.exports = router;

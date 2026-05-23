const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');

// Custom RBAC check middleware (copied from inventoryRoutes/orderRoutes)
const checkAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-user-email']) {
    req.user = {
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'] || 'Customer'
    };
  }

  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'You must be logged in to access this resource' });
  }
  next();
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    checkAuth(req, res, () => {
      const userRole = req.user.role || 'Customer';
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: insufficient permissions' });
      }
      next();
    });
  };
};

// Route definitions under /admin routing (strictly RBAC Admin and SuperAdmin)
router.get('/admin/pricing/products', requireRole(['Admin', 'SuperAdmin']), pricingController.getAdminPricingProducts);
router.post('/admin/pricing/products/:productId/plan', requireRole(['Admin', 'SuperAdmin']), pricingController.saveAdminPricingPlan);
router.post('/admin/pricing/products/:productId/auto-recommend', requireRole(['Admin', 'SuperAdmin']), pricingController.getAutoPriceRecommendation);
router.get('/admin/profit/products/:productId', requireRole(['Admin', 'SuperAdmin']), pricingController.getProductProfitDetails);
router.get('/admin/profit-ledger', requireRole(['Admin', 'SuperAdmin']), pricingController.getProfitLedger);
router.get('/admin/orders/:orderRef/profit-breakdown', requireRole(['Admin', 'SuperAdmin']), pricingController.getOrderProfitBreakdown);


module.exports = router;

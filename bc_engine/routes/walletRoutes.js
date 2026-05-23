const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

// Custom RBAC check middleware (matching pricingRoutes & whatsappRoutes standard)
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

// Admin / SuperAdmin only management routes
router.get('/admin/wallet/summary', requireRole(['Admin', 'SuperAdmin']), walletController.getWalletSummary);
router.get('/admin/wallet/audit-report', requireRole(['Admin', 'SuperAdmin']), walletController.getWalletAuditReport);
router.get('/admin/wallet/history', requireRole(['Admin', 'SuperAdmin']), walletController.getWalletHistory);
router.post('/admin/wallet/topup', requireRole(['Admin', 'SuperAdmin']), walletController.postWalletTopUp);
router.post('/admin/wallet/release-matured-profit', requireRole(['Admin', 'SuperAdmin']), walletController.postReleaseMaturedProfit);

module.exports = router;

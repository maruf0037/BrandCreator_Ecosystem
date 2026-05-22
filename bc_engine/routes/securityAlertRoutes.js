const express = require('express');
const router = express.Router();
const securityAlertController = require('../controllers/securityAlertController');

// Custom RBAC middleware
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
      if (allowedRoles.includes(userRole)) {
        return next();
      }
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: insufficient permissions' });
    });
  };
};

// Route definitions
router.post('/products/:id/ownership/assign', requireRole(['Admin', 'SuperAdmin']), securityAlertController.assignOwnership);
router.get('/products/:id/ownership', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), securityAlertController.getOwnership);
router.post('/products/:id/stock-policy', requireRole(['Admin', 'SuperAdmin']), securityAlertController.setStockPolicy);
router.get('/alerts/low-stock', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), securityAlertController.getLowStockAlerts);

module.exports = router;

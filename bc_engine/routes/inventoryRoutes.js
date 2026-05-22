const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Custom RBAC middleware
const checkAuth = (req, res, next) => {
  // Developer/Test auth simulation bypass
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

// Route definitions
router.post('/products', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.createProduct);
router.get('/products', requireRole(['SuperAdmin', 'Admin', 'Supplier', 'Customer']), inventoryController.getProducts);
router.get('/products/:productId/ledgers', requireRole(['SuperAdmin', 'Admin', 'Supplier', 'Customer']), inventoryController.getProductLedgers);
router.post('/inventory/transactions', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.applyTransaction);
router.post('/inventory/transfers', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.createTransfer);
router.get('/inventory/transfers', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.getTransfers);
router.post('/inventory/transfers/:id/approve', requireRole(['SuperAdmin', 'Admin']), inventoryController.approveTransfer);
router.get('/inventory/transactions', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.getTransactions);
router.get('/inventory/reconcile/:productId', requireRole(['SuperAdmin', 'Admin']), inventoryController.reconcileProduct);

module.exports = router;

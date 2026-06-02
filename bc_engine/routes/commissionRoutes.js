// routes/commissionRoutes.js
const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');

// Dev auth middleware (same pattern used across the project)
const checkAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-user-email']) {
    req.user = {
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'] || 'Customer'
    };
  }
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  checkAuth(req, res, () => {
    const role = req.user?.role || 'Customer';
    if (!['SuperAdmin', 'Admin'].includes(role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
    }
    next();
  });
};

const requireSupplier = (req, res, next) => {
  checkAuth(req, res, () => {
    const role = req.user?.role || 'Customer';
    if (!['SuperAdmin', 'Admin', 'Supplier'].includes(role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Supplier access required' });
    }
    next();
  });
};

// Admin Commission Rate Management
router.get('/admin/commission/rates', requireAdmin, commissionController.getCommissionRates);
router.post('/admin/commission/rates', requireAdmin, commissionController.setCommissionRate);
router.delete('/admin/commission/rates/:rateId', requireAdmin, commissionController.deactivateCommissionRate);

// Admin Global Default
router.get('/admin/commission/global-default', requireAdmin, commissionController.getGlobalDefault);
router.put('/admin/commission/global-default', requireAdmin, commissionController.updateGlobalDefault);

// Admin Commission Ledger
router.get('/admin/commission/ledger', requireAdmin, commissionController.getCommissionLedger);
router.post('/admin/commission/ledger/:entryId/mark-paid', requireAdmin, commissionController.markCommissionPaid);

// Supplier Commission Summary (own data)
router.get('/supplier/commission/summary', requireSupplier, commissionController.getSupplierCommissionSummary);

module.exports = router;

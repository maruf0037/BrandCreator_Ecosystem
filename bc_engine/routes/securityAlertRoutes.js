const express = require('express');
const router = express.Router();
const securityAlertController = require('../controllers/securityAlertController');
const { requireRole, requireAdmin } = require('../src/middleware/auth');

// Route definitions
router.post('/products/:id/ownership/assign', requireAdmin, securityAlertController.assignOwnership);
router.get('/products/:id/ownership', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), securityAlertController.getOwnership);
router.post('/products/:id/stock-policy', requireAdmin, securityAlertController.setStockPolicy);
router.get('/alerts/low-stock', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), securityAlertController.getLowStockAlerts);

module.exports = router;
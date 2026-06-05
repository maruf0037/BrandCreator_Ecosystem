const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { requireRole, requireAdmin } = require('../src/middleware/auth');

// Route definitions
router.post('/products', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.createProduct);
router.get('/products', requireRole(['SuperAdmin', 'Admin', 'Supplier', 'Customer']), inventoryController.getProducts);
router.get('/products/:productId/ledgers', requireRole(['SuperAdmin', 'Admin', 'Supplier', 'Customer']), inventoryController.getProductLedgers);
router.post('/inventory/transactions', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.applyTransaction);
router.post('/inventory/transfers', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.createTransfer);
router.get('/inventory/transfers', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.getTransfers);
router.post('/inventory/transfers/:id/approve', requireAdmin, inventoryController.approveTransfer);
router.get('/inventory/transactions', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.getTransactions);
router.get('/inventory/reconcile/:productId', requireAdmin, inventoryController.reconcileProduct);
router.put('/products/:productId/images', requireRole(['SuperAdmin', 'Admin', 'Supplier']), inventoryController.updateProductImages);
router.get('/catalog/fb-feed', inventoryController.getFacebookCatalogFeed);

// Dynamic Pricing & AI Picks Queue
router.get('/admin/ai-picks', requireAdmin, inventoryController.getAiDailyPicks);
router.post('/admin/ai-picks/approve', requireAdmin, inventoryController.approveAiPricing);

module.exports = router;
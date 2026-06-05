// routes/commissionRoutes.js
const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');
const { requireAdmin, requireSupplier } = require('../src/middleware/auth');

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
router.put('/admin/supplier/:userId/trust', requireAdmin, commissionController.updateSupplierTrustAndHold);

// Supplier Commission Summary (own data)
router.get('/supplier/commission/summary', requireSupplier, commissionController.getSupplierCommissionSummary);

module.exports = router;
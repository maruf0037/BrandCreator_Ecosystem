const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { requireAdmin } = require('../src/middleware/auth');

// Admin / SuperAdmin only management routes
router.get('/admin/wallet/summary', requireAdmin, walletController.getWalletSummary);
router.get('/admin/wallet/audit-report', requireAdmin, walletController.getWalletAuditReport);
router.get('/admin/wallet/history', requireAdmin, walletController.getWalletHistory);
router.post('/admin/wallet/topup', requireAdmin, walletController.postWalletTopUp);
router.post('/admin/wallet/release-matured-profit', requireAdmin, walletController.postReleaseMaturedProfit);

module.exports = router;
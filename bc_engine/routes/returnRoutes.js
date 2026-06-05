const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { requireRole, requireAdmin } = require('../src/middleware/auth');

// ─── Customer-facing return endpoints ───────────────────────────────

// POST /api/orders/:orderRef/return — Customer requests a return
router.post('/orders/:orderRef/return', requireRole(['Customer', 'Admin', 'SuperAdmin']), returnController.requestReturn);

// GET /api/orders/:orderRef/returns — Customer views their returns for this order
router.get('/orders/:orderRef/returns', requireRole(['Customer', 'Admin', 'SuperAdmin']), returnController.getOrderReturns);

// ─── Admin return management endpoints ──────────────────────────────

// GET /api/admin/returns — Admin lists all return requests
router.get('/admin/returns', requireAdmin, returnController.getAdminReturns);

// POST /api/admin/returns/:id/approve — Admin approves a return (restores stock)
router.post('/admin/returns/:id/approve', requireAdmin, returnController.approveReturn);

// POST /api/admin/returns/:id/reject — Admin rejects a return
router.post('/admin/returns/:id/reject', requireAdmin, returnController.rejectReturn);

// POST /api/admin/returns/:id/refund — Admin processes the final refund
router.post('/admin/returns/:id/refund', requireAdmin, returnController.processRefund);

module.exports = router;
// bc_engine/routes/posRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const { devAuthSimulator } = require('../middleware/devAuthSimulator');
const { requireRole } = require('../middleware/requireRole');

// All POS routes require Cashier, Admin, or Supplier role
const requirePOS = requireRole(['Cashier', 'Admin', 'SuperAdmin', 'Supplier']);

// ── Sale Lookup ──────────────────────────────────────────────────────────────
// GET /api/pos/sales/:orderRef
router.get('/pos/sales/:orderRef', devAuthSimulator, requirePOS, posController.getPosSale);

// GET /api/pos/sales/:orderRef/cancellable
router.get('/pos/sales/:orderRef/cancellable', devAuthSimulator, requirePOS, posController.checkCancellable);

// ── Sale Cancellation ────────────────────────────────────────────────────────
// POST /api/pos/sales/:orderRef/cancel
router.post('/pos/sales/:orderRef/cancel', devAuthSimulator, requirePOS, posController.cancelPosSale);

// ── Exchange / Swap ──────────────────────────────────────────────────────────
// POST /api/pos/exchange
router.post('/pos/exchange', devAuthSimulator, requirePOS, posController.processExchange);

module.exports = router;

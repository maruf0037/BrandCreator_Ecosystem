const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const secretAdminController = require('../controllers/secretAdminController');
const { requireRole } = require('../src/middleware/auth');
const { requireLicense } = require('../src/middleware/license');

// Route definitions
router.post('/orders', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), requireLicense, orderController.createOrder);
router.post('/orders/:orderRef/confirm', requireRole(['Admin', 'SuperAdmin', 'PaymentWebhook']), orderController.confirmOrder);
router.post('/orders/:orderRef/cancel', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin', 'PaymentWebhook']), orderController.cancelOrder);
router.get('/orders', requireRole(['Admin', 'SuperAdmin', 'Supplier', 'Customer']), orderController.getOrders);
router.get('/orders/:orderRef', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), orderController.getOrderDetails);
router.post('/orders/:orderRef/payment-evidence', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), orderController.submitPaymentEvidence);
router.get('/orders/:orderRef/payment-evidence', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), orderController.getPaymentEvidence);
router.post('/orders/:orderRef/payment-review', requireRole(['Admin', 'SuperAdmin']), orderController.reviewPaymentEvidence);
router.get('/orders/:orderRef/events', requireRole(['Admin', 'SuperAdmin']), orderController.getOrderEvents);
router.get('/outbox', requireRole(['Admin', 'SuperAdmin']), orderController.getOutboxEvents);
router.get('/outbox/pending', requireRole(['SystemWorker', 'Admin', 'SuperAdmin']), orderController.getPendingOutbox);
router.post('/outbox/:id/mark-sent', requireRole(['SystemWorker', 'Admin', 'SuperAdmin']), orderController.markOutboxSent);

// PHASE 1.3 ADDITIONS: Webhooks & Workers
router.post('/webhooks/payment/:provider', orderController.paymentWebhook); // Public (validates X-Signature)
router.post('/outbox/worker/poll', requireRole(['SystemWorker', 'Admin', 'SuperAdmin']), orderController.pollOutboxWorker);
router.post('/outbox/:id/worker/result', requireRole(['SystemWorker', 'Admin', 'SuperAdmin']), orderController.submitOutboxResult);

// PHASE 1.4 ADDITIONS: Admin Secret Rotations
router.post('/admin/secrets/webhook/rotate', requireRole(['SuperAdmin']), secretAdminController.rotateWebhookSecret);

module.exports = router;
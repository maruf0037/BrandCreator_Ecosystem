const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const secretAdminController = require('../controllers/secretAdminController');

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
      // Map mock roles like PaymentWebhook or SystemWorker if specified in headers
      if (allowedRoles.includes(userRole)) {
        return next();
      }
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: insufficient permissions' });
    });
  };
};

// Route definitions
router.post('/orders', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), orderController.createOrder);
router.post('/orders/:orderRef/confirm', requireRole(['Admin', 'SuperAdmin', 'PaymentWebhook']), orderController.confirmOrder);
router.post('/orders/:orderRef/cancel', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin', 'PaymentWebhook']), orderController.cancelOrder);
router.get('/orders', requireRole(['Admin', 'SuperAdmin', 'Supplier', 'Customer']), orderController.getOrders);
router.get('/orders/:orderRef', requireRole(['Customer', 'Supplier', 'Admin', 'SuperAdmin']), orderController.getOrderDetails);
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

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Custom RBAC check middleware (matching pricingRoutes standard)
const checkAuth = (req, res, next) => {
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

// Public WhatsApp Webhook endpoints (called by Meta Cloud API)
router.get('/webhooks/whatsapp', whatsappController.verifyMetaWebhook);
router.post('/webhooks/whatsapp', whatsappController.handleMetaWebhookEvent);

// Admin CRM management endpoints
router.get('/admin/whatsapp/contacts', requireRole(['Admin', 'SuperAdmin']), whatsappController.getContacts);
router.get('/admin/whatsapp/contacts/:phone/messages', requireRole(['Admin', 'SuperAdmin']), whatsappController.getChatHistory);
router.post('/admin/whatsapp/send-template', requireRole(['Admin', 'SuperAdmin']), whatsappController.sendManualTemplate);
router.get('/admin/whatsapp/templates', requireRole(['Admin', 'SuperAdmin']), whatsappController.getTemplates);
router.get('/admin/whatsapp/webhook-events', requireRole(['Admin', 'SuperAdmin']), whatsappController.getWebhookEvents);

module.exports = router;

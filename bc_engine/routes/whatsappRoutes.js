const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { requireAdmin } = require('../src/middleware/auth');

// Public WhatsApp Webhook endpoints (called by Meta Cloud API)
router.get('/webhooks/whatsapp', whatsappController.verifyMetaWebhook);
router.post('/webhooks/whatsapp', whatsappController.handleMetaWebhookEvent);

// Admin CRM management endpoints
router.get('/admin/whatsapp/contacts', requireAdmin, whatsappController.getContacts);
router.get('/admin/whatsapp/contacts/:phone/messages', requireAdmin, whatsappController.getChatHistory);
router.post('/admin/whatsapp/send-template', requireAdmin, whatsappController.sendManualTemplate);
router.get('/admin/whatsapp/templates', requireAdmin, whatsappController.getTemplates);
router.get('/admin/whatsapp/webhook-events', requireAdmin, whatsappController.getWebhookEvents);

module.exports = router;

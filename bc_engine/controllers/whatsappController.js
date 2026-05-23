const crypto = require('crypto');
const { poolPromise, sql } = require('../config/db');
const whatsappService = require('../services/whatsappService');
const logger = require('../src/logger');

/**
 * GET Verification endpoint for Meta WhatsApp Cloud API
 */
exports.verifyMetaWebhook = async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const localVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'brandcreator_verify_token';

    if (mode === 'subscribe' && token === localVerifyToken) {
      logger.info({ event: 'whatsapp.webhook_verify_success', token });
      return res.status(200).send(challenge);
    }

    logger.warn({ event: 'whatsapp.webhook_verify_failed', receivedToken: token });
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Verification token mismatch' });
  } catch (err) {
    logger.error({ event: 'whatsapp.webhook_verify_error', message: err.message });
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * POST Webhook receiver for Meta WhatsApp Cloud API events
 */
exports.handleMetaWebhookEvent = async (req, res) => {
  try {
    const signature = req.headers ? req.headers['x-hub-signature-256'] : undefined;
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Validate Signature cryptographically if app secret is provided
    if (appSecret && signature) {
      const elements = signature.split('=');
      const signatureHash = elements[1];
      const computedHash = crypto.createHmac('sha256', appSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signatureHash !== computedHash) {
        logger.warn({ event: 'whatsapp.webhook_invalid_signature' });
        return res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Signature verification failed' });
      }
    }

    const pool = await poolPromise;
    const payload = req.body || {};

    // 1. Record raw webhook receipt idempotently
    const eventType = payload.object ? 'meta_update' : 'unknown';
    const eventRef = payload.entry?.[0]?.id || 'META-' + Math.random().toString(36).slice(2);
    
    await pool.request()
      .input('eventType', sql.NVarChar(100), eventType)
      .input('eventRef', sql.NVarChar(250), eventRef)
      .input('payloadJson', sql.NVarChar(sql.MAX), JSON.stringify(payload))
      .query(`
        INSERT INTO dbo.WhatsAppWebhookEvents (EventType, EventRef, PayloadJson, Processed, CreatedAt)
        VALUES (@eventType, @eventRef, @payloadJson, 1, SYSUTCDATETIME())
      `);

    // 2. Parse Meta Event Contents
    const value = payload.entry?.[0]?.changes?.[0]?.value;
    if (value) {
      // Check for delivery status update
      if (value.statuses && Array.isArray(value.statuses) && value.statuses.length > 0) {
        const statusObj = value.statuses[0];
        const wabaMsgId = statusObj.id;
        const metaStatus = statusObj.status; // sent, delivered, read, failed
        const uppercaseStatus = metaStatus.toUpperCase();

        const errorObj = statusObj.errors?.[0];
        const errorMsg = errorObj ? `${errorObj.code}: ${errorObj.title}` : null;

        logger.info({
          event: 'whatsapp.status_webhook',
          wabaMsgId,
          status: uppercaseStatus,
          errorMsg
        });

        // Update local ledger
        await pool.request()
          .input('status', sql.NVarChar(50), uppercaseStatus)
          .input('errorMsg', sql.NVarChar(500), errorMsg)
          .input('messageSid', sql.NVarChar(150), wabaMsgId)
          .query(`
            UPDATE dbo.WhatsAppMessages 
            SET DeliveryStatus = @status, 
                ErrorMessage = COALESCE(@errorMsg, ErrorMessage)
            WHERE MessageSid = @messageSid
          `);
      }

      // Check for incoming customer message
      if (value.messages && Array.isArray(value.messages) && value.messages.length > 0) {
        const msgObj = value.messages[0];
        const phone = msgObj.from;
        const msgText = msgObj.text?.body || 'Attachment/Media message';
        const msgSid = msgObj.id;
        const profileName = value.contacts?.[0]?.profile?.name || null;

        const formattedPhone = whatsappService.formatPhoneNumber(phone);
        const contactId = await whatsappService.ensureContactExists(pool, formattedPhone, profileName);

        logger.info({
          event: 'whatsapp.receive_webhook',
          phone: formattedPhone,
          msgSid
        });

        // Insert incoming message
        await pool.request()
          .input('contactId', sql.Int, contactId)
          .input('direction', sql.NVarChar(20), 'RECEIVED')
          .input('messageSid', sql.NVarChar(150), msgSid)
          .input('bodyText', sql.NVarChar(sql.MAX), msgText)
          .query(`
            INSERT INTO dbo.WhatsAppMessages (ContactId, Direction, MessageSid, BodyText, DeliveryStatus, SentAt)
            VALUES (@contactId, @direction, @messageSid, @bodyText, 'READ', SYSUTCDATETIME())
          `);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error({ event: 'whatsapp.webhook_error', message: err.message });
    // Still send 200 to prevent Meta from retrying forever
    return res.status(200).json({ success: false, error: err.message });
  }
};

/**
 * GET Contacts list with last message summary and opt-in details
 */
exports.getContacts = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        c.ContactId AS contactId,
        c.Phone AS phone,
        c.Name AS name,
        c.OptedIn AS optedIn,
        c.CreatedAt AS createdAt,
        (
          SELECT TOP 1 m.BodyText 
          FROM dbo.WhatsAppMessages m 
          WHERE m.ContactId = c.ContactId 
          ORDER BY m.SentAt DESC
        ) AS lastMessage,
        (
          SELECT TOP 1 m.SentAt 
          FROM dbo.WhatsAppMessages m 
          WHERE m.ContactId = c.ContactId 
          ORDER BY m.SentAt DESC
        ) AS lastMessageAt,
        (
          SELECT TOP 1 m.DeliveryStatus 
          FROM dbo.WhatsAppMessages m 
          WHERE m.ContactId = c.ContactId 
          ORDER BY m.SentAt DESC
        ) AS lastMessageStatus
      FROM dbo.WhatsAppContacts c
      ORDER BY lastMessageAt DESC, c.CreatedAt DESC
    `);

    res.json({ success: true, items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * GET Message thread history for a specific phone number
 */
exports.getChatHistory = async (req, res) => {
  const { phone } = req.params;
  try {
    const pool = await poolPromise;
    const formattedPhone = whatsappService.formatPhoneNumber(phone);

    const result = await pool.request()
      .input('phone', sql.NVarChar(50), formattedPhone)
      .query(`
        SELECT 
          m.MessageId AS messageId,
          m.Direction AS direction,
          m.MessageSid AS messageSid,
          m.TemplateName AS templateName,
          m.BodyText AS bodyText,
          m.DeliveryStatus AS deliveryStatus,
          m.ErrorMessage AS errorMessage,
          m.SentAt AS sentAt,
          o.OrderRef AS orderRef,
          o.Status AS orderStatus,
          o.PaymentStatus AS paymentStatus
        FROM dbo.WhatsAppMessages m
        INNER JOIN dbo.WhatsAppContacts c ON m.ContactId = c.ContactId
        LEFT JOIN dbo.Orders o ON m.OrderId = o.OrderId
        WHERE c.Phone = @phone
        ORDER BY m.SentAt ASC
      `);

    res.json({ success: true, items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * POST Admin manually sends test or transactional templates
 */
exports.sendManualTemplate = async (req, res) => {
  const { phone, templateName, params, orderId } = req.body;

  if (!phone || !templateName || !Array.isArray(params)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'phone, templateName, and params array are required' });
  }

  try {
    const result = await whatsappService.sendTemplateMessage({
      phone,
      templateName,
      params,
      orderId: orderId ? parseInt(orderId) : null
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * GET standard seeded metadata templates for UI forms
 */
exports.getTemplates = async (req, res) => {
  try {
    const templates = [
      { templateName: 'order_confirmation', bodyPattern: 'Hello {{1}}, your order {{2}} of ৳{{3}} has been successfully reserved! Reply with transaction evidence to verify payment.' },
      { templateName: 'payment_reminder', bodyPattern: 'Hi {{1}}, we are waiting for your payment proof of order {{2}}. Please submit it at the earliest.' },
      { templateName: 'payment_verified', bodyPattern: 'Great news {{1}}! Your payment for order {{2}} has been verified. We are preparing your delivery.' },
      { templateName: 'delivery_update', bodyPattern: 'Hi {{1}}, your order {{2}} has been dispatched! Track status in your BrandCreator catalog.' },
      { templateName: 'review_request', bodyPattern: 'Hi {{1}}, how did you like our service for order {{2}}? Please leave us your valuable review.' }
    ];
    res.json({ success: true, items: templates });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * GET list of recorded webhook events for diagnostics panel
 */
exports.getWebhookEvents = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 50
        EventId AS eventId,
        EventType AS eventType,
        EventRef AS eventRef,
        PayloadJson AS payloadJson,
        Processed AS processed,
        CreatedAt AS createdAt
      FROM dbo.WhatsAppWebhookEvents
      ORDER BY CreatedAt DESC
    `);
    
    res.json({ success: true, items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

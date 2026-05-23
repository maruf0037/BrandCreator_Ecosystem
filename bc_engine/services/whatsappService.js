// Node 24 native fetch is used for HTTP requests
const { poolPromise, sql } = require('../config/db');
const logger = require('../src/logger');

// Clean and format phone number to E.164 standard (e.g. +8801712345678)
function formatPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If it starts with 0 and is 11 digits (BD standard), prepend +88
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+88' + cleaned;
  }
  // If it starts with 880 and is 13 digits, prepend +
  if (cleaned.startsWith('880') && cleaned.length === 13) {
    cleaned = '+' + cleaned;
  }
  
  // Ensure it has a leading '+'
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

// Generate human-friendly message body for simulated template rendering
function renderTemplateText(templateName, params) {
  const templates = {
    order_confirmation: 'Hello {{1}}, your order {{2}} of ৳{{3}} has been successfully reserved! Reply with transaction evidence to verify payment.',
    payment_reminder: 'Hi {{1}}, we are waiting for your payment proof of order {{2}}. Please submit it at the earliest.',
    payment_verified: 'Great news {{1}}! Your payment for order {{2}} has been verified. We are preparing your delivery.',
    delivery_update: 'Hi {{1}}, your order {{2}} has been dispatched! Track status in your BrandCreator catalog.',
    review_request: 'Hi {{1}}, how did you like our service for order {{2}}? Please leave us your valuable review.'
  };

  let text = templates[templateName] || `Template [${templateName}] triggered with parameters: ${params.join(', ')}`;
  params.forEach((param, idx) => {
    text = text.replace(`{{${idx + 1}}}`, param);
  });
  return text;
}

/**
 * Ensure contact exists in the database
 */
async function ensureContactExists(pool, phone, name = null) {
  // Check if exists
  const existing = await pool.request()
    .input('phone', sql.NVarChar(50), phone)
    .query('SELECT ContactId FROM dbo.WhatsAppContacts WHERE Phone = @phone');

  if (existing.recordset.length > 0) {
    return existing.recordset[0].ContactId;
  }

  // Insert contact
  const displayName = name || `Customer (${phone.slice(-4)})`;
  const insertRes = await pool.request()
    .input('phone', sql.NVarChar(50), phone)
    .input('name', sql.NVarChar(255), displayName)
    .query(`
      INSERT INTO dbo.WhatsAppContacts (Phone, Name, OptedIn, CreatedAt, UpdatedAt)
      OUTPUT inserted.ContactId
      VALUES (@phone, @name, 1, SYSUTCDATETIME(), SYSUTCDATETIME())
    `);
  
  return insertRes.recordset[0].ContactId;
}

/**
 * Send WhatsApp template message using Meta API or fallback to mock simulation
 */
async function sendTemplateMessage({ phone, templateName, params, orderId = null }) {
  const enabled = process.env.WHATSAPP_ENABLED !== 'false';
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v20.0';

  const formattedPhone = formatPhoneNumber(phone);
  const bodyText = renderTemplateText(templateName, params);

  logger.info({
    event: 'whatsapp.send_attempt',
    phone: formattedPhone,
    template: templateName,
    orderId
  });

  const pool = await poolPromise;
  const contactId = await ensureContactExists(pool, formattedPhone, params[0]);

  // If WhatsApp notifications are globally disabled or credentials missing
  if (!enabled || !token || !phoneId) {
    const skipStatus = 'SKIPPED_CONFIG_MISSING';
    
    // Save to local message ledger as skipped
    await pool.request()
      .input('contactId', sql.Int, contactId)
      .input('orderId', sql.BigInt, orderId)
      .input('direction', sql.NVarChar(20), 'SENT')
      .input('templateName', sql.NVarChar(150), templateName)
      .input('bodyText', sql.NVarChar(sql.MAX), bodyText)
      .input('status', sql.NVarChar(50), skipStatus)
      .input('err', sql.NVarChar(500), 'Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID')
      .query(`
        INSERT INTO dbo.WhatsAppMessages (ContactId, OrderId, Direction, MessageSid, TemplateName, BodyText, DeliveryStatus, ErrorMessage, SentAt)
        VALUES (@contactId, @orderId, @direction, 'MOCK-' + CAST(NEWID() AS NVARCHAR(50)), @templateName, @bodyText, @status, @err, SYSUTCDATETIME())
      `);

    logger.warn({
      event: 'whatsapp.skipped',
      phone: formattedPhone,
      reason: 'credentials_missing',
      body: bodyText
    });

    return {
      status: skipStatus,
      body: bodyText,
      simulated: true
    };
  }

  // Meta Cloud API Request Configuration
  try {
    const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US'
        },
        components: [
          {
            type: 'body',
            parameters: params.map(p => ({
              type: 'text',
              text: String(p)
            }))
          }
        ]
      }
    };

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(id);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const responseData = await response.json();
    const wabaMsgId = responseData?.messages?.[0]?.id || 'WABA-' + Math.random().toString(36).slice(2);

    await pool.request()
      .input('contactId', sql.Int, contactId)
      .input('orderId', sql.BigInt, orderId)
      .input('direction', sql.NVarChar(20), 'SENT')
      .input('messageSid', sql.NVarChar(150), wabaMsgId)
      .input('templateName', sql.NVarChar(150), templateName)
      .input('bodyText', sql.NVarChar(sql.MAX), bodyText)
      .query(`
        INSERT INTO dbo.WhatsAppMessages (ContactId, OrderId, Direction, MessageSid, TemplateName, BodyText, DeliveryStatus, SentAt)
        VALUES (@contactId, @orderId, @direction, @messageSid, @templateName, @bodyText, 'SENT', SYSUTCDATETIME())
      `);

    logger.info({
      event: 'whatsapp.sent_success',
      phone: formattedPhone,
      wabaMsgId
    });

    return {
      status: 'SENT',
      wabaMsgId,
      body: bodyText
    };
  } catch (error) {
    const errorMsg = error.message || 'Meta API Call Failed';
    logger.error({
      event: 'whatsapp.sent_failed',
      phone: formattedPhone,
      error: errorMsg
    });

    await pool.request()
      .input('contactId', sql.Int, contactId)
      .input('orderId', sql.BigInt, orderId)
      .input('direction', sql.NVarChar(20), 'SENT')
      .input('templateName', sql.NVarChar(150), templateName)
      .input('bodyText', sql.NVarChar(sql.MAX), bodyText)
      .input('err', sql.NVarChar(500), errorMsg.slice(0, 500))
      .query(`
        INSERT INTO dbo.WhatsAppMessages (ContactId, OrderId, Direction, MessageSid, TemplateName, BodyText, DeliveryStatus, ErrorMessage, SentAt)
        VALUES (@contactId, @orderId, @direction, 'ERR-' + CAST(NEWID() AS NVARCHAR(50)), @templateName, @bodyText, 'FAILED', @err, SYSUTCDATETIME())
      `);

    return {
      status: 'FAILED',
      error: errorMsg,
      body: bodyText
    };
  }
}

module.exports = {
  formatPhoneNumber,
  renderTemplateText,
  sendTemplateMessage,
  ensureContactExists
};

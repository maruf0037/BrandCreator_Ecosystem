// test_whatsapp_crm.js
// Standalone validator for BrandCreator WhatsApp CRM + Transactional notifications.

require('dotenv').config();
const { poolPromise, sql } = require('./config/db');
const whatsappService = require('./services/whatsappService');
const whatsappController = require('./controllers/whatsappController');

async function runTests() {
  console.log('=== BRANDCREATOR WHATSAPP CRM TEST SUITE ===');
  
  try {
    const pool = await poolPromise;
    console.log('✅ Database connected successfully.');

    // 1. Verify Phone Number Cleanups
    console.log('\n--- 1. Testing Phone Formatting ---');
    const phones = ['01712345678', '+8801811223344', '8801912345678', ' 015-1234-5678 '];
    phones.forEach(p => {
      const formatted = whatsappService.formatPhoneNumber(p);
      console.log(`Original: "${p}" => Formatted: "${formatted}"`);
    });

    // 2. Verify Template Rendering Logic
    console.log('\n--- 2. Testing Template Preview Renderer ---');
    const orderConf = whatsappService.renderTemplateText('order_confirmation', ['Abir', 'BC-ORD-987654', '1500.00']);
    console.log('Order Confirmation:', orderConf);

    const paymentVerified = whatsappService.renderTemplateText('payment_verified', ['Abir', 'BC-ORD-987654']);
    console.log('Payment Verified:', paymentVerified);

    // 3. Test Manual Template Send Simulator (credentials missing fallback)
    console.log('\n--- 3. Testing Notification Dispatch with Mock Fallback ---');
    const result = await whatsappService.sendTemplateMessage({
      phone: '01799887766',
      templateName: 'order_confirmation',
      params: ['Test Customer', 'BC-ORD-999999', '849.00'],
      orderId: null
    });
    console.log('Send Message result:', result);

    // Check database to ensure it was saved to WhatsAppMessages
    const dbCheck = await pool.request()
      .query(`
        SELECT TOP 1 m.BodyText, m.DeliveryStatus, c.Phone 
        FROM dbo.WhatsAppMessages m
        INNER JOIN dbo.WhatsAppContacts c ON m.ContactId = c.ContactId
        ORDER BY m.SentAt DESC
      `);
    if (dbCheck.recordset.length > 0) {
      const row = dbCheck.recordset[0];
      console.log('✅ Message stored in DB correctly:');
      console.log(`   Phone: ${row.Phone}`);
      console.log(`   Status: ${row.DeliveryStatus}`);
      console.log(`   Text: ${row.BodyText}`);
    } else {
      throw new Error('Message was not stored in database');
    }

    // 4. Test Webhook subscription verification challenge
    console.log('\n--- 4. Testing GET Webhook Challenge Verification ---');
    let verifyResponse = '';
    const mockReqGet = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'brandcreator_verify_token',
        'hub.challenge': 'CHALLENGE_ACCEPTED_12345'
      }
    };
    const mockResGet = {
      status: (code) => {
        return {
          send: (txt) => {
            verifyResponse = txt;
            return { code };
          }
        };
      }
    };
    await whatsappController.verifyMetaWebhook(mockReqGet, mockResGet);
    console.log('Webhook Echo Response:', verifyResponse);
    if (verifyResponse === 'CHALLENGE_ACCEPTED_12345') {
      console.log('✅ Webhook verification passed.');
    } else {
      throw new Error('Webhook verification failed');
    }

    // 5. Test POST Webhook updates (status and incoming message simulation)
    console.log('\n--- 5. Testing POST Webhook Event Receiver ---');
    const mockReqPost = {
      body: {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WABA-1234567890',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '16505553333', phone_number_id: '1234567890' },
                  contacts: [{ profile: { name: 'Meta Guest User' }, wa_id: '8801611001100' }],
                  messages: [
                    {
                      from: '8801611001100',
                      id: 'wamid.HBgMODgwMTYxMTAwMTEwMBIVAgY0NEVEM0RDMTJCMzBCN0EyMwA=',
                      timestamp: '1650555333',
                      text: { body: 'Hello! I need support regarding my custom storefront order confirmation.' },
                      type: 'text'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      }
    };
    const mockResPost = {
      status: (code) => {
        return {
          json: (obj) => {
            return { code, obj };
          }
        };
      }
    };

    await whatsappController.handleMetaWebhookEvent(mockReqPost, mockResPost);
    
    // Verify in database that webhook parsed and logged correctly
    const webhookCheck = await pool.request()
      .query(`
        SELECT TOP 1 m.BodyText, m.Direction, c.Name 
        FROM dbo.WhatsAppMessages m
        INNER JOIN dbo.WhatsAppContacts c ON m.ContactId = c.ContactId
        WHERE m.Direction = 'RECEIVED'
        ORDER BY m.SentAt DESC
      `);
    
    if (webhookCheck.recordset.length > 0) {
      const row = webhookCheck.recordset[0];
      console.log('✅ Incoming message webhook processed and saved correctly:');
      console.log(`   Customer: ${row.Name}`);
      console.log(`   Direction: ${row.Direction}`);
      console.log(`   Body: ${row.BodyText}`);
    } else {
      throw new Error('Webhook incoming message was not saved in DB');
    }

    console.log('\n=============================================');
    console.log('🎉 ALL WHATSAPP CRM INTEGRATION TESTS PASSED!');
    console.log('=============================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ WHATSAPP CRM TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runTests();

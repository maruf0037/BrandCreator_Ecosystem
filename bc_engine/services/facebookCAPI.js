// cspell:ignore GraphAPI
const crypto = require('crypto');
const https = require('https');
const logger = require('../src/logger');

// Retrieve configurations from environment
const PIXEL_ID = process.env.META_PIXEL_ID || null;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || null;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.brandcreator.eu.cc';

/**
 * Hash utility for SHA-256 matching keys
 */
function hashSHA256(val) {
    if (!val) return null;
    const clean = val.toString().trim().toLowerCase();
    if (!clean) return null;
    return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Phone-specific hash utility: retains digits only, then hashes
 */
function hashPhone(val) {
    if (!val) return null;
    const clean = val.toString().replace(/\D/g, ''); // keep only numbers
    if (!clean) return null;
    return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Dispatches a server-to-server tracking event to Meta conversions API.
 * This is non-blocking and handles failures gracefully to protect core transactions.
 * 
 * @param {string} eventName - Standard Meta CAPI event (e.g. Purchase, AddToCart, InitiateCheckout)
 * @param {Object} userData - Customer matching parameters (email, phone, ipAddress, userAgent)
 * @param {Object} customData - Event metrics (value, currency, contentName, contents)
 * @param {string} [eventSourceUrl] - Page URL triggering the event (defaults to frontend domain)
 * @param {string} [eventId] - Unique identifier for deduplication against browser Pixel
 */
async function sendServerEvent(eventName, userData = {}, customData = {}, eventSourceUrl = null, eventId = null) {
    if (!PIXEL_ID || !ACCESS_TOKEN) {
        logger.debug('Meta Conversions API (CAPI) skipped: META_PIXEL_ID or META_ACCESS_TOKEN is not configured.');
        return;
    }

    try {
        const timestamp = Math.floor(Date.now() / 1000);
        
        // 1. Resolve User Data matching parameters
        const userDataPayload = {
            client_ip_address: userData.ipAddress || null,
            client_user_agent: userData.userAgent || null,
        };

        if (userData.email) {
            userDataPayload.em = [hashSHA256(userData.email)];
        }
        if (userData.phone) {
            userDataPayload.ph = [hashPhone(userData.phone)];
        }
        if (userData.firstName) {
            userDataPayload.fn = [hashSHA256(userData.firstName)];
        }
        if (userData.lastName) {
            userDataPayload.ln = [hashSHA256(userData.lastName)];
        }

        // Strip null/undefined matching parameters
        for (const key of Object.keys(userDataPayload)) {
            if (userDataPayload[key] === null || userDataPayload[key] === undefined) {
                delete userDataPayload[key];
            }
        }

        // 2. Prepare CAPI request body
        const eventData = {
            event_name: eventName,
            event_time: timestamp,
            user_data: userDataPayload,
            custom_data: {
                currency: customData.currency || 'BDT',
                value: customData.value ? parseFloat(customData.value) : 0.00,
                content_type: customData.contentType || 'product'
            },
            event_source_url: eventSourceUrl || FRONTEND_URL,
            action_source: 'website'
        };

        if (eventId) {
            eventData.event_id = eventId;
        }

        if (customData.contents && Array.isArray(customData.contents)) {
            eventData.custom_data.contents = customData.contents.map(item => ({
                id: item.productId.toString(),
                quantity: item.qty,
                item_price: item.unitPrice ? parseFloat(item.unitPrice) : undefined
            }));
        }

        const payload = {
            data: [eventData]
        };

        // Add Facebook test event code if defined
        if (TEST_EVENT_CODE) {
            payload.test_event_code = TEST_EVENT_CODE;
        }

        const bodyData = JSON.stringify(payload);

        // 3. Dispatch native HTTP request to Meta Graph API
        const path = `/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData)
            }
        };

        const req = https.request(options, (res) => {
            let responseBody = '';
            
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            
            res.on('end', () => {
                const parsed = JSON.parse(responseBody);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    logger.info(`Meta CAPI Success: Telemetry for event '${eventName}' dispatched successfully. Received: ${parsed.events_received || 0} events.`);
                } else {
                    logger.error(`Meta CAPI Error Response (Status ${res.statusCode}): ${JSON.stringify(parsed.error || parsed)}`);
                }
            });
        });

        req.on('error', (err) => {
            logger.error(`Meta CAPI Connection Error: ${err.message}`);
        });

        // Write request payload and close connection
        req.write(bodyData);
        req.end();

    } catch (err) {
        logger.error(`Meta CAPI Telemetry Dispatch Exception: ${err.message}`);
    }
}

module.exports = {
    sendServerEvent,
    hashSHA256,
    hashPhone
};

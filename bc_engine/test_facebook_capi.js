// test_facebook_capi.js
// Dry-run test suite for Meta Conversions API (CAPI) Integration

const assert = require('assert');
const facebookCAPI = require('./services/facebookCAPI');
const crypto = require('crypto');

console.log('======================================================');
console.log('STARTING META CONVERSIONS API (CAPI) UNIT & E2E TESTS');
console.log('======================================================\n');

try {
    // -----------------------------------------------------------------
    // Step 1: Verify Hashing Utilities (SHA-256)
    // -----------------------------------------------------------------
    console.log('--- Step 1: Testing Cryptographic Hashing Helpers ---');
    
    // Email hashing: lowercase, trimmed
    const rawEmail = '  Customer@Test.Com ';
    const expectedEmailHash = crypto.createHash('sha256').update('customer@test.com').digest('hex');
    const actualEmailHash = facebookCAPI.hashSHA256(rawEmail);
    assert.strictEqual(actualEmailHash, expectedEmailHash, '❌ Email hash mismatch!');
    console.log('   ✅ Pass: Email lowercase and trim hashing works.');

    // Phone hashing: digits only
    const rawPhone = ' +880-1712-345-678 ';
    const expectedPhoneHash = crypto.createHash('sha256').update('8801712345678').digest('hex');
    const actualPhoneHash = facebookCAPI.hashPhone(rawPhone);
    assert.strictEqual(actualPhoneHash, expectedPhoneHash, '❌ Phone hash mismatch!');
    console.log('   ✅ Pass: Phone number digit stripping and hashing works.');

    // Null safety
    assert.strictEqual(facebookCAPI.hashSHA256(null), null, '❌ Null email hashing failed safety check!');
    assert.strictEqual(facebookCAPI.hashPhone(''), null, '❌ Empty phone hashing failed safety check!');
    console.log('   ✅ Pass: Null-safety and empty string checks pass.\n');

    // -----------------------------------------------------------------
    // Step 2: Validate Event Dispatch Logic (InitiateCheckout & Purchase)
    // -----------------------------------------------------------------
    console.log('--- Step 2: Testing dry-run sendServerEvent dispatch ---');
    
    const sampleUserData = {
        email: 'john.doe@brandcreator.xyz',
        phone: '+1 (555) 019-2834',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        firstName: 'John',
        lastName: 'Doe'
    };

    const sampleCustomData = {
        value: 12500.50,
        currency: 'BDT',
        contentType: 'product',
        contents: [
            { productId: 101, qty: 2, unitPrice: 5000.25 },
            { productId: 102, qty: 1, unitPrice: 2500.00 }
        ]
    };

    console.log('   📡 Triggering server-to-server dispatch (InitiateCheckout)...');
    facebookCAPI.sendServerEvent('InitiateCheckout', sampleUserData, sampleCustomData, 'https://brandcreator.xyz/checkout', 'TEST-ORDER-123')
        .then(() => {
            console.log('   ✅ Pass: InitiateCheckout event triggered without throwing exceptions.\n');
            
            console.log('   📡 Triggering server-to-server dispatch (Purchase)...');
            return facebookCAPI.sendServerEvent('Purchase', sampleUserData, sampleCustomData, 'https://brandcreator.xyz/checkout/thank-you', 'TEST-ORDER-123');
        })
        .then(() => {
            console.log('   ✅ Pass: Purchase event triggered without throwing exceptions.\n');
            console.log('======================================================');
            console.log('*** ALL META CAPI DIAGNOSTICS & TELEMETRY PASSED! ***');
            console.log('======================================================');
        })
        .catch(err => {
            console.error('❌ CAPI E2E verification failed:', err);
            process.exit(1);
        });

} catch (err) {
    console.error('❌ Assertion failed:', err.message);
    process.exit(1);
}

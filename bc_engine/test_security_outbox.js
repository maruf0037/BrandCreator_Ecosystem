const assert = require('assert');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };
  
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  
  const response = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // raw text
  }
  return { status: response.status, data };
}

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 1.3 INTEGRATION TEST SUITE');
  console.log('==================================================\n');

  // SETUP: Create two supplier emails
  const supplierA = 'supplier-a@test.com';
  const supplierB = 'supplier-b@test.com';

  // 1. PRODUCT CREATION (Expected: 201)
  console.log('1. Creating product P1 for supplier A ownership tests (Expected: 201)...');
  const createProdResult = await request('/api/products', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' },
    body: { supplierUserId: 101, sku: 'SKU-OWN-' + Math.floor(Math.random() * 1000000), productName: 'Ownership T-Shirt' }
  });
  assert.strictEqual(createProdResult.status, 201);
  const p1Id = createProdResult.data.productId;
  console.log(`   -> Pass: Product P1 created with ID = ${p1Id}`);

  // 2. ASSIGN OWNERSHIP TO SUPPLIER A (Expected: 200)
  console.log(`2. Assigning P1 ownership strictly to Supplier A (${supplierA}) (Expected: 200)...`);
  const assignResult = await request(`/api/products/${p1Id}/ownership/assign`, {
    method: 'POST',
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' },
    body: { supplierEmail: supplierA }
  });
  assert.strictEqual(assignResult.status, 200);
  assert.strictEqual(assignResult.data.supplierEmail, supplierA);
  assert.strictEqual(assignResult.data.isActive, true);
  console.log('   -> Pass: Ownership assigned successfully');

  // 3. ROW-LEVEL ACCESS ENFORCEMENT BLOCK (Expected: 403)
  console.log(`3. Supplier B (${supplierB}) attempts to access P1 details (Expected: 403)...`);
  const accessDenied = await request(`/api/products/${p1Id}`, {
    headers: { 'x-user-email': supplierB, 'x-user-role': 'Supplier' }
  });
  assert.strictEqual(accessDenied.status, 403);
  assert.strictEqual(accessDenied.data.error, 'FORBIDDEN');
  console.log('   -> Pass: Correctly blocked Supplier B with 403 Forbidden!');

  // 4. ROW-LEVEL ACCESS ENFORCEMENT ALLOW (Expected: 200)
  console.log(`4. Supplier A (${supplierA}) accesses P1 details (Expected: 200)...`);
  const accessAllowed = await request(`/api/products/${p1Id}`, {
    headers: { 'x-user-email': supplierA, 'x-user-role': 'Supplier' }
  });
  assert.strictEqual(accessAllowed.status, 200);
  assert.strictEqual(accessAllowed.data.productId, p1Id);
  console.log('   -> Pass: Supplier A successfully retrieves product P1 details');

  // 5. PRE-STOCKED PRODUCT P2 FOR WEBHOOKS (Expected: 201)
  console.log('\n5. Creating and stocking product P2 for webhook test (Expected: 201)...');
  const p2Result = await request('/api/products', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' },
    body: { supplierUserId: 101, sku: 'SKU-WEB-' + Math.floor(Math.random() * 1000000), productName: 'Webhook Premium Mug' }
  });
  const p2Id = p2Result.data.productId;
  
  // Assign ownership of P2 to Supplier A so Supplier A can query it later
  await request(`/api/products/${p2Id}/ownership/assign`, {
    method: 'POST',
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' },
    body: { supplierEmail: supplierA }
  });

  // Stock 100 to MASTER
  await request('/api/inventory/transactions', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' },
    body: { productId: p2Id, ledgerType: 'MASTER', txnType: 'IN', qty: 100 }
  });
  // Transfer to SELL
  const transfer = await request('/api/inventory/transfers', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' },
    body: { productId: p2Id, qty: 100 }
  });
  await request(`/api/inventory/transfers/${transfer.data.transferId}/approve`, {
    method: 'POST',
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' }
  });
  console.log('   -> Pass: Product P2 loaded with 100 units SELL stock');

  // 6. CREATE AN ORDER PENDING (Expected: 201)
  const orderRef = 'ORD-WEB-' + Math.floor(Math.random() * 1000000);
  console.log(`6. Creating order ${orderRef} buying 10 units of P2 (Expected: 201)...`);
  const createOrder = await request('/api/orders', {
    method: 'POST',
    headers: { 'x-user-email': 'customer@test.com', 'x-user-role': 'Customer' },
    body: {
      orderRef,
      items: [{ productId: p2Id, qty: 10, unitPrice: 250.00 }]
    }
  });
  assert.strictEqual(createOrder.status, 201);
  console.log('   -> Pass: Order created in PENDING state');

  // 7. PAYMENT WEBHOOK INVALID SIGNATURE BLOCK (Expected: 401)
  console.log('7. Sending webhook callback with invalid signature (Expected: 401)...');
  const badWebhook = await request(`/api/webhooks/payment/bkash`, {
    method: 'POST',
    headers: {
      'X-Signature': 'invalid_hash_signature',
      'X-Event-Ref': 'EVT-' + Math.floor(Math.random() * 1000000)
    },
    body: { orderRef, eventType: 'CAPTURE', amount: 2500.00 }
  });
  assert.strictEqual(badWebhook.status, 401);
  assert.strictEqual(badWebhook.data.error, 'INVALID_SIGNATURE');
  console.log('   -> Pass: Invalid webhook signature blocked with 401!');

  // 8. PAYMENT WEBHOOK VALID SIGNATURE (Expected: 200)
  const eventRef = 'EVT-' + Math.floor(Math.random() * 1000000);
  const webhookBody = { orderRef, eventType: 'CAPTURE', amount: 2500.00 };
  const secret = 'webhook_secret_placeholder';
  const validSignature = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(webhookBody))
    .digest('hex');

  console.log(`8. Sending valid signed webhook callback (EventRef: ${eventRef}) (Expected: 200)...`);
  const goodWebhook = await request(`/api/webhooks/payment/bkash`, {
    method: 'POST',
    headers: {
      'X-Signature': validSignature,
      'X-Event-Ref': eventRef
    },
    body: webhookBody
  });
  assert.strictEqual(goodWebhook.status, 200);
  assert.strictEqual(goodWebhook.data.verified, true);
  assert.strictEqual(goodWebhook.data.processed, true);
  console.log('   -> Pass: Webhook verified successfully');

  // Verify stock was committed (SELL OnHand decreased from 100 to 90)
  const ledgersCheck = await request(`/api/products/${p2Id}/ledgers`, {
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' }
  });
  assert.strictEqual(ledgersCheck.data.sell.onHandQty, 90);
  console.log('   -> Pass: Stock successfully COMMITTED from 100 to 90');

  // 9. WEBHOOK IDEMPOTENT DUPLICATE REPLAY (Expected: 200)
  console.log('9. Re-sending identical webhook to test idempotency (Expected: 200)...');
  const duplicateWebhook = await request(`/api/webhooks/payment/bkash`, {
    method: 'POST',
    headers: {
      'X-Signature': validSignature,
      'X-Event-Ref': eventRef
    },
    body: webhookBody
  });
  assert.strictEqual(duplicateWebhook.status, 200);
  assert.strictEqual(duplicateWebhook.data.idempotentReplay, true);
  console.log('   -> Pass: Idempotent replay identified and cached response returned');

  // 10. OUTBOX WORKER POLLING (Expected: 200)
  console.log('\n10. Polling outbox worker to fetch due events (Expected: 200)...');
  const pollResult = await request('/api/outbox/worker/poll', {
    method: 'POST',
    headers: { 'x-user-email': 'worker@system.com', 'x-user-role': 'SystemWorker' }
  });
  assert.strictEqual(pollResult.status, 200);
  const outboxItem = pollResult.data.items.find(i => i.aggregateId === orderRef);
  assert.ok(outboxItem);
  const outboxId = outboxItem.outboxId;
  console.log(`    -> Pass: Successfully polled and found ORDER_CONFIRMED event for outbox #${outboxId}`);

  // 11. OUTBOX RETRY PROGRESSIVE BACKOFF & DLQ TRANSITIONS
  console.log('\n11. Testing Outbox progressive retry backoffs & Dead-Letter limits...');
  
  // Attempt 1: Fail
  console.log('    Attempt 1: Fail...');
  const attempt1 = await request(`/api/outbox/${outboxId}/worker/result`, {
    method: 'POST',
    headers: { 'x-user-email': 'worker@system.com', 'x-user-role': 'SystemWorker' },
    body: { status: 'FAILED', errorMessage: 'Host unreachable' }
  });
  assert.strictEqual(attempt1.data.status, 'FAILED');
  assert.strictEqual(attempt1.data.retryCount, 1);
  assert.ok(attempt1.data.nextRetryAt);
  console.log(`       -> Retry 1 registered successfully. Backoff nextRetryAt: ${attempt1.data.nextRetryAt}`);

  // Attempt 2: Fail
  console.log('    Attempt 2: Fail...');
  const attempt2 = await request(`/api/outbox/${outboxId}/worker/result`, {
    method: 'POST',
    headers: { 'x-user-email': 'worker@system.com', 'x-user-role': 'SystemWorker' },
    body: { status: 'FAILED', errorMessage: 'SMTP Timeout' }
  });
  assert.strictEqual(attempt2.data.status, 'FAILED');
  assert.strictEqual(attempt2.data.retryCount, 2);

  // Attempt 3: Fail
  console.log('    Attempt 3: Fail...');
  const attempt3 = await request(`/api/outbox/${outboxId}/worker/result`, {
    method: 'POST',
    headers: { 'x-user-email': 'worker@system.com', 'x-user-role': 'SystemWorker' },
    body: { status: 'FAILED', errorMessage: 'Internal socket closed' }
  });
  assert.strictEqual(attempt3.data.status, 'FAILED');
  assert.strictEqual(attempt3.data.retryCount, 3);

  // Attempt 4: Fail
  console.log('    Attempt 4: Fail...');
  const attempt4 = await request(`/api/outbox/${outboxId}/worker/result`, {
    method: 'POST',
    headers: { 'x-user-email': 'worker@system.com', 'x-user-role': 'SystemWorker' },
    body: { status: 'FAILED', errorMessage: 'Rate limit hit' }
  });
  assert.strictEqual(attempt4.data.status, 'FAILED');
  assert.strictEqual(attempt4.data.retryCount, 4);

  // Attempt 5: Fail -> Should trigger DEAD_LETTER!
  console.log('    Attempt 5: Fail (Expected: DEAD_LETTER)...');
  const attempt5 = await request(`/api/outbox/${outboxId}/worker/result`, {
    method: 'POST',
    headers: { 'x-user-email': 'worker@system.com', 'x-user-role': 'SystemWorker' },
    body: { status: 'FAILED', errorMessage: 'Max attempts reached' }
  });
  assert.strictEqual(attempt5.data.status, 'DEAD_LETTER');
  assert.strictEqual(attempt5.data.retryCount, 5);
  console.log('       -> Pass: Exceeded 5 attempts and successfully shifted to DEAD_LETTER pool!');

  // 12. DYNAMIC LOW-STOCK POLICIES CONFIGURATION (Expected: 200)
  console.log('\n12. Setting custom low-stock thresholds policy for P2 (Expected: 200)...');
  const policyResult = await request(`/api/products/${p2Id}/stock-policy`, {
    method: 'POST',
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' },
    body: { sellLowStockThreshold: 95, masterLowStockThreshold: 200, isAlertEnabled: true }
  });
  assert.strictEqual(policyResult.status, 200);
  assert.strictEqual(policyResult.data.sellLowStockThreshold, 95);
  assert.strictEqual(policyResult.data.isAlertEnabled, true);
  console.log('    -> Pass: Low-stock threshold policies applied successfully');

  // 13. DYNAMIC LOW-STOCK ALERTS LISTING (Expected: 200)
  console.log('13. Querying low-stock alert violations listing as Admin (Expected: 200)...');
  const alertsList = await request('/api/alerts/low-stock', {
    headers: { 'x-user-email': 'admin@test.com', 'x-user-role': 'Admin' }
  });
  assert.strictEqual(alertsList.status, 200);
  // Find P2 in alert list (it has OnHand = 90 which is below threshold = 95)
  const p2Alert = alertsList.data.items.find(i => i.productId === p2Id);
  assert.ok(p2Alert);
  assert.strictEqual(p2Alert.sellOnHand, 90);
  assert.strictEqual(p2Alert.threshold, 95);
  assert.strictEqual(p2Alert.severity, 'MEDIUM'); // 90 is >= 47.5 (50% of 95)
  console.log(`    -> Pass: Correctly flagged P2 alert! Severity: ${p2Alert.severity}`);

  console.log('\n==================================================');
  console.log('🎉 ALL PHASE 1.3 INTEGRATION TESTS PASSED! 🎉');
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  if (err.actual !== undefined) {
    console.error(`   Expected: ${err.expected}`);
    console.error(`   Actual:   ${err.actual}`);
  }
  process.exit(1);
});

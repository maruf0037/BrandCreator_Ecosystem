const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 1.2 ORDER PIPELINE TEST SUITE');
  console.log('==================================================\n');

  let testProductId = null;
  let testTransferId = null;
  const testSku = 'SKU-ORD-' + Math.floor(Math.random() * 100000);

  // Helper for requests
  async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const status = response.status;
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // Not JSON
    }

    return { status, data };
  }

  // 1. CREATE PRODUCT
  console.log('1. Creating product for order tests (Expected: 201)...');
  const createProdRes = await request('/api/products', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      supplierUserId: 12,
      sku: testSku,
      productName: 'Cozy Bamboo Hoodie'
    }
  });
  assert.strictEqual(createProdRes.status, 201);
  testProductId = createProdRes.data.productId;
  console.log(`   -> Pass: Product created with ProductId = ${testProductId}\n`);

  // 2. STOCK THE MASTER POOL WITH 100 ITEMS
  console.log('2. Stocking 100 units to MASTER ledger (Expected: 200)...');
  const stockInRes = await request('/api/inventory/transactions', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      productId: testProductId,
      ledgerType: 'MASTER',
      txnType: 'IN',
      qty: 100,
      refType: 'PURCHASE',
      refId: 'PO-2026-ORD',
      note: 'Initial hoodie stock'
    }
  });
  assert.strictEqual(stockInRes.status, 200);
  console.log('   -> Pass: Stocked 100 units to MASTER\n');

  // 3. TRANSFER 100 ITEMS FROM MASTER TO SELL
  console.log('3. Requesting stock transfer of 100 units MASTER -> SELL (Expected: 201)...');
  const transferRes = await request('/api/inventory/transfers', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      productId: testProductId,
      qty: 100,
      note: 'Transfer all stock to digital storefront'
    }
  });
  assert.strictEqual(transferRes.status, 201);
  testTransferId = transferRes.data.transferId;

  console.log('4. Approving transfer to load stock into SELL pool (Expected: 200)...');
  const approveRes = await request(`/api/inventory/transfers/${testTransferId}/approve`, {
    method: 'POST',
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'SuperAdmin'
    }
  });
  assert.strictEqual(approveRes.status, 200);

  // Verify SELL stock has 100 available
  const ledgerRes = await request(`/api/products/${testProductId}/ledgers`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(ledgerRes.data.sell.onHandQty, 100);
  assert.strictEqual(ledgerRes.data.sell.availableQty, 100);
  console.log('   -> Pass: SELL ledger successfully stocked with 100 units\n');

  // 4. CREATE ORDER 1: COZY BAMBOO HOODIE (10 QTY)
  const order1Ref = 'ORD-' + Math.floor(Math.random() * 1000000);
  console.log(`5. Creating order ${order1Ref} buying 10 units (Expected: 201)...`);
  const createOrder1 = await request('/api/orders', {
    method: 'POST',
    headers: {
      'x-user-email': 'customer@example.com',
      'x-user-role': 'Customer'
    },
    body: {
      orderRef: order1Ref,
      items: [
        { productId: testProductId, qty: 10, unitPrice: 850.00 }
      ],
      currency: 'BDT'
    }
  });
  if (createOrder1.status !== 201) {
    console.error('   -> Failed with status:', createOrder1.status);
    console.error('   -> Error data:', JSON.stringify(createOrder1.data, null, 2));
  }
  assert.strictEqual(createOrder1.status, 201);
  assert.strictEqual(createOrder1.data.status, 'PENDING');
  assert.strictEqual(createOrder1.data.reservation, 'DONE');
  console.log('   -> Pass: Order pending created successfully & reservation completed');
  console.log('   -> Response:', JSON.stringify(createOrder1.data, null, 2), '\n');

  // 5. VERIFY SELL LEDGER HAS RESERVED 10 UNITS
  console.log('6. Checking stock reservation on SELL ledger (Expected: 200)...');
  const reservedLedgerRes = await request(`/api/products/${testProductId}/ledgers`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(reservedLedgerRes.data.sell.onHandQty, 100);
  assert.strictEqual(reservedLedgerRes.data.sell.reservedQty, 10);
  assert.strictEqual(reservedLedgerRes.data.sell.availableQty, 90);
  console.log('   -> Pass: SELL ledger Reserved = 10, Available = 90\n');

  // 6. PLACE ORDER 2 EXCEEDING AVAILABLE STOCK (Should fail 400)
  const order2Ref = 'ORD-' + Math.floor(Math.random() * 1000000);
  console.log(`7. Trying to create order ${order2Ref} buying 120 units (Expected: 400)...`);
  const createOrder2 = await request('/api/orders', {
    method: 'POST',
    headers: {
      'x-user-email': 'customer@example.com',
      'x-user-role': 'Customer'
    },
    body: {
      orderRef: order2Ref,
      items: [
        { productId: testProductId, qty: 120, unitPrice: 850.00 }
      ]
    }
  });
  if (createOrder2.status !== 400) {
    console.error('   -> Failed with status:', createOrder2.status);
    console.error('   -> Error data:', JSON.stringify(createOrder2.data, null, 2));
  }
  assert.strictEqual(createOrder2.status, 400);
  assert.strictEqual(createOrder2.data.error, 'INSUFFICIENT_STOCK');
  console.log('   -> Pass: Correctly blocked with 400 and INSUFFICIENT_STOCK error');
  console.log('   -> Response:', JSON.stringify(createOrder2.data, null, 2), '\n');

  // 7. CONFIRM ORDER 1 (PAYMENT SUCCESS) WITH IDEMPOTENCY KEY
  const idemKey = 'idem-' + Math.floor(Math.random() * 1000000);
  console.log(`8. Confirming order ${order1Ref} with Idempotency Key: ${idemKey} (Expected: 200)...`);
  const confirmRes = await request(`/api/orders/${order1Ref}/confirm`, {
    method: 'POST',
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'SuperAdmin',
      'Idempotency-Key': idemKey
    },
    body: {
      provider: 'BKASH',
      eventType: 'CAPTURE',
      eventRef: 'BK-TRX-8899',
      payload: { amount: 8500.00 }
    }
  });
  assert.strictEqual(confirmRes.status, 200);
  assert.strictEqual(confirmRes.data.status, 'CONFIRMED');
  assert.strictEqual(confirmRes.data.stockAction, 'SELL_COMMIT_DONE');
  console.log('   -> Pass: Order confirmed atomically and stock committed');
  console.log('   -> Response:', JSON.stringify(confirmRes.data, null, 2), '\n');

  // 8. VERIFY STOCK IS FULLY DEDUCTED (COMMIT)
  console.log('9. Checking stock levels after confirm commit (Expected: 200)...');
  const committedLedgerRes = await request(`/api/products/${testProductId}/ledgers`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(committedLedgerRes.data.sell.onHandQty, 90);
  assert.strictEqual(committedLedgerRes.data.sell.reservedQty, 0);
  assert.strictEqual(committedLedgerRes.data.sell.availableQty, 90);
  console.log('   -> Pass: SELL ledger OnHand decreased to 90 (reserved reset to 0)\n');

  // 9. IDEMPOTENCY REPLAY: CALL CONFIRM AGAIN WITH SAME KEY
  console.log('10. Sending duplicate confirm request with same idempotency key (Expected: 200 & idempotentReplay: true)...');
  const replayRes = await request(`/api/orders/${order1Ref}/confirm`, {
    method: 'POST',
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'SuperAdmin',
      'Idempotency-Key': idemKey
    },
    body: {
      provider: 'BKASH',
      eventType: 'CAPTURE',
      eventRef: 'BK-TRX-8899',
      payload: { amount: 8500.00 }
    }
  });
  assert.strictEqual(replayRes.status, 200);
  assert.strictEqual(replayRes.data.idempotentReplay, true);
  assert.strictEqual(replayRes.data.status, 'CONFIRMED');
  console.log('   -> Pass: Duplicate payment event ignored and returned cached response');
  console.log('   -> Response:', JSON.stringify(replayRes.data, null, 2), '\n');

  // 10. CREATE ORDER 3 FOR CANCELLATION (15 QTY)
  const order3Ref = 'ORD-' + Math.floor(Math.random() * 1000000);
  console.log(`11. Creating order ${order3Ref} for cancellation (Expected: 201)...`);
  const createOrder3 = await request('/api/orders', {
    method: 'POST',
    headers: {
      'x-user-email': 'customer@example.com',
      'x-user-role': 'Customer'
    },
    body: {
      orderRef: order3Ref,
      items: [
        { productId: testProductId, qty: 15, unitPrice: 850.00 }
      ]
    }
  });
  assert.strictEqual(createOrder3.status, 201);
  console.log('   -> Pass: Order 3 pending created\n');

  // 11. CANCEL ORDER 3 (RELEASE STOCK)
  console.log(`12. Cancelling order ${order3Ref} (Expected: 200)...`);
  const cancelRes = await request(`/api/orders/${order3Ref}/cancel`, {
    method: 'POST',
    headers: {
      'x-user-email': 'customer@example.com',
      'x-user-role': 'Customer'
    },
    body: {
      provider: 'BKASH',
      eventType: 'CANCEL',
      eventRef: 'BK-TRX-8899-C',
      reason: 'Payment timeout'
    }
  });
  assert.strictEqual(cancelRes.status, 200);
  assert.strictEqual(cancelRes.data.status, 'CANCELLED');
  assert.strictEqual(cancelRes.data.stockAction, 'SELL_RELEASE_DONE');
  console.log('   -> Pass: Order cancelled atomically and stock released');
  console.log('   -> Response:', JSON.stringify(cancelRes.data, null, 2), '\n');

  // 12. VERIFY STOCK IS RELEASED BACK TO AVAILABLE (No reduction in OnHand)
  console.log('13. Checking stock levels after cancel release (Expected: 200)...');
  const cancelledLedgerRes = await request(`/api/products/${testProductId}/ledgers`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(cancelledLedgerRes.data.sell.onHandQty, 90);
  assert.strictEqual(cancelledLedgerRes.data.sell.reservedQty, 0);
  assert.strictEqual(cancelledLedgerRes.data.sell.availableQty, 90);
  console.log('   -> Pass: SELL ledger OnHand remains 90 (reserved reset to 0, available remains 90)\n');

  // 13. GET ORDER EVENTS FOR AUDITING
  console.log('14. Getting payment events for confirm audit (Expected: 200)...');
  const eventsRes = await request(`/api/orders/${order1Ref}/events`, {
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'SuperAdmin'
    }
  });
  assert.strictEqual(eventsRes.status, 200);
  assert.strictEqual(eventsRes.data.items[0].idempotencyKey, idemKey);
  assert.strictEqual(eventsRes.data.items[0].processed, true);
  console.log('   -> Pass: Successfully retrieved payment event log');
  console.log('   -> Response:', JSON.stringify(eventsRes.data, null, 2), '\n');

  // 14. GET PENDING OUTBOX EVENTS
  console.log('15. Fetching pending outbox events (Expected: 200)...');
  const outboxRes = await request('/api/outbox/pending', {
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'SuperAdmin'
    }
  });
  assert.strictEqual(outboxRes.status, 200);
  assert.ok(outboxRes.data.items.length >= 2); // ORDER_CONFIRMED, ORDER_CANCELLED
  const firstEvent = outboxRes.data.items.find(e => e.aggregateId === order1Ref);
  assert.strictEqual(firstEvent.eventType, 'ORDER_CONFIRMED');
  console.log(`   -> Pass: Found ${outboxRes.data.items.length} pending events including ORDER_CONFIRMED for ${order1Ref}`);
  console.log('   -> Pending events:', JSON.stringify(outboxRes.data.items.slice(0, 2), null, 2), '\n');

  // 15. MARK EVENT AS SENT
  console.log(`16. Marking outbox event ID ${firstEvent.outboxId} as SENT (Expected: 200)...`);
  const markRes = await request(`/api/outbox/${firstEvent.outboxId}/mark-sent`, {
    method: 'POST',
    headers: {
      'x-user-email': 'worker@system.com',
      'x-user-role': 'SystemWorker'
    }
  });
  assert.strictEqual(markRes.status, 200);
  assert.strictEqual(markRes.data.status, 'SENT');
  console.log('   -> Pass: Successfully marked event as SENT');
  console.log('   -> Response:', JSON.stringify(markRes.data, null, 2), '\n');

  console.log('==================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});

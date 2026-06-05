const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000';

async function runE2EWalkthrough() {
  console.log('==================================================');
  console.log('STARTING FULL E2E INTEGRATION ROLE WALKTHROUGH');
  console.log('==================================================\n');

  const testSku = 'SKU-E2E-WALK-' + Math.floor(Math.random() * 100000);
  let testProductId = null;
  let testTransferId = null;
  let testOrderId = null;
  let testOrderRef = 'ORD-E2E-' + Math.floor(Math.random() * 100000);

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

  // 1. SUPPLIER ROLE - Create Product
  console.log('1. [Supplier Role] Creating "E2E Silk Shirt" (Expected: 201)...');
  const createProdRes = await request('/api/products', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      supplierUserId: 44,
      sku: testSku,
      productName: 'E2E Silk Shirt'
    }
  });
  assert.strictEqual(createProdRes.status, 201);
  testProductId = createProdRes.data.productId;
  console.log(`   -> Success: Product created with ProductId = ${testProductId}`);
  console.log(`   -> QC Status: ${createProdRes.data.ledgers ? 'DRAFT' : 'UNKNOWN'}\n`);

  // 2. SUPPLIER ROLE - Submit to QC
  console.log('2. [Supplier Role] Submitting product for QC audit (Expected: 200)...');
  const submitQcRes = await request(`/api/products/${testProductId}/qc/submit`, {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      note: 'Please audit this premium silk shirt.'
    }
  });
  assert.strictEqual(submitQcRes.status, 200);
  assert.strictEqual(submitQcRes.data.qcStatus, 'SUBMITTED');
  console.log('   -> Success: Product successfully submitted for QC\n');

  // 3. ADMIN ROLE - Approve QC
  console.log('3. [Admin Role] Auditing and APPROVING product (Expected: 200)...');
  const approveQcRes = await request(`/api/products/${testProductId}/qc/review`, {
    method: 'POST',
    headers: {
      'x-user-email': 'md.marufalrashid@gmail.com',
      'x-user-role': 'SuperAdmin'
    },
    body: {
      decision: 'APPROVE',
      reason: 'Looks wonderful, quality checks out.'
    }
  });
  assert.strictEqual(approveQcRes.status, 200);
  assert.strictEqual(approveQcRes.data.qcStatus, 'APPROVED');
  console.log('   -> Success: Product status set to APPROVED\n');

  // 4. SUPPLIER ROLE - Receive 100 units MASTER stock
  console.log('4. [Supplier Role] Stocking 100 units (IN) to MASTER ledger (Expected: 200)...');
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
      refId: 'PO-E2E-1',
      note: 'Initial production batch'
    }
  });
  assert.strictEqual(stockInRes.status, 200);
  assert.strictEqual(stockInRes.data.newOnHandQty, 100);
  console.log('   -> Success: MASTER ledger now holds 100 units on-hand\n');

  // 5. SUPPLIER ROLE - Request Transfer 50 units MASTER -> SELL
  console.log('5. [Supplier Role] Requesting 50 units transfer MASTER -> SELL (Expected: 201)...');
  const transferRes = await request('/api/inventory/transfers', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      productId: testProductId,
      qty: 50,
      note: 'Move to storefront for catalog availability'
    }
  });
  assert.strictEqual(transferRes.status, 201);
  testTransferId = transferRes.data.transferId;
  console.log(`   -> Success: Transfer requested. TransferId = ${testTransferId}`);
  console.log(`   -> Status: ${transferRes.data.status} (50 units now RESERVED on MASTER)\n`);

  // 6. ADMIN ROLE - Approve Transfer
  console.log('6. [Admin Role] Reviewing and APPROVING transfer request (Expected: 200)...');
  const approveTransferRes = await request(`/api/inventory/transfers/${testTransferId}/approve`, {
    method: 'POST',
    headers: {
      'x-user-email': 'md.marufalrashid@gmail.com',
      'x-user-role': 'SuperAdmin'
    }
  });
  assert.strictEqual(approveTransferRes.status, 200);
  assert.strictEqual(approveTransferRes.data.status, 'COMPLETED');
  console.log('   -> Success: Transfer COMPLETED atomically');
  console.log(`   -> MASTER On-Hand: ${approveTransferRes.data.master.onHandQty} | SELL On-Hand: ${approveTransferRes.data.sell.onHandQty}\n`);

  // 7. CUSTOMER ROLE - Browse Catalog
  console.log('7. [Customer Role] Browsing Active Product Catalog (Expected: 200)...');
  const catalogRes = await request('/api/products', {
    headers: {
      'x-user-email': 'customer@example.com',
      'x-user-role': 'Customer'
    }
  });
  assert.strictEqual(catalogRes.status, 200);
  const activeProduct = catalogRes.data.items.find(p => p.productId === testProductId);
  assert.ok(activeProduct);
  assert.strictEqual(activeProduct.sellOnHand, 50);
  console.log('   -> Success: Verified "E2E Silk Shirt" is active on the storefront catalog');
  console.log(`   -> Available Stock: ${activeProduct.sellOnHand} units\n`);

  // 8. CUSTOMER ROLE - Place Order (Reserve 5 units)
  console.log('8. [Customer Role] Placing storefront order for 5 units (Expected: 201)...');
  const orderRes = await request('/api/orders', {
    method: 'POST',
    headers: {
      'x-user-email': 'customer@example.com',
      'x-user-role': 'Customer'
    },
    body: {
      orderRef: testOrderRef,
      items: [{ productId: testProductId, qty: 5, unitPrice: 120.00 }]
    }
  });
  assert.strictEqual(orderRes.status, 201);
  testOrderId = orderRes.data.orderId;
  console.log(`   -> Success: Order created. OrderId = ${testOrderId} | Ref = ${testOrderRef}`);
  console.log(`   -> Status: ${orderRes.data.status} | Stock reserved successfully\n`);

  // 9. CUSTOMER ROLE - Confirm Order Payment (Commit 5 units)
  console.log('9. [Customer Role] Simulating payment gateway confirm & capture (Expected: 200)...');
  const webhookBody = { orderRef: testOrderRef, eventType: 'CAPTURE', amount: 600.00 };
  
  // Fetch dynamic rotated secret from db
  const pool = await require('./config/db').poolPromise;
  const secretRes = await pool.request()
    .query("SELECT TOP 1 KeyId, SecretValue FROM dbo.SecretVersions WHERE SecretType = 'WEBHOOK' AND IsActive = 1 ORDER BY CreatedAt DESC");
  const activeKey = secretRes.recordset[0];

  const crypto = require('crypto');
  const validSignature = crypto.createHmac('sha256', activeKey.SecretValue)
    .update(JSON.stringify(webhookBody))
    .digest('hex');

  const webhookRes = await request(`/api/webhooks/payment/bkash`, {
    method: 'POST',
    headers: {
      'X-Signature': validSignature,
      'X-Event-Ref': 'EVT-E2E-' + Math.floor(Math.random() * 100000),
      'X-Key-Id': activeKey.KeyId
    },
    body: webhookBody
  });
  assert.strictEqual(webhookRes.status, 200);
  assert.strictEqual(webhookRes.data.processed, true);
  console.log('   -> Success: Webhook event processed and signature verified');
  console.log(`   -> Order status updated: ${webhookRes.data.stockAction}\n`);

  // 10. VERIFY FINAL LEDGER LEVELS
  console.log('10. [Audit Verification] Verifying final ledger stock balance (Expected: 200)...');
  const finalLedgerRes = await request(`/api/products/${testProductId}/ledgers`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(finalLedgerRes.status, 200);
  assert.strictEqual(finalLedgerRes.data.master.onHandQty, 50);
  assert.strictEqual(finalLedgerRes.data.sell.onHandQty, 45); // 50 - 5 committed = 45
  console.log('   -> Success: Final double-ledger balances reconciled perfectly!');
  console.log(`      - MASTER Warehouse Balance: ${finalLedgerRes.data.master.onHandQty} units`);
  console.log(`      - SELL Storefront Catalog Balance: ${finalLedgerRes.data.sell.onHandQty} units\n`);

  console.log('==================================================');
  console.log('🎉 ALL E2E ROLE INTEGRATION FLOWS PASSED SUCCESSFULLY! 🎉');
  console.log('==================================================');
  process.exit(0);
}

runE2EWalkthrough().catch(err => {
  console.error('\n❌ E2E WALKTHROUGH FAILED:', err.message);
  process.exit(1);
});

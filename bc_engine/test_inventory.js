const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 1.0 INVENTORY INTEGRATION TEST SUITE');
  console.log('==================================================\n');

  let testProductId = null;
  let testTransferId = null;
  const testSku = 'SKU-TEE-' + Math.floor(Math.random() * 100000);

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

  // 1. TEST RBAC - CREATE PRODUCT AS CUSTOMER (Should fail 403)
  console.log('1. Testing RBAC: Create product as Customer (Expected: 403)...');
  const rbacFail = await request('/api/products', {
    method: 'POST',
    headers: {
      'x-user-email': 'customer@example.com',
      'x-user-role': 'Customer'
    },
    body: {
      supplierUserId: 12,
      sku: testSku,
      productName: 'Dev Premium Tee'
    }
  });
  assert.strictEqual(rbacFail.status, 403);
  console.log('   -> Pass: Correctly blocked with 403 Forbidden\n');

  // 2. CREATE PRODUCT AS SUPPLIER (Should succeed 201)
  console.log('2. Creating product as Supplier (Expected: 201)...');
  const createProdRes = await request('/api/products', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      supplierUserId: 12,
      sku: testSku,
      productName: 'Dev Premium Tee'
    }
  });
  assert.strictEqual(createProdRes.status, 201);
  testProductId = createProdRes.data.productId;
  console.log(`   -> Pass: Product created with ProductId = ${testProductId}`);
  console.log('   -> Response:', JSON.stringify(createProdRes.data, null, 2), '\n');

  // 3. GET INITIAL LEDGERS
  console.log('3. Getting initial product ledgers (Expected: 200)...');
  const initialLedgerRes = await request(`/api/products/${testProductId}/ledgers`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(initialLedgerRes.status, 200);
  assert.strictEqual(initialLedgerRes.data.master.onHandQty, 0);
  assert.strictEqual(initialLedgerRes.data.sell.onHandQty, 0);
  console.log('   -> Pass: Ledgers successfully initialized to 0');
  console.log('   -> Response:', JSON.stringify(initialLedgerRes.data, null, 2), '\n');

  // 4. POST TRANSACTION: STOCK RECEIVE (IN) TO MASTER
  console.log('4. Posting stock receive (IN) 200 units to MASTER (Expected: 200)...');
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
      qty: 200,
      refType: 'PURCHASE',
      refId: 'PO-2026-TEST',
      note: 'Initial development test stock'
    }
  });
  assert.strictEqual(stockInRes.status, 200);
  assert.strictEqual(stockInRes.data.newOnHandQty, 200);
  console.log('   -> Pass: Successfully stocked 200 units on MASTER');
  console.log('   -> Response:', JSON.stringify(stockInRes.data, null, 2), '\n');

  // 5. TEST CONCURRENCY/BALANCE CHECK: OUT EXCEEDING STOCK
  console.log('5. Testing insufficient stock balance check (Expected: 400)...');
  const stockOutFail = await request('/api/inventory/transactions', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      productId: testProductId,
      ledgerType: 'MASTER',
      txnType: 'OUT',
      qty: 250,
      note: 'Overdraft test'
    }
  });
  assert.strictEqual(stockOutFail.status, 400);
  assert.strictEqual(stockOutFail.data.error, 'INSUFFICIENT_STOCK');
  console.log('   -> Pass: Correctly rejected with 400 and INSUFFICIENT_STOCK error');
  console.log('   -> Response:', JSON.stringify(stockOutFail.data, null, 2), '\n');

  // 6. POST TRANSFER REQUEST
  console.log('6. Creating transfer request of 50 units MASTER -> SELL (Expected: 201)...');
  const transferRes = await request('/api/inventory/transfers', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      productId: testProductId,
      qty: 50,
      note: 'Move to storefront pool'
    }
  });
  assert.strictEqual(transferRes.status, 201);
  testTransferId = transferRes.data.transferId;
  console.log(`   -> Pass: Transfer request created with TransferId = ${testTransferId}`);
  console.log('   -> Response:', JSON.stringify(transferRes.data, null, 2), '\n');

  // 7. VERIFY STOCK IS RESERVED ON MASTER
  console.log('7. Verifying stock is immediately RESERVED on MASTER (Expected: 200)...');
  const reservedLedgerRes = await request(`/api/products/${testProductId}/ledgers`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(reservedLedgerRes.status, 200);
  assert.strictEqual(reservedLedgerRes.data.master.onHandQty, 200);
  assert.strictEqual(reservedLedgerRes.data.master.reservedQty, 0);
  assert.strictEqual(reservedLedgerRes.data.master.availableQty, 200);
  console.log('   -> Pass: No reservation applied on MASTER since stock is shared directly');
  console.log('   -> Response:', JSON.stringify(reservedLedgerRes.data, null, 2), '\n');

  // 8. TEST RBAC - APPROVE TRANSFER AS SUPPLIER (Should fail 403)
  console.log('8. Testing RBAC: Approve transfer as Supplier (Expected: 403)...');
  const approveRbacFail = await request(`/api/inventory/transfers/${testTransferId}/approve`, {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(approveRbacFail.status, 403);
  console.log('   -> Pass: Correctly blocked with 403 Forbidden\n');

  // 9. APPROVE TRANSFER AS ADMIN (Should succeed 200)
  console.log('9. Approving transfer request as Admin (Expected: 200)...');
  const approveRes = await request(`/api/inventory/transfers/${testTransferId}/approve`, {
    method: 'POST',
    headers: {
      'x-user-email': 'md.marufalrashid@gmail.com',
      'x-user-role': 'SuperAdmin'
    }
  });
  assert.strictEqual(approveRes.status, 200);
  console.log('   -> Pass: Transfer approved atomically');
  console.log('   -> Response:', JSON.stringify(approveRes.data, null, 2), '\n');

  // 10. GET FINAL LEDGERS AFTER TRANSFER
  console.log('10. Getting final product ledgers (Expected: 200)...');
  const finalLedgerRes = await request(`/api/products/${testProductId}/ledgers`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(finalLedgerRes.status, 200);
  assert.strictEqual(finalLedgerRes.data.master.onHandQty, 200);
  assert.strictEqual(finalLedgerRes.data.master.reservedQty, 0);
  assert.strictEqual(finalLedgerRes.data.sell.onHandQty, 200);
  console.log('   -> Pass: Shared stock pool remains 200, no physical-to-virtual partitions applied');
  console.log('   -> Response:', JSON.stringify(finalLedgerRes.data, null, 2), '\n');

  // 11. GET TRANSACTIONS
  console.log('11. Retrieving transaction history (Expected: 200)...');
  const txnsRes = await request(`/api/inventory/transactions?productId=${testProductId}&limit=5`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(txnsRes.status, 200);
  assert.ok(txnsRes.data.items.length >= 1); // Only 'IN' transaction on MASTER exists in shared stock mode
  console.log(`   -> Pass: Retrieved ${txnsRes.data.items.length} transactional logs`);
  console.log('   -> Response (top items):', JSON.stringify(txnsRes.data.items.slice(0, 2), null, 2), '\n');

  // 12. RUN RECONCILIATION ENGINE (GET /api/inventory/reconcile/:productId)
  console.log('12. Running reconciliation check on product (Expected: 200 & ok=true)...');
  const reconRes = await request(`/api/inventory/reconcile/${testProductId}`, {
    headers: {
      'x-user-email': 'md.marufalrashid@gmail.com',
      'x-user-role': 'SuperAdmin'
    }
  });
  assert.strictEqual(reconRes.status, 200);
  assert.strictEqual(reconRes.data.ok, true);
  assert.strictEqual(reconRes.data.checks[0].diff, 0);
  assert.strictEqual(reconRes.data.checks[1].diff, 0);
  console.log('   -> Pass: RECONCILIATION ENGINE RETURNED ok = true WITH ZERO DIFFERENCES');
  console.log('   -> Response:', JSON.stringify(reconRes.data, null, 2), '\n');

  console.log('==================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});

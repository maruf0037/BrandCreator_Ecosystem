const assert = require('assert');
const { poolPromise } = require('./config/db');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 1.5 PHYSICAL SHOP CHECKOUT TEST');
  console.log('==================================================\n');

  const pool = await poolPromise;
  const testSku = 'SKU-POS-' + Math.floor(Math.random() * 100000);
  let testProductId = null;
  const orderRef = 'POS-ORD-' + Math.floor(100000 + Math.random() * 900000);

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
  console.log('1. Creating a new test product (Expected: 201)...');
  const createProdRes = await request('/api/products', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      supplierUserId: 12,
      sku: testSku,
      productName: 'POS Double Ledger Silk Shirt'
    }
  });
  assert.strictEqual(createProdRes.status, 201);
  testProductId = createProdRes.data.productId;
  console.log(`   -> Pass: Product created with ProductId = ${testProductId}\n`);

  // Approve product in QC
  console.log('2. Admin approving product in QC (Expected: 200)...');
  const qcRes = await request(`/api/products/${testProductId}/qc/review`, {
    method: 'POST',
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'Admin'
    },
    body: {
      decision: 'APPROVE',
      reason: 'POS testing approval'
    }
  });
  assert.strictEqual(qcRes.status, 200);
  console.log('   -> Pass: Product QC status is APPROVED\n');

  // 3. RECEIVE MASTER STOCK
  console.log('3. Stocking 50 units into MASTER pool (Expected: 200)...');
  const stockRes = await request('/api/inventory/transactions', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      productId: testProductId,
      ledgerType: 'MASTER',
      txnType: 'IN',
      qty: 50,
      refType: 'PURCHASE',
      refId: 'PO-POS-2026',
      note: 'Initial POS test stock'
    }
  });
  assert.strictEqual(stockRes.status, 200);
  console.log('   -> Pass: Successfully stocked 50 units on MASTER\n');

  // 4. PERFORM PHYSICAL SHOP CHECKOUT
  console.log('4. Performing physical shop checkout (Expected: 201)...');
  const checkoutRes = await request('/api/orders', {
    method: 'POST',
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'Admin'
    },
    body: {
      orderRef,
      items: [{ productId: testProductId, qty: 5, unitPrice: 200 }],
      currency: 'BDT',
      customerPhone: '01711112222',
      saleChannel: 'PHYSICAL_SHOP',
      paymentMethod: 'CARD'
    }
  });
  if (checkoutRes.status !== 201) {
    console.error('   -> Fail: POS Checkout failed with data:', JSON.stringify(checkoutRes.data));
  }
  assert.strictEqual(checkoutRes.status, 201);
  assert.strictEqual(checkoutRes.data.status, 'CONFIRMED');
  assert.strictEqual(checkoutRes.data.stockAction, 'DONE');
  console.log('   -> Pass: POS Checkout instantly confirmed, stock Action = DONE');
  console.log('   -> Response:', JSON.stringify(checkoutRes.data, null, 2), '\n');

  // 5. DB VERIFICATIONS
  console.log('5. Querying database for verification...');
  
  // A. Check order details in dbo.Orders
  const dbOrderRes = await pool.request()
    .input('ref', orderRef)
    .query('SELECT Status, PaymentStatus, PaidAmount, SaleChannel, PaymentProvider FROM dbo.Orders WHERE OrderRef = @ref');
  
  const order = dbOrderRes.recordset[0];
  assert.ok(order, 'Order record should exist in database');
  assert.strictEqual(order.Status, 'CONFIRMED', 'Order status should be CONFIRMED directly');
  assert.strictEqual(order.PaymentStatus, 'PAYMENT_VERIFIED', 'Payment status should be PAYMENT_VERIFIED directly');
  assert.strictEqual(parseFloat(order.PaidAmount), 1000.00, 'PaidAmount should match TotalAmount');
  assert.strictEqual(order.SaleChannel, 'PHYSICAL_SHOP', 'SaleChannel should be PHYSICAL_SHOP');
  assert.strictEqual(order.PaymentProvider, 'CARD', 'PaymentProvider should record CARD');
  console.log('   -> Pass: Database Order table matches expected completed status');

  // B. Check stock balance in InventoryLedgers
  const dbLedgerRes = await pool.request()
    .input('productId', testProductId)
    .query("SELECT OnHandQty, ReservedQty FROM dbo.InventoryLedgers WHERE ProductId = @productId AND LedgerType = 'MASTER'");
  
  const ledger = dbLedgerRes.recordset[0];
  assert.strictEqual(ledger.OnHandQty, 45, 'OnHandQty should be exactly 45 (decreased by 5)');
  assert.strictEqual(ledger.ReservedQty, 0, 'ReservedQty should remain 0 (directly committed)');
  console.log('   -> Pass: MASTER ledger stock correctly decremented directly with zero reservation lock');

  // C. Check transaction history in InventoryTransactions
  const dbTxnsRes = await pool.request()
    .input('productId', testProductId)
    .query("SELECT TxnType, Qty, RefType, RefId FROM dbo.InventoryTransactions WHERE ProductId = @productId AND LedgerType = 'MASTER' AND RefType = 'ORDER_COMMIT'");
  
  const commitTxn = dbTxnsRes.recordset[0];
  assert.ok(commitTxn, 'Should have recorded a COMMIT transaction');
  assert.strictEqual(commitTxn.TxnType, 'OUT', 'COMMIT transaction should be of type OUT');
  assert.strictEqual(commitTxn.Qty, 5, 'COMMIT transaction qty should be 5');
  console.log('   -> Pass: InventoryTransaction correctly logged COMMIT directly\n');

  console.log('==================================================');
  console.log('🎉 ALL PHYSICAL SHOP CHECKOUT TESTS PASSED! 🎉');
  console.log('==================================================');
  
  await pool.close();
  setTimeout(() => {
    process.exit(0);
  }, 200);
}

runTests().catch(async (err) => {
  console.error('Test suite failed:', err);
  try {
    const { poolPromise } = require('./config/db');
    const pool = await poolPromise;
    await pool.close();
  } catch (e) {}
  process.exit(1);
});

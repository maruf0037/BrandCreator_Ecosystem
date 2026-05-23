const assert = require('assert');
const { poolPromise } = require('./config/db');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('==============================================================');
  console.log('STARTING RETURN / REFUND WORKFLOW TEST SUITE');
  console.log('==============================================================\n');

  // ---- Helper ----
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
    try { data = await response.json(); } catch (e) { /* not JSON */ }
    return { status, data };
  }

  const pool = await poolPromise;
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    console.log(`\n  [TEST] ${name}`);
  }

  function assertResult(condition, msg) {
    if (condition) {
      console.log(`    ✓ ${msg}`);
      passed++;
    } else {
      console.log(`    ✗ ${msg}`);
      failed++;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // SETUP: Find or create a CONFIRMED + PAYMENT_VERIFIED order
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- SETUP: Preparing test data ---');

  // 1. Check for existing confirmed orders with items
  const existingOrdersRes = await pool.request().query(`
    SELECT TOP 3 o.OrderId, o.OrderRef, o.CustomerEmail
    FROM dbo.Orders o
    WHERE o.Status = 'CONFIRMED' AND o.PaymentStatus = 'PAYMENT_VERIFIED'
      AND EXISTS (
        SELECT 1 FROM dbo.OrderItems oi
        WHERE oi.OrderId = o.OrderId
          AND oi.Qty > COALESCE((
            SELECT SUM(ri.Qty)
            FROM dbo.ReturnRequestItems ri
            INNER JOIN dbo.ReturnRequests rr ON ri.ReturnRequestId = rr.ReturnRequestId
            WHERE rr.OrderId = o.OrderId AND ri.ProductId = oi.ProductId AND rr.Status IN ('APPROVED', 'REFUNDED')
          ), 0)
      )
    ORDER BY o.OrderId DESC
  `);

  let testOrderRef;
  let testOrderId;
  let testCustomerEmail = 'customer@test.com';

  if (existingOrdersRes.recordset.length > 0) {
    const order = existingOrdersRes.recordset[0];
    testOrderRef = order.OrderRef;
    testOrderId = order.OrderId;
    testCustomerEmail = order.CustomerEmail;
    console.log(`  Using existing confirmed order: ${testOrderRef} (OrderId=${testOrderId})`);
  } else {
    console.log('  No confirmed orders found. Creating a complete order lifecycle...');

    // Find an approved product with active pricing plan
    const prodRes = await pool.request().query(`
      SELECT TOP 1 p.ProductId, p.ProductName
      FROM dbo.Products p
      INNER JOIN dbo.AdminPricingPlans ap ON p.ProductId = ap.ProductId AND ap.Status = 'ACTIVE'
      WHERE p.QCStatus = 'APPROVED'
    `);

    if (prodRes.recordset.length === 0) {
      console.log('  SKIP: No products with active pricing plans available for test setup.');
      console.log('  Run test_admin_pricing_profit.js first to create test data.');
      console.log(`\n  ─────────────────────────────────────`);
      console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
      console.log(`  ${failed > 0 ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED'}`);
      process.exit(failed > 0 ? 1 : 0);
    }

    const product = prodRes.recordset[0];

    // Create order
    const createRes = await request('/api/orders', {
      method: 'POST',
      headers: { 'x-user-email': testCustomerEmail, 'x-user-role': 'Customer' },
      body: {
        items: [{ productId: product.ProductId, qty: 2 }],
        customerEmail: testCustomerEmail,
        customerPhone: '01700000000'
      }
    });

    if (createRes.status !== 201 || !createRes.data?.orderRef) {
      console.log('  SKIP: Could not create test order.');
      console.log(`  Response: ${JSON.stringify(createRes.data)}`);
      console.log(`\n  ─────────────────────────────────────`);
      console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
      process.exit(1);
    }

    testOrderRef = createRes.data.orderRef;

    // Submit payment evidence
    await request(`/api/orders/${testOrderRef}/payment-evidence`, {
      method: 'POST',
      headers: { 'x-user-email': testCustomerEmail, 'x-user-role': 'Customer' },
      body: {
        paymentProvider: 'BKASH',
        transactionId: `TXN-RETURN-${Date.now()}`,
        paidAmount: createRes.data.totalAmount
      }
    });

    // Admin verifies payment & confirms
    const confirmRes = await request(`/api/orders/${testOrderRef}/confirm`, {
      method: 'POST',
      headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
      body: {
        manualReviewNote: 'Test payment for return workflow',
        paymentProvider: 'BKASH',
        transactionId: `TXN-RETURN-CONFIRM-${Date.now()}`
      }
    });

    if (confirmRes.status !== 200) {
      console.log('  SKIP: Could not confirm test order.');
      console.log(`  Response: ${JSON.stringify(confirmRes.data)}`);
      process.exit(1);
    }

    testOrderId = confirmRes.data.order?.OrderId;
    console.log(`  Created test order: ${testOrderRef} (OrderId=${testOrderId})`);
  }

  // Get the order items for return testing
  const orderItemsRes = await pool.request()
    .input('orderId', testOrderId)
    .query(`SELECT OrderItemId, ProductId, Qty, UnitPrice FROM dbo.OrderItems WHERE OrderId = @orderId`);

  if (orderItemsRes.recordset.length === 0) {
    console.log('  SKIP: Test order has no items.');
    process.exit(1);
  }

  const testItem = orderItemsRes.recordset[0];
  console.log(`  Test product: ProductId=${testItem.ProductId}, Qty=${testItem.Qty}, UnitPrice=${testItem.UnitPrice}`);

  // ────────────────────────────────────────────────────────────────
  // TEST 1: Customer requests a return — full qty
  // ────────────────────────────────────────────────────────────────
  test('Customer requests a return (full quantity)');
  const returnRes1 = await request(`/api/orders/${testOrderRef}/return`, {
    method: 'POST',
    headers: { 'x-user-email': testCustomerEmail, 'x-user-role': 'Customer' },
    body: {
      items: [{ productId: testItem.ProductId, qty: testItem.Qty }],
      reason: 'Product quality not as expected'
    }
  });

  let returnRequestId;
  if (returnRes1.status === 201 && returnRes1.data?.returnRequest?.returnRequestId) {
    returnRequestId = returnRes1.data.returnRequest.returnRequestId;
    assertResult(true, `Return request created (ID=${returnRequestId}), status=${returnRes1.data.returnRequest.status}`);
  } else {
    assertResult(false, `Return request creation failed: ${JSON.stringify(returnRes1.data)}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 2: Customer views their return requests
  // ────────────────────────────────────────────────────────────────
  test('Customer views returns for the order');
  const viewRes = await request(`/api/orders/${testOrderRef}/returns`, {
    headers: { 'x-user-email': testCustomerEmail, 'x-user-role': 'Customer' }
  });

  if (viewRes.status === 200 && viewRes.data?.items?.length > 0) {
    assertResult(true, `Found ${viewRes.data.items.length} return request(s) for order`);
  } else {
    assertResult(false, `Failed to view returns: ${JSON.stringify(viewRes.data)}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 3: Admin lists all return requests
  // ────────────────────────────────────────────────────────────────
  test('Admin lists all return requests');
  const adminListRes = await request('/api/admin/returns', {
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });

  if (adminListRes.status === 200 && adminListRes.data?.items?.length > 0) {
    const found = adminListRes.data.items.some(r => r.returnRequestId === returnRequestId);
    assertResult(found, `Return request (ID=${returnRequestId}) visible in admin list`);
  } else {
    assertResult(false, `Admin list failed or empty: ${JSON.stringify(adminListRes.data)}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 4: Admin approves the return (restores stock)
  // ────────────────────────────────────────────────────────────────
  test('Admin approves return (stock restoration)');
  const approveRes = await request(`/api/admin/returns/${returnRequestId}/approve`, {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });

  if (approveRes.status === 200 && approveRes.data?.status === 'APPROVED') {
    assertResult(true, `Return approved. Stock restored for ${approveRes.data.itemsRestored?.length || 0} item(s)`);
  } else {
    assertResult(false, `Approve failed: ${JSON.stringify(approveRes.data)}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 5: Admin processes the refund (updates profit/wallet)
  // ────────────────────────────────────────────────────────────────
  test('Admin processes refund (profit/wallet adjustment)');
  const refundRes = await request(`/api/admin/returns/${returnRequestId}/refund`, {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });

  if (refundRes.status === 200 && refundRes.data?.status === 'REFUNDED') {
    assertResult(true, `Refund processed. Amount=${refundRes.data.refundTotal}, SupplierReversal=${refundRes.data.supplierPayableReversed}`);
  } else {
    assertResult(false, `Refund failed: ${JSON.stringify(refundRes.data)}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 6: Verify wallet reflects the refund changes
  // ────────────────────────────────────────────────────────────────
  test('Wallet summary reflects returned profit adjustment');
  const walletRes = await request('/api/admin/wallet/summary', {
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });

  if (walletRes.status === 200 && walletRes.data) {
    assertResult(true, `Wallet summary accessible. stableProfit=${walletRes.data.stableProfit}, pendingProfit=${walletRes.data.pendingProfit}, supplierPayableLocked=${walletRes.data.supplierPayableLocked}`);

    // Check that a RETURN_REFUND wallet transaction was recorded
    const txRes = await pool.request()
      .input('returnRequestId', returnRequestId)
      .query(`
        SELECT COUNT(*) AS cnt FROM dbo.WalletTransactions
        WHERE TxnType = 'RETURN_REFUND'
          AND Notes LIKE '%#' + CAST(@returnRequestId AS NVARCHAR(20)) + '%'
      `);
    assertResult(txRes.recordset[0].cnt > 0, 'Wallet contains RETURN_REFUND transaction record');
  } else {
    assertResult(false, `Wallet summary failed: ${JSON.stringify(walletRes.data)}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 7: Duplicate return attempt (should fail — qty exhausted)
  // ────────────────────────────────────────────────────────────────
  test('Duplicate return for same qty is blocked');
  const dupRes = await request(`/api/orders/${testOrderRef}/return`, {
    method: 'POST',
    headers: { 'x-user-email': testCustomerEmail, 'x-user-role': 'Customer' },
    body: {
      items: [{ productId: testItem.ProductId, qty: testItem.Qty }],
      reason: 'Trying to return again'
    }
  });

  if (dupRes.status === 400 && dupRes.data?.error === 'QTY_EXCEEDS_AVAILABLE') {
    assertResult(true, 'Duplicate return correctly blocked (qty already returned)');
  } else {
    assertResult(false, `Duplicate return was not blocked as expected: ${JSON.stringify(dupRes.data)}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 8: Return request on non-existent order (should fail)
  // ────────────────────────────────────────────────────────────────
  test('Return request on non-existent order fails');
  const badRes = await request('/api/orders/DOES-NOT-EXIST/return', {
    method: 'POST',
    headers: { 'x-user-email': testCustomerEmail, 'x-user-role': 'Customer' },
    body: { items: [{ productId: testItem.ProductId, qty: 1 }], reason: 'test' }
  });

  if (badRes.status === 404) {
    assertResult(true, 'Non-existent order correctly rejected');
  } else {
    assertResult(false, `Expected 404 got ${badRes.status}: ${JSON.stringify(badRes.data)}`);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 9: Reject flow — create a second return request and reject it
  // ────────────────────────────────────────────────────────────────
  test('Admin can reject a return request');
  const returnRes2 = await request(`/api/orders/${testOrderRef}/return`, {
    method: 'POST',
    headers: { 'x-user-email': testCustomerEmail, 'x-user-role': 'Customer' },
    body: {
      items: [{ productId: testItem.ProductId, qty: 0 }], // qty=0 will be blocked
      reason: 'Testing reject flow'
    }
  });

  // Create a valid small-qty return to reject
  // If the item originally had qty=2 and we already returned 2, we need another product or another order
  // Let's find any other order item from a different order if available
  const otherItemRes = await pool.request().query(`
    SELECT TOP 1 oi.OrderItemId, oi.ProductId, oi.Qty, oi.OrderId, o.OrderRef
    FROM dbo.OrderItems oi
    INNER JOIN dbo.Orders o ON oi.OrderId = o.OrderId
    WHERE o.Status = 'CONFIRMED' AND o.PaymentStatus = 'PAYMENT_VERIFIED'
      AND o.OrderId != ${testOrderId}
      AND oi.Qty > COALESCE((
        SELECT SUM(ri.Qty)
        FROM dbo.ReturnRequestItems ri
        INNER JOIN dbo.ReturnRequests rr ON ri.ReturnRequestId = rr.ReturnRequestId
        WHERE rr.OrderId = o.OrderId
          AND ri.ProductId = oi.ProductId
          AND rr.Status IN ('APPROVED', 'REFUNDED')
      ), 0)
    ORDER BY o.OrderId DESC
  `);

  if (otherItemRes.recordset.length > 0) {
    const otherItem = otherItemRes.recordset[0];
    const rejectReturnRes = await request(`/api/orders/${otherItem.OrderRef}/return`, {
      method: 'POST',
      headers: { 'x-user-email': testCustomerEmail, 'x-user-role': 'Customer' },
      body: {
        items: [{ productId: otherItem.ProductId, qty: 1 }],
        reason: 'Testing reject flow'
      }
    });

    if (rejectReturnRes.status === 201) {
      const rejectId = rejectReturnRes.data.returnRequest.returnRequestId;
      const rejectRes = await request(`/api/admin/returns/${rejectId}/reject`, {
        method: 'POST',
        headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
        body: { rejectReason: 'Customer is outside return window' }
      });

      if (rejectRes.status === 200 && rejectRes.data?.status === 'REJECTED') {
        assertResult(true, `Return rejected successfully: ${rejectRes.data.rejectReason}`);
      } else {
        assertResult(false, `Reject failed: ${JSON.stringify(rejectRes.data)}`);
      }
    } else {
      assertResult(false, `Could not create return for reject test: ${JSON.stringify(rejectReturnRes.data)}`);
    }
  } else {
    console.log('    ~ No additional confirmed orders to test reject flow (non-critical)');
  }

  // ────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────
  console.log(`\n  ─────────────────────────────────────`);
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`  ${failed > 0 ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED'}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
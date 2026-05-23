const { sql } = require('../config/db');
const logger = require('../src/logger');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates that an order is eligible for a return.
 * Rules: order must be CONFIRMED + PAYMENT_VERIFIED, and (optional) within
 * the return window if RETURN_WINDOW_SECONDS is set.
 */
async function validateOrderForReturn(pool, orderRef, customerEmail, userRole = 'Customer') {
  const res = await pool.request()
    .input('orderRef', sql.NVarChar(100), orderRef)
    .query(`
      SELECT
        o.OrderId, o.Status, o.PaymentStatus, o.PaidAt, o.CustomerEmail
      FROM dbo.Orders o
      WHERE o.OrderRef = @orderRef
    `);

  const order = res.recordset[0];
  if (!order) {
    throw Object.assign(new Error('Order not found'), { code: 'ORDER_NOT_FOUND', status: 404 });
  }
  if (order.Status !== 'CONFIRMED') {
    throw Object.assign(new Error('Order is not CONFIRMED. Only confirmed orders can be returned.'), { code: 'ORDER_NOT_CONFIRMED', status: 400 });
  }
  if (order.PaymentStatus !== 'PAYMENT_VERIFIED') {
    throw Object.assign(new Error('Order payment is not verified. Cannot process return.'), { code: 'PAYMENT_NOT_VERIFIED', status: 400 });
  }
  const isAdmin = ['Admin', 'SuperAdmin'].includes(userRole);
  if (!isAdmin && String(order.CustomerEmail).toLowerCase() !== String(customerEmail).toLowerCase()) {
    throw Object.assign(new Error('You can only request returns for your own orders.'), { code: 'ORDER_OWNERSHIP_MISMATCH', status: 403 });
  }

  // Optional: check return window
  const returnWindowSeconds = parseInt(process.env.RETURN_WINDOW_SECONDS || '604800');
  if (order.PaidAt) {
    const deadline = new Date(new Date(order.PaidAt).getTime() + returnWindowSeconds * 1000);
    if (new Date() > deadline) {
      throw Object.assign(
        new Error(`Return window has passed. Deadline was ${deadline.toISOString()}. Contact admin for assistance.`),
        { code: 'RETURN_WINDOW_EXPIRED', status: 400 }
      );
    }
  }

  return order;
}

/**
 * Validates that the requested items belong to the order and that
 * quantities don't exceed what was ordered.
 * Returns enriched line items with pricing data.
 */
async function validateReturnItems(pool, orderId, items) {
  if (!items || items.length === 0) {
    throw Object.assign(new Error('At least one item is required for a return request.'), { code: 'NO_ITEMS', status: 400 });
  }

  const orderItemsRes = await pool.request()
    .input('orderId', sql.BigInt, orderId)
    .query(`
      SELECT
        oi.OrderItemId, oi.ProductId, oi.Qty AS orderedQty, oi.UnitPrice,
        p.ProductName,
        COALESCE(b.ReturnLoss, 0) AS existingReturnLoss,
        b.BreakdownId, b.NetBrandCreatorProfit, b.SupplierPayable,
        b.AdSpendShare, b.PlatformCommission, b.DeliveryOpsCost, b.DiscountAmount,
        (oi.Qty * oi.UnitPrice) AS grossRevenue
      FROM dbo.OrderItems oi
      INNER JOIN dbo.Products p ON oi.ProductId = p.ProductId
      LEFT JOIN dbo.OrderProfitBreakdowns b ON b.OrderId = @orderId AND b.ProductId = oi.ProductId
      WHERE oi.OrderId = @orderId
    `);

  const orderItems = orderItemsRes.recordset;
  if (orderItems.length === 0) {
    throw Object.assign(new Error('No items found on this order.'), { code: 'ORDER_ITEMS_EMPTY', status: 400 });
  }

  // Build a map of ProductId -> total already-returned qty from existing approved/refunded requests
  const alreadyReturnedRes = await pool.request()
    .input('orderId', sql.BigInt, orderId)
    .query(`
      SELECT ri.ProductId, SUM(ri.Qty) AS returnedQty
      FROM dbo.ReturnRequestItems ri
      INNER JOIN dbo.ReturnRequests rr ON ri.ReturnRequestId = rr.ReturnRequestId
      WHERE rr.OrderId = @orderId AND rr.Status IN ('APPROVED', 'REFUNDED')
      GROUP BY ri.ProductId
    `);

  const alreadyReturnedMap = new Map();
  for (const row of alreadyReturnedRes.recordset) {
    alreadyReturnedMap.set(row.ProductId, parseInt(row.returnedQty, 10));
  }

  // Validate each requested item
  const enriched = [];
  for (const item of items) {
    const { productId, qty } = item;
    if (!productId || !qty || qty <= 0) {
      throw Object.assign(new Error(`Invalid item: productId=${productId}, qty=${qty}`), { code: 'INVALID_ITEM', status: 400 });
    }

    const oi = orderItems.find(r => r.ProductId === productId);
    if (!oi) {
      throw Object.assign(new Error(`Product ${productId} is not part of this order.`), { code: 'PRODUCT_NOT_IN_ORDER', status: 400 });
    }

    const alreadyReturned = alreadyReturnedMap.get(productId) || 0;
    const availableForReturn = oi.orderedQty - alreadyReturned;

    if (qty > availableForReturn) {
      throw Object.assign(
        new Error(`Product ${oi.ProductName} (ID ${productId}): requested return qty ${qty} exceeds available qty ${availableForReturn} (ordered ${oi.orderedQty}, already returned ${alreadyReturned}).`),
        { code: 'QTY_EXCEEDS_AVAILABLE', status: 400 }
      );
    }

    // Calculate the per-unit values for the refund
    const unitPrice = parseFloat(oi.UnitPrice);
    const refundLineAmount = qty * unitPrice;

    // Calculate supplier reversal (pro-rata based on qty)
    const totalOrdered = oi.orderedQty;
    const supplierPayableTotal = parseFloat(oi.SupplierPayable || 0);
    const supplierReversal = (qty / totalOrdered) * supplierPayableTotal;

    enriched.push({
      orderItemId: oi.OrderItemId,
      productId: oi.ProductId,
      productName: oi.ProductName,
      qty,
      refundLineAmount: parseFloat(refundLineAmount.toFixed(2)),
      supplierReversal: parseFloat(supplierReversal.toFixed(2)),
      breakdownId: oi.BreakdownId
    });
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Customer requests a return on a confirmed order.
 * Items: [{ productId, qty }]
 */
async function requestReturn(pool, orderRef, customerEmail, items, reason, userRole = 'Customer') {
  // 1. Validate order
  const order = await validateOrderForReturn(pool, orderRef, customerEmail, userRole);

  // 2. Validate items and get enriched data
  const enriched = await validateReturnItems(pool, order.OrderId, items);

  // 3. Calculate total refund
  const refundTotal = parseFloat(enriched.reduce((sum, i) => sum + i.refundLineAmount, 0).toFixed(2));

  // 4. Create ReturnRequest + ReturnRequestItems in a transaction
  const transaction = pool.transaction();
  await transaction.begin();

  try {
    const insertReq = await transaction.request()
      .input('orderId', sql.BigInt, order.OrderId)
      .input('customerEmail', sql.NVarChar(255), customerEmail)
      .input('refundTotal', sql.Decimal(18, 2), refundTotal)
      .input('reason', sql.NVarChar(1000), reason || null)
      .input('requestedByEmail', sql.NVarChar(255), customerEmail)
      .query(`
        INSERT INTO dbo.ReturnRequests (OrderId, CustomerEmail, RefundTotal, Reason, RequestedByEmail)
        OUTPUT INSERTED.*
        VALUES (@orderId, @customerEmail, @refundTotal, @reason, @requestedByEmail)
      `);

    const returnRequest = insertReq.recordset[0];

    for (const item of enriched) {
      await transaction.request()
        .input('returnRequestId', sql.BigInt, returnRequest.ReturnRequestId)
        .input('orderItemId', sql.BigInt, item.orderItemId)
        .input('productId', sql.Int, item.productId)
        .input('qty', sql.Int, item.qty)
        .input('refundLineAmount', sql.Decimal(18, 2), item.refundLineAmount)
        .query(`
          INSERT INTO dbo.ReturnRequestItems (ReturnRequestId, OrderItemId, ProductId, Qty, RefundLineAmount)
          VALUES (@returnRequestId, @orderItemId, @productId, @qty, @refundLineAmount)
        `);
    }

    await transaction.commit();

    return {
      returnRequestId: returnRequest.ReturnRequestId,
      orderRef,
      status: returnRequest.Status,
      refundTotal,
      reason: reason || null,
      items: enriched.map(i => ({
        productId: i.productId,
        productName: i.productName,
        qty: i.qty,
        refundLineAmount: i.refundLineAmount
      })),
      createdAt: returnRequest.CreatedAt
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Admin lists all return requests with optional filters.
 */
async function getReturnRequests(pool, filters = {}) {
  let query = `
    SELECT
      rr.ReturnRequestId, rr.OrderId, rr.CustomerEmail, rr.Status,
      rr.RefundTotal, rr.Reason, rr.RequestedByEmail, rr.ApprovedByEmail,
      rr.RejectReason, rr.RefundedAt, rr.CreatedAt, rr.UpdatedAt,
      o.OrderRef
    FROM dbo.ReturnRequests rr
    INNER JOIN dbo.Orders o ON rr.OrderId = o.OrderId
    WHERE 1=1
  `;
  const req = pool.request();

  if (filters.status) {
    query += ' AND rr.Status = @status';
    req.input('status', sql.NVarChar(30), filters.status);
  }
  if (filters.customerEmail) {
    query += ' AND rr.CustomerEmail = @customerEmail';
    req.input('customerEmail', sql.NVarChar(255), filters.customerEmail);
  }
  if (filters.orderRef) {
    query += ' AND o.OrderRef = @orderRef';
    req.input('orderRef', sql.NVarChar(100), filters.orderRef);
  }

  query += ' ORDER BY rr.CreatedAt DESC';

  const res = await req.query(query);

  // Fetch items for each return request
  const results = [];
  for (const row of res.recordset) {
    const itemsRes = await pool.request()
      .input('returnRequestId', sql.BigInt, row.ReturnRequestId)
      .query(`
        SELECT ri.ReturnItemId, ri.ProductId, p.ProductName, ri.Qty, ri.RefundLineAmount
        FROM dbo.ReturnRequestItems ri
        INNER JOIN dbo.Products p ON ri.ProductId = p.ProductId
        WHERE ri.ReturnRequestId = @returnRequestId
      `);

    results.push({
      returnRequestId: row.ReturnRequestId,
      orderId: row.OrderId,
      orderRef: row.OrderRef,
      customerEmail: row.CustomerEmail,
      status: row.Status,
      refundTotal: parseFloat(row.RefundTotal),
      reason: row.Reason,
      requestedByEmail: row.RequestedByEmail,
      approvedByEmail: row.ApprovedByEmail,
      rejectReason: row.RejectReason,
      refundedAt: row.RefundedAt,
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt,
      items: itemsRes.recordset.map(i => ({
        returnItemId: i.ReturnItemId,
        productId: i.ProductId,
        productName: i.ProductName,
        qty: i.Qty,
        refundLineAmount: parseFloat(i.RefundLineAmount)
      }))
    });
  }

  return results;
}

/**
 * Customer views returns for a specific order.
 */
async function getOrderReturns(pool, orderRef, customerEmail) {
  const res = await pool.request()
    .input('orderRef', sql.NVarChar(100), orderRef)
    .input('customerEmail', sql.NVarChar(255), customerEmail)
    .query(`
      SELECT
        rr.ReturnRequestId, rr.Status, rr.RefundTotal, rr.Reason,
        rr.RejectReason, rr.RefundedAt, rr.CreatedAt,
        o.OrderRef
      FROM dbo.ReturnRequests rr
      INNER JOIN dbo.Orders o ON rr.OrderId = o.OrderId
      WHERE o.OrderRef = @orderRef AND rr.CustomerEmail = @customerEmail
      ORDER BY rr.CreatedAt DESC
    `);

  const results = [];
  for (const row of res.recordset) {
    const itemsRes = await pool.request()
      .input('returnRequestId', sql.BigInt, row.ReturnRequestId)
      .query(`
        SELECT ri.ProductId, p.ProductName, ri.Qty, ri.RefundLineAmount
        FROM dbo.ReturnRequestItems ri
        INNER JOIN dbo.Products p ON ri.ProductId = p.ProductId
        WHERE ri.ReturnRequestId = @returnRequestId
      `);

    results.push({
      returnRequestId: row.ReturnRequestId,
      orderRef: row.OrderRef,
      status: row.Status,
      refundTotal: parseFloat(row.RefundTotal),
      reason: row.Reason,
      rejectReason: row.RejectReason,
      refundedAt: row.RefundedAt,
      createdAt: row.CreatedAt,
      items: itemsRes.recordset.map(i => ({
        productId: i.ProductId,
        productName: i.ProductName,
        qty: i.Qty,
        refundLineAmount: parseFloat(i.RefundLineAmount)
      }))
    });
  }

  return results;
}

/**
 * Admin approves a return request.
 * - Restores MASTER stock via sp_InventoryApplyTransaction(IN).
 * - Does NOT touch financials yet — that happens on refund.
 * - Transition: PENDING → APPROVED
 */
async function approveReturn(pool, returnRequestId, adminEmail) {
  const transaction = pool.transaction();
  await transaction.begin();

  try {
    // 1. Fetch the return request with items
    const reqRes = await transaction.request()
      .input('returnRequestId', sql.BigInt, returnRequestId)
      .query(`
        SELECT Status, OrderId, CustomerEmail, RefundTotal
        FROM dbo.ReturnRequests
        WHERE ReturnRequestId = @returnRequestId
      `);

    const returnReq = reqRes.recordset[0];
    if (!returnReq) {
      throw Object.assign(new Error('Return request not found.'), { code: 'NOT_FOUND', status: 404 });
    }
    if (returnReq.Status !== 'PENDING') {
      throw Object.assign(new Error(`Return request is in '${returnReq.Status}' state. Only PENDING requests can be approved.`), { code: 'INVALID_STATUS', status: 400 });
    }

    // 2. Fetch return items with product info
    const itemsRes = await transaction.request()
      .input('returnRequestId', sql.BigInt, returnRequestId)
      .query(`
        SELECT ri.ProductId, ri.Qty, ri.RefundLineAmount, p.ProductName
        FROM dbo.ReturnRequestItems ri
        INNER JOIN dbo.Products p ON ri.ProductId = p.ProductId
        WHERE ri.ReturnRequestId = @returnRequestId
      `);

    // 3. Restore MASTER stock for each returned item
    for (const item of itemsRes.recordset) {
      await transaction.request()
        .input('ProductId', sql.Int, item.ProductId)
        .input('LedgerType', sql.NVarChar(20), 'MASTER')
        .input('TxnType', sql.NVarChar(30), 'IN')
        .input('Qty', sql.Int, item.Qty)
        .input('CreatedByEmail', sql.NVarChar(255), adminEmail)
        .input('RefType', sql.NVarChar(50), 'RETURN')
        .input('RefId', sql.NVarChar(100), `RR-${returnRequestId}`)
        .input('Note', sql.NVarChar(500), `Stock restored from return request #${returnRequestId} (${item.ProductName})`)
        .execute('dbo.sp_InventoryApplyTransaction');
    }

    // 4. Update status to APPROVED
    await transaction.request()
      .input('returnRequestId', sql.BigInt, returnRequestId)
      .input('approvedByEmail', sql.NVarChar(255), adminEmail)
      .query(`
        UPDATE dbo.ReturnRequests
        SET
          Status = 'APPROVED',
          ApprovedByEmail = @approvedByEmail,
          UpdatedAt = SYSUTCDATETIME()
        WHERE ReturnRequestId = @returnRequestId
      `);

    await transaction.commit();

    return {
      returnRequestId,
      status: 'APPROVED',
      approvedBy: adminEmail,
      itemsRestored: itemsRes.recordset.map(i => ({
        productId: i.ProductId,
        productName: i.ProductName,
        qty: i.Qty
      }))
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Admin rejects a return request.
 * Transition: PENDING → REJECTED
 */
async function rejectReturn(pool, returnRequestId, adminEmail, rejectReason) {
  const res = await pool.request()
    .input('returnRequestId', sql.BigInt, returnRequestId)
    .input('approvedByEmail', sql.NVarChar(255), adminEmail)
    .input('rejectReason', sql.NVarChar(500), rejectReason || null)
    .query(`
      UPDATE dbo.ReturnRequests
      SET
        Status = 'REJECTED',
        ApprovedByEmail = @approvedByEmail,
        RejectReason = @rejectReason,
        UpdatedAt = SYSUTCDATETIME()
      WHERE ReturnRequestId = @returnRequestId AND Status = 'PENDING'

      SELECT Status, ApprovedByEmail, RejectReason
      FROM dbo.ReturnRequests
      WHERE ReturnRequestId = @returnRequestId
    `);

  const updated = res.recordset[0];
  if (!updated) {
    // Could mean not found or not in PENDING state
    const check = await pool.request()
      .input('returnRequestId', sql.BigInt, returnRequestId)
      .query(`SELECT Status FROM dbo.ReturnRequests WHERE ReturnRequestId = @returnRequestId`);

    if (!check.recordset[0]) {
      throw Object.assign(new Error('Return request not found.'), { code: 'NOT_FOUND', status: 404 });
    }
    throw Object.assign(
      new Error(`Return request is in '${check.recordset[0].Status}' state. Only PENDING requests can be rejected.`),
      { code: 'INVALID_STATUS', status: 400 }
    );
  }

  return {
    returnRequestId,
    status: updated.Status,
    approvedBy: updated.ApprovedByEmail,
    rejectReason: updated.RejectReason
  };
}

/**
 * Admin processes the final refund for an approved return.
 * - Updates OrderProfitBreakdowns (ReturnLoss, ProfitAfterReturn, SupplierPayable)
 * - Records REFUND transaction in WalletTransactions
 * - Transition: APPROVED → REFUNDED
 */
async function processRefund(pool, returnRequestId, adminEmail) {
  const transaction = pool.transaction();
  await transaction.begin();

  try {
    // 1. Fetch the return request
    const reqRes = await transaction.request()
      .input('returnRequestId', sql.BigInt, returnRequestId)
      .query(`
        SELECT rr.Status, rr.OrderId, rr.RefundTotal, rr.CustomerEmail, o.OrderRef
        FROM dbo.ReturnRequests rr
        INNER JOIN dbo.Orders o ON rr.OrderId = o.OrderId
        WHERE rr.ReturnRequestId = @returnRequestId
      `);

    const returnReq = reqRes.recordset[0];
    if (!returnReq) {
      throw Object.assign(new Error('Return request not found.'), { code: 'NOT_FOUND', status: 404 });
    }
    if (returnReq.Status !== 'APPROVED') {
      throw Object.assign(new Error(`Return request is in '${returnReq.Status}' state. Only APPROVED requests can be refunded.`), { code: 'INVALID_STATUS', status: 400 });
    }

    // 2. Fetch return items with breakdown data (join via OrderId + ProductId)
    const itemsWithBreakdown = await transaction.request()
      .input('returnRequestId', sql.BigInt, returnRequestId)
      .input('orderId', sql.BigInt, returnReq.OrderId)
      .query(`
        SELECT
          ri.ProductId, ri.Qty, ri.RefundLineAmount,
          b.BreakdownId, b.NetBrandCreatorProfit, b.SupplierPayable, b.ReturnLoss,
          b.ProfitAfterReturn, b.GrossRevenue
        FROM dbo.ReturnRequestItems ri
        INNER JOIN dbo.OrderProfitBreakdowns b
          ON b.OrderId = @orderId AND b.ProductId = ri.ProductId
        WHERE ri.ReturnRequestId = @returnRequestId
      `);

    // 3. Update each OrderProfitBreakdown row
    let totalSupplierReversal = 0;
    for (const item of itemsWithBreakdown.recordset) {
      const refundLine = parseFloat(item.RefundLineAmount);
      const currentReturnLoss = parseFloat(item.ReturnLoss || 0);
      const netProfit = parseFloat(item.NetBrandCreatorProfit);
      const currentSupplierPayable = parseFloat(item.SupplierPayable);

      // Calculate pro-rata supplier reversal for this item
      // SupplierPayable is total for the breakdown row (for all ordered qty)
      // The refund line amount is for the returned qty
      const orderedQtyBase = await transaction.request()
        .input('orderId', sql.BigInt, returnReq.OrderId)
        .input('productId', sql.Int, item.ProductId)
        .query(`SELECT Qty FROM dbo.OrderItems WHERE OrderId = @orderId AND ProductId = @productId`);

      const orderedQty = orderedQtyBase.recordset[0]?.Qty || 1;
      const supplierReversal = (item.Qty / orderedQty) * currentSupplierPayable;
      totalSupplierReversal += supplierReversal;

      const newReturnLoss = currentReturnLoss + refundLine;
      const newSupplierPayable = Math.max(0, currentSupplierPayable - supplierReversal);
      const newProfitAfterReturn = Math.max(0, netProfit - newReturnLoss);

      await transaction.request()
        .input('breakdownId', sql.BigInt, item.BreakdownId)
        .input('returnLoss', sql.Decimal(18, 2), newReturnLoss)
        .input('supplierPayable', sql.Decimal(18, 2), newSupplierPayable)
        .input('profitAfterReturn', sql.Decimal(18, 2), newProfitAfterReturn)
        .query(`
          UPDATE dbo.OrderProfitBreakdowns
          SET
            ReturnLoss = @returnLoss,
            SupplierPayable = @supplierPayable,
            ProfitAfterReturn = @profitAfterReturn
          WHERE BreakdownId = @breakdownId
        `);
    }

    // 4. Record the refund in WalletTransactions for audit trail
    const refundAmount = parseFloat(returnReq.RefundTotal);
    await transaction.request()
      .input('txnType', sql.NVarChar(50), 'RETURN_REFUND')
      .input('amount', sql.Decimal(18, 2), refundAmount)
      .input('notes', sql.NVarChar(500), `Refund for return request #${returnRequestId} | Order ${returnReq.OrderRef}`)
      .input('source', sql.NVarChar(100), 'RETURN_REFUND')
      .input('createdByEmail', sql.NVarChar(255), adminEmail)
      .query(`
        INSERT INTO dbo.WalletTransactions (TxnType, Amount, Notes, Source, CreatedByEmail)
        VALUES (@txnType, @amount, @notes, @source, @createdByEmail)
      `);

    // 5. Update status to REFUNDED
    await transaction.request()
      .input('returnRequestId', sql.BigInt, returnRequestId)
      .query(`
        UPDATE dbo.ReturnRequests
        SET
          Status = 'REFUNDED',
          RefundedAt = SYSUTCDATETIME(),
          UpdatedAt = SYSUTCDATETIME()
        WHERE ReturnRequestId = @returnRequestId
      `);

    await transaction.commit();

    return {
      returnRequestId,
      orderRef: returnReq.OrderRef,
      status: 'REFUNDED',
      refundTotal: refundAmount,
      refundedBy: adminEmail,
      refundedAt: new Date().toISOString(),
      supplierPayableReversed: parseFloat(totalSupplierReversal.toFixed(2))
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  requestReturn,
  getReturnRequests,
  getOrderReturns,
  approveReturn,
  rejectReturn,
  processRefund
};

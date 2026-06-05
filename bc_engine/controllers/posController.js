// bc_engine/controllers/posController.js
// ─── POS-Specific Operations: Exchange/Swap & Sale Cancellation ──────────────
'use strict';

const { poolPromise, sql } = require('../config/database');
const logger = require('../services/logger');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Restore stock batches for a returned item (reverse of FEFO depletion)
// Adds returned qty back to the MOST RECENT batch (LIFO restoration) to avoid
// contaminating FEFO queue, or creates a new returned-stock batch entry.
// ─────────────────────────────────────────────────────────────────────────────
const restoreBatchStock = async (transaction, productId, qtyToRestore, orderRef) => {
  // Try to add back to the latest batch for this product to keep ledger clean
  const latestBatch = await transaction.request()
    .input('productId', sql.Int, productId)
    .query(`
      SELECT TOP 1 BatchId FROM dbo.SupplierStockBatches
      WHERE ProductId = @productId
      ORDER BY BatchId DESC
    `);

  if (latestBatch.recordset.length > 0) {
    await transaction.request()
      .input('batchId', sql.Int, latestBatch.recordset[0].BatchId)
      .input('qty', sql.Int, qtyToRestore)
      .query('UPDATE dbo.SupplierStockBatches SET Qty = Qty + @qty WHERE BatchId = @batchId');
  } else {
    // No batches exist — insert a new returned-stock batch
    await transaction.request()
      .input('productId', sql.Int, productId)
      .input('qty', sql.Int, qtyToRestore)
      .input('ref', sql.NVarChar(100), orderRef)
      .query(`
        INSERT INTO dbo.SupplierStockBatches (ProductId, Qty, BatchNumber, Notes)
        VALUES (@productId, @qty, 'RETURN-' + CONVERT(NVARCHAR, GETDATE(), 112), 'Auto-created from return: ' + @ref)
      `);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Deplete batches FEFO (copied logic from orderController to keep atomic)
// ─────────────────────────────────────────────────────────────────────────────
const depleteBatchesFEFO = async (transaction, productId, qtyNeeded) => {
  let remaining = qtyNeeded;
  const batchesRes = await transaction.request()
    .input('productId', sql.Int, productId)
    .query(`
      SELECT BatchId, Qty
      FROM dbo.SupplierStockBatches
      WHERE ProductId = @productId AND Qty > 0
      ORDER BY
        CASE WHEN ExpiryDate IS NULL THEN 1 ELSE 0 END,
        ExpiryDate ASC,
        BatchId ASC
    `);

  for (const batch of batchesRes.recordset) {
    if (remaining <= 0) break;
    const deduct = Math.min(remaining, batch.Qty);
    await transaction.request()
      .input('batchId', sql.Int, batch.BatchId)
      .input('deduct', sql.Int, deduct)
      .query('UPDATE dbo.SupplierStockBatches SET Qty = Qty - @deduct WHERE BatchId = @batchId');
    remaining -= deduct;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pos/sales/:orderRef
// Fetch a single POS sale by orderRef for the Cancel/Exchange flow
// ─────────────────────────────────────────────────────────────────────────────
exports.getPosSale = async (req, res) => {
  const { orderRef } = req.params;
  try {
    const pool = await poolPromise;
    const orderRes = await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .query(`
        SELECT
          o.OrderId, o.OrderRef, o.Status, o.SaleChannel,
          o.TotalAmount, o.PaidAmount, o.PaymentProvider,
          o.CustomerPhone, o.CreatedAt, o.UpdatedAt,
          o.PromoCodeApplied, o.DiscountAmount,
          ISNULL(o.SaleStatus, 'COMPLETED') AS SaleStatus
        FROM dbo.Orders o
        WHERE o.OrderRef = @ref
      `);

    if (orderRes.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'SALE_NOT_FOUND', message: 'No POS sale found with that receipt number.' });
    }

    const order = orderRes.recordset[0];

    // Fetch line items
    const itemsRes = await pool.request()
      .input('orderId', sql.BigInt, order.OrderId)
      .query(`
        SELECT
          oi.OrderItemId, oi.ProductId, oi.Qty, oi.UnitPrice,
          p.ProductName, p.SKU, p.Barcode, p.Category
        FROM dbo.OrderItems oi
        JOIN dbo.Products p ON oi.ProductId = p.ProductId
        WHERE oi.OrderId = @orderId
      `);

    res.json({
      success: true,
      sale: {
        ...order,
        items: itemsRes.recordset
      }
    });
  } catch (err) {
    logger.error(err, 'getPosSale failed');
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pos/sales/:orderRef/cancellable
// Check whether a sale is still within the cancellation policy window
// Policy: Within same business day (before midnight) OR within 24 hours of sale
// ─────────────────────────────────────────────────────────────────────────────
exports.checkCancellable = async (req, res) => {
  const { orderRef } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .query(`
        SELECT
          OrderId, OrderRef, Status, SaleChannel, CreatedAt,
          ISNULL(SaleStatus, 'COMPLETED') AS SaleStatus,
          DATEDIFF(MINUTE, CreatedAt, GETUTCDATE()) AS AgeMinutes
        FROM dbo.Orders
        WHERE OrderRef = @ref
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, cancellable: false, reason: 'SALE_NOT_FOUND' });
    }

    const sale = result.recordset[0];
    const ageMinutes = sale.AgeMinutes;
    const MAX_CANCEL_MINUTES = 24 * 60; // 24-hour window

    let cancellable = false;
    let reason = '';

    if (sale.SaleStatus === 'CANCELLED') {
      reason = 'Sale is already cancelled.';
    } else if (sale.SaleChannel !== 'PHYSICAL_SHOP') {
      reason = 'Only physical POS sales can be cancelled from this terminal. Use Admin panel for online orders.';
    } else if (ageMinutes > MAX_CANCEL_MINUTES) {
      reason = `Cancellation window expired. Sale was made ${Math.round(ageMinutes / 60)} hours ago. Policy: 24 hours.`;
    } else {
      cancellable = true;
      reason = `Sale is eligible for cancellation. ${Math.round(MAX_CANCEL_MINUTES - ageMinutes)} minutes remaining in policy window.`;
    }

    res.json({
      success: true,
      cancellable,
      reason,
      sale: {
        orderRef: sale.OrderRef,
        status: sale.SaleStatus,
        ageMinutes,
        createdAt: sale.CreatedAt
      }
    });
  } catch (err) {
    logger.error(err, 'checkCancellable failed');
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pos/sales/:orderRef/cancel
// Cancel a completed POS sale, reverse all stock, and record refund
// Body: { cancellationReason, refundMethod }
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelPosSale = async (req, res) => {
  const { orderRef } = req.params;
  const { cancellationReason, refundMethod = 'CASH' } = req.body;
  const cashierEmail = req.user?.email || 'cashier@pos.local';

  if (!cancellationReason || !cancellationReason.trim()) {
    return res.status(400).json({ success: false, error: 'VALIDATION', message: 'Cancellation reason is required.' });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // 1. Fetch sale with lock
    const orderRes = await transaction.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .query(`
        SELECT
          o.OrderId, o.OrderRef, o.Status, o.SaleChannel, o.TotalAmount, o.PaidAmount,
          o.PaymentProvider, o.CustomerPhone, o.CreatedAt,
          ISNULL(o.SaleStatus, 'COMPLETED') AS SaleStatus,
          DATEDIFF(MINUTE, o.CreatedAt, GETUTCDATE()) AS AgeMinutes
        FROM dbo.Orders o WITH (UPDLOCK)
        WHERE o.OrderRef = @ref
      `);

    if (orderRes.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'SALE_NOT_FOUND', message: 'Receipt not found.' });
    }

    const sale = orderRes.recordset[0];

    // 2. Policy guards
    if (sale.SaleStatus === 'CANCELLED') {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: 'ALREADY_CANCELLED', message: 'This sale has already been cancelled.' });
    }
    if (sale.SaleChannel !== 'PHYSICAL_SHOP') {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'INVALID_CHANNEL', message: 'Only physical POS sales can be voided here.' });
    }
    if (sale.AgeMinutes > 24 * 60) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'POLICY_WINDOW_EXPIRED', message: `Cancellation denied: sale is ${Math.round(sale.AgeMinutes / 60)}h old. Max window is 24h.` });
    }

    // 3. Get line items
    const itemsRes = await transaction.request()
      .input('orderId', sql.BigInt, sale.OrderId)
      .query('SELECT ProductId, Qty, UnitPrice FROM dbo.OrderItems WHERE OrderId = @orderId');

    // 4. Reverse stock: re-add qty back to batches + apply IN transaction to master ledger
    for (const item of itemsRes.recordset) {
      // Restore to FEFO batches
      await restoreBatchStock(transaction, item.ProductId, item.Qty, orderRef);

      // Apply master ledger reversal (IN = stock coming back)
      await transaction.request()
        .input('ProductId', sql.Int, item.ProductId)
        .input('LedgerType', sql.NVarChar(20), 'MASTER')
        .input('TxnType', sql.NVarChar(30), 'IN')
        .input('Qty', sql.Int, item.Qty)
        .input('RefType', sql.NVarChar(50), 'SALE_CANCELLATION')
        .input('RefId', sql.NVarChar(100), orderRef)
        .input('Note', sql.NVarChar(255), `Sale void reversal: ${cancellationReason}`)
        .input('CreatedByEmail', sql.NVarChar(255), cashierEmail)
        .execute('dbo.sp_InventoryApplyTransaction');
    }

    // 5. Mark sale as CANCELLED in Orders table
    // First check if SaleStatus column exists (schema migration safety)
    try {
      await transaction.request()
        .input('ref', sql.NVarChar(100), orderRef)
        .input('reason', sql.NVarChar(500), cancellationReason)
        .input('cancelledBy', sql.NVarChar(255), cashierEmail)
        .query(`
          UPDATE dbo.Orders
          SET
            Status = 'CANCELLED',
            SaleStatus = 'CANCELLED',
            CancellationReason = @reason,
            CancelledAt = GETUTCDATE(),
            CancelledBy = @cancelledBy,
            UpdatedAt = GETUTCDATE()
          WHERE OrderRef = @ref
        `);
    } catch {
      // Fallback if new columns don't exist yet
      await transaction.request()
        .input('ref', sql.NVarChar(100), orderRef)
        .query(`
          UPDATE dbo.Orders SET Status = 'CANCELLED', UpdatedAt = GETUTCDATE()
          WHERE OrderRef = @ref
        `);
    }

    await transaction.commit();

    logger.info({ event: 'pos.sale.cancelled', orderRef, cashierEmail, reason: cancellationReason });

    res.json({
      success: true,
      message: 'Sale cancelled successfully. Stock has been restored.',
      orderRef,
      refundAmount: parseFloat(sale.PaidAmount || sale.TotalAmount),
      refundMethod,
      itemsRestored: itemsRes.recordset.map(i => ({ productId: i.ProductId, qty: i.Qty }))
    });

  } catch (err) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error(err, 'cancelPosSale failed');
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pos/exchange
// Process a product exchange: return Item_A, issue Item_B, settle price diff
// Body: {
//   originalOrderRef,    -- receipt of the original sale
//   returnedItems: [{ productId, qty }],
//   newItems: [{ productId, qty, unitPrice }],
//   settlementMethod: 'CASH' | 'CARD' | 'WALLET',
//   exchangeNotes
// }
// ─────────────────────────────────────────────────────────────────────────────
exports.processExchange = async (req, res) => {
  const {
    originalOrderRef,
    returnedItems = [],
    newItems = [],
    settlementMethod = 'CASH',
    exchangeNotes = ''
  } = req.body;

  const cashierEmail = req.user?.email || 'cashier@pos.local';

  // Validate inputs
  if (!originalOrderRef) {
    return res.status(400).json({ success: false, error: 'VALIDATION', message: 'originalOrderRef is required.' });
  }
  if (returnedItems.length === 0) {
    return res.status(400).json({ success: false, error: 'VALIDATION', message: 'At least one returned item is required.' });
  }
  if (newItems.length === 0) {
    return res.status(400).json({ success: false, error: 'VALIDATION', message: 'At least one new item is required for exchange.' });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // 1. Validate the original sale exists and is a POS sale
    const originalSaleRes = await transaction.request()
      .input('ref', sql.NVarChar(100), originalOrderRef)
      .query(`
        SELECT OrderId, Status, SaleChannel, TotalAmount, PaidAmount
        FROM dbo.Orders WITH (UPDLOCK)
        WHERE OrderRef = @ref
      `);

    if (originalSaleRes.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'SALE_NOT_FOUND', message: 'Original receipt not found.' });
    }

    const origSale = originalSaleRes.recordset[0];
    if (origSale.SaleChannel !== 'PHYSICAL_SHOP') {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'INVALID_CHANNEL', message: 'Exchange is only supported for physical POS sales.' });
    }

    // 2. Check stock availability for new items
    for (const newItem of newItems) {
      const stockRes = await transaction.request()
        .input('productId', sql.Int, newItem.productId)
        .query(`
          SELECT ISNULL(SUM(Qty), 0) AS Available
          FROM dbo.SupplierStockBatches
          WHERE ProductId = @productId AND Qty > 0
        `);
      const available = stockRes.recordset[0]?.Available || 0;
      if (available < newItem.qty) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for product ID ${newItem.productId}. Available: ${available}, Requested: ${newItem.qty}`
        });
      }
    }

    // 3. Process returned items: restore stock
    let returnedValue = 0;
    for (const retItem of returnedItems) {
      await restoreBatchStock(transaction, retItem.productId, retItem.qty, originalOrderRef);

      // Get unit price from original order
      const priceRes = await transaction.request()
        .input('orderId', sql.BigInt, origSale.OrderId)
        .input('productId', sql.Int, retItem.productId)
        .query('SELECT TOP 1 UnitPrice FROM dbo.OrderItems WHERE OrderId = @orderId AND ProductId = @productId');

      const unitPrice = priceRes.recordset[0]?.UnitPrice || 0;
      returnedValue += unitPrice * retItem.qty;

      // Ledger: stock coming back IN
      await transaction.request()
        .input('ProductId', sql.Int, retItem.productId)
        .input('LedgerType', sql.NVarChar(20), 'MASTER')
        .input('TxnType', sql.NVarChar(30), 'IN')
        .input('Qty', sql.Int, retItem.qty)
        .input('RefType', sql.NVarChar(50), 'EXCHANGE_RETURN')
        .input('RefId', sql.NVarChar(100), originalOrderRef)
        .input('Note', sql.NVarChar(255), `Exchange return: ${exchangeNotes}`.substring(0, 255))
        .input('CreatedByEmail', sql.NVarChar(255), cashierEmail)
        .execute('dbo.sp_InventoryApplyTransaction');
    }

    // 4. Process new items: deplete stock FEFO, create new order
    let newItemsValue = 0;
    const exchangeOrderRef = `EXC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrderRes = await transaction.request()
      .input('orderRef', sql.NVarChar(100), exchangeOrderRef)
      .input('customerEmail', sql.NVarChar(255), cashierEmail)
      .input('totalAmount', sql.Decimal(18, 2), newItems.reduce((s, i) => s + i.qty * (i.unitPrice || 0), 0))
      .input('currency', sql.NVarChar(10), 'BDT')
      .input('saleChannel', sql.NVarChar(50), 'PHYSICAL_SHOP')
      .input('paymentProvider', sql.NVarChar(50), settlementMethod)
      .input('transactionId', sql.NVarChar(100), `EXC-${Date.now()}`)
      .query(`
        INSERT INTO dbo.Orders (OrderRef, CustomerEmail, Status, PaymentStatus, TotalAmount, PaidAmount, PaidAt, Currency, SaleChannel, PaymentProvider, TransactionId)
        OUTPUT inserted.OrderId
        VALUES (@orderRef, @customerEmail, 'CONFIRMED', 'PAYMENT_VERIFIED', @totalAmount, @totalAmount, SYSUTCDATETIME(), @currency, @saleChannel, @paymentProvider, @transactionId)
      `);

    const newOrderId = newOrderRes.recordset[0].OrderId;

    for (const newItem of newItems) {
      newItemsValue += newItem.qty * (newItem.unitPrice || 0);

      await transaction.request()
        .input('orderId', sql.BigInt, newOrderId)
        .input('productId', sql.Int, newItem.productId)
        .input('qty', sql.Int, newItem.qty)
        .input('unitPrice', sql.Decimal(18, 2), newItem.unitPrice || 0)
        .query('INSERT INTO dbo.OrderItems (OrderId, ProductId, Qty, UnitPrice) VALUES (@orderId, @productId, @qty, @unitPrice)');

      await transaction.request()
        .input('ProductId', sql.Int, newItem.productId)
        .input('LedgerType', sql.NVarChar(20), 'MASTER')
        .input('TxnType', sql.NVarChar(30), 'OUT')
        .input('Qty', sql.Int, newItem.qty)
        .input('RefType', sql.NVarChar(50), 'EXCHANGE_ISSUE')
        .input('RefId', sql.NVarChar(100), exchangeOrderRef)
        .input('Note', sql.NVarChar(255), `Exchange issue: ${exchangeNotes}`.substring(0, 255))
        .input('CreatedByEmail', sql.NVarChar(255), cashierEmail)
        .execute('dbo.sp_InventoryApplyTransaction');

      await depleteBatchesFEFO(transaction, newItem.productId, newItem.qty);
    }

    // 5. Calculate price difference
    const priceDifference = newItemsValue - returnedValue;

    // 6. Try to record in POS_Exchanges table (created if table exists)
    try {
      await transaction.request()
        .input('originalSaleId', sql.BigInt, origSale.OrderId)
        .input('newSaleId', sql.BigInt, newOrderId)
        .input('returnedItems', sql.NVarChar(sql.MAX), JSON.stringify(returnedItems))
        .input('newItems', sql.NVarChar(sql.MAX), JSON.stringify(newItems))
        .input('priceDifference', sql.Decimal(18, 2), priceDifference)
        .input('settlementMethod', sql.NVarChar(20), settlementMethod)
        .input('processedBy', sql.NVarChar(255), cashierEmail)
        .input('exchangeNotes', sql.NVarChar(500), exchangeNotes || '')
        .query(`
          INSERT INTO dbo.POS_Exchanges
            (OriginalSaleId, NewSaleId, ReturnedItems, NewItems, PriceDifference, SettlementMethod, ProcessedBy, ExchangeNotes)
          VALUES
            (@originalSaleId, @newSaleId, @returnedItems, @newItems, @priceDifference, @settlementMethod, @processedBy, @exchangeNotes)
        `);
    } catch (tableErr) {
      // POS_Exchanges table may not exist yet — log but don't fail the exchange
      logger.warn('POS_Exchanges table not found; exchange logged without record table entry.', tableErr.message);
    }

    await transaction.commit();

    logger.info({ event: 'pos.exchange.processed', originalOrderRef, exchangeOrderRef, priceDifference, cashierEmail });

    res.status(201).json({
      success: true,
      message: 'Exchange processed successfully.',
      originalOrderRef,
      exchangeOrderRef,
      returnedValue: parseFloat(returnedValue.toFixed(2)),
      newItemsValue: parseFloat(newItemsValue.toFixed(2)),
      priceDifference: parseFloat(priceDifference.toFixed(2)),
      settlementMethod,
      instruction: priceDifference > 0
        ? `Customer pays ৳${priceDifference.toFixed(2)} extra.`
        : priceDifference < 0
          ? `Issue refund of ৳${Math.abs(priceDifference).toFixed(2)} to customer.`
          : 'No price difference. Even exchange completed.'
    });

  } catch (err) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error(err, 'processExchange failed');
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
};

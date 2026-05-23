const { poolPromise, sql } = require('../config/db');
const crypto = require('crypto');
const logger = require('../src/logger');
const { outboxPendingGauge, webhookVerifyCounter } = require('../src/metrics');

// Helper function to record order item splits in OrderProfitBreakdowns and update profit snapshots
const recordOrderProfitBreakdown = async (transaction, orderId, orderRef) => {
  const result = await transaction.request()
    .input('orderId', sql.BigInt, orderId)
    .query(`
      SELECT 
        oi.ProductId AS productId,
        oi.Qty AS qty,
        oi.UnitPrice AS unitPrice,
        p.BasePrice AS basePrice,
        p.RPU_MRP AS rpuMrp,
        ap.AdminSellingPrice AS adminSellingPrice,
        ap.AdBudgetPlanned AS adBudgetPlanned,
        ap.PlatformCommission AS platformCommission,
        ap.DeliveryOpsCost AS deliveryOpsCost,
        ap.DiscountAmount AS discountAmount
      FROM dbo.OrderItems oi
      INNER JOIN dbo.Products p ON oi.ProductId = p.ProductId
      LEFT JOIN dbo.AdminPricingPlans ap ON oi.ProductId = ap.ProductId AND ap.Status = 'ACTIVE'
      WHERE oi.OrderId = @orderId
    `);

  for (const row of result.recordset) {
    const qty = row.qty;
    const unitPrice = parseFloat(row.unitPrice);
    const grossRevenue = qty * unitPrice;

    // Supplier Cost per unit: prioritizing RPU_MRP then BasePrice
    const supplierCostPerUnit = row.rpuMrp !== null && parseFloat(row.rpuMrp) > 0 
      ? parseFloat(row.rpuMrp) 
      : (row.basePrice !== null ? parseFloat(row.basePrice) : 0.00);

    const supplierPayable = qty * supplierCostPerUnit;

    // Pricing plan variables (fallback to 0 if no plan)
    const adPlannedUnit = row.adBudgetPlanned !== null ? parseFloat(row.adBudgetPlanned) : 0.00;
    const commUnit = row.platformCommission !== null ? parseFloat(row.platformCommission) : 0.00;
    const deliveryUnit = row.deliveryOpsCost !== null ? parseFloat(row.deliveryOpsCost) : 0.00;
    const discountUnit = row.discountAmount !== null ? parseFloat(row.discountAmount) : 0.00;

    // Calculate payouts
    const adSpendShare = qty * adPlannedUnit;
    const platformCommission = qty * commUnit;
    const deliveryOpsCost = qty * deliveryUnit;
    const discountAmount = qty * discountUnit;

    // Net BrandCreator profit formula: GrossRevenue minus supplier cost, planned marketing, logistics, and discounts
    const netBrandCreatorProfit = grossRevenue - supplierPayable - adSpendShare - deliveryOpsCost - discountAmount;

    // Insert into dbo.OrderProfitBreakdowns
    await transaction.request()
      .input('orderId', sql.BigInt, orderId)
      .input('productId', sql.Int, row.productId)
      .input('qty', sql.Int, qty)
      .input('grossRevenue', sql.Decimal(18, 2), grossRevenue)
      .input('supplierPayable', sql.Decimal(18, 2), supplierPayable)
      .input('platformCommission', sql.Decimal(18, 2), platformCommission)
      .input('adSpendShare', sql.Decimal(18, 2), adSpendShare)
      .input('deliveryOpsCost', sql.Decimal(18, 2), deliveryOpsCost)
      .input('discountAmount', sql.Decimal(18, 2), discountAmount)
      .input('netProfit', sql.Decimal(18, 2), netBrandCreatorProfit)
      .input('profitAfterReturn', sql.Decimal(18, 2), netBrandCreatorProfit)
      .query(`
        INSERT INTO dbo.OrderProfitBreakdowns (
          OrderId, ProductId, Qty, GrossRevenue, SupplierPayable, PlatformCommission,
          AdSpendShare, DeliveryOpsCost, DiscountAmount, NetBrandCreatorProfit, ReturnLoss, 
          ProfitAfterReturn, PaymentStatus
        )
        VALUES (
          @orderId, @productId, @qty, @grossRevenue, @supplierPayable, @platformCommission,
          @adSpendShare, @deliveryOpsCost, @discountAmount, @netProfit, 0.00, 
          @profitAfterReturn, 'PAID'
        )
      `);
      
    // Update live AdSpendActual on the snapshot: increment actual spend by simulated share
    await transaction.request()
      .input('productId', sql.Int, row.productId)
      .input('adSpendShare', sql.Decimal(18, 2), adSpendShare)
      .query(`
        UPDATE dbo.ProductProfitSnapshots
        SET AdSpendActual = AdSpendActual + @adSpendShare,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ProductId = @productId
      `);
  }
};

// POST /api/orders
exports.createOrder = async (req, res) => {
  const { orderRef, items, currency, customerPhone } = req.body;
  const customerEmail = req.user?.email || 'customer@test.com';

  if (!orderRef || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'orderRef and a non-empty items array are required' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Calculate Total Amount and verify products
      let totalAmount = 0;
      for (const item of items) {
        if (!item.productId || !item.qty || !item.unitPrice) {
          return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Each item must have productId, qty, and unitPrice' });
        }
        totalAmount += item.qty * item.unitPrice;
      }

      // 2. Pre-check stock levels in SELL ledger for all products to prevent transaction aborts
      for (const item of items) {
        const ledgerResult = await transaction.request()
          .input('productId', sql.Int, item.productId)
          .query("SELECT OnHandQty, ReservedQty FROM dbo.InventoryLedgers WHERE ProductId = @productId AND LedgerType = 'SELL'");

        const ledger = ledgerResult.recordset[0] || { OnHandQty: 0, ReservedQty: 0 };
        const available = ledger.OnHandQty - ledger.ReservedQty;

        if (available < item.qty) {
          const stockErr = new Error('INSUFFICIENT_STOCK');
          throw stockErr;
        }
      }

      // 3. Insert Order Header
      const orderInsertRes = await transaction.request()
        .input('orderRef', sql.NVarChar(100), orderRef)
        .input('customerEmail', sql.NVarChar(255), customerEmail)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('currency', sql.NVarChar(10), currency || 'BDT')
        .input('customerPhone', sql.NVarChar(50), customerPhone || null)
        .query(`
          INSERT INTO dbo.Orders (OrderRef, CustomerEmail, Status, TotalAmount, Currency, CustomerPhone)
          OUTPUT inserted.OrderId
          VALUES (@orderRef, @customerEmail, 'PENDING', @totalAmount, @currency, @customerPhone)
        `);

      const orderId = orderInsertRes.recordset[0].OrderId;

      // 4. Process items: insert to OrderItems and reserve SELL stock via sp_InventoryApplyTransaction
      for (const item of items) {
        // A. Insert Item record
        await transaction.request()
          .input('orderId', sql.BigInt, orderId)
          .input('productId', sql.Int, item.productId)
          .input('qty', sql.Int, item.qty)
          .input('unitPrice', sql.Decimal(18, 2), item.unitPrice)
          .query(`
            INSERT INTO dbo.OrderItems (OrderId, ProductId, Qty, UnitPrice)
            VALUES (@orderId, @productId, @qty, @unitPrice)
          `);

        // B. Apply SELL RESERVE (Using capitalized parameter names as declared in SP)
        await transaction.request()
          .input('ProductId', sql.Int, item.productId)
          .input('LedgerType', sql.NVarChar(20), 'SELL')
          .input('TxnType', sql.NVarChar(30), 'RESERVE')
          .input('Qty', sql.Int, item.qty)
          .input('RefType', sql.NVarChar(50), 'ORDER_RESERVE')
          .input('RefId', sql.NVarChar(100), orderRef)
          .input('Note', sql.NVarChar(255), 'Reserve order stock')
          .input('CreatedByEmail', sql.NVarChar(255), customerEmail)
          .execute('dbo.sp_InventoryApplyTransaction');
      }

      await transaction.commit();

      // Trigger WhatsApp order confirmation asynchronously
      if (customerPhone) {
        const whatsappService = require('../services/whatsappService');
        const customerName = customerEmail.split('@')[0];
        whatsappService.sendTemplateMessage({
          phone: customerPhone,
          templateName: 'order_confirmation',
          params: [customerName, orderRef, totalAmount.toFixed(2)],
          orderId: parseInt(orderId)
        }).catch(err => logger.error('WhatsApp checkout confirmation error:', err));
      }

      logger.info({
        event: 'order.reserve',
        reqId: req.reqId,
        orderRef,
        status: 'PENDING'
      });

      res.status(201).json({
        orderId: parseInt(orderId),
        orderRef,
        status: 'PENDING',
        reservation: 'DONE'
      });
    } catch (err) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        // Suppress rollback errors since the transaction might be already aborted
      }
      
      // If error is related to Stored Procedure stock limits, pre-check, or transaction rollbacks
      if (
        err.message === 'INSUFFICIENT_STOCK' ||
        (err.message && err.message.includes('INSUFFICIENT_STOCK')) ||
        (err.message && err.message.includes('Transaction count after EXECUTE')) ||
        !err.message
      ) {
        return res.status(400).json({
          error: 'INSUFFICIENT_STOCK',
          message: 'Requested qty exceeds SELL available balance'
        });
      }

      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/orders/:orderRef/confirm
exports.confirmOrder = async (req, res) => {
  const { orderRef } = req.params;
  const { provider, eventType, eventRef, payload } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];
  const email = req.user?.email || 'webhook@payment.com';

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Idempotency-Key header is required' });
  }

  if (!provider || !eventType || !eventRef) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'provider, eventType, and eventRef are required' });
  }

  try {
    const pool = await poolPromise;

    // 1. Idempotency Check: search if already processed
    const idemCheck = await pool.request()
      .input('key', sql.NVarChar(150), idempotencyKey)
      .query('SELECT TOP 1 * FROM dbo.PaymentEvents WHERE IdempotencyKey = @key');

    if (idemCheck.recordset.length > 0) {
      const event = idemCheck.recordset[0];
      if (event.Processed) {
        // Fetch order status
        const orderResult = await pool.request()
          .input('ref', sql.NVarChar(100), orderRef)
          .query('SELECT Status FROM dbo.Orders WHERE OrderRef = @ref');
        
        const status = orderResult.recordset[0]?.Status || 'CONFIRMED';
        return res.json({
          orderRef,
          status,
          idempotentReplay: true
        });
      }
    } else {
      // Reserve the idempotency key in a quick insert
      try {
        await pool.request()
          .input('provider', sql.NVarChar(50), provider)
          .input('eventType', sql.NVarChar(50), eventType)
          .input('eventRef', sql.NVarChar(150), eventRef)
          .input('orderRef', sql.NVarChar(100), orderRef)
          .input('key', sql.NVarChar(150), idempotencyKey)
          .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(payload || {}))
          .query(`
            INSERT INTO dbo.PaymentEvents (Provider, EventType, EventRef, OrderRef, IdempotencyKey, PayloadJson, Processed)
            VALUES (@provider, @eventType, @eventRef, @orderRef, @key, @payload, 0)
          `);
      } catch (e) {
        // Duplicate key race condition
        return res.status(409).json({ error: 'CONFLICT', message: 'Idempotency key processing in progress or already processed' });
      }
    }

    // 2. Perform Order Confirmation Transactionally
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Get order details
      const orderRes = await transaction.request()
        .input('ref', sql.NVarChar(100), orderRef)
        .query('SELECT OrderId, Status, PaymentStatus, TotalAmount, PaidAmount, CustomerPhone, CustomerEmail FROM dbo.Orders WHERE OrderRef = @ref');

      if (orderRes.recordset.length === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
      }

      const order = orderRes.recordset[0];

      if (order.Status === 'CONFIRMED') {
        // Mark processed and commit
        await transaction.request()
          .input('key', sql.NVarChar(150), idempotencyKey)
          .query('UPDATE dbo.PaymentEvents SET Processed = 1 WHERE IdempotencyKey = @key');
        await transaction.commit();

        return res.json({
          orderRef,
          status: 'CONFIRMED',
          stockAction: 'SELL_COMMIT_DONE'
        });
      }

      if (order.Status !== 'PENDING') {
        return res.status(400).json({ error: 'INVALID_STATE', message: `Order cannot be confirmed because it is in state: ${order.Status}` });
      }

      // Check payment status or manual admin override with review note
      const isVerified = order.PaymentStatus === 'PAYMENT_VERIFIED';
      const manualReviewNote = req.body.manualReviewNote || req.body.overrideNote || payload?.manualReviewNote;
      const isManualOverride = Boolean(manualReviewNote && (req.user?.role === 'Admin' || req.user?.role === 'SuperAdmin'));

      if (!isVerified && !isManualOverride) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'PAYMENT_NOT_VERIFIED',
          message: 'Confirm payment is only allowed if payment status is PAYMENT_VERIFIED or admin manual review note is supplied.'
        });
      }

      // If manual override is used, update database fields within the transaction
      if (isManualOverride && !isVerified) {
        await transaction.request()
          .input('ref', sql.NVarChar(100), orderRef)
          .input('note', sql.NVarChar(1000), manualReviewNote)
          .input('reviewer', sql.NVarChar(255), email)
          .query(`
            UPDATE dbo.Orders 
            SET PaymentStatus = 'PAYMENT_VERIFIED', 
                ManualReviewNote = @note, 
                PaymentReviewedByEmail = @reviewer, 
                PaymentReviewedAt = SYSUTCDATETIME(),
                PaidAmount = TotalAmount,
                PaidAt = SYSUTCDATETIME()
            WHERE OrderRef = @ref
          `);
      }

      // Fetch Items
      const itemsRes = await transaction.request()
        .input('orderId', sql.BigInt, order.OrderId)
        .query('SELECT ProductId, Qty FROM dbo.OrderItems WHERE OrderId = @orderId');

      // 3. For each item, apply COMMIT transaction
      for (const item of itemsRes.recordset) {
        await transaction.request()
          .input('ProductId', sql.Int, item.ProductId)
          .input('LedgerType', sql.NVarChar(20), 'SELL')
          .input('TxnType', sql.NVarChar(30), 'COMMIT')
          .input('Qty', sql.Int, item.Qty)
          .input('RefType', sql.NVarChar(50), 'ORDER_COMMIT')
          .input('RefId', sql.NVarChar(100), orderRef)
          .input('Note', sql.NVarChar(255), 'Commit order stock')
          .input('CreatedByEmail', sql.NVarChar(255), email)
          .execute('dbo.sp_InventoryApplyTransaction');
      }

      // 4. Update Order Status
      await transaction.request()
        .input('ref', sql.NVarChar(100), orderRef)
        .query("UPDATE dbo.Orders SET Status = 'CONFIRMED', UpdatedAt = SYSUTCDATETIME() WHERE OrderRef = @ref");

      // 4b. Realize financial splits in the ledger
      await recordOrderProfitBreakdown(transaction, order.OrderId, orderRef);

      // 5. Update Idempotency Table Processed bit
      await transaction.request()
        .input('key', sql.NVarChar(150), idempotencyKey)
        .query('UPDATE dbo.PaymentEvents SET Processed = 1 WHERE IdempotencyKey = @key');

      // 6. Write to OutboxEvents
      await transaction.request()
        .input('ref', sql.NVarChar(100), orderRef)
        .input('payload', sql.NVarChar(sql.MAX), JSON.stringify({ orderRef, amount: payload?.amount || 0 }))
        .query(`
          INSERT INTO dbo.OutboxEvents (EventType, AggregateType, AggregateId, PayloadJson, Status)
          VALUES ('ORDER_CONFIRMED', 'ORDER', @ref, @payload, 'PENDING')
        `);

      await transaction.commit();

      // Trigger WhatsApp payment confirmation asynchronously
      if (order.CustomerPhone) {
        const whatsappService = require('../services/whatsappService');
        const customerName = (order.CustomerEmail || 'Customer').split('@')[0];
        whatsappService.sendTemplateMessage({
          phone: order.CustomerPhone,
          templateName: 'payment_verified',
          params: [customerName, orderRef],
          orderId: order.OrderId
        }).catch(err => logger.error('WhatsApp payment verification confirm error:', err));
      }

      logger.info({
        event: 'order.confirm',
        reqId: req.reqId,
        orderRef,
        status: 'CONFIRMED'
      });

      res.json({
        orderRef,
        status: 'CONFIRMED',
        stockAction: 'SELL_COMMIT_DONE'
      });
    } catch (err) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        // Suppress rollback errors since the transaction might be already aborted
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/orders/:orderRef/cancel
exports.cancelOrder = async (req, res) => {
  const { orderRef } = req.params;
  const { provider, eventType, eventRef, reason } = req.body;
  const email = req.user?.email || 'customer@test.com';

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Get order details
      const orderRes = await transaction.request()
        .input('ref', sql.NVarChar(100), orderRef)
        .query('SELECT OrderId, Status FROM dbo.Orders WHERE OrderRef = @ref');

      if (orderRes.recordset.length === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
      }

      const order = orderRes.recordset[0];

      if (order.Status === 'CANCELLED') {
        await transaction.commit();
        return res.json({
          orderRef,
          status: 'CANCELLED',
          stockAction: 'SELL_RELEASE_DONE'
        });
      }

      if (order.Status !== 'PENDING') {
        return res.status(400).json({ error: 'INVALID_STATE', message: `Order cannot be cancelled because it is in state: ${order.Status}` });
      }

      // Fetch Items
      const itemsRes = await transaction.request()
        .input('orderId', sql.BigInt, order.OrderId)
        .query('SELECT ProductId, Qty FROM dbo.OrderItems WHERE OrderId = @orderId');

      // For each item, apply RELEASE transaction
      for (const item of itemsRes.recordset) {
        await transaction.request()
          .input('ProductId', sql.Int, item.ProductId)
          .input('LedgerType', sql.NVarChar(20), 'SELL')
          .input('TxnType', sql.NVarChar(30), 'RELEASE')
          .input('Qty', sql.Int, item.Qty)
          .input('RefType', sql.NVarChar(50), 'ORDER_RELEASE')
          .input('RefId', sql.NVarChar(100), orderRef)
          .input('Note', sql.NVarChar(255), 'Release order stock')
          .input('CreatedByEmail', sql.NVarChar(255), email)
          .execute('dbo.sp_InventoryApplyTransaction');
      }

      // Update Order Status
      await transaction.request()
        .input('ref', sql.NVarChar(100), orderRef)
        .query("UPDATE dbo.Orders SET Status = 'CANCELLED', UpdatedAt = SYSUTCDATETIME() WHERE OrderRef = @ref");

      // Write to OutboxEvents
      await transaction.request()
        .input('ref', sql.NVarChar(100), orderRef)
        .input('payload', sql.NVarChar(sql.MAX), JSON.stringify({ orderRef, reason: reason || 'Payment timeout' }))
        .query(`
          INSERT INTO dbo.OutboxEvents (EventType, AggregateType, AggregateId, PayloadJson, Status)
          VALUES ('ORDER_CANCELLED', 'ORDER', @ref, @payload, 'PENDING')
        `);

      await transaction.commit();

      logger.info({
        event: 'order.cancel',
        reqId: req.reqId,
        orderRef,
        status: 'CANCELLED'
      });

      res.json({
        orderRef,
        status: 'CANCELLED',
        stockAction: 'SELL_RELEASE_DONE'
      });
    } catch (err) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        // Suppress rollback errors since the transaction might be already aborted
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/orders/:orderRef
exports.getOrderDetails = async (req, res) => {
  const { orderRef } = req.params;

  try {
    const pool = await poolPromise;
    
    const orderRes = await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .query(`
        SELECT OrderId, OrderRef, CustomerEmail, Status, TotalAmount, Currency,
               PaymentEvidence, PaymentProvider, TransactionId, PaidAmount, PaymentStatus,
               GatewaySignatureStatus, ManualReviewNote, PaymentSubmittedByEmail, PaymentReviewedByEmail,
               PaidAt, PaymentReviewedAt
        FROM dbo.Orders 
        WHERE OrderRef = @ref
      `);

    if (orderRes.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

    const order = orderRes.recordset[0];

    const itemsRes = await pool.request()
      .input('orderId', sql.BigInt, order.OrderId)
      .query('SELECT ProductId AS productId, Qty AS qty, UnitPrice AS unitPrice, LineTotal AS lineTotal FROM dbo.OrderItems WHERE OrderId = @orderId');

    res.json({
      orderRef: order.OrderRef,
      status: order.Status,
      customerEmail: order.CustomerEmail,
      totalAmount: order.TotalAmount,
      currency: order.Currency,
      paymentEvidence: order.PaymentEvidence,
      paymentProvider: order.PaymentProvider,
      transactionId: order.TransactionId,
      paidAmount: order.PaidAmount,
      paymentStatus: order.PaymentStatus,
      gatewaySignatureStatus: order.GatewaySignatureStatus,
      manualReviewNote: order.ManualReviewNote,
      paymentSubmittedByEmail: order.PaymentSubmittedByEmail,
      paymentReviewedByEmail: order.PaymentReviewedByEmail,
      paidAt: order.PaidAt,
      paymentReviewedAt: order.PaymentReviewedAt,
      items: itemsRes.recordset
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/orders/:orderRef/events
exports.getOrderEvents = async (req, res) => {
  const { orderRef } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .query('SELECT Provider AS provider, EventType AS eventType, EventRef AS eventRef, IdempotencyKey AS idempotencyKey, Processed AS processed FROM dbo.PaymentEvents WHERE OrderRef = @ref');

    res.json({
      items: result.recordset
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/outbox/pending
exports.getPendingOutbox = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT OutboxId AS outboxId, EventType AS eventType, AggregateType AS aggregateType, AggregateId AS aggregateId, Status AS status FROM dbo.OutboxEvents WHERE Status = 'PENDING' ORDER BY CreatedAt ASC");

    // Expose metrics Pending total
    outboxPendingGauge.set(result.recordset.length);

    res.json({
      items: result.recordset
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/outbox/:id/mark-sent
exports.markOutboxSent = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.BigInt, id)
      .query("UPDATE dbo.OutboxEvents SET Status = 'SENT', SentAt = SYSUTCDATETIME() WHERE OutboxId = @id");

    res.json({
      outboxId: parseInt(id),
      status: 'SENT'
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// ==========================================
// PHASE 1.3 & 1.4 ADDITIONS: Webhooks & Workers
// ==========================================

// POST /api/webhooks/payment/:provider
exports.paymentWebhook = async (req, res) => {
  const { provider } = req.params;
  const { orderRef, eventType, amount } = req.body;
  const signature = req.headers['x-signature'];
  const eventRef = req.headers['x-event-ref'];
  const keyId = req.headers['x-key-id'];

  if (!eventRef) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'X-Event-Ref header is required' });
  }

  const upperProvider = provider.toUpperCase();

  try {
    const pool = await poolPromise;

    // 1. Idempotency Check: check WebhookReceipts first
    const receiptCheck = await pool.request()
      .input('provider', sql.NVarChar(50), upperProvider)
      .input('eventRef', sql.NVarChar(150), eventRef)
      .query('SELECT Verified, VerificationError FROM dbo.WebhookReceipts WHERE Provider = @provider AND EventRef = @eventRef');

    if (receiptCheck.recordset.length > 0) {
      const receipt = receiptCheck.recordset[0];
      if (receipt.Verified) {
        return res.json({
          provider: upperProvider,
          eventRef: eventRef,
          verified: true,
          processed: true,
          idempotentReplay: true
        });
      } else {
        return res.status(401).json({
          error: 'INVALID_SIGNATURE',
          message: receipt.VerificationError || 'Webhook signature verification failed'
        });
      }
    }

    // 2. Load Secret from Key Versions (KID) if passed, else fallback to backward-compatible env secret
    let secret = process.env.WEBHOOK_SECRET || 'webhook_secret_placeholder';
    if (keyId) {
      const keyResult = await pool.request()
        .input('keyId', sql.NVarChar(50), keyId)
        .input('secretType', sql.NVarChar(50), 'WEBHOOK')
        .query('SELECT TOP 1 SecretValue FROM dbo.SecretVersions WHERE SecretType = @secretType AND KeyId = @keyId');

      if (keyResult.recordset.length > 0) {
        secret = keyResult.recordset[0].SecretValue;
      } else {
        // Log webhook verify failure metrics counter
        webhookVerifyCounter.labels(provider, 'fail').inc();

        // Write verification failed receipt
        await pool.request()
          .input('provider', sql.NVarChar(50), upperProvider)
          .input('eventRef', sql.NVarChar(150), eventRef)
          .input('signatureHash', sql.NVarChar(255), signature || 'MISSING')
          .input('payloadHash', sql.NVarChar(255), 'INVALID_KID')
          .query(`
            INSERT INTO dbo.WebhookReceipts (Provider, EventRef, SignatureHash, PayloadHash, Verified, VerificationError)
            VALUES (@provider, @eventRef, @signatureHash, @payloadHash, 0, 'Invalid webhook secret Key ID (kid)')
          `);

        logger.error({
          event: 'webhook.verify',
          reqId: req.reqId,
          provider: upperProvider,
          result: 'fail',
          reason: 'invalid_key_id'
        });

        return res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed: invalid key ID' });
      }
    }

    // Validate Signature cryptographically using HMAC-SHA256
    const computedSignature = crypto.createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const isValid = signature && computedSignature === signature;

    // Log Webhook metrics Counter
    webhookVerifyCounter.labels(provider, isValid ? 'ok' : 'fail').inc();

    // Create a new Webhook Receipt entry
    await pool.request()
      .input('provider', sql.NVarChar(50), upperProvider)
      .input('eventRef', sql.NVarChar(150), eventRef)
      .input('signatureHash', sql.NVarChar(255), signature || 'MISSING')
      .input('payloadHash', sql.NVarChar(255), computedSignature)
      .input('verified', sql.Bit, isValid ? 1 : 0)
      .input('err', sql.NVarChar(500), isValid ? null : 'Signature mismatch')
      .query(`
        INSERT INTO dbo.WebhookReceipts (Provider, EventRef, SignatureHash, PayloadHash, Verified, VerificationError)
        VALUES (@provider, @eventRef, @signatureHash, @payloadHash, @verified, @err)
      `);

    logger.info({
      event: 'webhook.verify',
      reqId: req.reqId,
      provider: upperProvider,
      result: isValid ? 'ok' : 'fail'
    });

    if (!isValid) {
      return res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' });
    }

    // 3. Signature is valid! Dispatch order confirm/cancel action
    const email = `webhook@${provider.toLowerCase()}.com`;

    if (eventType === 'CAPTURE') {
      // Simulate confirmation logic transactionally
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        const orderRes = await transaction.request()
          .input('ref', sql.NVarChar(100), orderRef)
          .query('SELECT OrderId, Status, CustomerPhone, CustomerEmail FROM dbo.Orders WHERE OrderRef = @ref');

        if (orderRes.recordset.length === 0) {
          throw new Error('Order not found');
        }

        const order = orderRes.recordset[0];
        if (order.Status === 'PENDING') {
          // Fetch items and commit SELL stock
          const itemsRes = await transaction.request()
            .input('orderId', sql.BigInt, order.OrderId)
            .query('SELECT ProductId, Qty FROM dbo.OrderItems WHERE OrderId = @orderId');

          for (const item of itemsRes.recordset) {
            await transaction.request()
              .input('ProductId', sql.Int, item.ProductId)
              .input('LedgerType', sql.NVarChar(20), 'SELL')
              .input('TxnType', sql.NVarChar(30), 'COMMIT')
              .input('Qty', sql.Int, item.Qty)
              .input('RefType', sql.NVarChar(50), 'WEBHOOK_COMMIT')
              .input('RefId', sql.NVarChar(100), eventRef)
              .input('Note', sql.NVarChar(255), 'Commit order stock via Webhook')
              .input('CreatedByEmail', sql.NVarChar(255), email)
              .execute('dbo.sp_InventoryApplyTransaction');
          }

           // Update Status and Payment Details
          await transaction.request()
            .input('ref', sql.NVarChar(100), orderRef)
            .input('provider', sql.VarChar(50), upperProvider)
            .input('txn', sql.VarChar(100), eventRef)
            .input('amount', sql.Decimal(18, 2), amount || 0)
            .query(`
              UPDATE dbo.Orders 
              SET Status = 'CONFIRMED', 
                  PaymentStatus = 'PAYMENT_VERIFIED',
                  PaymentProvider = @provider,
                  TransactionId = @txn,
                  PaidAmount = @amount,
                  PaidAt = SYSUTCDATETIME(),
                  GatewaySignatureStatus = 'VERIFIED',
                  UpdatedAt = SYSUTCDATETIME() 
              WHERE OrderRef = @ref
            `);

          // Realize financial splits in the ledger via webhook
          await recordOrderProfitBreakdown(transaction, order.OrderId, orderRef);

          // Outbox
          await transaction.request()
            .input('ref', sql.NVarChar(100), orderRef)
            .input('payload', sql.NVarChar(sql.MAX), JSON.stringify({ orderRef, amount }))
            .query(`
              INSERT INTO dbo.OutboxEvents (EventType, AggregateType, AggregateId, PayloadJson, Status)
              VALUES ('ORDER_CONFIRMED', 'ORDER', @ref, @payload, 'PENDING')
            `);
        }

        await transaction.commit();

        // Trigger WhatsApp payment confirmation asynchronously via Webhook
        if (order.CustomerPhone) {
          const whatsappService = require('../services/whatsappService');
          const customerName = (order.CustomerEmail || 'Customer').split('@')[0];
          whatsappService.sendTemplateMessage({
            phone: order.CustomerPhone,
            templateName: 'payment_verified',
            params: [customerName, orderRef],
            orderId: order.OrderId
          }).catch(err => logger.error('WhatsApp payment verification confirm webhook error:', err));
        }
      } catch (err) {
        try {
          await transaction.rollback();
        } catch (rErr) {}
        throw err;
      }
    } else if (eventType === 'CANCEL') {
      // Simulate cancellation logic
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        const orderRes = await transaction.request()
          .input('ref', sql.NVarChar(100), orderRef)
          .query('SELECT OrderId, Status FROM dbo.Orders WHERE OrderRef = @ref');

        if (orderRes.recordset.length === 0) {
          throw new Error('Order not found');
        }

        const order = orderRes.recordset[0];
        if (order.Status === 'PENDING') {
          // Release
          const itemsRes = await transaction.request()
            .input('orderId', sql.BigInt, order.OrderId)
            .query('SELECT ProductId, Qty FROM dbo.OrderItems WHERE OrderId = @orderId');

          for (const item of itemsRes.recordset) {
            await transaction.request()
              .input('ProductId', sql.Int, item.ProductId)
              .input('LedgerType', sql.NVarChar(20), 'SELL')
              .input('TxnType', sql.NVarChar(30), 'RELEASE')
              .input('Qty', sql.Int, item.Qty)
              .input('RefType', sql.NVarChar(50), 'WEBHOOK_RELEASE')
              .input('RefId', sql.NVarChar(100), eventRef)
              .input('Note', sql.NVarChar(255), 'Release order stock via Webhook')
              .input('CreatedByEmail', sql.NVarChar(255), email)
              .execute('dbo.sp_InventoryApplyTransaction');
          }

          // Update Status
          await transaction.request()
            .input('ref', sql.NVarChar(100), orderRef)
            .query("UPDATE dbo.Orders SET Status = 'CANCELLED', UpdatedAt = SYSUTCDATETIME() WHERE OrderRef = @ref");

          // Outbox
          await transaction.request()
            .input('ref', sql.NVarChar(100), orderRef)
            .input('payload', sql.NVarChar(sql.MAX), JSON.stringify({ orderRef, reason: 'Webhook cancelled' }))
            .query(`
              INSERT INTO dbo.OutboxEvents (EventType, AggregateType, AggregateId, PayloadJson, Status)
              VALUES ('ORDER_CANCELLED', 'ORDER', @ref, @payload, 'PENDING')
            `);
        }

        await transaction.commit();
      } catch (err) {
        try {
          await transaction.rollback();
        } catch (rErr) {}
        throw err;
      }
    }

    res.json({
      provider: upperProvider,
      eventRef: eventRef,
      verified: true,
      processed: true
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/outbox/worker/poll
exports.pollOutboxWorker = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    // Batch polling tuning limit to TOP 10 using hot indexes
    const result = await pool.request()
      .query(`
        SELECT TOP 10
          o.OutboxId AS outboxId,
          o.EventType AS eventType,
          o.AggregateType AS aggregateType,
          o.AggregateId AS aggregateId,
          o.Status AS status,
          (SELECT COUNT(*) FROM dbo.OutboxAttempts a WHERE a.OutboxId = o.OutboxId) AS retryCount
        FROM dbo.OutboxEvents o
        WHERE o.Status IN ('PENDING', 'FAILED')
          AND (o.NextRetryAt IS NULL OR o.NextRetryAt <= SYSUTCDATETIME())
          AND o.DeadLetteredAt IS NULL
        ORDER BY o.CreatedAt ASC
      `);

    // Dynamic metrics gauge setting
    outboxPendingGauge.set(result.recordset.length);

    res.json({
      items: result.recordset
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/outbox/:id/worker/result
exports.submitOutboxResult = async (req, res) => {
  const { id } = req.params;
  const { status, errorMessage } = req.body;

  if (!status || !['SENT', 'FAILED'].includes(status)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: "status is required and must be either 'SENT' or 'FAILED'" });
  }

  try {
    const pool = await poolPromise;

    // 1. Verify OutboxEvent exists
    const eventCheck = await pool.request()
      .input('id', sql.BigInt, id)
      .query('SELECT OutboxId, Status FROM dbo.OutboxEvents WHERE OutboxId = @id');

    if (eventCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Outbox event not found' });
    }

    // 2. Count current attempts
    const attemptsCheck = await pool.request()
      .input('outboxId', sql.BigInt, id)
      .query('SELECT COUNT(*) AS total FROM dbo.OutboxAttempts WHERE OutboxId = @outboxId');
    
    const attemptNo = attemptsCheck.recordset[0].total + 1;

    // 3. Log attempt record in OutboxAttempts
    await pool.request()
      .input('outboxId', sql.BigInt, id)
      .input('attemptNo', sql.Int, attemptNo)
      .input('status', sql.NVarChar(20), status)
      .input('errMsg', sql.NVarChar(1000), errorMessage || null)
      .query(`
        INSERT INTO dbo.OutboxAttempts (OutboxId, AttemptNo, Status, ErrorMessage)
        VALUES (@outboxId, @attemptNo, @status, @errMsg)
      `);

    if (status === 'SENT') {
      // Transition to SENT successfully
      await pool.request()
        .input('id', sql.BigInt, id)
        .query("UPDATE dbo.OutboxEvents SET Status = 'SENT', SentAt = SYSUTCDATETIME() WHERE OutboxId = @id");

      logger.info({
        event: 'outbox.success',
        reqId: req.reqId,
        outboxId: id,
        retryCount: attemptNo - 1
      });

      return res.json({
        outboxId: parseInt(id),
        status: 'SENT',
        retryCount: attemptNo - 1
      });
    } else {
      // FAILED path: handle retry limit and backoffs
      if (attemptNo >= 5) {
        // Max retries exceeded -> Dead-letter!
        await pool.request()
          .input('id', sql.BigInt, id)
          .query("UPDATE dbo.OutboxEvents SET Status = 'DEAD_LETTER', DeadLetteredAt = SYSUTCDATETIME() WHERE OutboxId = @id");

        logger.info({
          event: 'outbox.dead_letter',
          reqId: req.reqId,
          outboxId: id,
          retryCount: attemptNo
        });

        return res.json({
          outboxId: parseInt(id),
          status: 'DEAD_LETTER',
          retryCount: attemptNo
        });
      } else {
        // Compute progressive backoff delay
        const delays = [1, 5, 15, 60]; // delays in minutes
        const minutes = delays[attemptNo - 1] || 60;
        const nextRetry = new Date(Date.now() + minutes * 60 * 1000);

        await pool.request()
          .input('id', sql.BigInt, id)
          .input('nextRetry', sql.DateTime2, nextRetry)
          .query("UPDATE dbo.OutboxEvents SET Status = 'FAILED', NextRetryAt = @nextRetry WHERE OutboxId = @id");

        logger.info({
          event: 'outbox.retry',
          reqId: req.reqId,
          outboxId: id,
          retryCount: attemptNo,
          nextRetry: nextRetry.toISOString()
        });

        return res.json({
          outboxId: parseInt(id),
          status: 'FAILED',
          retryCount: attemptNo,
          nextRetryAt: nextRetry.toISOString()
        });
      }
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/outbox
exports.getOutboxEvents = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT OutboxId AS outboxId, EventType AS eventType, AggregateType AS aggregateType, 
               AggregateId AS aggregateId, PayloadJson AS payloadJson, Status AS status, 
               RetryCount AS retryCount, LastError AS lastError, NextRetryAt AS nextRetryAt, 
               DeadLetteredAt AS deadLetteredAt, CreatedAt AS createdAt, SentAt AS sentAt
        FROM dbo.OutboxEvents
        ORDER BY OutboxId DESC
      `);
    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/orders
exports.getOrders = async (req, res) => {
  const userEmail = req.user?.email || 'customer@test.com';
  const userRole = req.user?.role || 'Customer';

  try {
    const pool = await poolPromise;
    let result;

    if (userRole === 'SuperAdmin' || userRole === 'Admin') {
      result = await pool.request()
        .query(`
          SELECT OrderId AS orderId, OrderRef AS orderRef, CustomerEmail AS customerEmail, 
                 Status AS status, TotalAmount AS totalAmount, Currency AS currency, CreatedAt AS createdAt,
                 PaymentStatus AS paymentStatus, PaymentProvider AS paymentProvider, TransactionId AS transactionId,
                 PaidAmount AS paidAmount, PaidAt AS paidAt
          FROM dbo.Orders
          ORDER BY OrderId DESC
        `);
    } else if (userRole === 'Supplier') {
      result = await pool.request()
        .input('email', sql.NVarChar(255), userEmail)
        .query(`
          SELECT DISTINCT o.OrderId AS orderId, o.OrderRef AS orderRef, o.CustomerEmail AS customerEmail, 
                          o.Status AS status, o.TotalAmount AS totalAmount, o.Currency AS currency, o.CreatedAt AS createdAt,
                          o.PaymentStatus AS paymentStatus, o.PaymentProvider AS paymentProvider, o.TransactionId AS transactionId,
                          o.PaidAmount AS paidAmount, o.PaidAt AS paidAt
          FROM dbo.Orders o
          INNER JOIN dbo.OrderItems i ON o.OrderId = i.OrderId
          INNER JOIN dbo.ProductOwnership ow ON i.ProductId = ow.ProductId
          WHERE ow.SupplierEmail = @email AND ow.IsActive = 1
          ORDER BY o.OrderId DESC
        `);
    } else {
      // Customer
      result = await pool.request()
        .input('email', sql.NVarChar(255), userEmail)
        .query(`
          SELECT OrderId AS orderId, OrderRef AS orderRef, CustomerEmail AS customerEmail, 
                 Status AS status, TotalAmount AS totalAmount, Currency AS currency, CreatedAt AS createdAt,
                 PaymentStatus AS paymentStatus, PaymentProvider AS paymentProvider, TransactionId AS transactionId,
                 PaidAmount AS paidAmount, PaidAt AS paidAt
          FROM dbo.Orders
          WHERE CustomerEmail = @email
          ORDER BY OrderId DESC
        `);
    }

    res.json({ items: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/orders/:orderRef/payment-evidence
exports.submitPaymentEvidence = async (req, res) => {
  const { orderRef } = req.params;
  const { paymentEvidence, paymentProvider, transactionId, paidAmount } = req.body;
  const email = req.user?.email || 'customer@test.com';

  if (!paymentProvider || !transactionId || paidAmount === undefined) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'paymentProvider, transactionId, and paidAmount are required' });
  }

  try {
    const pool = await poolPromise;

    // Check if order exists and is in PENDING state
    const orderRes = await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .query('SELECT OrderId, Status, CustomerEmail, TotalAmount FROM dbo.Orders WHERE OrderRef = @ref');

    if (orderRes.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

    const order = orderRes.recordset[0];
    if (order.Status !== 'PENDING') {
      return res.status(400).json({ error: 'INVALID_STATE', message: 'Payment evidence can only be submitted for PENDING orders' });
    }

    // Check if transactionId is already used by another order
    const txnCheck = await pool.request()
      .input('txn', sql.VarChar(100), transactionId)
      .input('ref', sql.NVarChar(100), orderRef)
      .query('SELECT OrderRef FROM dbo.Orders WHERE TransactionId = @txn AND OrderRef <> @ref');

    if (txnCheck.recordset.length > 0) {
      return res.status(409).json({ error: 'DUPLICATE_TRANSACTION', message: `Transaction ID is already claimed by order: ${txnCheck.recordset[0].OrderRef}` });
    }

    // Compute automatic status
    let computedStatus = 'PAYMENT_SUBMITTED';
    if (parseFloat(paidAmount) !== parseFloat(order.TotalAmount)) {
      computedStatus = 'PAYMENT_MISMATCH';
    } else if (paymentProvider.toLowerCase() === 'manual' || paymentProvider.toLowerCase().startsWith('manual_')) {
      computedStatus = 'MANUAL_REVIEW_REQUIRED';
    }

    await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .input('evidence', sql.NVarChar(1000), paymentEvidence || null)
      .input('provider', sql.VarChar(50), paymentProvider)
      .input('txn', sql.VarChar(100), transactionId)
      .input('amount', sql.Decimal(18,2), paidAmount)
      .input('status', sql.VarChar(50), computedStatus)
      .input('submitter', sql.NVarChar(255), email)
      .query(`
        UPDATE dbo.Orders
        SET PaymentEvidence = @evidence,
            PaymentProvider = @provider,
            TransactionId = @txn,
            PaidAmount = @amount,
            PaymentStatus = @status,
            PaymentSubmittedByEmail = @submitter,
            PaidAt = SYSUTCDATETIME()
        WHERE OrderRef = @ref
      `);

    logger.info({
      event: 'payment.evidence_submitted',
      orderRef,
      paymentProvider,
      transactionId,
      paidAmount,
      status: computedStatus
    });

    res.json({
      orderRef,
      paymentStatus: computedStatus,
      message: 'Payment evidence submitted successfully'
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// GET /api/orders/:orderRef/payment-evidence
exports.getPaymentEvidence = async (req, res) => {
  const { orderRef } = req.params;

  try {
    const pool = await poolPromise;
    const orderRes = await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .query(`
        SELECT OrderRef AS orderRef, TotalAmount AS orderTotal, Currency AS currency,
               PaymentEvidence AS paymentEvidence, PaymentProvider AS paymentProvider, 
               TransactionId AS transactionId, PaidAmount AS paidAmount, PaymentStatus AS paymentStatus,
               GatewaySignatureStatus AS gatewaySignatureStatus, ManualReviewNote AS manualReviewNote, 
               PaymentSubmittedByEmail AS paymentSubmittedByEmail, PaymentReviewedByEmail AS paymentReviewedByEmail,
               PaidAt AS paidAt, PaymentReviewedAt AS paymentReviewedAt
        FROM dbo.Orders 
        WHERE OrderRef = @ref
      `);

    if (orderRes.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

    res.json(orderRes.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

// POST /api/orders/:orderRef/payment-review
exports.reviewPaymentEvidence = async (req, res) => {
  const { orderRef } = req.params;
  const { paymentStatus, manualReviewNote } = req.body;
  const email = req.user?.email || 'admin@test.com';

  const validStatuses = ['PAYMENT_VERIFIED', 'PAYMENT_MISMATCH', 'PAYMENT_FAILED', 'MANUAL_REVIEW_REQUIRED'];
  if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: `paymentStatus is required and must be one of: ${validStatuses.join(', ')}` });
  }

  if (paymentStatus === 'PAYMENT_VERIFIED' && !manualReviewNote) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'manualReviewNote is required to verify payment manually' });
  }

  try {
    const pool = await poolPromise;

    // Check if order exists
    const orderRes = await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .query('SELECT OrderId, Status, TotalAmount FROM dbo.Orders WHERE OrderRef = @ref');

    if (orderRes.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

    // Update database fields
    await pool.request()
      .input('ref', sql.NVarChar(100), orderRef)
      .input('status', sql.VarChar(50), paymentStatus)
      .input('note', sql.NVarChar(1000), manualReviewNote || null)
      .input('reviewer', sql.NVarChar(255), email)
      .query(`
        UPDATE dbo.Orders
        SET PaymentStatus = @status,
            ManualReviewNote = @note,
            PaymentReviewedByEmail = @reviewer,
            PaymentReviewedAt = SYSUTCDATETIME()
        WHERE OrderRef = @ref
      `);

    logger.info({
      event: 'payment.evidence_reviewed',
      orderRef,
      paymentStatus,
      reviewer: email
    });

    res.json({
      orderRef,
      paymentStatus,
      message: 'Payment evidence reviewed successfully'
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

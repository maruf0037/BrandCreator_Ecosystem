const { poolPromise, sql } = require('../config/db');
const logger = require('../src/logger');

/**
 * POST /api/admin/grn
 * Warehouse Agent / Admin initializes a new Goods Received Note.
 * Body: { supplierEmail, invoiceNumber, notes, items: [{ productId, batchNumber, expiryDate, qtyReceived }] }
 */
exports.createGRN = async (req, res) => {
  const { supplierEmail, invoiceNumber, notes, items } = req.body;
  const receivedByEmail = req.user?.email || 'warehouse@test.com';

  if (!supplierEmail || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'supplierEmail and a non-empty items array are required.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Generate unique GRN Number
      const grnNumber = `GRN-${Date.now()}`;
      let totalQtyReceived = 0;
      for (const item of items) {
        totalQtyReceived += parseInt(item.qtyReceived || 0);
      }

      // 2. Insert GRN Header
      const headerRes = await transaction.request()
        .input('grnNumber', sql.NVarChar(100), grnNumber)
        .input('supplierEmail', sql.NVarChar(255), supplierEmail)
        .input('invoiceNumber', sql.NVarChar(100), invoiceNumber || null)
        .input('totalQtyReceived', sql.Int, totalQtyReceived)
        .input('receivedByEmail', sql.NVarChar(255), receivedByEmail)
        .input('notes', sql.NVarChar(500), notes || null)
        .query(`
          INSERT INTO dbo.GoodsReceivedNotes (
            GRNNumber, SupplierEmail, InvoiceNumber, TotalQtyReceived, ReceivedByEmail, Notes
          )
          OUTPUT inserted.GRNId
          VALUES (
            @grnNumber, @supplierEmail, @invoiceNumber, @totalQtyReceived, @receivedByEmail, @notes
          )
        `);

      const grnId = headerRes.recordset[0].GRNId;

      // 3. Insert GRN Items
      for (const item of items) {
        if (!item.productId || !item.batchNumber || !item.qtyReceived || parseInt(item.qtyReceived) <= 0) {
          throw new Error('Each item must have productId, batchNumber, and positive qtyReceived.');
        }

        const expDate = item.expiryDate ? new Date(item.expiryDate) : null;

        await transaction.request()
          .input('grnId', sql.BigInt, grnId)
          .input('productId', sql.Int, item.productId)
          .input('batchNumber', sql.NVarChar(100), item.batchNumber)
          .input('expiryDate', sql.DateTime2, expDate)
          .input('qtyReceived', sql.Int, parseInt(item.qtyReceived))
          .query(`
            INSERT INTO dbo.GRNItems (
              GRNId, ProductId, BatchNumber, ExpiryDate, QtyReceived, QtyAccepted, QtyRejected, QCStatus
            )
            VALUES (
              @grnId, @productId, @batchNumber, @expiryDate, @qtyReceived, 0, 0, 'PENDING'
            )
          `);
      }

      await transaction.commit();
      logger.info(`Goods Received Note ${grnNumber} created successfully by ${receivedByEmail}`);

      return res.status(201).json({
        success: true,
        grnId,
        grnNumber,
        message: 'Goods Received Note initialized successfully. Awaiting Quality Check (QC).'
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    logger.error('Error creating Goods Received Note:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * GET /api/admin/grn
 * Admin / Agent lists all Goods Received Notes.
 */
exports.getGRNs = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        GRNId AS grnId, GRNNumber AS grnNumber, SupplierEmail AS supplierEmail, 
        InvoiceNumber AS invoiceNumber, ReceivedDate AS receivedDate, 
        Status AS status, TotalQtyReceived AS totalQtyReceived, 
        ReceivedByEmail AS receivedByEmail, Notes AS notes, CreatedAt AS createdAt
      FROM dbo.GoodsReceivedNotes
      ORDER BY CreatedAt DESC
    `);

    const items = [];
    for (const row of result.recordset) {
      const itemsRes = await pool.request()
        .input('grnId', sql.BigInt, row.grnId)
        .query(`
          SELECT 
            gi.GRNItemId AS grnItemId, gi.ProductId AS productId, p.ProductName AS productName,
            gi.BatchNumber AS batchNumber, gi.ExpiryDate AS expiryDate, 
            gi.QtyReceived AS qtyReceived, gi.QtyAccepted AS qtyAccepted, 
            gi.QtyRejected AS qtyRejected, gi.QCStatus AS qcStatus, gi.QCNotes AS qcNotes
          FROM dbo.GRNItems gi
          INNER JOIN dbo.Products p ON gi.ProductId = p.ProductId
          WHERE gi.GRNId = @grnId
        `);

      items.push({
        ...row,
        items: itemsRes.recordset.map(i => ({
          ...i,
          qtyReceived: parseInt(i.qtyReceived),
          qtyAccepted: parseInt(i.qtyAccepted),
          qtyRejected: parseInt(i.qtyRejected)
        }))
      });
    }

    return res.json({ success: true, items });
  } catch (err) {
    logger.error('Error fetching GRNs:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

/**
 * POST /api/admin/grn/:id/qc
 * Submit QC verdict for items in the GRN. This atomically runs QC and imports accepted stock.
 * Body: { items: [{ grnItemId, qtyAccepted, qtyRejected, qcStatus, qcNotes }] }
 */
exports.submitGRNQC = async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;
  const qcOfficerEmail = req.user?.email || 'qcofficer@test.com';

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'qc items are required.' });
  }

  try {
    const pool = await poolPromise;

    // Verify GRN exists and is PENDING or QC_PROGRESS
    const grnRes = await pool.request()
      .input('grnId', sql.BigInt, id)
      .query('SELECT Status, SupplierEmail, GRNNumber FROM dbo.GoodsReceivedNotes WHERE GRNId = @grnId');

    const grn = grnRes.recordset[0];
    if (!grn) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Goods Received Note not found.' });
    }

    if (grn.Status === 'COMPLETED' || grn.Status === 'REJECTED') {
      return res.status(400).json({ error: 'INVALID_STATE', message: 'QC already processed for this Goods Received Note.' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      let anyPassed = false;
      let totalItemsCompleted = 0;

      // Fetch existing GRNItems to map productId
      const grnItemsRes = await transaction.request()
        .input('grnId', sql.BigInt, id)
        .query('SELECT GRNItemId, ProductId, QtyReceived, BatchNumber, ExpiryDate FROM dbo.GRNItems WHERE GRNId = @grnId');
      
      const grnItemsMap = grnItemsRes.recordset;

      for (const item of items) {
        const { grnItemId, qtyAccepted, qtyRejected, qcStatus, qcNotes } = item;
        const matchingGRNItem = grnItemsMap.find(i => String(i.GRNItemId) === String(grnItemId));

        if (!matchingGRNItem) {
          throw new Error(`GRN Item ${grnItemId} not found in this GRN.`);
        }

        const totalQty = parseInt(qtyAccepted || 0) + parseInt(qtyRejected || 0);
        if (totalQty !== parseInt(matchingGRNItem.QtyReceived)) {
          throw new Error(`Sum of qtyAccepted (${qtyAccepted}) and qtyRejected (${qtyRejected}) must equal qtyReceived (${matchingGRNItem.QtyReceived}) for item ${grnItemId}.`);
        }

        // Update GRNItem
        await transaction.request()
          .input('grnItemId', sql.BigInt, grnItemId)
          .input('qtyAccepted', sql.Int, parseInt(qtyAccepted))
          .input('qtyRejected', sql.Int, parseInt(qtyRejected))
          .input('qcStatus', sql.NVarChar(30), qcStatus.toUpperCase())
          .input('qcNotes', sql.NVarChar(500), qcNotes || null)
          .query(`
            UPDATE dbo.GRNItems
            SET 
              QtyAccepted = @qtyAccepted,
              QtyRejected = @qtyRejected,
              QCStatus = @qcStatus,
              QCNotes = @qcNotes
            WHERE GRNItemId = @grnItemId
          `);

        if (qcStatus.toUpperCase() === 'PASSED' && parseInt(qtyAccepted) > 0) {
          anyPassed = true;

          // Resolve BasePrice / RPU_MRP
          const prodRes = await transaction.request()
            .input('productId', sql.Int, matchingGRNItem.ProductId)
            .query('SELECT BasePrice, RPU_MRP FROM dbo.Products WHERE ProductId = @productId');
          const product = prodRes.recordset[0];
          const unitCost = product?.RPU_MRP || product?.BasePrice || 0.00;

          // 1. Insert into SupplierStockBatches
          await transaction.request()
            .input('productId', sql.Int, matchingGRNItem.ProductId)
            .input('supplierEmail', sql.NVarChar(255), grn.SupplierEmail)
            .input('qty', sql.Int, parseInt(qtyAccepted))
            .input('rpuMrp', sql.Decimal(18, 2), unitCost)
            .input('batchNote', sql.NVarChar(500), `GRN QC Import: ${qcNotes || 'Passed'}`)
            .input('grnItemId', sql.BigInt, grnItemId)
            .input('batchNumber', sql.NVarChar(100), matchingGRNItem.BatchNumber)
            .input('expiryDate', sql.DateTime2, matchingGRNItem.ExpiryDate)
            .query(`
              INSERT INTO dbo.SupplierStockBatches (
                ProductId, SupplierEmail, Qty, RPU_MRP, BatchNote, GRNItemId, BatchNumber, ExpiryDate
              )
              VALUES (
                @productId, @supplierEmail, @qty, @rpuMrp, @batchNote, @grnItemId, @batchNumber, @expiryDate
              )
            `);

          // 2. Increment MASTER ledger (warehouse stock) using sp_InventoryApplyTransaction
          await transaction.request()
            .input('ProductId', sql.Int, matchingGRNItem.ProductId)
            .input('LedgerType', sql.NVarChar(20), 'MASTER')
            .input('TxnType', sql.NVarChar(30), 'IN')
            .input('Qty', sql.Int, parseInt(qtyAccepted))
            .input('RefType', sql.NVarChar(50), 'GRN_RECEIPT')
            .input('RefId', sql.NVarChar(100), `GRN-${id}-${grnItemId}`)
            .input('Note', sql.NVarChar(500), `Inbound logistics cargo receipt from GRN #${grn.GRNNumber}`)
            .input('CreatedByEmail', sql.NVarChar(255), qcOfficerEmail)
            .execute('dbo.sp_InventoryApplyTransaction');
        }

        totalItemsCompleted++;
      }

      // Update GRN status
      const grnStatus = anyPassed ? 'COMPLETED' : 'REJECTED';
      await transaction.request()
        .input('grnId', sql.BigInt, id)
        .input('status', sql.NVarChar(30), grnStatus)
        .query(`
          UPDATE dbo.GoodsReceivedNotes
          SET Status = @status, UpdatedAt = SYSUTCDATETIME()
          WHERE GRNId = @grnId
        `);

      await transaction.commit();
      logger.info(`Goods Received Note #${id} completed with status: ${grnStatus} by ${qcOfficerEmail}`);

      return res.json({
        success: true,
        status: grnStatus,
        message: `Quality Check completed. GRN status updated to: ${grnStatus}.`
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    logger.error('Error processing GRN QC:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

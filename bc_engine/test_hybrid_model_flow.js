require('dotenv').config();
const { poolPromise, sql } = require('./config/db');
const inventoryController = require('./controllers/inventoryController');
const orderController = require('./controllers/orderController');
const commissionController = require('./controllers/commissionController');

async function runTests() {
  console.log('==================================================');
  console.log('STARTING HYBRID BUSINESS MODEL E2E VERIFICATION TEST');
  console.log('==================================================\n');

  try {
    const pool = await poolPromise;

    // Verify Default Global Commission Setting exists
    const gsCheck = await pool.request().query(
      "SELECT SettingValue FROM dbo.GlobalSettings WHERE SettingKey = 'DEFAULT_COMMISSION_RATE'"
    );
    if (gsCheck.recordset.length === 0) {
      await pool.request().query(
        "INSERT INTO dbo.GlobalSettings (SettingKey, SettingValue, Description) VALUES ('DEFAULT_COMMISSION_RATE', '10.00', 'Default rate')"
      );
      console.log('   -> Set DEFAULT_COMMISSION_RATE to 10.00%');
    } else {
      console.log(`   -> Active Global Default Commission: ${gsCheck.recordset[0].SettingValue}%`);
    }

    const testSuffix = Math.floor(Math.random() * 100000);

    // ==========================================
    // SCENARIO 1: OWN Product QC Bypass & Commission Exclusion
    // ==========================================
    console.log('\n--- Scenario 1: Direct OWN Product ---');
    const ownSku = 'TEST-OWN-' + testSuffix;
    const ownName = 'E2E Direct OWN Jacket';
    
    let ownProduct = null;
    const ownReq = {
      body: {
        supplierUserId: 999,
        sku: ownSku,
        productName: ownName,
        basePrice: 1500.00,
        ownershipType: 'OWN',
        onlineSellingRequested: true
      },
      user: { email: 'admin@brandcreator.com', role: 'Admin' }
    };
    const ownRes = {
      status: (code) => ({
        json: (data) => { ownProduct = data.product || data; }
      })
    };

    await inventoryController.createProduct(ownReq, ownRes);
    const ownProductId = ownProduct.ProductId || ownProduct.productId;
    console.log(`   * Created OWN Product ID: ${ownProductId}`);

    // Verify QC is Auto-Approved and status ACTIVE
    const dbOwnCheck = await pool.request()
      .input('id', sql.Int, ownProductId)
      .query('SELECT Status, QCStatus, OwnershipType, ProductReadinessStatus FROM dbo.Products WHERE ProductId = @id');
    
    const ownRow = dbOwnCheck.recordset[0];
    console.log(`   * DB Audit: Ownership=${ownRow.OwnershipType}, Status=${ownRow.Status}, QCStatus=${ownRow.QCStatus}, Readiness=${ownRow.ProductReadinessStatus}`);
    
    if (ownRow.OwnershipType === 'OWN' && ownRow.Status === 'ACTIVE' && ownRow.QCStatus === 'APPROVED') {
      console.log('   ✅ Pass: Direct OWN product bypasses QC and goes ACTIVE instantly.');
    } else {
      throw new Error('OWN product QC bypass failed.');
    }

    // Set stock levels to prevent INSUFFICIENT_STOCK
    console.log('   * Replenishing stock in MASTER ledger...');
    await pool.request()
      .input('productId', sql.Int, ownProductId)
      .query("UPDATE dbo.InventoryLedgers SET OnHandQty = 100 WHERE ProductId = @productId AND LedgerType = 'MASTER'");

    // Sell the OWN product and confirm payment
    const ownOrderRef = 'ORD-OWN-' + testSuffix;
    const ownOrderReq = {
      body: {
        orderRef: ownOrderRef,
        items: [{ productId: ownProductId, qty: 1, unitPrice: 1800.00 }],
        customerPhone: '01700000000',
        saleChannel: 'ONLINE'
      },
      user: { email: 'customer@test.com' }
    };
    
    let ownOrder = null;
    const ownOrderRes = {
      status: (code) => ({
        json: (data) => { ownOrder = data; }
      })
    };

    await orderController.createOrder(ownOrderReq, ownOrderRes);
    console.log(`   * Placed Order: ${ownOrderRef}, OrderId: ${ownOrder.orderId}`);

    // Simulate payment confirmation (confirm PENDING order with manual override)
    const ownConfirmReq = {
      params: { orderRef: ownOrderRef },
      body: {
        provider: 'BKASH',
        eventType: 'PAYMENT_CONFIRMED',
        eventRef: 'TXN-OWN-' + testSuffix,
        amount: 1800.00,
        manualReviewNote: 'Admin manual approval OWN E2E'
      },
      headers: {
        'idempotency-key': 'idemp-own-' + testSuffix
      },
      user: { email: 'admin@brandcreator.com', role: 'Admin' }
    };
    
    let ownConfirmResult = null;
    const ownConfirmRes = {
      status: (code) => ({ 
        json: (data) => { ownConfirmResult = data; } 
      }),
      json: (data) => { ownConfirmResult = data; }
    };

    await orderController.confirmOrder(ownConfirmReq, ownConfirmRes);
    
    if (ownConfirmResult && ownConfirmResult.error) {
      throw new Error(`Payment confirmation failed: ${ownConfirmResult.message}`);
    }
    console.log('   * Payment Confirmed successfully via Manual Override!');

    // Assert that NO Commission Ledger record was written
    const ownCommLedger = await pool.request()
      .input('orderId', sql.BigInt, ownOrder.orderId)
      .query('SELECT * FROM dbo.CommissionLedger WHERE OrderId = @orderId');
    
    console.log(`   * Commission Ledger entries for OWN order: ${ownCommLedger.recordset.length}`);
    if (ownCommLedger.recordset.length === 0) {
      console.log('   ✅ Pass: Direct OWN product sales DO NOT write commission ledger logs.');
    } else {
      throw new Error('OWN product sales generated unwanted commission.');
    }

    // Verify profit splits (SupplierPayable should be COGS basePrice 1500.00, BrandCreator profit 300.00)
    const ownProfitCheck = await pool.request()
      .input('orderId', sql.BigInt, ownOrder.orderId)
      .query('SELECT * FROM dbo.OrderProfitBreakdowns WHERE OrderId = @orderId');
    
    if (ownProfitCheck.recordset.length === 0) {
      throw new Error('OrderProfitBreakdowns record was not written for OWN product.');
    }

    const profitRow = ownProfitCheck.recordset[0];
    console.log(`   * Profit splits: Gross=${profitRow.GrossRevenue}, COGS Payable=${profitRow.SupplierPayable}, Net Profit=${profitRow.NetBrandCreatorProfit}`);
    if (parseFloat(profitRow.SupplierPayable) === 1500.00 && parseFloat(profitRow.NetBrandCreatorProfit) === 300.00) {
      console.log('   ✅ Pass: Direct OWN product splits profit accurately (100% to platform).');
    } else {
      throw new Error('OWN product profit splits arithmetic incorrect.');
    }


    // ==========================================
    // SCENARIO 2: SUPPLIER Product QC Flow & Waterfall Commission
    // ==========================================
    console.log('\n--- Scenario 2: Marketplace SUPPLIER Product ---');
    const suppSku = 'TEST-SUPP-' + testSuffix;
    const suppName = 'E2E Vendor SUPPLIER Saree';
    const supplierEmail = 'supplier_e2e@test.com';

    let suppProduct = null;
    const suppReq = {
      body: {
        supplierUserId: 999,
        sku: suppSku,
        productName: suppName,
        basePrice: 2000.00,
        ownershipType: 'SUPPLIER',
        onlineSellingRequested: true
      },
      user: { email: supplierEmail, role: 'Supplier' }
    };
    const suppRes = {
      status: (code) => ({
        json: (data) => { suppProduct = data.product || data; }
      })
    };

    await inventoryController.createProduct(suppReq, suppRes);
    const suppProductId = suppProduct.ProductId || suppProduct.productId;
    console.log(`   * Created SUPPLIER Product ID: ${suppProductId}`);

    // Verify it requires QC review (Status APPROVED is null or inactive)
    const dbSuppCheck = await pool.request()
      .input('id', sql.Int, suppProductId)
      .query('SELECT Status, QCStatus, OwnershipType, ProductReadinessStatus FROM dbo.Products WHERE ProductId = @id');
    
    const suppRow = dbSuppCheck.recordset[0];
    console.log(`   * DB Audit: Ownership=${suppRow.OwnershipType}, Status=${suppRow.Status}, QCStatus=${suppRow.QCStatus}, Readiness=${suppRow.ProductReadinessStatus}`);
    
    if (suppRow.Status === 'ACTIVE' && (suppRow.QCStatus === null || suppRow.QCStatus === 'PENDING' || suppRow.QCStatus === 'DRAFT')) {
      console.log('   ✅ Pass: SUPPLIER product defaults to QC pending state.');
    } else {
      throw new Error('SUPPLIER product default state error.');
    }

    // Perform manual QC Approval as Admin
    await pool.request()
      .input('id', sql.Int, suppProductId)
      .query("UPDATE dbo.Products SET QCStatus = 'APPROVED', ProductReadinessStatus = 'CAMPAIGN_READY' WHERE ProductId = @id");
    
    // Register Supplier Ownership link is automatically done in createProduct!
    
    // Set stock levels to prevent INSUFFICIENT_STOCK
    console.log('   * Replenishing stock in MASTER ledger...');
    await pool.request()
      .input('productId', sql.Int, suppProductId)
      .query("UPDATE dbo.InventoryLedgers SET OnHandQty = 100 WHERE ProductId = @productId AND LedgerType = 'MASTER'");

    console.log('   * Admin QC approved and registered supplier ownership!');

    // Place an order for the SUPPLIER product
    const suppOrderRef = 'ORD-SUPP-' + testSuffix;
    const suppOrderReq = {
      body: {
        orderRef: suppOrderRef,
        items: [{ productId: suppProductId, qty: 1, unitPrice: 2500.00 }],
        customerPhone: '01711111111',
        saleChannel: 'ONLINE'
      },
      user: { email: 'customer@test.com' }
    };
    
    let suppOrder = null;
    const suppOrderRes = {
      status: (code) => ({
        json: (data) => { suppOrder = data; }
      })
    };

    await orderController.createOrder(suppOrderReq, suppOrderRes);
    console.log(`   * Placed Order: ${suppOrderRef}, OrderId: ${suppOrder.orderId}`);

    // Confirm payment (triggers recordOrderProfitBreakdown with commission resolver)
    const suppConfirmReq = {
      params: { orderRef: suppOrderRef },
      body: {
        provider: 'BKASH',
        eventType: 'PAYMENT_CONFIRMED',
        eventRef: 'TXN-SUPP-' + testSuffix,
        amount: 2500.00,
        manualReviewNote: 'Admin manual approval SUPPLIER E2E'
      },
      headers: {
        'idempotency-key': 'idemp-supp-' + testSuffix
      },
      user: { email: 'admin@brandcreator.com', role: 'Admin' }
    };
    
    let suppConfirmResult = null;
    const suppConfirmRes = {
      status: (code) => ({ 
        json: (data) => { suppConfirmResult = data; } 
      }),
      json: (data) => { suppConfirmResult = data; }
    };

    await orderController.confirmOrder(suppConfirmReq, suppConfirmRes);
    
    if (suppConfirmResult && suppConfirmResult.error) {
      throw new Error(`Supplier payment confirmation failed: ${suppConfirmResult.message}`);
    }
    console.log('   * Payment Confirmed successfully via Manual Override!');

    // Verify Commission Ledger entry is created (should apply default 10% rate)
    const dbLedgerEntries = await pool.request()
      .input('orderId', sql.BigInt, suppOrder.orderId)
      .query('SELECT * FROM dbo.CommissionLedger WHERE OrderId = @orderId');

    console.log(`   * Commission Ledger entries for SUPPLIER order: ${dbLedgerEntries.recordset.length} found.`);
    if (dbLedgerEntries.recordset.length === 1) {
      const entry = dbLedgerEntries.recordset[0];
      console.log(`      * SaleAmount: ৳${entry.SaleAmount}, CommissionRate: ${entry.CommissionRate}%, Deducted: ৳${entry.CommissionAmount}, SupplierPayable: ৳${entry.SupplierPayable}, Status: ${entry.Status}`);
      
      if (parseFloat(entry.CommissionRate) === 10.00 && parseFloat(entry.CommissionAmount) === 250.00 && parseFloat(entry.SupplierPayable) === 2250.00 && entry.Status === 'PENDING') {
        console.log('   ✅ Pass: Commission ledger entries calculated and populated perfectly!');
      } else {
        throw new Error('Commission ledger calculation math mismatch.');
      }
      
      // Test mark PAID settlement (Mark Paid payout transaction)
      console.log('   * Settling payout...');
      const markReq = { params: { entryId: entry.EntryId } };
      let markResult = null;
      const markRes = {
        json: (data) => { markResult = data; },
        status: (code) => ({ json: (data) => { console.error('Mark Paid Error:', data); } })
      };
      await commissionController.markCommissionPaid(markReq, markRes);

      // Verify DB update
      const dbEntryUpdated = await pool.request()
        .input('entryId', sql.BigInt, entry.EntryId)
        .query('SELECT Status, PaidAt FROM dbo.CommissionLedger WHERE EntryId = @entryId');
      
      console.log(`      * After Settlement Status: ${dbEntryUpdated.recordset[0].Status}, PaidAt: ${dbEntryUpdated.recordset[0].PaidAt}`);
      if (dbEntryUpdated.recordset[0].Status === 'PAID' && dbEntryUpdated.recordset[0].PaidAt) {
        console.log('   ✅ Pass: Payout marked PAID successfully with timestamp.');
      } else {
        throw new Error('Payout status settlement failed.');
      }

    } else {
      throw new Error('No commission ledger found for SUPPLIER sale.');
    }

    // ==========================================
    // CLEANUP
    // ==========================================
    console.log('\n--- Cleaning up test records ---');
    
    // Delete OWN product links
    await pool.request().input('id', sql.BigInt, ownOrder.orderId).query('DELETE FROM dbo.WhatsAppMessages WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, ownOrder.orderId).query('DELETE FROM dbo.OrderItems WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, ownOrder.orderId).query('DELETE FROM dbo.OrderProfitBreakdowns WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, ownOrder.orderId).query('DELETE FROM dbo.Orders WHERE OrderId = @id');
    await pool.request().input('id', sql.Int, ownProductId).query('DELETE FROM dbo.InventoryTransactions WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, ownProductId).query('DELETE FROM dbo.InventoryLedgers WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, ownProductId).query('DELETE FROM dbo.ProductProfitSnapshots WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, ownProductId).query('DELETE FROM dbo.ProductOwnership WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, ownProductId).query('DELETE FROM dbo.ProductImages WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, ownProductId).query('DELETE FROM dbo.Products WHERE ProductId = @id');
    
    // Delete SUPPLIER product links
    const suppEntry = dbLedgerEntries.recordset[0];
    if (suppEntry) {
      await pool.request().input('id', sql.BigInt, suppEntry.EntryId).query('DELETE FROM dbo.CommissionLedger WHERE EntryId = @id');
    }
    await pool.request().input('id', sql.BigInt, suppOrder.orderId).query('DELETE FROM dbo.WhatsAppMessages WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, suppOrder.orderId).query('DELETE FROM dbo.OrderItems WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, suppOrder.orderId).query('DELETE FROM dbo.OrderProfitBreakdowns WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, suppOrder.orderId).query('DELETE FROM dbo.Orders WHERE OrderId = @id');
    await pool.request().input('id', sql.Int, suppProductId).query('DELETE FROM dbo.InventoryTransactions WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, suppProductId).query('DELETE FROM dbo.ProductOwnership WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, suppProductId).query('DELETE FROM dbo.InventoryLedgers WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, suppProductId).query('DELETE FROM dbo.ProductProfitSnapshots WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, suppProductId).query('DELETE FROM dbo.ProductImages WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, suppProductId).query('DELETE FROM dbo.Products WHERE ProductId = @id');

    console.log('   ✅ Pass: Cleaned up E2E test footprints successfully.');

    console.log('\n==================================================');
    console.log('*** ALL HYBRID MODEL PHASE 2 TESTS PASSED! ***');
    console.log('==================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ [ERROR] Hybrid Model E2E Test failed:');
    console.error(err);
    process.exit(1);
  }
}

runTests();

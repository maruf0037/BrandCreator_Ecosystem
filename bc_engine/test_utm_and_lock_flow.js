require('dotenv').config();
const { poolPromise, sql } = require('./config/db');
const inventoryController = require('./controllers/inventoryController');
const orderController = require('./controllers/orderController');
const commissionController = require('./controllers/commissionController');
const revenueController = require('./controllers/revenueController');

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 3A: UTM TRACKING & PAYOUT LOCK TEST');
  console.log('==================================================\n');

  try {
    const pool = await poolPromise;
    const testSuffix = Math.floor(Math.random() * 100000);

    // Save default return window if exists
    const origWindow = process.env.RETURN_WINDOW_SECONDS;
    // Set return window to 10 seconds for the test
    process.env.RETURN_WINDOW_SECONDS = '10';

    // ==========================================
    // 1. Create a test SUPPLIER product with fabric attributes
    // ==========================================
    console.log('--- Step 1: Create Product with Fabric Attributes ---');
    const fabricSku = 'FABRIC-TEST-' + testSuffix;
    const fabricName = 'E2E Handloom Premium Jamdani Saree';
    const supplierEmail = 'fabric_supplier@test.com';

    let product = null;
    const prodReq = {
      body: {
        supplierUserId: 888,
        sku: fabricSku,
        productName: fabricName,
        basePrice: 5000.00,
        ownershipType: 'SUPPLIER',
        onlineSellingRequested: true,
        images: [{ imageUrl: '/uploads/jamdani1.webp', isPrimary: true, altText: 'Jamdani Front' }]
      },
      user: { email: supplierEmail, role: 'Supplier' }
    };
    const prodRes = {
      status: (code) => ({
        json: (data) => { product = data.product || data; }
      })
    };

    await inventoryController.createProduct(prodReq, prodRes);
    const productId = product.ProductId || product.productId;
    console.log(`   * Created Product ID: ${productId}`);

    // Update fabrics columns directly since Supplier creation might not accept it in body yet
    await pool.request()
      .input('productId', sql.Int, productId)
      .input('material', sql.NVarChar(100), 'Jamdani Cotton')
      .input('texture', sql.NVarChar(100), 'Soft & Light')
      .input('width', sql.NVarChar(50), '45 inches')
      .input('threadCount', sql.NVarChar(50), '80 Count')
      .input('weavingType', sql.NVarChar(100), 'Handloom Weaving')
      .query(`
        UPDATE dbo.Products
        SET FabricMaterial = @material,
            FabricTexture = @texture,
            FabricWidth = @width,
            ThreadCount = @threadCount,
            WeavingType = @weavingType,
            QCStatus = 'APPROVED',
            ProductReadinessStatus = 'CAMPAIGN_READY'
        WHERE ProductId = @productId
      `);

    // Verify DB update
    const dbProdCheck = await pool.request()
      .input('id', sql.Int, productId)
      .query('SELECT FabricMaterial, QCStatus, Status FROM dbo.Products WHERE ProductId = @id');
    const prodRow = dbProdCheck.recordset[0];
    console.log(`   * DB Audit: Material=${prodRow.FabricMaterial}, Status=${prodRow.Status}, QCStatus=${prodRow.QCStatus}`);
    
    if (prodRow.FabricMaterial === 'Jamdani Cotton' && prodRow.QCStatus === 'APPROVED') {
      console.log('   ✅ Pass: Fabrics attributes successfully updated and QC approved.');
    } else {
      throw new Error('Fabrics product update failed.');
    }

    // Set stock levels to prevent INSUFFICIENT_STOCK
    await pool.request()
      .input('productId', sql.Int, productId)
      .query("UPDATE dbo.InventoryLedgers SET OnHandQty = 100 WHERE ProductId = @productId AND LedgerType = 'MASTER'");

    // ==========================================
    // 2. Place Order with UTM Source Parameter
    // ==========================================
    console.log('\n--- Step 2: Place Order with UTM source ---');
    const orderRef = 'ORD-FABRIC-' + testSuffix;
    const utmSource = 'FB-ADS-DHANMONDI';

    const orderReq = {
      body: {
        orderRef,
        items: [{ productId, qty: 1, unitPrice: 6000.00 }],
        customerPhone: '01799999999',
        saleChannel: 'ONLINE',
        utmSource
      },
      user: { email: 'customer@test.com' }
    };

    let order = null;
    const orderRes = {
      status: (code) => ({
        json: (data) => { order = data; }
      })
    };

    await orderController.createOrder(orderReq, orderRes);
    console.log(`   * Placed Order: ${orderRef}, OrderId: ${order.orderId}`);

    // Verify UtmSource in Orders
    const dbOrderCheck = await pool.request()
      .input('id', sql.BigInt, order.orderId)
      .query('SELECT UtmSource FROM dbo.Orders WHERE OrderId = @id');
    
    console.log(`   * DB Order UTM Source: ${dbOrderCheck.recordset[0].UtmSource}`);
    if (dbOrderCheck.recordset[0].UtmSource === utmSource) {
      console.log('   ✅ Pass: UTM Source correctly captured in Orders table.');
    } else {
      throw new Error('Orders table UTM source capture failed.');
    }

    // ==========================================
    // 3. Confirm Payment (triggers recordOrderProfitBreakdown with UTM propagation)
    // ==========================================
    console.log('\n--- Step 3: Confirm Payment & Verify UTM Attribution ---');
    const confirmReq = {
      params: { orderRef },
      body: {
        provider: 'BKASH',
        eventType: 'PAYMENT_CONFIRMED',
        eventRef: 'TXN-FABRIC-' + testSuffix,
        amount: 6000.00,
        manualReviewNote: 'Admin manual approval fabric E2E'
      },
      headers: {
        'idempotency-key': 'idemp-fabric-' + testSuffix
      },
      user: { email: 'admin@brandcreator.com', role: 'Admin' }
    };

    let confirmResult = null;
    const confirmRes = {
      status: (code) => ({ json: (data) => { confirmResult = data; } }),
      json: (data) => { confirmResult = data; }
    };

    await orderController.confirmOrder(confirmReq, confirmRes);

    if (confirmResult && confirmResult.error) {
      throw new Error(`Order confirmation failed: ${confirmResult.message}`);
    }
    console.log('   * Payment verified successfully.');

    // Assert UTM Source propagated to OrderProfitBreakdowns
    const dbBreakdown = await pool.request()
      .input('id', sql.BigInt, order.orderId)
      .query('SELECT UtmSource, NetBrandCreatorProfit FROM dbo.OrderProfitBreakdowns WHERE OrderId = @id');
    
    console.log(`   * DB Breakdown UTM Source: ${dbBreakdown.recordset[0].UtmSource}`);
    if (dbBreakdown.recordset[0].UtmSource === utmSource) {
      console.log('   ✅ Pass: UTM Source correctly propagated to OrderProfitBreakdowns.');
    } else {
      throw new Error('OrderProfitBreakdowns UTM propagation failed.');
    }

    // ==========================================
    // 4. Test Campaign ROI Analytics
    // ==========================================
    console.log('\n--- Step 4: Verify Campaign ROI Analytics ---');
    let roiData = null;
    const roiRes = {
      json: (data) => { roiData = data; }
    };

    await revenueController.getCampaignRoiStats({}, roiRes);
    const campaignItem = roiData.items.find(i => i.utmSource === utmSource);

    if (campaignItem) {
      console.log(`   * Campaign stats: Source=${campaignItem.utmSource}, Orders=${campaignItem.orderCount}, Gross=${campaignItem.grossRevenue}, Profit=${campaignItem.netProfit}`);
      if (campaignItem.orderCount === 1 && parseFloat(campaignItem.grossRevenue) === 6000.00) {
        console.log('   ✅ Pass: Campaign ROI Analytics aggregated sales perfectly!');
      } else {
        throw new Error('Campaign ROI arithmetic incorrect.');
      }
    } else {
      throw new Error('Campaign ROI analytics endpoint failed to return our test UTM campaign.');
    }

    // ==========================================
    // 5. Test Payout Return Window Lock
    // ==========================================
    console.log('\n--- Step 5: Test Return Window Lock ---');
    const ledgerRes = await pool.request()
      .input('orderId', sql.BigInt, order.orderId)
      .query('SELECT EntryId, Status FROM dbo.CommissionLedger WHERE OrderId = @orderId');
    
    const entry = ledgerRes.recordset[0];
    if (!entry) {
      throw new Error('Ledger entry not found for our test order.');
    }
    console.log(`   * Ledger Entry ID: ${entry.EntryId}, Current Status: ${entry.Status}`);

    // Try to mark PAID immediately (Return window is set to 10s, order was confirmed 1s ago)
    console.log('   * Attempting to settle payout immediately (within return window)...');
    let settleErr = null;
    const settleReq = { params: { entryId: entry.EntryId } };
    const settleRes = {
      status: (code) => {
        return {
          json: (data) => { settleErr = data; }
        };
      },
      json: (data) => { console.log('Settle Payout Success:', data); }
    };

    await commissionController.markCommissionPaid(settleReq, settleRes);

    if (settleErr && settleErr.error === 'LOCK_ACTIVE') {
      console.log(`   ✅ Pass: Payout blocked successfully. Response: ${settleErr.message}`);
    } else {
      throw new Error('Payout return lock bypassed illegally!');
    }

    // Mock time shift in DB: set PaidAt to 15 seconds ago to simulate return window expiry
    console.log('   * Simulating return window expiry (set PaidAt in DB to 15s in the past)...');
    await pool.request()
      .input('orderId', sql.BigInt, order.orderId)
      .query("UPDATE dbo.Orders SET PaidAt = DATEADD(second, -15, SYSUTCDATETIME()) WHERE OrderId = @orderId");

    // Retry payout settlement
    console.log('   * Retrying payout settlement...');
    let settleSuccess = null;
    const settleRes2 = {
      status: (code) => {
        return {
          json: (data) => { console.error('Settle Retry Failed:', data); }
        };
      },
      json: (data) => { settleSuccess = data; }
    };

    await commissionController.markCommissionPaid(settleReq, settleRes2);

    if (settleSuccess && settleSuccess.success) {
      console.log('   ✅ Pass: Payout successfully marked PAID after return window expired!');
    } else {
      throw new Error('Failed to settle payout after return window expired.');
    }

    // ==========================================
    // 6. Test Facebook XML Catalog Feed
    // ==========================================
    console.log('\n--- Step 6: Verify Facebook XML Feed Generator ---');
    let feedXml = null;
    const feedReq = {
      get: (header) => 'localhost:5000',
      secure: false
    };
    const feedRes = {
      header: (name, val) => {},
      send: (data) => { feedXml = data; }
    };

    await inventoryController.getFacebookCatalogFeed(feedReq, feedRes);

    if (feedXml && feedXml.includes('<g:id>') && feedXml.includes('<g:title>') && feedXml.includes('<g:price>')) {
      console.log('   ✅ Pass: Facebook XML catalog feed generated successfully!');
      
      // Verify fabric material and width custom labels exist in the feed
      if (feedXml.includes('Jamdani Cotton') && feedXml.includes('45 inches')) {
        console.log('   ✅ Pass: Fabric attributes successfully embedded in XML feed custom labels!');
      } else {
        throw new Error('Fabric attributes missing in XML catalog feed.');
      }
    } else {
      throw new Error('XML Feed empty or malformed.');
    }

    // ==========================================
    // CLEANUP
    // ==========================================
    console.log('\n--- Cleaning up test records ---');
    
    await pool.request().input('id', sql.BigInt, order.orderId).query('DELETE FROM dbo.WhatsAppMessages WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, order.orderId).query('DELETE FROM dbo.OrderItems WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, order.orderId).query('DELETE FROM dbo.OrderProfitBreakdowns WHERE OrderId = @id');
    await pool.request().input('id', sql.BigInt, entry.EntryId).query('DELETE FROM dbo.CommissionLedger WHERE EntryId = @id');
    await pool.request().input('id', sql.BigInt, order.orderId).query('DELETE FROM dbo.Orders WHERE OrderId = @id');
    await pool.request().input('id', sql.Int, productId).query('DELETE FROM dbo.InventoryTransactions WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, productId).query('DELETE FROM dbo.ProductOwnership WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, productId).query('DELETE FROM dbo.ProductImages WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, productId).query('DELETE FROM dbo.InventoryLedgers WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, productId).query('DELETE FROM dbo.ProductProfitSnapshots WHERE ProductId = @id');
    await pool.request().input('id', sql.Int, productId).query('DELETE FROM dbo.Products WHERE ProductId = @id');

    console.log('   ✅ Pass: Cleaned up Phase 3A test footprints successfully.');

    // Restore return window seconds env
    if (origWindow) {
      process.env.RETURN_WINDOW_SECONDS = origWindow;
    } else {
      delete process.env.RETURN_WINDOW_SECONDS;
    }

    console.log('\n==================================================');
    console.log('*** ALL PHASE 3A FABRICS ENGINE TESTS PASSED! ***');
    console.log('==================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ [ERROR] Phase 3A Fabrics Engine Test failed:');
    console.error(err);
    process.exit(1);
  }
}

runTests();

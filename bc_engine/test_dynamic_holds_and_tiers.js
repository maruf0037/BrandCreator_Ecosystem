require('dotenv').config();
const { poolPromise, sql } = require('./config/db');
const commissionController = require('./controllers/commissionController');

async function runTests() {
  console.log('======================================================');
  console.log('STARTING PHASE 3B: SUPPLIER TRUST & DYNAMIC HOLDS TEST');
  console.log('======================================================\n');

  try {
    const pool = await poolPromise;
    const testSuffix = Math.floor(Math.random() * 100000);
    const supplierEmail1 = `new_supplier_${testSuffix}@test.com`;
    const supplierEmail2 = `trusted_supplier_${testSuffix}@test.com`;

    // ==========================================
    // 1. Setup Mock Suppliers in Users table
    // ==========================================
    console.log('--- Step 1: Registering Test Suppliers in SQL Database ---');
    
    // Insert new supplier
    await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail1)
      .input('role', sql.NVarChar(50), 'Supplier')
      .input('name', sql.NVarChar(100), 'Bronze Weaver Artisan')
      .query(`
        INSERT INTO dbo.Users (Email, GoogleID, Role, DisplayName, Avatar, TrustLevel, CustomHoldDays, OnboardedAt)
        VALUES (@email, 'google-id-' + @email, 'SUPPLIER', @name, 'avatar.png', 'Bronze', NULL, GETUTCDATE())
      `);

    const user1Res = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail1)
      .query("SELECT Id, TrustLevel, OnboardedAt FROM dbo.Users WHERE Email = @email");
    const supplier1 = user1Res.recordset[0];
    console.log(`   * Registered Bronze Supplier: ID=${supplier1.Id}, TrustLevel=${supplier1.TrustLevel}, OnboardedAt=${supplier1.OnboardedAt.toISOString()}`);

    // Insert established supplier
    await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail2)
      .input('role', sql.NVarChar(50), 'Supplier')
      .input('name', sql.NVarChar(100), 'Gold Premium Handloom')
      .query(`
        INSERT INTO dbo.Users (Email, GoogleID, Role, DisplayName, Avatar, TrustLevel, CustomHoldDays, OnboardedAt)
        VALUES (@email, 'google-id-' + @email, 'SUPPLIER', @name, 'avatar.png', 'Gold', 3, DATEADD(month, -6, GETUTCDATE()))
      `);

    const user2Res = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail2)
      .query("SELECT Id, TrustLevel, CustomHoldDays FROM dbo.Users WHERE Email = @email");
    const supplier2 = user2Res.recordset[0];
    console.log(`   * Registered Gold Supplier: ID=${supplier2.Id}, TrustLevel=${supplier2.TrustLevel}, CustomHoldDaysOverride=${supplier2.CustomHoldDays}`);

    // ==========================================
    // 2. Verify Dynamic Hold Days Function (fn_GetHoldDays)
    // ==========================================
    console.log('\n--- Step 2: Testing Dynamic Payout Hold Calculation (fn_GetHoldDays) ---');
    
    // Check Bronze hold days (default: 7 days)
    const bronzeHoldCheck = await pool.request()
      .input('id', sql.Int, supplier1.Id)
      .query("SELECT dbo.fn_GetHoldDays(@id) AS holdDays");
    console.log(`   * Bronze Supplier Hold Period: ${bronzeHoldCheck.recordset[0].holdDays} days`);
    if (bronzeHoldCheck.recordset[0].holdDays === 7) {
      console.log('   ✅ Pass: Bronze supplier defaults to 7 days hold period.');
    } else {
      throw new Error(`Bronze hold days mismatch: expected 7, got ${bronzeHoldCheck.recordset[0].holdDays}`);
    }

    // Check Gold hold days override (default: 3 days)
    const goldHoldCheck = await pool.request()
      .input('id', sql.Int, supplier2.Id)
      .query("SELECT dbo.fn_GetHoldDays(@id) AS holdDays");
    console.log(`   * Gold Supplier Hold Period: ${goldHoldCheck.recordset[0].holdDays} days`);
    if (goldHoldCheck.recordset[0].holdDays === 3) {
      console.log('   ✅ Pass: Gold supplier correctly resolves to 3 days hold period.');
    } else {
      throw new Error(`Gold hold days mismatch: expected 3, got ${goldHoldCheck.recordset[0].holdDays}`);
    }

    // ==========================================
    // 3. Test Welcome Incentive: 0% Commission for New Suppliers
    // ==========================================
    console.log('\n--- Step 3: Verify 0% Commission Promo for New Suppliers (First 90 Days) ---');
    
    const rateInfo1 = await commissionController.resolveCommissionRate(pool, null, supplierEmail1, null);
    console.log(`   * New Onboarded Supplier Commission Rate: ${rateInfo1.rate}%, Source: ${rateInfo1.source}`);
    if (rateInfo1.rate === 0.00 && rateInfo1.source === 'NEW_SUPPLIER_PROMO') {
      console.log('   ✅ Pass: New supplier welcomes 0% promotional rate successfully!');
    } else {
      throw new Error(`New supplier commission resolution failed. Expected 0%, got ${rateInfo1.rate}%`);
    }

    // ==========================================
    // 4. Test Volume-Based Tiers
    // ==========================================
    console.log('\n--- Step 4: Verify Volume-Based Commission Tiers ---');
    
    // Simulate sales for Gold Supplier to trigger Tier 2 (Silver: sales > 50,000)
    // We insert a fake order first to satisfy foreign key constraints
    const orderRef = 'ORD-FAKE-TIER-' + testSuffix;
    await pool.request()
      .input('orderRef', sql.NVarChar(100), orderRef)
      .query(`
        INSERT INTO dbo.Orders (OrderRef, CustomerEmail, CustomerPhone, TotalAmount, PaymentStatus, Status, PaidAt, CreatedAt)
        VALUES (@orderRef, 'customer@test.com', '01799999999', 75000.00, 'PAID', 'DELIVERED', SYSUTCDATETIME(), SYSUTCDATETIME())
      `);

    const orderRes = await pool.request()
      .input('orderRef', sql.NVarChar(100), orderRef)
      .query("SELECT OrderId FROM dbo.Orders WHERE OrderRef = @orderRef");
    const fakeOrderId = orderRes.recordset[0].OrderId;

    // We insert a fake entry in CommissionLedger referencing the valid fakeOrderId
    await pool.request()
      .input('orderId', sql.BigInt, fakeOrderId)
      .input('email', sql.NVarChar(255), supplierEmail2)
      .query(`
        INSERT INTO dbo.CommissionLedger (OrderId, ProductId, SupplierEmail, SaleAmount, CommissionRate, CommissionAmount, SupplierPayable, Status, CreatedAt)
        VALUES (@orderId, 1, @email, 75000.00, 10.00, 7500.00, 67500.00, 'PAID', SYSUTCDATETIME())
      `);

    const rateInfo2 = await commissionController.resolveCommissionRate(pool, null, supplierEmail2, null);
    console.log(`   * Gold Supplier resolved commission tier rate: ${rateInfo2.rate}%, Source: ${rateInfo2.source}`);
    if (rateInfo2.rate === 8.00 && rateInfo2.source === 'VOLUME_TIER') {
      console.log('   ✅ Pass: Volume-based commission tier successfully matched to Silver tier (8%)!');
    } else {
      throw new Error(`Volume-tier resolution mismatch: expected 8%, got ${rateInfo2.rate}%`);
    }

    // ==========================================
    // 5. Test Supplier Auto-Trust Upgrade Stored Procedure (sp_UpdateSupplierTrustLevel)
    // ==========================================
    console.log('\n--- Step 5: Verify sp_UpdateSupplierTrustLevel Auto-Transitions ---');
    
    // Execute sp to upgrade Bronze supplier to Silver after 12 successful orders and 1.5% return rate
    console.log('   * Upgrading supplier to 12 successful orders, 1.5% return rate...');
    await pool.request()
      .input('id', sql.Int, supplier1.Id)
      .query("EXEC dbo.sp_UpdateSupplierTrustLevel @SupplierId = @id, @NewTotalOrders = 12, @NewReturnRate = 1.50");

    const updatedUser = await pool.request()
      .input('id', sql.Int, supplier1.Id)
      .query("SELECT TrustLevel, CustomHoldDays, ShowTrustedBadge FROM dbo.Users WHERE Id = @id");
    const supplier1Updated = updatedUser.recordset[0];
    
    console.log(`   * Upgraded Supplier State: TrustLevel=${supplier1Updated.TrustLevel}, HoldDays=${supplier1Updated.CustomHoldDays}, ShowBadge=${supplier1Updated.ShowTrustedBadge}`);
    if (supplier1Updated.TrustLevel === 'Silver' && supplier1Updated.CustomHoldDays === 5 && supplier1Updated.ShowTrustedBadge === true) {
      console.log('   ✅ Pass: Supplier automatically upgraded to Silver Trust, Hold Days lowered to 5, Badge activated!');
    } else {
      throw new Error('Trust upgrade procedure assertion failed.');
    }

    // ==========================================
    // 6. Cleanup
    // ==========================================
    console.log('\n--- Cleaning up test records ---');
    await pool.request().input('email1', sql.NVarChar(255), supplierEmail1).query("DELETE FROM dbo.SupplierTrustHistory WHERE SupplierId IN (SELECT Id FROM dbo.Users WHERE Email = @email1)");
    await pool.request().input('email2', sql.NVarChar(255), supplierEmail2).query("DELETE FROM dbo.SupplierTrustHistory WHERE SupplierId IN (SELECT Id FROM dbo.Users WHERE Email = @email2)");
    await pool.request().input('email1', sql.NVarChar(255), supplierEmail1).query("DELETE FROM dbo.Users WHERE Email = @email1");
    await pool.request().input('email2', sql.NVarChar(255), supplierEmail2).query("DELETE FROM dbo.Users WHERE Email = @email2");
    await pool.request().input('orderRef', sql.NVarChar(100), orderRef).query("DELETE FROM dbo.CommissionLedger WHERE OrderId IN (SELECT OrderId FROM dbo.Orders WHERE OrderRef = @orderRef)");
    await pool.request().input('orderRef', sql.NVarChar(100), orderRef).query("DELETE FROM dbo.Orders WHERE OrderRef = @orderRef");
    console.log('   ✅ Pass: Test footprints cleaned up successfully.');

    console.log('\n======================================================');
    console.log('*** ALL PHASE 3B DYNAMIC HOLDS & TIERS TESTS PASSED! ***');
    console.log('======================================================\n');

  } catch (err) {
    console.error('\n❌ E2E Test Suite Failed:');
    console.error(`   ${err.message}\n`);
    process.exit(1);
  } finally {
    await sql.close();
  }
}

runTests();

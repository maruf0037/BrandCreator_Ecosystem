const assert = require('assert');
const { poolPromise } = require('./config/db');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 6: WALLET & RETURN WINDOW LOCKING TEST SUITE');
  console.log('==================================================\n');

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

  const pool = await poolPromise;

  // Let's first clean up any existing wallet transactions or campaigns to have a clean testing baseline
  console.log('Cleaning up existing campaigns and test wallet transactions...');
  await pool.request().query("DELETE FROM dbo.WalletTransactions WHERE Source = 'TEST_ADMIN_TOPUP'");
  await pool.request().query("DELETE FROM dbo.CampaignPlans WHERE Notes LIKE '%TEST_CAMPAIGN%'");

  // Define product and locations for campaign approval testing
  // We will find or create a product with an active pricing plan
  const pricingProductsRes = await request('/api/admin/pricing/products', {
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });
  
  let testProduct = pricingProductsRes.data.items.find(i => i.planStatus === 'ACTIVE');
  
  if (!testProduct) {
    console.log('No active pricing products found. Creating one...');
    // Create product
    const testSku = 'SKU-WALLET-' + Math.floor(Math.random() * 100000);
    const createProdRes = await request('/api/products', {
      method: 'POST',
      headers: { 'x-user-email': 'supplier@example.com', 'x-user-role': 'Supplier' },
      body: {
        supplierUserId: 22,
        sku: testSku,
        productName: 'Wallet Test Premium Organic Tee',
        basePrice: 200.00,
        rpuMrp: 220.00,
        suggestedRetailPrice: 350.00
      }
    });
    const testProductId = createProdRes.data.productId;

    // Approve QC
    await pool.request().query(`UPDATE dbo.Products SET QCStatus = 'APPROVED' WHERE ProductId = ${testProductId}`);

    // Create pricing plan
    await request(`/api/admin/pricing/products/${testProductId}/plan`, {
      method: 'POST',
      headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
      body: {
        adminSellingPrice: 500.00,
        adBudgetPlanned: 50.00,
        platformCommission: 30.00,
        deliveryOpsCost: 60.00,
        discountAmount: 10.00
      }
    });

    // Stock
    await request('/api/inventory/transactions', {
      method: 'POST',
      headers: { 'x-user-email': 'supplier@example.com', 'x-user-role': 'Supplier' },
      body: { productId: testProductId, ledgerType: 'MASTER', txnType: 'IN', qty: 20 }
    });
    const transfer = await request('/api/inventory/transfers', {
      method: 'POST',
      headers: { 'x-user-email': 'supplier@example.com', 'x-user-role': 'Supplier' },
      body: { productId: testProductId, qty: 20 }
    });
    await request(`/api/inventory/transfers/${transfer.data.transferId}/approve`, {
      method: 'POST',
      headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'SuperAdmin' }
    });

    // Sync suggestions
    await request('/api/admin/location-ads/sync', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
      body: { productId: testProductId, locationName: 'Uttara' }
    });

    // Reload active product
    const pricingProductsReload = await request('/api/admin/pricing/products', {
      headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
    });
    testProduct = pricingProductsReload.data.items.find(i => i.productId === testProductId);
  }

  assert.ok(testProduct);
  const testProductId = testProduct.productId;
  console.log(`Using test Product ID: ${testProductId}\n`);

  await request('/api/admin/location-ads/sync', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
    body: { productId: testProductId, locationName: 'Uttara' }
  });

  // 1. FETCH INITIAL WALLET SUMMARY
  console.log('1. Fetching initial wallet summary...');
  const walletSummaryRes = await request('/api/admin/wallet/summary', {
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });
  assert.strictEqual(walletSummaryRes.status, 200);
  const initialAvailable = walletSummaryRes.data.adsSpendAvailable;
  console.log(`   -> Pass: Initial Ads Spend Available is BDT ${initialAvailable}\n`);

  // 2. ATTEMPT CAMPAIGN APPROVAL EXCEEDING AVAILABLE BALANCE
  console.log('2. Trying to approve campaign with high budget (Expected: 400 blocked)...');
  const targetBudget = initialAvailable + 10000.00; // Exceeding available by BDT 10,000
  const dailyBudget = targetBudget / 2;

  const approveBlockedRes = await request('/api/admin/campaigns/approve-test', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
    body: {
      productId: testProductId,
      selectedLocation: 'Uttara',
      platform: 'Facebook',
      dailyBudgetBDT: dailyBudget,
      expectedOrderRange: '1-5',
      notes: 'TEST_CAMPAIGN_BLOCKED'
    }
  });

  assert.strictEqual(approveBlockedRes.status, 400);
  assert.strictEqual(approveBlockedRes.data.error, 'APPROVAL_BLOCKED');
  const blockingReason = approveBlockedRes.data.blockingReasons.find(r => r.code === 'PENDING_PROFIT_BLOCKED');
  assert.ok(blockingReason);
  assert.strictEqual(blockingReason.message, 'BLOCKED: Profit is still inside return window. Wait until return date passes.');
  console.log('   -> Pass: Campaign correctly blocked with exact required warning message!\n');

  // 3. INJECT TEST SEED TRANSACTION (CLEARLY MARKED Source = 'TEST_ADMIN_TOPUP')
  console.log('3. Injecting test seed transaction of BDT 20,000 with Source = TEST_ADMIN_TOPUP...');
  const topupRes = await request('/api/admin/wallet/topup', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
    body: {
      txnType: 'ADMIN_TOP_UP',
      amount: 20000.00,
      notes: 'Seed balance for automated campaign testing',
      source: 'TEST_ADMIN_TOPUP'
    }
  });
  assert.strictEqual(topupRes.status, 201);
  assert.strictEqual(topupRes.data.success, true);
  console.log(`   -> Pass: Topup succeeded. New Ads Spend Available: BDT ${topupRes.data.balances.adsSpendAvailable}\n`);

  // 4. ATTEMPT CAMPAIGN APPROVAL WITH BUDGET COVERED BY SEED
  console.log('4. Retrying campaign approval with budget covered by seed BDT 20,000 (Expected: 201 approved)...');
  const approveSuccessRes = await request('/api/admin/campaigns/approve-test', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
    body: {
      productId: testProductId,
      selectedLocation: 'Uttara',
      platform: 'Facebook',
      dailyBudgetBDT: 500, // Total Budget = BDT 1000, fully covered
      expectedOrderRange: '1-5',
      notes: 'TEST_CAMPAIGN_SUCCESS'
    }
  });

  assert.strictEqual(approveSuccessRes.status, 201);
  assert.strictEqual(approveSuccessRes.data.status, 'APPROVED_FOR_TEST');
  console.log('   -> Pass: Campaign approved successfully when budget is covered by wallet balance!\n');

  // 5. MANUAL matured release triggers test
  console.log('5. Triggering manual release matured profits check...');
  const releaseRes = await request('/api/admin/wallet/release-matured-profit', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });
  assert.strictEqual(releaseRes.status, 200);
  assert.strictEqual(releaseRes.data.success, true);
  console.log('   -> Pass: Matured release process successfully executed dynamically.\n');

  console.log('==================================================');
  console.log('ALL PHASE 6 WALLET & LOCKING TESTS PASSED!');
  console.log('==================================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

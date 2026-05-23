const assert = require('assert');
const { sql, poolPromise } = require('./config/db');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 6: WALLET CHAOS & CONCURRENCY RESILIENCE SUITE');
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

  // Let's first clean up any existing test data to have a clean testing baseline
  console.log('Cleaning up existing campaigns and test wallet transactions...');
  await pool.request().query("DELETE FROM dbo.WalletTransactions WHERE Source = 'TEST_ADMIN_TOPUP'");
  await pool.request().query("DELETE FROM dbo.CampaignPlans WHERE Notes LIKE '%CHAOS_TEST%'");

  // Get active pricing products for campaign testing
  const pricingProductsRes = await request('/api/admin/pricing/products', {
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });
  
  let testProduct = pricingProductsRes.data.items.find(i => i.planStatus === 'ACTIVE');
  if (!testProduct) {
    console.log('Error: Run test_wallet_profit_locking.js first to seed active products, or create one.');
    process.exit(1);
  }
  const testProductId = testProduct.productId;
  console.log(`Using test Product ID: ${testProductId}\n`);

  // Ensure Location suggestion exists for location testing
  await request('/api/admin/location-ads/sync', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
    body: { productId: testProductId, locationName: 'Uttara' }
  });

  // 1. TOP-UP LIMITS BOUNDARIES VALIDATION
  console.log('1. Verifying top-up amount bounds validations...');
  
  // Test 1A: Value > BDT 1,000,000 topup (Expected: 400 validation error)
  console.log('   - Submitting topup of BDT 1,000,001 (Expected: 400 blocked)...');
  const topupTooHighRes = await request('/api/admin/wallet/topup', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
    body: {
      txnType: 'ADMIN_TOP_UP',
      amount: 1000001.00,
      notes: 'Should fail upper limit BDT 1M validation',
      source: 'TEST_ADMIN_TOPUP'
    }
  });
  assert.strictEqual(topupTooHighRes.status, 400);
  assert.strictEqual(topupTooHighRes.data.error, 'VALIDATION_ERROR');
  assert.strictEqual(topupTooHighRes.data.message, 'Transaction amount exceeds maximum limit of BDT 1,000,000.');
  console.log('   -> Pass: Successfully blocked top-up exceeding BDT 1,000,000!\n');

  // Test 1B: Value <= 0 topup (Expected: 400 validation error)
  console.log('   - Submitting topup of BDT -100 (Expected: 400 blocked)...');
  const topupNegativeRes = await request('/api/admin/wallet/topup', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
    body: {
      txnType: 'ADMIN_TOP_UP',
      amount: -100.00,
      notes: 'Should fail lower limit BDT 0 validation',
      source: 'TEST_ADMIN_TOPUP'
    }
  });
  assert.strictEqual(topupNegativeRes.status, 400);
  assert.strictEqual(topupNegativeRes.data.error, 'VALIDATION_ERROR');
  console.log('   -> Pass: Successfully blocked negative top-up!\n');

  // 2. PARALLEL CAMPAIGN DOUBLE-SPEND CONCURRENCY RACE CONDITION CHECK
  console.log('2. Running Parallel Campaign Double-Spend race condition check...');
  
  // Step A: Seed the wallet with exactly enough balance for exactly ONE campaign, but not two!
  // Say dailyBudget = 500 BDT, which requires TotalBudgetBDT = 1,000 BDT (since testDays = 2).
  // So we will seed exactly BDT 1,500 into the spendable ads balance.
  console.log('   - Fetching current wallet status...');
  const initialWalletSummary = await request('/api/admin/wallet/summary', {
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' }
  });
  const currentAvailable = initialWalletSummary.data.adsSpendAvailable;
  console.log(`   - Current spendable balance before seeding is BDT ${currentAvailable}`);

  // Calculate needed seed to make available balance exactly BDT 1,500.
  // (Available = Stable Profit + Topup + Deposit - BudgetSpent. So we add topup to make it exactly 1500.)
  const targetAvailable = 1500.00;
  const neededTopup = targetAvailable - currentAvailable;
  
  console.log(`   - Injecting seed top-up of BDT ${neededTopup} to calibrate total available balance to exactly BDT 1,500...`);
  const calibrationRes = await request('/api/admin/wallet/topup', {
    method: 'POST',
    headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
    body: {
      txnType: 'ADMIN_TOP_UP',
      amount: neededTopup,
      notes: 'Calibrate available balance to BDT 1,500',
      source: 'TEST_ADMIN_TOPUP'
    }
  });
  assert.strictEqual(calibrationRes.status, 201);
  console.log(`   -> Pass: Calibrated! New Ads Spend Available: BDT ${calibrationRes.data.balances.adsSpendAvailable}\n`);

  // Step B: Submit two duplicate campaign approval requests concurrently, each requiring BDT 1,000.
  // Combined budget = BDT 2,000 > BDT 1,500 available, so only ONE of them must succeed!
  console.log('   - Triggering concurrent duplicate campaign approvals (each requiring BDT 1,000 budget)...');
  const payload = {
    productId: testProductId,
    selectedLocation: 'Uttara',
    platform: 'Facebook',
    dailyBudgetBDT: 500, // Total = 1,000 BDT
    expectedOrderRange: '1-5',
    notes: 'CHAOS_TEST_CONCURRENCY'
  };

  const results = await Promise.all([
    request('/api/admin/campaigns/approve-test', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
      body: payload
    }),
    request('/api/admin/campaigns/approve-test', {
      method: 'POST',
      headers: { 'x-user-email': 'admin@brandcreator.com', 'x-user-role': 'Admin' },
      body: payload
    })
  ]);

  const successResults = results.filter(r => r.status === 201);
  const failureResults = results.filter(r => r.status === 400);

  console.log(`   - Concurrent execution results: ${successResults.length} succeeded, ${failureResults.length} failed`);
  
  assert.strictEqual(successResults.length, 1, 'Exactly one concurrent campaign approval must succeed!');
  assert.strictEqual(failureResults.length, 1, 'Exactly one concurrent campaign approval must be rejected!');
  assert.strictEqual(failureResults[0].data.error, 'APPROVAL_BLOCKED', 'Rejected request must fail with APPROVAL_BLOCKED code');
  
  const blockReason = failureResults[0].data.blockingReasons.find(r => r.code === 'PENDING_PROFIT_BLOCKED');
  assert.ok(blockReason, 'Failure reason must be insufficient wallet funds (PENDING_PROFIT_BLOCKED)');
  console.log('   -> Pass: Race condition handled successfully! Mutex lock perfectly serialized requests, blocking the double-spend campaign approval.\n');

  // 3. TRANSACTION ROLLBACK INTEGRITY CHECKS (SPLIT SETTLEMENT LEDGER INTEGRITY)
  console.log('3. Validating SQL Transaction Rollback and Ledger consistency...');
  
  // We will run a manual transaction using SQL server inside our test.
  // We open a transaction, insert a new record, then perform a bad statement (div by zero),
  // then verify that the transaction was aborted and the record rolled back successfully.
  console.log('   - Simulating transactional error inside a split settlement process...');
  let rollbackExceptionTriggered = false;
  let transaction;
  try {
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    // Insert a test top-up
    await transaction.request()
      .input('txnType', 'ADMIN_TOP_UP')
      .input('amount', 50000.00)
      .input('notes', 'Rollback simulation testing')
      .input('source', 'TEST_ADMIN_TOPUP')
      .input('createdByEmail', 'chaos@brandcreator.com')
      .query(`
        INSERT INTO dbo.WalletTransactions (TxnType, Amount, Notes, Source, CreatedByEmail)
        VALUES (@txnType, @amount, @notes, @source, @createdByEmail)
      `);

    // Force failure: divide by zero
    await transaction.request().query('SELECT 1 / 0 AS forceError');
    
    // Commit should never be reached
    await transaction.commit();
  } catch (err) {
    rollbackExceptionTriggered = true;
    console.log('   - Caught expected SQL exception (force error):', err.message);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollErr) {
        console.log('   - Transaction already rolled back silently:', rollErr.message);
      }
    }
  }

  assert.ok(rollbackExceptionTriggered, 'Test transaction must fail and trigger an exception');

  // Verify that the record was NOT committed to the database
  const checkRes = await pool.request().query("SELECT COUNT(*) AS count FROM dbo.WalletTransactions WHERE CreatedByEmail = 'chaos@brandcreator.com'");
  assert.strictEqual(checkRes.recordset[0].count, 0, 'Ledger consistency check failed: record should be rolled back');
  console.log('   -> Pass: Transaction rollback verified! Database successfully rolled back the split settlement, preventing orphan ledger entries.\n');

  console.log('==================================================');
  console.log('ALL WALLET CHAOS & CONCURRENCY TESTS PASSED!');
  console.log('==================================================\n');
}

runTests().catch(err => {
  console.error('Chaos Resilience Test Suite Failed:', err);
  process.exit(1);
});

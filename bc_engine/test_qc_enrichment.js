const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('==================================================');
  console.log('STARTING PHASE 1.1 QC & ENRICHMENT TEST SUITE');
  console.log('==================================================\n');

  let testProductId = null;
  let testJobId = null;
  const testSku = 'SKU-QC-' + Math.floor(Math.random() * 100000);

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

  // 1. CREATE PRODUCT FOR QC
  console.log('1. Creating product for QC flow (Expected: 201)...');
  const createProdRes = await request('/api/products', {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      supplierUserId: 12,
      sku: testSku,
      productName: 'Premium Bamboo Tee'
    }
  });
  assert.strictEqual(createProdRes.status, 201);
  testProductId = createProdRes.data.productId;
  console.log(`   -> Pass: Product created with ProductId = ${testProductId}\n`);

  // 2. VERIFY INITIAL QC STATUS IS DRAFT
  console.log('2. Checking initial QCStatus is DRAFT (Expected: 200)...');
  const initialDetails = await request(`/api/products/${testProductId}`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(initialDetails.status, 200);
  assert.strictEqual(initialDetails.data.qcStatus, 'DRAFT');
  console.log('   -> Pass: Initial QCStatus is correctly DRAFT\n');

  // 3. TRY TO ENRICH PRODUCT IN DRAFT STATE (Should fail 400)
  console.log('3. Trying to enrich product in DRAFT state (Expected: 400)...');
  const enrichDraftFail = await request(`/api/products/${testProductId}/enrich`, {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      fields: ['title', 'description', 'tags'],
      language: 'bn'
    }
  });
  assert.strictEqual(enrichDraftFail.status, 400);
  assert.strictEqual(enrichDraftFail.data.error, 'INVALID_STATE');
  console.log('   -> Pass: Correctly rejected enrichment with 400 and INVALID_STATE');
  console.log('   -> Response:', JSON.stringify(enrichDraftFail.data, null, 2), '\n');

  // 4. SUBMIT FOR QC
  console.log('4. Submitting product for QC (Expected: 200)...');
  const submitQcRes = await request(`/api/products/${testProductId}/qc/submit`, {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      note: 'Ready for official review'
    }
  });
  assert.strictEqual(submitQcRes.status, 200);
  assert.strictEqual(submitQcRes.data.qcStatus, 'SUBMITTED');
  console.log('   -> Pass: Successfully submitted for QC');
  console.log('   -> Response:', JSON.stringify(submitQcRes.data, null, 2), '\n');

  // 5. REVIEW QC - REJECT (Should succeed 200)
  console.log('5. Reviewing QC: REJECTING product as Admin (Expected: 200)...');
  const rejectRes = await request(`/api/products/${testProductId}/qc/review`, {
    method: 'POST',
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'SuperAdmin'
    },
    body: {
      decision: 'REJECT',
      reason: 'Bamboo ratio missing in title'
    }
  });
  assert.strictEqual(rejectRes.status, 200);
  assert.strictEqual(rejectRes.data.qcStatus, 'REJECTED');
  assert.strictEqual(rejectRes.data.qcReason, 'Bamboo ratio missing in title');
  console.log('   -> Pass: Product correctly set to REJECTED with reason');
  console.log('   -> Response:', JSON.stringify(rejectRes.data, null, 2), '\n');

  // 6. TRY TO ENRICH PRODUCT IN REJECTED STATE (Should fail 400)
  console.log('6. Trying to enrich product in REJECTED state (Expected: 400)...');
  const enrichRejectFail = await request(`/api/products/${testProductId}/enrich`, {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      fields: ['title', 'description', 'tags']
    }
  });
  assert.strictEqual(enrichRejectFail.status, 400);
  assert.strictEqual(enrichRejectFail.data.error, 'INVALID_STATE');
  console.log('   -> Pass: Correctly rejected enrichment in REJECTED state\n');

  // 7. SUBMIT FOR QC AGAIN
  console.log('7. Re-submitting product for QC (Expected: 200)...');
  const submitAgainRes = await request(`/api/products/${testProductId}/qc/submit`, {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      note: 'Fixed ratio'
    }
  });
  assert.strictEqual(submitAgainRes.status, 200);
  assert.strictEqual(submitAgainRes.data.qcStatus, 'SUBMITTED');
  console.log('   -> Pass: Successfully re-submitted\n');

  // 8. REVIEW QC - APPROVE
  console.log('8. Reviewing QC: APPROVING product as Admin (Expected: 200)...');
  const approveRes = await request(`/api/products/${testProductId}/qc/review`, {
    method: 'POST',
    headers: {
      'x-user-email': 'admin@brandcreator.com',
      'x-user-role': 'SuperAdmin'
    },
    body: {
      decision: 'APPROVE',
      reason: 'Perfect details'
    }
  });
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.data.qcStatus, 'APPROVED');
  console.log('   -> Pass: Product successfully APPROVED');
  console.log('   -> Response:', JSON.stringify(approveRes.data, null, 2), '\n');

  // 9. CALL ENRICH: TRIGGER QUEUED FALLBACK (AI key missing)
  console.log('9. Calling enrichment with missing AI key (Expected: 202 QUEUED)...');
  const enrichQueuedRes = await request(`/api/products/${testProductId}/enrich`, {
    method: 'POST',
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    },
    body: {
      fields: ['title', 'description', 'tags'],
      language: 'bn'
    }
  });
  if (enrichQueuedRes.status !== 202) {
    console.error('   -> Failed with status:', enrichQueuedRes.status);
    console.error('   -> Error data:', JSON.stringify(enrichQueuedRes.data, null, 2));
  }
  assert.strictEqual(enrichQueuedRes.status, 202);
  assert.strictEqual(enrichQueuedRes.data.status, 'QUEUED');
  testJobId = enrichQueuedRes.data.jobId;
  console.log('   -> Pass: Correctly enqueued and returned 202 Accepted');
  console.log('   -> Response:', JSON.stringify(enrichQueuedRes.data, null, 2), '\n');

  // 10. GET AUDIT EVENTS LOG
  console.log('10. Retrieving QC audit events log (Expected: 200)...');
  const eventsRes = await request(`/api/products/${testProductId}/qc/events`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(eventsRes.status, 200);
  assert.strictEqual(eventsRes.data.items.length, 4); // SUBMIT, REJECT, SUBMIT, APPROVE
  console.log(`   -> Pass: Retrieved ${eventsRes.data.items.length} audit logs in order`);
  console.log('   -> Logs:', JSON.stringify(eventsRes.data.items, null, 2), '\n');

  // 11. GET ENRICHMENT JOBS LOG
  console.log('11. Retrieving enrichment jobs log (Expected: 200)...');
  const jobsRes = await request(`/api/products/${testProductId}/enrichment/jobs`, {
    headers: {
      'x-user-email': 'supplier@example.com',
      'x-user-role': 'Supplier'
    }
  });
  assert.strictEqual(jobsRes.status, 200);
  assert.strictEqual(parseInt(jobsRes.data.items[0].jobId), testJobId);
  assert.strictEqual(jobsRes.data.items[0].status, 'QUEUED');
  console.log('   -> Pass: Enrichment job successfully registered as QUEUED in database\n');

  console.log('==================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});

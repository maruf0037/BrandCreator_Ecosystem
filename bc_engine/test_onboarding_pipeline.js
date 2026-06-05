require('dotenv').config();
const { poolPromise, sql } = require('./config/db');
const onboardingController = require('./controllers/onboardingController');

async function runTests() {
  console.log('======================================================');
  console.log('STARTING USER ONBOARDING PIPELINE INTEGRATION TEST');
  console.log('======================================================\n');

  try {
    const pool = await poolPromise;
    const testSuffix = Math.floor(Math.random() * 100000);
    const supplierEmail = `supplier_${testSuffix}@onboard.com`;
    const customerEmail = `customer_${testSuffix}@onboard.com`;

    // 1. Create a base customer user in the Users table (Google signup)
    console.log('--- Step 1: Simulating new Supplier user signup in Users table ---');
    await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .input('role', sql.NVarChar(50), 'Customer') // Everyone starts as Customer
      .query(`
        INSERT INTO dbo.Users (Email, GoogleID, Role)
        VALUES (@email, 'google-id-' + @email, @role)
      `);
    console.log(`   * Created user ${supplierEmail} with role 'Customer'`);

    // 2. Submit supplier onboarding details
    console.log('\n--- Step 2: Simulating Supplier Onboarding form submission ---');
    const submitReq = {
      user: { email: supplierEmail },
      body: {
        shopName: 'Test Jamdani Saree',
        shopLocation: 'Demra, Dhaka',
        phoneNumber: '01711122233',
        nid: 'NID-928392819',
        tradeLicense: 'TL-DEMRA-9988'
      }
    };
    const submitRes = {
      json(data) {
        this.data = data;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      }
    };

    await onboardingController.submitSupplierOnboarding(submitReq, submitRes);
    console.log('   * submitSupplierOnboarding response:', submitRes.data);
    if (submitRes.data && submitRes.data.success) {
      console.log('   ✅ Pass: Onboarding details submitted successfully.');
    } else {
      throw new Error(`Failed to submit supplier onboarding details: ${JSON.stringify(submitRes.data)}`);
    }

    // 3. Verify status is PENDING_APPROVAL
    console.log('\n--- Step 3: Checking Supplier status is PENDING_APPROVAL ---');
    const statusReq = { user: { email: supplierEmail } };
    const statusRes = {
      json(data) {
        this.data = data;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      }
    };

    await onboardingController.getSupplierOnboardingStatus(statusReq, statusRes);
    console.log('   * getSupplierOnboardingStatus response profile Status:', statusRes.data.profile?.Status);
    if (statusRes.data && statusRes.data.profile?.Status === 'PENDING_APPROVAL') {
      console.log('   ✅ Pass: Supplier profile is correctly PENDING_APPROVAL.');
    } else {
      throw new Error(`Supplier profile status mismatch: ${JSON.stringify(statusRes.data)}`);
    }

    // 4. Approve supplier application (Admin action)
    console.log('\n--- Step 4: Simulating Admin Approval ---');
    const approveReq = { params: { email: supplierEmail } };
    const approveRes = {
      json(data) {
        this.data = data;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      }
    };

    await onboardingController.approveSupplier(approveReq, approveRes);
    console.log('   * approveSupplier response:', approveRes.data);
    if (approveRes.data && approveRes.data.success) {
      console.log('   ✅ Pass: Admin approved the supplier application.');
    } else {
      throw new Error(`Failed to approve supplier application: ${JSON.stringify(approveRes.data)}`);
    }

    // 5. Verify supplier status is APPROVED and user role is Supplier
    console.log('\n--- Step 5: Verifying DB role upgrades and status is APPROVED ---');
    const userResult = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .query("SELECT Role FROM dbo.Users WHERE Email = @email");
    const supplierRole = userResult.recordset[0]?.Role;
    console.log(`   * DB User Role: ${supplierRole}`);

    const profileResult = await pool.request()
      .input('email', sql.NVarChar(255), supplierEmail)
      .query("SELECT Status FROM dbo.SupplierProfiles WHERE Email = @email");
    const profileStatus = profileResult.recordset[0]?.Status;
    console.log(`   * Supplier Profile Status: ${profileStatus}`);

    if (supplierRole === 'Supplier' && profileStatus === 'APPROVED') {
      console.log('   ✅ Pass: User upgraded to Supplier role and profile is APPROVED.');
    } else {
      throw new Error(`Role upgrade or status verification failed: Role=${supplierRole}, Status=${profileStatus}`);
    }

    // 6. Customer profile completion
    console.log('\n--- Step 6: Testing Customer Profile Completion ---');
    // Create base customer user
    await pool.request()
      .input('email', sql.NVarChar(255), customerEmail)
      .input('role', sql.NVarChar(50), 'Customer')
      .query(`
        INSERT INTO dbo.Users (Email, GoogleID, Role)
        VALUES (@email, 'google-id-' + @email, @role)
      `);

    const custReq = {
      user: { email: customerEmail },
      body: {
        phoneNumber: '01888999000',
        deliveryAddress: 'House 12, Dhanmondi, Dhaka'
      }
    };
    const custRes = {
      json(data) {
        this.data = data;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      }
    };

    await onboardingController.submitCustomerProfile(custReq, custRes);
    console.log('   * submitCustomerProfile response:', custRes.data);

    // Verify completeness
    const checkCustReq = { user: { email: customerEmail } };
    const checkCustRes = {
      json(data) {
        this.data = data;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      }
    };
    await onboardingController.getCustomerProfileStatus(checkCustReq, checkCustRes);
    console.log('   * getCustomerProfileStatus response:', checkCustRes.data);
    if (checkCustRes.data && checkCustRes.data.complete) {
      console.log('   ✅ Pass: Customer profile completed successfully.');
    } else {
      throw new Error(`Customer profile status incomplete: ${JSON.stringify(checkCustRes.data)}`);
    }

    // Cleanup
    console.log('\n--- Step 7: Cleaning up test records ---');
    await pool.request().input('email', sql.NVarChar(255), supplierEmail).query("DELETE FROM dbo.SupplierProfiles WHERE Email = @email");
    await pool.request().input('email', sql.NVarChar(255), supplierEmail).query("DELETE FROM dbo.Users WHERE Email = @email");
    await pool.request().input('email', sql.NVarChar(255), customerEmail).query("DELETE FROM dbo.CustomerProfiles WHERE Email = @email");
    await pool.request().input('email', sql.NVarChar(255), customerEmail).query("DELETE FROM dbo.Users WHERE Email = @email");
    console.log('   ✅ Pass: Onboarding pipeline test footprints cleared.');

    console.log('\n======================================================');
    console.log('*** ALL USER ONBOARDING PIPELINE TESTS PASSED! ***');
    console.log('======================================================\n');

  } catch (err) {
    console.error('\n❌ Onboarding Pipeline Test Suite Failed:');
    console.error(`   ${err.message}\n`);
    process.exit(1);
  } finally {
    await sql.close();
  }
}

runTests();

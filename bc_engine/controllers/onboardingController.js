const { poolPromise, sql } = require('../config/db');

// Submit or resubmit supplier onboarding profile
exports.submitSupplierOnboarding = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'You must be logged in' });
  }

  const email = (req.user.email || req.user.Email || '').toLowerCase().trim();
  const { shopName, shopLocation, phoneNumber, nid, tradeLicense } = req.body;

  if (!shopName || !shopLocation || !phoneNumber || !nid || !tradeLicense) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'All fields are required' });
  }

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('shopName', sql.NVarChar(255), shopName)
      .input('shopLocation', sql.NVarChar(255), shopLocation)
      .input('phoneNumber', sql.NVarChar(50), phoneNumber)
      .input('nid', sql.NVarChar(50), nid)
      .input('tradeLicense', sql.NVarChar(100), tradeLicense)
      .query(`
        MERGE INTO dbo.SupplierProfiles AS target
        USING (SELECT @email AS Email) AS source
        ON (target.Email = source.Email)
        WHEN MATCHED THEN
          UPDATE SET 
            ShopName = @shopName,
            ShopLocation = @shopLocation,
            PhoneNumber = @phoneNumber,
            NID = @nid,
            TradeLicense = @tradeLicense,
            Status = 'PENDING_APPROVAL',
            RejectReason = NULL,
            SubmittedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (Email, ShopName, ShopLocation, PhoneNumber, NID, TradeLicense, Status, SubmittedAt)
          VALUES (source.Email, @shopName, @shopLocation, @phoneNumber, @nid, @tradeLicense, 'PENDING_APPROVAL', SYSUTCDATETIME());
      `);

    res.json({ success: true, message: 'Supplier onboarding application submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

// Check current supplier onboarding status
exports.getSupplierOnboardingStatus = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'You must be logged in' });
  }

  const email = (req.user.email || req.user.Email || '').toLowerCase().trim();

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('SELECT TOP 1 * FROM dbo.SupplierProfiles WHERE Email = @email');

    if (result.recordset.length === 0) {
      return res.json({ submitted: false, status: 'NOT_SUBMITTED' });
    }

    res.json({ submitted: true, profile: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

// Submit or update customer profile
exports.submitCustomerProfile = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'You must be logged in' });
  }

  const email = (req.user.email || req.user.Email || '').toLowerCase().trim();
  const { phoneNumber, deliveryAddress } = req.body;

  if (!phoneNumber || !deliveryAddress) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Phone number and delivery address are required' });
  }

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('phoneNumber', sql.NVarChar(50), phoneNumber)
      .input('deliveryAddress', sql.NVarChar(500), deliveryAddress)
      .query(`
        MERGE INTO dbo.CustomerProfiles AS target
        USING (SELECT @email AS Email) AS source
        ON (target.Email = source.Email)
        WHEN MATCHED THEN
          UPDATE SET 
            PhoneNumber = @phoneNumber,
            DeliveryAddress = @deliveryAddress,
            UpdatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (Email, PhoneNumber, DeliveryAddress, UpdatedAt)
          VALUES (source.Email, @phoneNumber, @deliveryAddress, SYSUTCDATETIME());
      `);

    res.json({ success: true, message: 'Customer profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

// Check current customer profile status
exports.getCustomerProfileStatus = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'You must be logged in' });
  }

  const email = (req.user.email || req.user.Email || '').toLowerCase().trim();

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('SELECT TOP 1 * FROM dbo.CustomerProfiles WHERE Email = @email');

    if (result.recordset.length === 0) {
      return res.json({ complete: false });
    }

    res.json({ complete: true, profile: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

// List all pending supplier profiles (Admin only)
exports.getPendingOnboardings = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT * FROM dbo.SupplierProfiles WHERE Status = 'PENDING_APPROVAL' ORDER BY SubmittedAt DESC");

    res.json({ success: true, profiles: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

// Approve supplier application
exports.approveSupplier = async (req, res) => {
  const { email } = req.params;

  try {
    const pool = await poolPromise;
    
    // Check if supplier profile exists
    const checkResult = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('SELECT TOP 1 * FROM dbo.SupplierProfiles WHERE Email = @email');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Supplier profile not found' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Update Supplier profile status
      await transaction.request()
        .input('email', sql.NVarChar(255), email)
        .query("UPDATE dbo.SupplierProfiles SET Status = 'APPROVED', ReviewedAt = SYSUTCDATETIME() WHERE Email = @email");

      // 2. Upgrade User role to Supplier
      await transaction.request()
        .input('email', sql.NVarChar(255), email)
        .query("UPDATE dbo.Users SET Role = 'Supplier' WHERE Email = @email");

      await transaction.commit();
      res.json({ success: true, message: `Supplier ${email} approved successfully and upgraded to Supplier role` });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

// Reject supplier application
exports.rejectSupplier = async (req, res) => {
  const { email } = req.params;
  const { rejectReason } = req.body;

  if (!rejectReason) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Rejection reason is required' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('rejectReason', sql.NVarChar(500), rejectReason)
      .query("UPDATE dbo.SupplierProfiles SET Status = 'REJECTED', RejectReason = @rejectReason, ReviewedAt = SYSUTCDATETIME() WHERE Email = @email");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Supplier profile not found' });
    }

    res.json({ success: true, message: `Supplier ${email} application rejected successfully` });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
};

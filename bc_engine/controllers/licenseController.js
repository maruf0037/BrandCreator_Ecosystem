// controllers/licenseController.js
const { poolPromise, sql } = require('../config/db');
const crypto = require('crypto');

// Generate a random license key: BC-XXXX-XXXX-XXXX
function generateLicenseKey() {
  const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `BC-${segment()}-${segment()}-${segment()}`;
}

// GET /api/admin/licenses  — list all licenses (Admin only)
exports.listLicenses = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        l.LicenseId,
        l.LicenseKey,
        l.SupplierEmail,
        l.IsActive,
        l.IssuedAt,
        l.ExpiresAt,
        l.RevokedAt,
        l.MonthlyFee,
        l.Notes,
        CASE WHEN l.IsActive = 1 AND (l.ExpiresAt IS NULL OR l.ExpiresAt > SYSUTCDATETIME()) THEN 1 ELSE 0 END AS IsValid
      FROM dbo.SupplierLicenses l
      ORDER BY l.IssuedAt DESC
    `);
    res.json({ licenses: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/licenses  — issue new license (Admin only)
exports.issueLicense = async (req, res) => {
  const { supplierEmail, monthlyFee, expiresAt, notes } = req.body;
  if (!supplierEmail) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'supplierEmail is required' });
  }
  try {
    const pool = await poolPromise;
    const key = generateLicenseKey();
    const now = new Date();
    // Default expiry: 30 days from now if not provided
    const expiry = expiresAt
      ? new Date(expiresAt)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await pool.request()
      .input('key', sql.NVarChar(50), key)
      .input('email', sql.NVarChar(255), supplierEmail.toLowerCase().trim())
      .input('fee', sql.Decimal(10, 2), parseFloat(monthlyFee) || 0)
      .input('expiry', sql.DateTime2, expiry)
      .input('notes', sql.NVarChar(500), notes || null)
      .query(`
        INSERT INTO dbo.SupplierLicenses (LicenseKey, SupplierEmail, IsActive, IssuedAt, ExpiresAt, MonthlyFee, Notes)
        VALUES (@key, @email, 1, SYSUTCDATETIME(), @expiry, @fee, @notes)
      `);
    res.status(201).json({ success: true, licenseKey: key, expiresAt: expiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/licenses/:licenseId/revoke  — revoke a license (Admin only)
exports.revokeLicense = async (req, res) => {
  const { licenseId } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(licenseId))
      .query(`
        UPDATE dbo.SupplierLicenses 
        SET IsActive = 0, RevokedAt = SYSUTCDATETIME()
        WHERE LicenseId = @id
      `);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/licenses/:licenseId/renew  — renew license by 30 days (Admin only)
exports.renewLicense = async (req, res) => {
  const { licenseId } = req.params;
  const { days } = req.body;
  const renewDays = parseInt(days) || 30;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(licenseId))
      .input('days', sql.Int, renewDays)
      .query(`
        UPDATE dbo.SupplierLicenses
        SET IsActive = 1,
            RevokedAt = NULL,
            ExpiresAt = DATEADD(day, @days, CASE WHEN ExpiresAt > SYSUTCDATETIME() THEN ExpiresAt ELSE SYSUTCDATETIME() END)
        WHERE LicenseId = @id
      `);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supplier/license/status  — check own license (Supplier only)
exports.getMyLicenseStatus = async (req, res) => {
  const email = (req.user?.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query(`
        SELECT TOP 1
          LicenseKey,
          IsActive,
          IssuedAt,
          ExpiresAt,
          MonthlyFee,
          Notes,
          CASE WHEN IsActive = 1 AND (ExpiresAt IS NULL OR ExpiresAt > SYSUTCDATETIME()) THEN 1 ELSE 0 END AS IsValid,
          DATEDIFF(day, SYSUTCDATETIME(), ExpiresAt) AS DaysRemaining
        FROM dbo.SupplierLicenses
        WHERE SupplierEmail = @email
        ORDER BY IssuedAt DESC
      `);

    if (result.recordset.length === 0) {
      return res.json({ hasLicense: false, isValid: false });
    }

    const lic = result.recordset[0];
    return res.json({
      hasLicense: true,
      isValid: Boolean(lic.IsValid),
      licenseKey: lic.LicenseKey,
      isActive: Boolean(lic.IsActive),
      issuedAt: lic.IssuedAt,
      expiresAt: lic.ExpiresAt,
      daysRemaining: lic.DaysRemaining,
      monthlyFee: lic.MonthlyFee,
      notes: lic.Notes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

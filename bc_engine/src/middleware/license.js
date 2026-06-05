const { poolPromise, sql } = require('../../config/db');

const requireLicense = async (req, res, next) => {
  const activeSaleChannel = req.body.saleChannel || 'ONLINE';
  const userRole = req.user?.role || 'Customer';
  const email = (req.user?.email || '').toLowerCase().trim();

  if (activeSaleChannel === 'PHYSICAL_SHOP' && userRole === 'Supplier') {
    if (!email) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Supplier email not found in session' });
    }
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('email', sql.NVarChar(255), email)
        .query(`
          SELECT TOP 1
            CASE WHEN IsActive = 1 AND (ExpiresAt IS NULL OR ExpiresAt > SYSUTCDATETIME()) THEN 1 ELSE 0 END AS IsValid
          FROM dbo.SupplierLicenses
          WHERE SupplierEmail = @email
          ORDER BY IssuedAt DESC
        `);

      if (result.recordset.length === 0 || !result.recordset[0].IsValid) {
        return res.status(403).json({
          error: 'LICENSE_REQUIRED',
          message: 'An active license key is required to access the POS / Physical Shop channel.'
        });
      }
    } catch (err) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: err.message });
    }
  }
  next();
};

module.exports = { requireLicense };

// routes/licenseRoutes.js
const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');
const { requireAdmin, requireRole, devAuthSimulator } = require('../src/middleware/auth');

// Admin: list all licenses
router.get('/admin/licenses', requireAdmin, licenseController.listLicenses);

// Admin: issue a new license
router.post('/admin/licenses', requireAdmin, licenseController.issueLicense);

// Admin: revoke a license
router.patch('/admin/licenses/:licenseId/revoke', requireAdmin, licenseController.revokeLicense);

// Admin: renew a license
router.patch('/admin/licenses/:licenseId/renew', requireAdmin, licenseController.renewLicense);

// Supplier: check own license status
router.get('/supplier/license/status', devAuthSimulator, requireRole(['Supplier', 'Admin', 'SuperAdmin']), licenseController.getMyLicenseStatus);

module.exports = router;

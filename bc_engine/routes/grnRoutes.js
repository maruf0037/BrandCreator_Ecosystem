const express = require('express');
const router = express.Router();
const grnController = require('../controllers/grnController');
const { requireAdmin } = require('../src/middleware/auth');

// Inbound logistics routes (Admin/Warehouse Agents only)
router.post('/admin/grn', requireAdmin, grnController.createGRN);
router.get('/admin/grn', requireAdmin, grnController.getGRNs);
router.post('/admin/grn/:id/qc', requireAdmin, grnController.submitGRNQC);

module.exports = router;

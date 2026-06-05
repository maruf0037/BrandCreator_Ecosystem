const express = require('express');
const router = express.Router();
const qcEnrichmentController = require('../controllers/qcEnrichmentController');
const { requireRole, requireAdmin } = require('../src/middleware/auth');

// Route definitions
router.get('/qc/queue', requireAdmin, qcEnrichmentController.getQCQueue);
router.post('/products/:id/qc/submit', requireRole(['SuperAdmin', 'Admin', 'Supplier']), qcEnrichmentController.submitProductQC);
router.post('/products/:id/qc/review', requireAdmin, qcEnrichmentController.reviewProductQC);
router.post('/products/:id/enrich', requireRole(['SuperAdmin', 'Admin', 'Supplier']), qcEnrichmentController.enrichProduct);
router.get('/products/:id/qc/events', requireRole(['SuperAdmin', 'Admin', 'Supplier']), qcEnrichmentController.getProductQCEvents);
router.get('/products/:id/enrichment/jobs', requireRole(['SuperAdmin', 'Admin', 'Supplier']), qcEnrichmentController.getProductEnrichmentJobs);
router.get('/products/:id', requireRole(['SuperAdmin', 'Admin', 'Supplier', 'Customer']), qcEnrichmentController.getProductDetails);

module.exports = router;
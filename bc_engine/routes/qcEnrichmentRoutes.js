const express = require('express');
const router = express.Router();
const qcEnrichmentController = require('../controllers/qcEnrichmentController');

// Custom RBAC middleware
const checkAuth = (req, res, next) => {
  // Developer/Test auth simulation bypass
  if (process.env.NODE_ENV !== 'production' && req.headers['x-user-email']) {
    req.user = {
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'] || 'Customer'
    };
  }

  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'You must be logged in to access this resource' });
  }
  next();
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    checkAuth(req, res, () => {
      const userRole = req.user.role || 'Customer';
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: insufficient permissions' });
      }
      next();
    });
  };
};

// Route definitions
router.get('/qc/queue', requireRole(['SuperAdmin', 'Admin']), qcEnrichmentController.getQCQueue);
router.post('/products/:id/qc/submit', requireRole(['SuperAdmin', 'Admin', 'Supplier']), qcEnrichmentController.submitProductQC);
router.post('/products/:id/qc/review', requireRole(['SuperAdmin', 'Admin']), qcEnrichmentController.reviewProductQC);
router.post('/products/:id/enrich', requireRole(['SuperAdmin', 'Admin', 'Supplier']), qcEnrichmentController.enrichProduct);
router.get('/products/:id/qc/events', requireRole(['SuperAdmin', 'Admin', 'Supplier']), qcEnrichmentController.getProductQCEvents);
router.get('/products/:id/enrichment/jobs', requireRole(['SuperAdmin', 'Admin', 'Supplier']), qcEnrichmentController.getProductEnrichmentJobs);
router.get('/products/:id', requireRole(['SuperAdmin', 'Admin', 'Supplier', 'Customer']), qcEnrichmentController.getProductDetails);

module.exports = router;

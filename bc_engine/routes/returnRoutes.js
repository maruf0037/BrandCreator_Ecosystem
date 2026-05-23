const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');

// Custom RBAC middleware (same pattern as orderRoutes.js)
const checkAuth = (req, res, next) => {
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
      if (allowedRoles.includes(userRole)) {
        return next();
      }
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: insufficient permissions' });
    });
  };
};

// ─── Customer-facing return endpoints ───────────────────────────────

// POST /api/orders/:orderRef/return — Customer requests a return
router.post('/orders/:orderRef/return', requireRole(['Customer', 'Admin', 'SuperAdmin']), returnController.requestReturn);

// GET /api/orders/:orderRef/returns — Customer views their returns for this order
router.get('/orders/:orderRef/returns', requireRole(['Customer', 'Admin', 'SuperAdmin']), returnController.getOrderReturns);

// ─── Admin return management endpoints ──────────────────────────────

// GET /api/admin/returns — Admin lists all return requests
router.get('/admin/returns', requireRole(['Admin', 'SuperAdmin']), returnController.getAdminReturns);

// POST /api/admin/returns/:id/approve — Admin approves a return (restores stock)
router.post('/admin/returns/:id/approve', requireRole(['Admin', 'SuperAdmin']), returnController.approveReturn);

// POST /api/admin/returns/:id/reject — Admin rejects a return
router.post('/admin/returns/:id/reject', requireRole(['Admin', 'SuperAdmin']), returnController.rejectReturn);

// POST /api/admin/returns/:id/refund — Admin processes the final refund
router.post('/admin/returns/:id/refund', requireRole(['Admin', 'SuperAdmin']), returnController.processRefund);

module.exports = router;
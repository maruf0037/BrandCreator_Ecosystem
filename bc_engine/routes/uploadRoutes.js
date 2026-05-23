const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

const checkAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-user-email']) {
    req.user = {
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'] || 'Supplier'
    };
  }

  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'You must be logged in to upload product images' });
  }
  next();
};

const requireRole = (allowedRoles) => (req, res, next) => {
  checkAuth(req, res, () => {
    const userRole = req.user.role || 'Customer';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: insufficient permissions' });
    }
    next();
  });
};

router.post(
  '/uploads/product-image',
  requireRole(['SuperAdmin', 'Admin', 'Supplier']),
  uploadController.productImageMiddleware,
  uploadController.uploadProductImage
);

module.exports = router;

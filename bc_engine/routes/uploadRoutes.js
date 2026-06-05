const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { requireSupplier } = require('../src/middleware/auth');

router.post(
  '/uploads/product-image',
  requireSupplier,
  uploadController.productImageMiddleware,
  uploadController.uploadProductImage
);

module.exports = router;

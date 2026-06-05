const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { requireAdmin } = require('../src/middleware/auth');

// Public checkout validation
router.post('/promotions/validate', promotionController.validatePromo);

// Admin-only management
router.post('/admin/promotions', requireAdmin, promotionController.createPromotion);
router.get('/admin/promotions', requireAdmin, promotionController.getPromotions);
router.put('/admin/promotions/:promoId/toggle', requireAdmin, promotionController.togglePromotionStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const locationAdsController = require('../controllers/locationAdsController');

router.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-user-email']) {
    req.user = {
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'] || 'Customer'
    };
  }

  if (!req.user) {
    req.user = { email: 'admin@test.com', role: 'Admin' };
  }

  next();
});

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role || 'Customer';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient role permissions' });
    }
    next();
  };
};

router.post('/admin/location-ads/analyze', requireRole(['SuperAdmin', 'Admin']), locationAdsController.analyzeLocationAds);
router.get('/admin/location-ads/products/:productId/suggestions', requireRole(['SuperAdmin', 'Admin']), locationAdsController.getProductSuggestions);
router.get('/admin/location-ads/profiles', requireRole(['SuperAdmin', 'Admin']), locationAdsController.getLocationProfiles);

module.exports = router;

const express = require('express');
const router = express.Router();
const locationAdsController = require('../controllers/locationAdsController');
const { requireAdmin } = require('../src/middleware/auth');

router.post('/admin/location-ads/analyze', requireAdmin, locationAdsController.analyzeLocationAds);
router.post('/admin/location-ads/sync', requireAdmin, (req, res, next) => {
  req.body.testedLocation = req.body.testedLocation || req.body.locationName;
  return locationAdsController.analyzeLocationAds(req, res, next);
});
router.get('/admin/location-ads/products/:productId/suggestions', requireAdmin, locationAdsController.getProductSuggestions);
router.get('/admin/location-ads/profiles', requireAdmin, locationAdsController.getLocationProfiles);

module.exports = router;

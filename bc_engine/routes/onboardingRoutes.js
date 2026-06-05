// routes/onboardingRoutes.js
const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { requireAdmin, requireUser, devAuthSimulator } = require('../src/middleware/auth');

// Supplier onboarding routes (accessible by any authenticated user)
router.post('/onboarding/supplier', devAuthSimulator, requireUser, onboardingController.submitSupplierOnboarding);
router.get('/onboarding/supplier/status', devAuthSimulator, requireUser, onboardingController.getSupplierOnboardingStatus);

// Customer profile routes (accessible by any authenticated user)
router.post('/onboarding/customer', devAuthSimulator, requireUser, onboardingController.submitCustomerProfile);
router.get('/onboarding/customer/status', devAuthSimulator, requireUser, onboardingController.getCustomerProfileStatus);

// Admin onboarding review routes (accessible by Admin/SuperAdmin only)
router.get('/admin/onboarding/pending', devAuthSimulator, requireAdmin, onboardingController.getPendingOnboardings);
router.post('/admin/onboarding/:email/approve', devAuthSimulator, requireAdmin, onboardingController.approveSupplier);
router.post('/admin/onboarding/:email/reject', devAuthSimulator, requireAdmin, onboardingController.rejectSupplier);

module.exports = router;

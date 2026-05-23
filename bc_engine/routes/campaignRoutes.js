const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// TODO: Apply your RBAC/Admin verification middleware here if required

router.get('/', campaignController.getCampaigns);
router.post('/approve-test', campaignController.approveTestCampaign);
router.put('/:campaignId/status', campaignController.updateCampaignStatus);

module.exports = router;
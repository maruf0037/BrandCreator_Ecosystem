const router = require("express").Router();
const { healthDeep } = require("../controllers/healthController");

// Public check
router.get("/health/deep", healthDeep);

module.exports = router;

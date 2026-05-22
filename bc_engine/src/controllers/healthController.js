const { buildDeepHealth } = require("../services/healthDeepService");
const logger = require("../logger");

async function healthDeep(req, res) {
  try {
    const payload = await buildDeepHealth();
    return res.status(200).json(payload);
  } catch (err) {
    logger.error({
      event: "health.deep.error",
      reqId: req.reqId,
      message: err.message
    });
    return res.status(503).json({
      status: "degraded",
      error: "HEALTH_DEEP_FAILED",
      reqId: req.reqId
    });
  }
}

module.exports = { healthDeep };

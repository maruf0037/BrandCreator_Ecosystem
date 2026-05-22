const logger = require("../logger");

function httpLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1e6;

    logger.info({
      event: "http.request",
      reqId: req.reqId,
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: Number(latencyMs.toFixed(2)),
      role: req.user?.role || "anonymous",
      userEmail: req.user?.email || null
    });
  });

  next();
}

module.exports = httpLogger;

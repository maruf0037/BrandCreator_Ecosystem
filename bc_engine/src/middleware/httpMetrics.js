const { observeHttp } = require("../metrics");

function httpMetrics(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1e6;
    observeHttp(req, res, latencyMs);
  });

  next();
}

module.exports = httpMetrics;

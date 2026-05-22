const client = require("prom-client");

client.collectDefaultMetrics({ prefix: "bc_" });

const httpRequestDurationMs = new client.Histogram({
  name: "bc_http_request_duration_ms",
  help: "HTTP request duration in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [25, 50, 100, 200, 300, 500, 1000, 2000]
});

const outboxPendingGauge = new client.Gauge({
  name: "bc_outbox_pending_total",
  help: "Current count of pending outbox events"
});

const webhookVerifyCounter = new client.Counter({
  name: "bc_webhook_verify_total",
  help: "Webhook verification attempts",
  labelNames: ["provider", "result"] // result=ok|fail
});

function observeHttp(req, res, latencyMs) {
  httpRequestDurationMs
    .labels(req.method, req.route?.path || req.path || "unknown", String(res.statusCode))
    .observe(latencyMs);
}

async function metricsHandler(_req, res) {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = {
  client,
  observeHttp,
  outboxPendingGauge,
  webhookVerifyCounter,
  metricsHandler
};

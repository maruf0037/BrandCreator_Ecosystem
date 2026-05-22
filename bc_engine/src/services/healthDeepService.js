const { poolPromise } = require("../../config/db");

async function getDbPingMs() {
  const start = Date.now();
  const pool = await poolPromise;
  await pool.request().query("SELECT 1 AS ok");
  return Date.now() - start;
}

async function getOutboxLag() {
  const pool = await poolPromise;
  const rs = await pool.request().query(`
    SELECT
      COUNT(*) AS pendingCount,
      MIN(CreatedAt) AS oldestPendingCreatedAt
    FROM dbo.OutboxEvents
    WHERE Status IN ('PENDING','FAILED')
      AND (NextRetryAt IS NULL OR NextRetryAt <= SYSUTCDATETIME())
  `);

  const row = rs.recordset[0] || {};
  const pendingCount = Number(row.pendingCount || 0);

  let oldestOutboxAgeSec = 0;
  if (row.oldestPendingCreatedAt) {
    const oldest = new Date(row.oldestPendingCreatedAt).getTime();
    oldestOutboxAgeSec = Math.max(0, Math.floor((Date.now() - oldest) / 1000));
  }

  return { pendingCount, oldestOutboxAgeSec };
}

async function getActiveWebhookKey() {
  const pool = await poolPromise;
  const rs = await pool.request()
    .input("secretType", "WEBHOOK")
    .query(`
      SELECT TOP 1 KeyId
      FROM dbo.SecretVersions
      WHERE SecretType = @secretType AND IsActive = 1
      ORDER BY CreatedAt DESC
    `);

  return rs.recordset[0]?.KeyId || null;
}

async function buildDeepHealth() {
  const dbMs = await getDbPingMs();
  const outbox = await getOutboxLag();
  const activeWebhookKeyId = await getActiveWebhookKey();

  return {
    status: "ok",
    dbMs,
    outboxPending: outbox.pendingCount,
    oldestOutboxAgeSec: outbox.oldestOutboxAgeSec,
    activeWebhookKeyId
  };
}

module.exports = { buildDeepHealth };

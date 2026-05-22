# BrandCreator - Production Operations Runbook

This runbook guides system administrators, DevOps engineers, and Site Reliability Engineers (SREs) in managing, monitoring, and executing daily administrative tasks for the **BrandCreator Inventory & Order Engine**.

---

## 📊 1. Daily Health and Telemetry Monitoring

The engine exposes robust real-time endpoints to check application health and retrieve infrastructure telemetry metrics.

### A. Core Telemetry Endpoints
- **Metrics Scraping Endpoint**: `GET http://localhost:5000/metrics`
  - *Scraping Interval*: Recommended every 10–15 seconds.
  - *Data Format*: Standard Prometheus exposition text format.
- **Deep Health Probing Endpoint**: `GET http://localhost:5000/health/deep`
  - *Authorization*: Open for internal load balancers / health checks.
  - *Returns*: DB connectivity latency, active webhook keys, and outbox lag telemetry.

### B. Interpreting Prometheus Telemetry Metrics
Ensure dashboards (e.g., Grafana) are configured with alerts for these custom metrics:

- **`bc_http_request_duration_ms`** (Histogram):
  - Measures request processing latencies per method, route, and role.
  - *Warning Alert*: `p95 Latency > 200ms` for critical write routes (like `/api/orders`).
  - *Critical Alert*: `p99 Latency > 1000ms` (indicates DB lock contention or server CPU starvation).
- **`bc_outbox_pending_events`** (Gauge):
  - Tracks the total count of unsent outbox notifications queue items.
  - *Normal State*: Fluctuates dynamically as the Outbox worker polls and updates items.
  - *Warning Alert*: `bc_outbox_pending_events > 100` continuously for 5 minutes.
  - *Critical Alert*: `bc_outbox_pending_events > 500` (indicates outbox worker thread death, network isolation, or failure of external event delivery).
- **`bc_webhook_verification_total`** (Counter):
  - Counts the total number of incoming webhooks processed, labeled by `provider` (BKASH/NAGAD) and `result` (ok/fail).
  - *Warning Alert*: Spike in `result="fail"` counts (indicates a mismatch in keys, retired key usage, or signature replay attacks).

---

## 🔑 2. Webhook Secret Key Rotation Walkthrough

The engine supports live, dynamic webhook secret key rotation without requiring an application restart. When a secret is rotated, it is assigned a unique Key ID (`kid`) which is saved in `dbo.SecretVersions`.

### Step-by-Step Rotation Procedure:
1. **Prepare New Key Credentials**: Generate a secure cryptographically random 32-character token. Let this be the active secret. Define a new Key ID suffix (e.g., `wk_2026_07`).
2. **Execute Rotation Call**: Call the secure administrative endpoint:
   ```bash
   curl -X POST http://localhost:5000/api/admin/secrets/webhook/rotate \
     -H "Content-Type: application/json" \
     -H "x-user-email: md.marufalrashid@gmail.com" \
     -H "x-user-role: SuperAdmin" \
     -d '{
       "newKeyId": "wk_2026_07",
       "newSecret": "YOUR_GENERATED_SECURE_TOKEN_VALUE"
     }'
   ```
3. **Verify Active Key Activation**: Request the deep health check `/health/deep` to verify that `activeWebhookKeyId` lists the newly added Key ID (`wk_2026_07`).
4. **Notify Gateway / Payment Provider**: Update the payment partner settings (Bkash/Nagad) to sign payloads using the new key, specifying the new Key ID `wk_2026_07` in the `X-Key-Id` header.
5. **Monitor Log Streams**: Confirm that all new incoming webhook transactions list `result: "ok"` and use the newly rotated `wk_2026_07` secret version.

---

## 🔄 3. Outbox Queue Lag & DLQ Remediation

The outbox worker continuously polls pending notifications. If attempts to deliver an event fail repeatedly (5 times), it is sent to the Dead-Letter Queue (DLQ) by setting its status to `'DEAD_LETTER'`.

### A. Diagnosing Queue Latency
Check deep health:
```bash
curl -s http://localhost:5000/health/deep
```
Look at:
- `outboxPending`: Number of unsent events.
- `oldestOutboxAgeSec`: How long the oldest pending event has been stuck in the queue.
  - *Action Threshold*: If `oldestOutboxAgeSec > 600` (10 minutes), take remediation steps.

### B. Outbox Remediation SOP
1. **Analyze Failed Attempts**: Check retry history and error messages for the stuck event ID:
   ```sql
   SELECT AttemptNo, Status, ErrorMessage, CreatedAt
   FROM dbo.OutboxAttempts
   WHERE OutboxId = STUCK_EVENT_ID
   ORDER BY AttemptNo DESC;
   ```
2. **Diagnose Common Failures**:
   - *Network Timeout*: Verify routing and egress traffic from the engine to the target external notification endpoint.
   - *Payload Schema Validation Failure*: Check if the target API rejected the payload structure.
3. **Manual Re-queueing**: If the downstream target issue is resolved, re-queue the dead-lettered events to retry delivery:
   ```sql
   UPDATE dbo.OutboxEvents
   SET Status = 'PENDING', NextRetryAt = SYSUTCDATETIME(), DeadLetteredAt = NULL
   WHERE OutboxId = STUCK_EVENT_ID;
   ```

---

## 🧮 4. Inventory Reconciliation Procedures

To maintain high data integrity, the engine runs an active reconciliation check comparing double-ledger transaction sums.

### A. Executing the Reconciliation Check
Run a reconciliation check for a specific product:
```bash
curl http://localhost:5000/api/inventory/reconcile/PRODUCT_ID \
  -H "x-user-email: md.marufalrashid@gmail.com" \
  -H "x-user-role: SuperAdmin"
```

### B. Interpreting the Reconciliation Payload
Example response payload:
```json
{
  "productId": 24,
  "ok": true,
  "checks": [
    { "ledgerType": "MASTER", "ledgerOnHand": 0, "sumTransactions": 0, "diff": 0 },
    { "ledgerType": "SELL", "ledgerOnHand": 5, "sumTransactions": 5, "diff": 0 }
  ]
}
```
- If `"ok": true` and both `diff` are `0`, the double-ledger is in perfect alignment.
- If `"ok": false` or any `diff` is non-zero, a ledger discrepancy exists!

### C. Ledger Discrepancy Correction SOP
If a discrepancy is detected (e.g., `diff` != 0):
1. **Isolate Product Ledger**: Temporarily disable transfers and write actions for that specific Product ID.
2. **Audit Transaction History**: Extract all transaction records for the target product to pinpoint the exact duplicate or missing entry:
   ```sql
   SELECT LedgerType, TxnType, Qty, RefType, RefId, CreatedAt
   FROM dbo.InventoryTransactions
   WHERE ProductId = PRODUCT_ID
   ORDER BY TransactionId ASC;
   ```
3. **Apply Compensating Transaction**: Run an administrative ledger correction using `/api/inventory/transactions` to align the ledger balance back with the audited sum, adding a clear administrative description in the `note` parameter.
4. **Re-run Reconcile Check**: Execute the reconciliation endpoint again to confirm `"ok": true` and a difference of `0`.

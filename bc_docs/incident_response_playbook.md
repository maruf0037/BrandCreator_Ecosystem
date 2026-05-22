# BrandCreator - Incident Response Playbook

This playbook establishes critical Site Reliability Engineering (SRE) and Operational Support procedures for responding to production incidents on the **BrandCreator Inventory & Order Engine**.

---

## 🚨 SOP-01: Webhook Replay Storms or Floods

### 1. Incident Classification & Symptoms
- **Symptom A**: High CPU utilization on API servers accompanied by elevated error metrics in webhook endpoints.
- **Symptom B**: Prometheus metric `bc_webhook_verification_total{result="fail"}` spikes.
- **Symptom C**: Rapidly growing database rows in `dbo.WebhookReceipts` under short durations.

### 2. Triaging Actions (Find the Source)
1. Execute query to identify the top source IPs or event references flooding the system:
   ```sql
   SELECT TOP 10 Provider, EventRef, SignatureHash, Count(ReceiptId) AS DuplicateCount
   FROM dbo.WebhookReceipts
   GROUP BY Provider, EventRef, SignatureHash
   ORDER BY DuplicateCount DESC;
   ```
2. Inspect server logs for incoming request footprints:
   ```json
   {"level":30,"event":"webhook.verify","provider":"BKASH","result":"fail"}
   ```

### 3. Mitigation Steps
- **Scenario A (Malicious Signature Flooding / Signature Mismatch)**:
  - If the flood is signing payloads using retired or wrong secrets, immediately rotate the active webhook key to block the flood at the edge. Refer to the **Operations Runbook (Section 2 - Key Rotation)**.
- **Scenario B (IP-Level Gateway Denial-of-Service)**:
  - If a single gateway IP is hammering the endpoints with replay events, add an immediate IP-Block rule on the Web Application Firewall (WAF) or cloud gateway level (e.g., Cloudflare, AWS WAF, Azure Front Door) for the flooding IP.
  - The engine's built-in cryptographic validation and idempotent deduplication will continue to return `HTTP 200` to valid replays in under 50ms, protecting database thread counts from depletion.

---

## 🚨 SOP-02: Outbox Queue Backlog or High Lag Age

### 1. Incident Classification & Symptoms
- **Symptom A**: Prometheus metric `bc_outbox_pending_events` continuously increases and stays $> 100$.
- **Symptom B**: Customers complain of missing email notifications or order dispatch status delays.
- **Symptom C**: `/health/deep` returns `oldestOutboxAgeSec` values exceeding `600` (10 minutes).

### 2. Triaging Actions
1. Query the database to check if the outbox worker is experiencing progressive backoff delays or dead-letter limits:
   ```sql
   SELECT TOP 10 OutboxId, EventType, Status, NextRetryAt, DeadLetteredAt
   FROM dbo.OutboxEvents
   WHERE Status IN ('PENDING', 'FAILED')
   ORDER BY CreatedAt ASC;
   ```
2. Check if a high volume of transactions is causing row locking inside the database.

### 3. Mitigation Steps
1. **Network Egress Verification**: Check if target dispatch endpoints (like email servers or downstream supply chain gateways) are online.
2. **Worker Scale-up**: If target endpoints are healthy but the volume of generated events is exceeding worker capacity, spin up additional worker instances or configure a lower polling interval.
3. **Dead-Letter Queue (DLQ) Cleanup**: If events are stuck in `'DEAD_LETTER'` due to an earlier outage, clear the dead-letter status for all pending events once the downstream system is back online:
   ```sql
   UPDATE dbo.OutboxEvents
   SET Status = 'PENDING', NextRetryAt = SYSUTCDATETIME(), DeadLetteredAt = NULL
   WHERE Status = 'DEAD_LETTER';
   ```

---

## 🚨 SOP-03: Low-Stock Emergency Policies

### 1. Incident Classification & Symptoms
- **Symptom A**: Alerts triggered for `dbo.ProductStockPolicies` violations.
- **Symptom B**: Customers receive `INSUFFICIENT_STOCK` (HTTP 400) errors during checkout.
- **Symptom C**: `GET /api/alerts/low-stock` returns active high-severity stock alerts.

### 2. Triaging Actions
1. Retrieve active low-stock inventory entries to identify depleted products:
   ```sql
   SELECT p.ProductId, p.ProductName, l.OnHandQty, l.ReservedQty, l.LedgerType
   FROM dbo.InventoryLedgers l
   JOIN dbo.Products p ON l.ProductId = p.ProductId
   WHERE l.LedgerType = 'SELL' AND (l.OnHandQty - l.ReservedQty) <= 10;
   ```
2. Identify the active supplier mapped to the depleted product:
   ```sql
   SELECT SupplierEmail
   FROM dbo.ProductOwnership
   WHERE ProductId = DEPLETED_PRODUCT_ID AND IsActive = 1;
   ```

### 3. Mitigation Steps
1. **Initiate Stock Transfer**: If stock is available on the `MASTER` ledger but empty on the `SELL` storefront ledger:
   - SuperAdmin/Admin should immediately request a stock transfer:
     ```bash
     curl -X POST http://localhost:5000/api/inventory/transfers \
       -H "x-user-email: md.marufalrashid@gmail.com" \
       -H "x-user-role: SuperAdmin" \
       -d '{"productId": PRODUCT_ID, "qty": TRANSFER_QTY, "note": "Emergency stock replenishment"}'
     ```
   - Immediately approve the transfer to transfer stock from `MASTER` to `SELL`.
2. **Supplier Notification**: If stock is depleted on both `MASTER` and `SELL` ledgers, send an emergency restock order to the mapped active supplier.
3. **Temporary Front-End Disabling**: Deactivate the storefront purchase button for the depleted product to prevent checkout failure spikes for customers.

---

## 🚨 SOP-04: DB Deadlocks or Timeout Storms

### 1. Incident Classification & Symptoms
- **Symptom A**: Spike in API error rates returning `SERVER_ERROR` (HTTP 500) with empty messages or database timeout details.
- **Symptom B**: `/health/deep` returns `dbMs > 1000ms` or times out completely.
- **Symptom C**: Database transaction blocks or locked thread count anomalies detected.

### 2. Triaging Actions
1. Query active locked connections on the MS SQL server:
   ```sql
   SELECT dm_tran.session_id, dm_tran.transaction_id, dm_exec.text
   FROM sys.dm_tran_active_transactions dm_tran
   CROSS APPLY sys.dm_exec_sql_text(dm_tran.transaction_id) dm_exec;
   ```
2. Identify slow-running queries using slow-query logs in the Pino telemetry stream.

### 3. Mitigation Steps
1. **Kill Hanging Sessions**: If a specific session holds an exclusive transaction lock on `dbo.InventoryLedgers` due to a network connection drop or driver crash, kill the blocking session:
   ```sql
   KILL SESSION_ID_GOES_HERE;
   ```
2. **Review DB Connection Pool Size**: Increase the connection pool size in `config/db.js` if the engine is running out of available database connections.
3. **Verify Index Integrity**: If query plans show index scans instead of index seeks, rebuild index tables to restore fast querying execution:
   ```sql
   ALTER INDEX ALL ON dbo.InventoryLedgers REBUILD;
   ALTER INDEX ALL ON dbo.OutboxEvents REBUILD;
   ```

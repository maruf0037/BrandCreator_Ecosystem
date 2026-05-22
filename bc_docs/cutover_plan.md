# BrandCreator - Production Go-Live Cutover Plan

This document details the step-by-step operational timeline and decision framework for executing the production Go-Live switchover of the **BrandCreator Inventory & Order Engine**.

---

## 📅 1. Switchover Schedule & Timeline

The cutover window is scheduled during off-peak hours to minimize impact:
- **Start Time**: Friday, 22:00 UTC (System Freeze & Maintenance Banner)
- **Target Completion**: Saturday, 02:00 UTC (Smoke Testing Complete)
- **Ecosystem Freeze Duration**: 4 Hours (Standard Maintenance Window)

---

## 📋 2. Phase 1: Pre-Cutover Readiness Check

Before starting execution, the Cutover Coordinator must verify that all greenlights are achieved:

- [ ] **Code Freeze**: No new commits or feature branches allowed on the production release branch.
- [ ] **Backup Verification**: A full transaction-consistent snapshot backup of the current database must be executed and verified as restorable.
- [ ] **Infrastructure Provisioning**: Target container registry, scaling policies, and network gateways must be ready and provisioned.
- [ ] **Credentials Handover**: All target production secrets must be securely seeded into the production environment vault.

---

## 🚀 3. Phase 2: Cutover Execution Sequence

Follow this step-by-step chronology during the cutover window:

### Step 1: Maintenance Banner Activation (T + 0:00)
- [ ] Route all incoming public traffic to the static maintenance page.
- [ ] Block active customer checkouts on the old storefront.
- [ ] Allow administrative access for cutover engineers.

### Step 2: Database Migration (T + 0:15)
- [ ] Connect to the target SQL Server `BrandCreator_HUBDB`.
- [ ] Execute database migrations transactionally:
  ```bash
  # Execute migrations sequentially under explicit transactional wrappers:
  1. migration_001_phase1_inventory.sql
  2. migration_002_phase11_qc_enrichment.sql
  3. migration_003_phase12_order_reservation.sql
  4. migration_004_phase13_security_ownership.sql
  5. migration_005_phase14_observability_perf.sql
  ```
- [ ] Run diagnostic checks to verify table structures, constraints, and hot index creations.

### Step 3: Application Server Bootstrapping (T + 1:00)
- [ ] Boot up the new API engine instances loaded with production environment variables.
- [ ] Verify database connectivity:
  - Check that the Pino logs report `"SQL Server Connected Successfully"`.
  - Check that the outbox worker and retry retry queues are started cleanly.

### Step 4: Shallow Health Verification (T + 1:30)
- [ ] Request basic health indicators:
  - `GET http://localhost:5000/health` -> `HTTP 200`
- [ ] Request deep health indicators:
  - `GET http://localhost:5000/health/deep` -> Verify `dbMs` database ping latency is $< 50\text{ms}$ and `status: "ok"`.

---

## 🔀 4. Phase 3: DNS & Traffic Switchover

Once the API backend is validated, execute the traffic transition:

1. **Routing Update**: Update the public API gateway (e.g., Cloudflare, NGINX) routing targets from the deprecated legacy endpoint to the newly deployed Engine cluster.
2. **DNS TTL Update**: If changing server host IPs, update the DNS records. Keep Time-To-Live (TTL) set to 300 seconds (5 minutes) during the cutover window to support immediate rollback if needed.
3. **Storefront Redeployment**: Deploy the updated Vite React client app pointing API requests to the newly routed gateway.
4. **Smoke Testing**:
   - Create a test supplier account and create a dummy product.
   - Run a mock transaction to MASTER, transfer stock to SELL, and confirm the ledger atomically processes.
   - Create a customer order and verify that stock is successfully reserved and payment webhooks process cleanly.
   - Reconcile the test product using `/api/inventory/reconcile/:productId` and confirm `diff: 0`.
   - Remove/archive the test data from the production ledger.

---

## 🚦 5. Go/No-Go Decision Criteria

At **T + 3:00** (1 hour before the maintenance window ends), the Cutover Coordinator will convene a Go/No-Go session with key stakeholders.

### Go Criteria (System Launch)
All conditions must be met to proceed with Go-Live:
- [x] Database migration completes successfully without transactional rollback.
- [x] API server boots up, reports zero startup exceptions, and connects to SQL Server.
- [x] `/health/deep` reports `status: "ok"` and `dbMs < 100ms`.
- [x] Smoke tests for product creation, stock transfer, order checkout, and webhook verification pass.
- [x] Pino logs are streaming cleanly without syntax or database connection errors.

### No-Go Triggers (Execute Rollback)
If any of these conditions are met, immediately trigger a rollback:
- [ ] Database migration fails or experiences deadlocks that cannot be resolved in under 30 minutes.
- [ ] API server experiences continuous boot-loops or fails to connect to SQL Server.
- [ ] Smoke tests fail to reserve stock, confirm payments, or reconcile ledgers.
- [ ] Webhook validation fails continuously or rejects payment callback HMAC signatures.

### Rollback Protocol
If a "No-Go" decision is reached:
1. **Restore DNS**: Instantly point the public gateway and DNS routing records back to the old, stable legacy cluster.
2. **Reactivate Storefront**: Roll back storefront deployment to point back to the legacy stable API backend.
3. **Remove Maintenance Banner**: Deactivate the maintenance page, restoring previous customer access.
4. **Data Isolation**: Retain the failed database state for off-line diagnostics and run full post-mortem analysis.

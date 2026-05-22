# BrandCreator - Production Release Checklist

This document details the step-by-step procedure for deploying the **BrandCreator Inventory & Order Engine** to staging and production environments. Follow all checks sequentially to ensure zero-downtime, schema compatibility, and correct initializations.

---

## 📋 1. Pre-Deployment Validation

Before initiating any deployment activities, execute and pass these checks on the release branch:

- [ ] **Lint and Syntax Check**: All Javascript modules must pass strict lint checks.
- [ ] **Integration Suites Execution**:
  - [ ] `node test_inventory.js` (Phase 1.0) -> `PASS`
  - [ ] `node test_qc_enrichment.js` (Phase 1.1) -> `PASS`
  - [ ] `node test_order_pipeline.js` (Phase 1.2) -> `PASS`
  - [ ] `node test_security_outbox.js` (Phase 1.3) -> `PASS`
  - [ ] `node test_chaos_observability.js` (Phase 1.4) -> `PASS`
- [ ] **Dependency Audit**: Review `package.json` for security vulnerability patches (`npm audit`).
- [ ] **Database Connection Check**: Confirm connectivity to target MS SQL Server.

---

## 🗄️ 2. Database Schema Migration Plan

Database updates must be executed transactionally. Run the migration scripts in the following chronological sequence:

### Migration Chronology
1. **Phase 1.0 (Core Inventory)**: `migration_001_phase1_inventory.sql`
2. **Phase 1.1 (QC & Enrichment)**: `migration_002_phase11_qc_enrichment.sql`
3. **Phase 1.2 (Order Reservation)**: `migration_003_phase12_order_reservation.sql`
4. **Phase 1.3 (Security & Stock Policies)**: `migration_004_phase13_security_ownership.sql`
5. **Phase 1.4 (Observability & Key Rotation)**: `migration_005_phase14_observability_perf.sql`

> [!IMPORTANT]
> **Transactional Guard**: Always wrap migrations in `BEGIN TRAN;` and `COMMIT TRAN;` with `SET XACT_ABORT ON;` active. This prevents partial migration states if a query fails mid-execution.

### Database Index Verification
Confirm that hot database query indexes are successfully applied:
- [ ] Clustered Index `CIX_OutboxEvents` on `dbo.OutboxEvents(OutboxId)`
- [ ] Non-Clustered Index `IX_OutboxEvents_Status_NextRetry` on `dbo.OutboxEvents(Status, NextRetryAt) INCLUDE (CreatedAt)`
- [ ] Clustered Index `CIX_WebhookReceipts` on `dbo.WebhookReceipts(ReceiptId)`
- [ ] Unique Non-Clustered Index `UQ_WebhookReceipts_Provider_EventRef` on `dbo.WebhookReceipts(Provider, EventRef)`
- [ ] Clustered Index `CIX_SecretVersions` on `dbo.SecretVersions(SecretId)`
- [ ] Unique Non-Clustered Index `UQ_SecretVersions` on `dbo.SecretVersions(SecretType, KeyId)`

---

## 🔑 3. Environment Secrets Management

Configure target ecosystem environment variables in the secure production secrets manager (e.g., Azure Key Vault, AWS Secrets Manager).

| Variable Name | Purpose / Expected Value | Sensitivity |
| :--- | :--- | :--- |
| `PORT` | `5000` (Ecosystem Engine HTTP service port) | Low |
| `DB_USER` | Secure MS SQL DB login username (`BrandCreatorUser`) | High |
| `DB_PASSWORD` | Cryptographically strong DB password | High |
| `DB_SERVER` | Address/Host of production MS SQL Server | High |
| `DB_DATABASE` | Database name (`BrandCreator_HUBDB`) | Medium |
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID for Google SSO Login integration | Medium |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Client Secret value (automatic Pino logging redaction) | High |
| `WEBHOOK_SECRET` | Active payment webhook HMAC decryption secret | High |
| `GEMINI_API_KEY` | Production API Key for Google Gemini LLM enrichment | High |
| `LOG_LEVEL` | `info` (for telemetry) or `debug` (for deep triage) | Low |

---

## 🚀 4. Deployment Sequence (Zero-Downtime Pipeline)

Follow the Blue-Green or rolling update deployment model:

### Step 1: Pre-Migration Deployment
Apply target schema updates (migrations 1 to 5) directly against the active database. Because all tables and columns are backward-compatible (non-destructive `ALTER TABLE` operations), this step does not interrupt current active nodes.

### Step 2: Secret Configuration
Provision new environment variables to target task templates or container parameter specs.

### Step 3: Rolling Pod Re-creation
Initiate a rolling update of the API servers:
- Start the new engine pods/nodes.
- Perform internal health checks on the new nodes (`/health` and `/health/deep`).
- Route production gateway traffic to new nodes.
- Gracefully shut down and decommission deprecated active engine instances.

---

## 🔍 5. Post-Deployment Verification

After traffic cutover, verify live telemetry and health interfaces immediately:

1. **Verify Prometheus Exporter**: Fetch plain metrics from `/metrics` (Ensure `HTTP 200` with active histogram metrics).
2. **Deep Health Check**: Request `/health/deep`. Ensure:
   - `status` returns `"ok"`.
   - `dbMs` database ping latency is $< 100\text{ms}$.
   - `outboxPending` is within acceptable bounds.
   - `activeWebhookKeyId` lists the active key version.
3. **Structured Log Verification**: Inspect live Pino streams in Cloudwatch/Datadog. Ensure:
   - JSON structure is cleanly parsed.
   - Tracing correlation header `x-request-id` is included in all incoming requests.
   - Sensitive variables (`authorization`, `google_client_secret`) are successfully replaced with `"[REDACTED]"`.

---

## 🔄 6. Emergency Rollback Strategy

If critical post-deployment checks fail or serious error spikes occur:

1. **Traffic Re-route**: Immediately point the ecosystem gateway back to the previous stable active cluster (Blue).
2. **Database Schema State**: Do not roll back tables or column structures immediately unless there is a physical index corruption. The schema is fully backward-compatible, so the older engine code will continue to execute safely.
3. **Audit and Log Harvest**: Preserve all Pino logs containing the unique `x-request-id` corresponding to the crash event for post-mortem analysis.

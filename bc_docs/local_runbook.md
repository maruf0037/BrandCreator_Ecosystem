# BrandCreator Ecosystem Local Runbook

This document details the usage and controls for the one-click local launchers, environment audits, and integration tests of the BrandCreator Ecosystem.

---

## Workspace Controls

The ecosystem features three specialized PowerShell control scripts located in the `scripts/` directory to manage local development, service verification, and test lifecycle execution.

### 1. Launch Services (`start-local.ps1`)
Launches the Express backend engine in a detached background Node process, routes server logs to standard files, and checks the status of the Express health check and IIS reverse-proxy configuration.

* **Usage**:
  ```powershell
  .\scripts\start-local.ps1
  ```
* **Log Location**: Express server outputs are logged to `bc_engine/logs/server.log`.

---

### 2. Stop Services (`stop-local.ps1`)
Safely identifies and terminates only the active background Node process listening on port `5000` (without impacting other running node processes or system-wide IIS configurations).

* **Usage**:
  ```powershell
  .\scripts\stop-local.ps1
  ```

---

### 3. Integrated Diagnostics & E2E Tests (`verify-local.ps1`)
Maintains a four-stage comprehensive sanity check:
1. **Engine Check**: Queries `http://localhost:5000/health`.
2. **IIS Routing Check**: Validates routing fallbacks for `/admin`, `/supplier`, and `/shop` to ensure they respond with `200 OK`.
3. **Compilation Check**: Executes full production compilation inside `bc_storefront` to verify Javascript syntax, routes, and styles.
4. **E2E Check**: Triggers the integrated atomic transaction walkthrough in `bc_engine` (product registration, double-ledger stock addition, master-to-sell transfers, customer checkouts, simulated payment confirmations, and automated audit settlements).

* **Usage**:
  ```powershell
  .\scripts\verify-local.ps1
  ```

---

## Active Portals & Diagnostics References

Once started, the following local environments are active:

| Resource Portal | URL Location | Role Authorized |
| :--- | :--- | :--- |
| **Customer Storefront** | http://localhost:8080/shop | Customer, Supplier, Admin, SuperAdmin |
| **Supplier Workspace** | http://localhost:8080/supplier | Supplier |
| **Admin Controls & Health** | http://localhost:8080/admin | Admin, SuperAdmin |
| **Backend Engine Health** | http://localhost:5000/health | Observability, Monitoring |
| **Deep System Check** | http://localhost:5000/health/deep | Observability, Performance Audit |

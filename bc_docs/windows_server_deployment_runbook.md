# Windows Server (IIS + Node.js) Production Deployment Runbook

This runbook describes the step-by-step procedure for deploying the **BrandCreator Inventory & Order Ecosystem** to a Windows Server production environment using IIS as a reverse proxy/static storefront host and running the Express backend engine as a persistent Windows Service.

---

## 📋 1. Server Prerequisites Checklist

Before beginning the deployment, ensure that the target Windows Server has the following software and components installed and configured:

- [ ] **Windows Server**: Windows Server 2019 or 2022 Standard/Datacenter.
- [ ] **IIS (Internet Information Services)**:
  * Installed via *Server Manager -> Add Roles and Features*.
  * Ensure **Common HTTP Features** (Static Content, Default Document) and **Application Development** (WebSocket Protocol) are enabled.
- [ ] **URL Rewrite Module 2.1**:
  * [Download and Install URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite).
- [ ] **Application Request Routing (ARR) 3.0**:
  * [Download and Install ARR](https://www.iis.net/downloads/microsoft/application-request-routing).
  * **CRITICAL**: Enable Proxying.
    1. Open *IIS Manager*.
    2. Click on the root Server Node.
    3. Double-click **Application Request Routing Cache**.
    4. On the right-hand panel, click **Server Proxy Settings**.
    5. Check **Enable Proxy** and click **Apply**.
- [ ] **Node.js LTS**: Install Node.js LTS (v20+ recommended).
- [ ] **Microsoft SQL Server / SQL Express**:
  * MS SQL Server 2019 or 2022.
  * Ensure SQL Authentication is enabled (Mixed Mode).
  * Ensure TCP/IP connections are enabled in *SQL Server Configuration Manager* on port `1433`.
- [ ] **NSSM (Non-Sucking Service Manager)**:
  * [Download NSSM](https://nssm.cc/download) and place the executable in `C:\nssm\nssm.exe` (added to system PATH).

---

## 📂 2. Folder Layout & Organization

The recommended folder layout for the production deployment is:

```text
D:\Apps\BrandCreator\
├── bc_docs\             # Operational runbooks and specifications
├── bc_engine\           # Express backend API codebase
│   └── logs\            # Backend logging directory (server.log)
├── bc_storefront\       # Frontend codebase
│   └── dist\            # Compiled production static bundle
└── scripts\             # Operational and shortcut scripts
```

Create the root directory on the production drive:
```powershell
New-Item -ItemType Directory -Path "D:\Apps\BrandCreator" -Force
```

---

## 🔑 3. Production Environment Configuration

Create the secure `.env` files directly on the production host server. **NEVER** commit these files to Git.

### A. Backend Engine Configuration (`D:\Apps\BrandCreator\bc_engine\.env`)
```ini
PORT=5000
DB_USER=BrandCreator_AppUser
DB_PASSWORD=YourStrongSecureProductionSQLPassword
DB_SERVER=localhost
DB_DATABASE=BrandCreator_HUBDB
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
WEBHOOK_SECRET=your-cryptographic-webhook-signature-secret
GEMINI_API_KEY=your-production-google-gemini-key
LOG_LEVEL=info
```

### B. Front-End Storefront API URL (`D:\Apps\BrandCreator\bc_storefront\.env`)
Configure the frontend build to point to the unified domain address:
```ini
VITE_API_URL=/api
```
*(By setting `VITE_API_URL` to `/api`, we route storefront API requests relatively, letting the IIS URL Rewrite rule reverse-proxy it safely to port 5000).*

---

## 🛠️ 4. Build & Compilation Instructions

Execute the dependency installations and React static bundle compilation on the production server:

1. **Install Backend Dependencies**:
   ```cmd
   cd D:\Apps\BrandCreator\bc_engine
   npm install --production
   ```

2. **Compile Front-End Production Bundle**:
   ```cmd
   cd D:\Apps\BrandCreator\bc_storefront
   npm install
   npm run build
   ```
   *Verify that `D:\Apps\BrandCreator\bc_storefront\dist` is successfully populated with `index.html` and the `assets/` subfolder.*

---

## 🕸️ 5. IIS Site Setup & Reverse Proxy Routing

1. **Create the IIS Website**:
   * Open *IIS Manager*.
   * Right-click **Sites** -> **Add Website**.
   * **Site name**: `BrandCreator`
   * **Physical path**: `D:\Apps\BrandCreator\bc_storefront\dist`
   * **Binding**: HTTP on Port `80` (or Port `443` with a valid SSL/TLS certificate bound).
   * **Host name**: `brandcreator.company.com`

2. **Configure SPA Rewrite & API Reverse Proxy (`web.config`)**:
   Create a `web.config` file inside `D:\Apps\BrandCreator\bc_storefront\dist` with the following configuration:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Rule 1: Proxy all requests matching /api/* to Express on Port 5000 -->
        <rule name="API Reverse Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:5000/api/{R:1}" />
        </rule>

        <!-- Rule 2: Single Page Application fallback for React Router -->
        <rule name="React SPA Fallback" stopProcessing="false">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="index.html" />
        </rule>
      </rules>
    </rewrite>
    <httpErrors errorMode="Detailed" />
  </system.webServer>
</configuration>
```

---

## ⚙️ 6. Run Express Backend as a Windows Service

Utilize `NSSM` to register and manage the Node.js API process as an OS-level service, ensuring automatic start on server boot and recovery on failures.

1. **Install the Service**:
   Open a command prompt as **Administrator** and run:
   ```cmd
   nssm install BrandCreatorEngine
   ```

2. **Configure the Service Fields**:
   * **Application Tab**:
     * *Path*: `C:\Program Files\nodejs\node.exe` (or path to your node executable)
     * *Startup directory*: `D:\Apps\BrandCreator\bc_engine`
     * *Arguments*: `server.js`
   * **Details Tab**:
     * *Display name*: `BrandCreator Backend Engine`
     * *Description*: `Express inventory and order engine for BrandCreator Ecosystem`
     * *Startup type*: `Automatic`
   * **I/O Tab**:
     * *Output (stdout)*: `D:\Apps\BrandCreator\bc_engine\logs\server-stdout.log`
     * *Error (stderr)*: `D:\Apps\BrandCreator\bc_engine\logs\server-stderr.log`
   * **Shutdown Tab**:
     * Leave default parameters active to ensure graceful shutdown via `SIGTERM`.

3. **Start the Service**:
   Click **Install service** in the GUI, then start the service in PowerShell:
   ```powershell
   Start-Service BrandCreatorEngine
   ```

---

## 🗄️ 7. Database Migration Protocol

Connect to the production Microsoft SQL Server instance using SSMS or a CLI tool, and execute the migration scripts in the **strict chronological order** listed below:

1. **Core Double-Ledger Schema**: `bc_engine/migrations/migration_001_phase1_inventory.sql`
2. **QC Reviews & Enrichment State**: `bc_engine/migrations/migration_002_phase11_qc_enrichment.sql`
3. **Order Reservations & BKASH States**: `bc_engine/migrations/migration_003_phase12_order_reservation.sql`
4. **Row-level Ownership Policies**: `bc_engine/migrations/migration_004_phase13_security_ownership.sql`
5. **Prometheus Telemetry & Encryption Indexing**: `bc_engine/migrations/migration_005_phase14_observability_perf.sql`

*Always execute migrations within a secure transaction block:*
```sql
SET XACT_ABORT ON;
BEGIN TRANSACTION;
-- [Paste SQL script contents here]
COMMIT TRANSACTION;
```

---

## 🩺 8. Production Smoke Test Verification

Once deployment is complete, verify system operations sequentially:

1. **Validate API Endpoint**:
   * Visit `https://brandcreator.company.com/api/health`
   * Ensure it returns: `{"status":"ok","db":"sqlserver"}`.
2. **Verify Telemetry Stream**:
   * Visit `http://localhost:5000/metrics` internally.
   * Verify standard HTTP and Outbox queue histograms are active.
3. **Execute E2E Demo Cycle**:
   * **Supplier**: Create product (returns draft) -> Click **Submit for QC**.
   * **Admin**: Go to `/admin` -> QC Queue -> Click **Approve Design**.
   * **Supplier**: Click **[+] Add Stock** on product -> Deposit `100` units of physical `MASTER` stock.
   * **Supplier**: Click **Request Transfer** -> Request `30` units to virtual `SELL` ledger.
   * **Admin**: Go to `/admin` -> Stock Transfers -> Click **Approve** on the request.
   * **Shop**: Go to `/shop` -> Add product to cart -> Checkout -> Retrieve `orderRef`.
   * **Admin**: Go to `/admin` -> Recent Orders -> Click **Confirm Payment (Dev)**.
   * **Verification**: Verify that the virtual ledger (`SELL`) matches the checkout deduction perfectly.

---

## 🔄 9. Emergency Rollback Playbook

If critical errors, memory exhaustion, or telemetry warnings occur post-launch:

1. **Revert Frontend Storefront**:
   * Copy the previous stable `dist/` build directory back to `D:\Apps\BrandCreator\bc_storefront\dist`.
   * Clear browser cache / CDN edge caches if applicable.
2. **Revert Backend API Engine**:
   * Stop the backend service:
     ```powershell
     Stop-Service BrandCreatorEngine
     ```
   * Restore the previous stable `bc_engine/` files.
   * Restart the backend service:
     ```powershell
     Start-Service BrandCreatorEngine
     ```
3. **Database Schema State**:
   * **DO NOT** perform destructive SQL rollback scripts unless a physical constraint corrupts new data. Because the database schema additions (tables, views, stored procedures) are backward-compatible, older application builds will continue to query the database safely without requiring table drops.

---

## 🔒 10. Security Hardening Checklist

- [ ] **No Credentials in Git**: Ensure `.env` is listed inside the repository `.gitignore`.
- [ ] **SQL Least-Privilege Account**: Create a restricted SQL User (`BrandCreator_AppUser`) with only `EXECUTE` rights on stored procedures and basic CRUD on specific tables. **NEVER** run the production Express backend using the `sa` (System Administrator) database role.
- [ ] **SSL/TLS Protocol**: Bind a valid certificate (Let's Encrypt / Enterprise CA) to Port 443 in IIS. Install the **HTTP to HTTPS Redirect** rule in IIS rewrite rules.
- [ ] **OAuth Key Rotation**: Change and rotate the Google OAuth Client Secrets and Payment Webhook secret tokens quarterly.

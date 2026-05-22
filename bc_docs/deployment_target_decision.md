# BrandCreator Ecosystem - Deployment Target Decision Note

This document evaluates the potential deployment targets for the **BrandCreator Inventory & Order Ecosystem**. It reviews technical complexity, infrastructure costs, and architectural changes required to transition from the current local environment to production.

---

## 📊 Deployment Targets Comparison Matrix

| Deployment Option | Cost | Difficulty | Reliability | Key Architectural Changes Required |
| :--- | :--- | :--- | :--- | :--- |
| **1. IIS Local-Only** <br> *(Current State)* | **$0** (Free) | **Extremely Low** <br> (Already configured) | **Medium** <br> (No HA; restricted to single host PC) | None. Environment is 100% operational in offline desktop-operator mode. |
| **2. Windows Server IIS + Node Service** <br> *(On-Premises / Enterprise)* | **Low to Medium** <br> (Windows Server VM / hardware licenses) | **Medium** <br> (Requires Windows administrative privileges) | **High** <br> (Managed by IIS worker recycling and OS services) | • Register Express engine as a persistent Windows Service (via `NSSM` or `PM2`).<br>• Configure IIS ARR (Application Request Routing) for API reverse-proxying. |
| **3. Cloud VPS** <br> *(Linux VM - AWS EC2 / DO / Azure)* | **Low ($5 - $40/mo)** <br> (Scale-as-you-grow) | **Medium-High** <br> (Requires Linux CLI, Nginx, & SSL setup) | **Extremely High** <br> (99.9% VM SLA, automatic snapshots, and scaling) | • Replace Windows IIS with Nginx (acting as storefront static host and `/api` reverse proxy).<br>• Migrate SQL Server to cloud database (Azure SQL / AWS RDS) or host SQL on Linux VM. |
| **4. Docker Containers** <br> *(Containerized - Docker Compose / ECS / AKS)* | **Low to High** <br> (Dependent on cloud resource size) | **High** <br> (Requires Docker orchestration experience) | **Supreme** <br> (Immutable environments, instant scaling, & simple recovery) | • Create separate Dockerfiles for `bc_engine` (Node base) and `bc_storefront` (Nginx base).<br>• Define `docker-compose.yml` linking backend, frontend, and database services. |

---

## 🔍 Deep-Dive Evaluation

### 1. IIS Local-Only (Offline Desktop Mode)
The system is currently configured for this option. Vite serves the frontend React source during development, and the production build is compiled and hosted locally via an IIS Site.
* **Who it is for**: Internal training, offline data entry operators, and sandbox QA testing.
* **Pros**: Zero infrastructure costs, completely immune to external network outages, and works on standard operator PCs.
* **Cons**: No public accessibility. Collaboration requires manual exports, and the database resides entirely on the host machine.

### 2. Windows Server IIS + Node Service
This represents the natural progression for organizations running on Windows-based corporate infrastructure (which is very common for MS SQL Server database integrations).
* **Who it is for**: Businesses with existing Windows Server systems who want a self-hosted corporate intranet/extranet application.
* **Pros**: Uses existing Windows administrative skill sets. Safe database pings because SQL Server is colocated on the same local area network (LAN).
* **Cons**: Windows Server licenses can be costly if built from scratch. Setting up ARR (Application Request Routing) and URL Rewrite in IIS requires manual configuration.
* **What Needs to Change**:
  1. **Node Process Persistence**: Use `NSSM` (Non-Sucking Service Manager) or `pm2-windows-service` to run the Express `server.js` engine as a background Windows Service that automatically starts on system boot and restarts upon unexpected failure.
  2. **Reverse Proxy Setup**: Enable Application Request Routing (ARR) in IIS, and write a web rewrite rule inside the storefront `web.config` to map traffic matching `/api/*` to `http://localhost:5000/api/*`.

### 3. Cloud VPS (Linux VM)
A modern, flexible approach utilizing a cloud provider like DigitalOcean, AWS EC2, or Linode to expose the system to the public internet securely.
* **Who it is for**: Public storefront rollouts accessible to online buyers on any device.
* **Pros**: Automated server backups, simple memory/CPU scaling, and low entry cost.
* **Cons**: SQL Server licensing on Linux can be complex (standard developer edition vs web/standard edition). Requires basic Linux system administration (SSH, systemd, firewall, SSL certs).
* **What Needs to Change**:
  1. **Web Server**: Swap Windows IIS for Nginx. Configure Nginx to serve the `bc_storefront/dist` build folder static files on port `80`/`443` and reverse proxy `/api` requests to `http://localhost:5000`.
  2. **Process Manager**: Run Node via Linux `pm2` with daemon clustering.
  3. **SSL/TLS**: Apply free Let's Encrypt SSL certificates using `certbot` for safe HTTPS connections.

### 4. Docker Deployment (Containerized)
The most robust modern architecture. The entire application (storefront, backend, database) is packaged into self-contained micro-images that run identically anywhere.
* **Who it is for**: Agile teams aiming for absolute environment parity, CI/CD pipelines, or public cloud deployments.
* **Pros**: "Write once, run anywhere". Extremely clean upgrades—simply pull the new container image and swap it without manual file copy errors.
* **Cons**: Requires initial Docker development overhead. Database storage requires careful volume-binding to prevent data loss when containers cycle.
* **What Needs to Change**:
  1. **Storefront Container**: Create a `Dockerfile` using `node` to compile Vite assets, then copy the compiled files to an `nginx:alpine` image.
  2. **Engine Container**: Create a simple lightweight `Dockerfile` wrapping the Node Express project and copying `.env.production` at runtime.
  3. **Compose Orchestration**: Link both containers alongside a dedicated SQL Server Express Docker image inside a single `docker-compose.yml` file.

---

## 🎯 Definitive Recommendations for BrandCreator

For the initial launch phases of **BrandCreator**, we recommend a structured **two-phase rollout plan**:

### 🏁 Phase 1: Local / On-Premises Office Rollout
* **Choice**: **Option 2 (Windows Server IIS + Node Service)**
* **Rationale**: Since the database is already running on MS SQL Server and the operators are using Windows-based setups, migrating to a central Windows Server virtual machine inside the office/warehouse is the safest first step.
* **Implementation Priority**:
  1. Package the Express engine as a Windows Service using `NSSM`.
  2. Configure IIS ARR to route public traffic, eliminating manual port entries for operators.

### 🚀 Phase 2: Public Storefront Rollout
* **Choice**: **Option 3 (Cloud VPS - Linux VM) or Option 4 (Docker Compose)**
* **Rationale**: If the customer storefront goes public, the web traffic must reside on a high-availability cloud host. 
* **Implementation Priority**:
  1. Convert the system to use Nginx + PM2 on a Linux VPS.
  2. Migrate MS SQL Server to an managed DB instance (e.g., Azure SQL) to ensure automated maintenance, daily backups, and robust scaling bounds.

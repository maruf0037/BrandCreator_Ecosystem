# BrandCreator - 30-Day Post-Go-Live Technical Optimization Backlog

This document establishes the 30-day technical optimization backlog for the **BrandCreator Inventory & Order Engine**. These tasks focus on progressive performance, scalability, and system resilience improvements grouped into weekly execution sprints.

---

## 🗺️ 1. Backlog Roadmap & Prioritization

The optimization backlog is organized into a four-week progressive roadmap:

```mermaid
gantt
    title BrandCreator 30-Day Technical Optimization Backlog
    dateFormat  YYYY-MM-DD
    section Weekly Sprints
    Week 1: Concurrency & Clustering  :active, w1, 2026-05-25, 7d
    Week 2: Caching & Read Perf       : w2, after w1, 7d
    Week 3: Advanced DB Tuning        : w3, after w2, 7d
    Week 4: Queue Scaling & Backups    : w4, after w3, 7d
```

---

## 🏃 2. Weekly Sprint Breakdown

### 🎯 Week 1: High-Concurrency & Process Clustering
*Objective: Maximize server resource utilization and throughput.*

- [ ] **Node.js Cluster Mode Integration**:
  - Update `server.js` or configure PM2 to execute in cluster mode (`pm2 start server.js -i max`), spawning workers to match available CPU cores.
  - Verify session state is stateless (using JWT/database sessions) so requests can be routed to any cluster instance.
- [ ] **Egress Connection Pooling Optimizations**:
  - Tune SQL Server driver pool configurations in `config/db.js`:
    ```javascript
    pool: {
      max: 50,
      min: 10,
      idleTimeoutMillis: 30000
    }
    ```
  - Verify thread count latency and connection pooling behavior during peak hours.

### 🎯 Week 2: Caching Architecture & Read Performance
*Objective: Unburden hot database tables from high-read operations.*

- [ ] **Redis Catalog Cache Implementation**:
  - Implement Redis to cache product details fetched via `GET /api/products/:id` and search catalogs.
  - Implement a clean cache-invalidation protocol: invalidate or update the product cache instantly when a review changes state or enrichment completes.
- [ ] **Read/Write Query Splitting**:
  - Configure read-replicas for query routing. Route all read queries (like ledger audits or history) to read replicas while routing write actions (orders, transfers) to the primary database.

### 🎯 Week 3: Advanced Database Performance Tuning
*Objective: Optimize query execution speeds and storage structures.*

- [ ] **Ledger Table Partitioning**:
  - Partition historical logs table `dbo.InventoryTransactions` by calendar quarters to prevent scan degradation as transaction counts grow.
  - Set up monthly table purging or archivals for cold records older than 1 year.
- [ ] **Clustered Columnstore Indexes**:
  - Implement clustered columnstore indexes on transaction tables to accelerate real-time analytics and sum aggregation queries.

### 🎯 Week 4: Queue Scaling & Disaster Recovery Backups
*Objective: Boost async job delivery throughput and system resilience.*

- [ ] **Outbox Concurrency Throttling**:
  - Tune outbox worker configuration to poll and process events in parallel batches (e.g., batch size $= 50$ events per tick) with thread-safe lock-guards.
  - Implement fallback circuit breakers if external notification delivery endpoints fail repeatedly.
- [ ] **Automated Disaster Recovery Replication**:
  - Configure automated database snapshot backup routines executing hourly transactional log backups and daily full database backups.
  - Implement multi-region replication for hot recovery databases with dynamic failover gateways.

---

## 📊 3. Backlog Prioritization Matrix

Use this matrix to schedule tasks during standard development sprints:

| Backlog Item | Business Impact | Technical Complexity | Target Sprint | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **PM2 Process Clustering** | High (Boosts throughput 4x) | Low (Config update) | Week 1 | **Urgent (P1)** |
| **SQL Connection Pool Tuning** | High (Prevents lock timeouts) | Low (Code parameter change) | Week 1 | **Urgent (P1)** |
| **Redis Catalog Caching** | High (Unburdens primary DB) | Medium (Requires Redis server) | Week 2 | **High (P2)** |
| **Table Partitioning** | Medium (Long-term stability) | High (DB schema modifications) | Week 3 | **Medium (P3)** |
| **Outbox Throttling & Batching** | High (Speeds event dispatch) | Medium (Worker code updates) | Week 4 | **High (P2)** |
| **Automated Backups Verification**| Critical (Data safety) | Low (SQL Server Agent tasks) | Week 4 | **Urgent (P1)** |

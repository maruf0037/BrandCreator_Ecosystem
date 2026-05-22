# Master Plan: Phase 2 Admin Pricing & Profit Engine
Path: `D:\Workspace\01_Projects\Active\BrandCreator_Ecosystem\bc_docs\admin_pricing_profit_engine_plan.md`

Under our locked business framing:
```text
BrandCreator = Ads/Marketing Intelligence Engine + Controlled Selling Platform
```
* **Supplier** = Product & stock source only (cannot see marketing budgets, net margin formulas, or custom selling price points).
* **Admin** = Strategic brain (determines final pricing strategy, SEO campaign details, marketing budgets, and splits revenues).
* **Customer** = Future marketing audience assets & transactional revenue source.

---

## 1. SQL Schema Upgrade

We will define a SQL migration `migration_009_admin_pricing_profit.sql` to establish the core pricing plans, budgets, and profit realization ledger.

### A. Table: `dbo.AdminPricingPlans`
Stores the Admin's configured selling price, discount parameters, and planned budget values per product:
* `PlanId` INT IDENTITY(1,1) PRIMARY KEY
* `ProductId` INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId)
* `AdminSellingPrice` DECIMAL(18,2) NOT NULL
* `AdBudgetPlanned` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `PlatformCommission` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `DeliveryOpsCost` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `DiscountAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `CreatedByAdmin` NVARCHAR(255) NOT NULL
* `Status` NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
* `CreatedAt` DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
* `UpdatedAt` DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()

### B. Table: `dbo.ProductProfitSnapshots`
Maintains real-time calculations for product pricing and planned profit analytics:
* `SnapshotId` INT IDENTITY(1,1) PRIMARY KEY
* `ProductId` INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId)
* `SupplierRpuMrp` DECIMAL(18,2) NOT NULL
* `AdminSellingPrice` DECIMAL(18,2) NOT NULL
* `AdBudgetPlanned` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `AdSpendActual` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `NetBrandCreatorProfit` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `Status` NVARCHAR(50) NOT NULL DEFAULT 'OK'
* `UpdatedAt` DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()

### C. Table: `dbo.OrderProfitBreakdowns`
Locks the final financial split of every order item upon customer payment success:
* `BreakdownId` BIGINT IDENTITY(1,1) PRIMARY KEY
* `OrderId` BIGINT NOT NULL FOREIGN KEY REFERENCES dbo.Orders(OrderId)
* `ProductId` INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId)
* `Qty` INT NOT NULL
* `GrossRevenue` DECIMAL(18,2) NOT NULL
* `SupplierPayable` DECIMAL(18,2) NOT NULL
* `PlatformCommission` DECIMAL(18,2) NOT NULL
* `AdSpendShare` DECIMAL(18,2) NOT NULL
* `DeliveryOpsCost` DECIMAL(18,2) NOT NULL
* `DiscountAmount` DECIMAL(18,2) NOT NULL
* `NetBrandCreatorProfit` DECIMAL(18,2) NOT NULL
* `ReturnLoss` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `ProfitAfterReturn` DECIMAL(18,2) NOT NULL
* `PaymentStatus` NVARCHAR(50) NOT NULL DEFAULT 'UNPAID'
* `CreatedAt` DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()

### D. Table: `dbo.AdsBudgetLedgers`
Tracks dynamic ad campaign allocations and marketing cost distributions:
* `LedgerId` INT IDENTITY(1,1) PRIMARY KEY
* `ProductId` INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(ProductId)
* `AdBudgetPlanned` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `AdSpendActual` DECIMAL(18,2) NOT NULL DEFAULT 0.00
* `Note` NVARCHAR(500) NULL
* `CreatedByAdmin` NVARCHAR(255) NOT NULL
* `CreatedAt` DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()

---

## 2. Backend REST APIs

We will expose the following endpoint layer under the `/api/admin/*` routing prefix, utilizing strict Admin RBAC checks:

1. **`GET /api/admin/pricing/products`**
   * Returns a tabular list of all products combined with their supplier costs, MRP, active Admin selling price, and estimated margins.
2. **`POST /api/admin/pricing/products/:productId/plan`**
   * Configures or updates the `AdminPricingPlan` for a specific product. Checks if margins are negative or zero, returning a profit warning if required.
3. **`GET /api/admin/profit/products/:productId`**
   * Retrieves operational, ad-budget planning, and live net profit matrices for a specific product.
4. **`GET /api/admin/profit-ledger`**
   * Returns a summary ledger of all realized split payouts, recovered costs, and realized platform profits.
5. **`GET /api/admin/orders/:orderRef/profit-breakdown`**
   * Audits an order's financial splits and payouts.

---

## 3. Admin UI: Tab 9 "Pricing & Profit Engine"

We will upgrade `AdminDashboard.jsx` to render a glassmorphic master panel:
* **Product Details Grid**: Displays all database products with their Supplier cost/MRP, Admin selling price, planned ad budget, estimated commission, and estimated net profit.
* **Profit Warnings**: Highlights items with an estimated net profit of `<= 0` with glowing red outlines and alert flags.
* **Interactive Plan Modal**: Allows the Admin to define:
  - Admin Selling Price
  - Planned Ad Budget
  - Discounting/Campaign splits
  - Logistics allocations
* **Platform Profit Ledger summary**: Displays total accumulated stats for gross revenue, ad spend recovery, supplier payout allocations, and net BrandCreator profit.

---

## 4. Key Business Rules
* **Decoupled Pricing Rule**: Suppliers have 100% blind access to their dashboard. Any endpoint matching `/api/admin/*` must strictly return a `403 Forbidden` response for Supplier roles.
* **Campaign-Readiness Validation**: Products cannot be listed in campaigns or set to active ads running if there is no valid `AdminPricingPlan` configured.
* **Realized Profit Split**: Payment confirmation is required before final profit realization occurs. Unpaid orders do not release supplier payables or realize platform net margin.
* **Return Loss formula**: When a customer returns an item, the supplier payout is cancelled, and the return delivery costs are logged, adjusting the `ProfitAfterReturn` fields in the order breakdown.

---

## 5. Test Matrix
1. **Admin Pricing Creation Test**:
   * Create an Admin Pricing Plan via `POST /api/admin/pricing/products/:id/plan` with active admin credentials. Ensure it returns `201 Created` or `200 OK`.
2. **Supplier RBAC Lockout Test**:
   * Attempt to fetch the pricing plan using a `Supplier` session token/role context. Assert it returns `403 Forbidden`.
3. **Negative Profit Validation**:
   * Submit an Admin Pricing Plan where operational + marketing costs exceed the selling price. Assert that the response contains a warning object indicating negative profit margins.
4. **Reconciliation Assertions**:
   * Verify all existing ledger tests (Double-Ledger inventory checks and ordering flows) compile and pass with 100% correctness.

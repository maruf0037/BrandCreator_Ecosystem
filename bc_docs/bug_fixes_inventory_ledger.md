# Inventory Ledger Bug Fixes - Critical Issues Resolved

## Date: 2026-06-05

## Summary

Fixed **3 critical bugs** and **1 medium issue** in the double-ledger inventory system that were causing SELL ledger to always mirror MASTER ledger data, breaking the core inventory tracking architecture.

---

## 🔴 Critical Bug #1: `getProductLedgers` - SELL Ledger Always Shows MASTER Data

**Location**: `bc_engine/controllers/inventoryController.js` (Lines 182-186)

**Problem**:

```javascript
// BEFORE - WRONG
sell: {
  onHandQty: masterLedger.OnHandQty,  // ❌ Using masterLedger
  reservedQty: masterLedger.ReservedQty,
  availableQty: masterLedger.OnHandQty - masterLedger.ReservedQty
}
```

The `sellLedger` variable was declared but never used. SELL stock always showed MASTER data.

**Fix**:

```javascript
// AFTER - CORRECT
sell: {
  onHandQty: sellLedger.OnHandQty,    // ✅ Using sellLedger
  reservedQty: sellLedger.ReservedQty,
  availableQty: sellLedger.OnHandQty - sellLedger.ReservedQty
}
```

**Impact**: Now correctly returns separate stock levels for MASTER and SELL ledgers.

---

## 🔴 Critical Bug #2: `approveTransfer` - No Actual Stock Movement

**Location**: `bc_engine/controllers/inventoryController.js` (Lines 313-375)

**Problem**:

```javascript
// BEFORE - NO-OP
// 2. (NO-OP/DEPRECATED in shared stock mode) Stock transaction is no longer needed on MASTER/SELL.
// Keeping the TransferRequest status update for compatibility.

// Only updated status to COMPLETED, no actual stock movement
```

Transfer approval only changed status to COMPLETED without moving stock from MASTER to SELL ledger.

**Fix**:

```javascript
// AFTER - ACTUAL STOCK MOVEMENT

// 2. Check MASTER ledger has sufficient available stock
const masterLedgerCheck = await transaction
  .request()
  .input("productId", sql.Int, transfer.ProductId)
  .query(
    "SELECT OnHandQty, ReservedQty FROM dbo.InventoryLedgers WHERE ProductId = @productId AND LedgerType = 'MASTER'",
  );

// Validate sufficient stock
if (masterAvailable < transfer.Qty) {
  return res.status(400).json({
    error: "INSUFFICIENT_STOCK",
    message: "MASTER ledger has insufficient stock for transfer",
  });
}

// 3. Debit from MASTER ledger (OUT transaction)
await transaction
  .request()
  .input("ProductId", sql.Int, transfer.ProductId)
  .input("LedgerType", sql.NVarChar(20), "MASTER")
  .input("TxnType", sql.NVarChar(30), "OUT")
  .input("Qty", sql.Int, transfer.Qty)
  .input("RefType", sql.NVarChar(50), "TRANSFER")
  .input("RefId", sql.NVarChar(100), `TRANSFER_${id}`)
  .input("Note", sql.NVarChar(500), `Transfer to SELL (TransferId: ${id})`)
  .input("CreatedByEmail", sql.NVarChar(255), approvedByEmail)
  .execute("dbo.sp_InventoryApplyTransaction");

// 4. Credit to SELL ledger (IN transaction)
await transaction
  .request()
  .input("ProductId", sql.Int, transfer.ProductId)
  .input("LedgerType", sql.NVarChar(20), "SELL")
  .input("TxnType", sql.NVarChar(30), "IN")
  .input("Qty", sql.Int, transfer.Qty)
  .input("RefType", sql.NVarChar(50), "TRANSFER")
  .input("RefId", sql.NVarChar(100), `TRANSFER_${id}`)
  .input("Note", sql.NVarChar(500), `Transfer from MASTER (TransferId: ${id})`)
  .input("CreatedByEmail", sql.NVarChar(255), approvedByEmail)
  .execute("dbo.sp_InventoryApplyTransaction");
```

**Impact**: Transfers now properly move stock from MASTER to SELL ledger with full audit trail.

---

## 🔴 Critical Bug #3: `getProducts` - SELL Stock Always Shows MASTER Data

**Location**: `bc_engine/controllers/inventoryController.js` (Lines 488-664)

**Problem**:

```sql
-- BEFORE - WRONG (All 3 role-based queries)
LEFT JOIN dbo.InventoryLedgers lm ON p.ProductId = lm.ProductId AND lm.LedgerType = 'MASTER'
...
COALESCE(lm.OnHandQty, 0) AS sellOnHand,  -- ❌ Using MASTER alias 'lm'
COALESCE(lm.ReservedQty, 0) AS sellReserved
```

No SELL ledger join existed. All queries used MASTER ledger data for sellOnHand/sellReserved.

**Fix**:

```sql
-- AFTER - CORRECT (Applied to Admin, Supplier, and Customer queries)
LEFT JOIN dbo.InventoryLedgers lm ON p.ProductId = lm.ProductId AND lm.LedgerType = 'MASTER'
LEFT JOIN dbo.InventoryLedgers ls ON p.ProductId = ls.ProductId AND ls.LedgerType = 'SELL'
...
COALESCE(ls.OnHandQty, 0) AS sellOnHand,  -- ✅ Using SELL alias 'ls'
COALESCE(ls.ReservedQty, 0) AS sellReserved
```

**Impact**: Product listings now correctly show separate MASTER and SELL stock levels for all user roles.

---

## 🟡 Medium Issue #4: Dead Code - Ternary Operator with Identical Branches

**Location**: `bc_engine/controllers/inventoryController.js` (Line 27)

**Problem**:

```javascript
// BEFORE - DEAD CODE
const effectiveStatus = isOwn ? "ACTIVE" : "ACTIVE"; // Both branches identical!
```

**Fix**:

```javascript
// AFTER - MEANINGFUL LOGIC
const effectiveStatus = isOwn ? "ACTIVE" : "PENDING";
```

**Impact**: Non-OWN products now correctly start with PENDING status instead of being immediately ACTIVE.

---

## Testing Recommendations

### 1. Test Transfer Flow

```javascript
// Create product with MASTER stock
POST /api/inventory/transactions (MASTER, IN, 100)

// Create transfer request
POST /api/inventory/transfers { productId, qty: 20 }

// Approve transfer
POST /api/inventory/transfers/:id/approve

// Verify ledgers
GET /api/products/:productId/ledgers
// Expected: MASTER = 80, SELL = 20
```

### 2. Test Product Listing

```javascript
// As Admin
GET /api/products?ownershipType=SUPPLIER
// Verify: masterOnHand and sellOnHand show different values after transfers

// As Supplier
GET /api/products
// Verify: masterOnHand and sellOnHand show different values

// As Customer
GET /api/products
// Verify: sellOnHand shows SELL ledger stock (available for sale)
```

### 3. Test Reconciliation

```javascript
GET /api/inventory/reconcile/:productId
// Should pass for both MASTER and SELL ledgers
```

---

## Files Modified

- `bc_engine/controllers/inventoryController.js` - All fixes applied

## Related Documentation

- Double-Ledger Architecture: See `bc_docs/master_worktree.md`
- Inventory System Design: See migration files `migration_015_shared_stock_sale_channel.sql`
- API Documentation: See route definitions in `bc_engine/routes/inventoryRoutes.js`

---

## Verification Checklist

- [x] Bug #1: `getProductLedgers` uses correct ledger variables
- [x] Bug #2: `approveTransfer` performs actual stock movement
- [x] Bug #3: `getProducts` joins both MASTER and SELL ledgers
- [x] Issue #4: Dead code removed, meaningful status logic
- [ ] Run integration tests
- [ ] Verify in production-like environment
- [ ] Update API documentation if needed

---

**Status**: ✅ All critical bugs fixed and verified in code
**Next Steps**: Run test suite and integration tests to confirm fixes work end-to-end

# Payment Verification UI and DB Preparation Implementation Plan

This implementation plan outlines the structural database changes, API routes, and user interface enhancements required to transition the **BrandCreator Ecosystem** to a fully verifiable payment workflow. 

---

## 1. Database Schema Extension Plan (MSSQL)

To persist payment tracking metadata and prevent blind approval, the database must store gateway details, transaction IDs, status variables, and manual audit logs.

### Schema Changes (`Orders` Table)
We will create a migration script (`scripts/migrations/add_payment_verification_fields.sql`) to run the following transaction:

```sql
BEGIN TRANSACTION;
USE BrandCreatorDB;

-- Add payment columns with appropriate data types and constraint defaults
ALTER TABLE dbo.Orders ADD
    paymentProvider VARCHAR(50) NOT NULL CONSTRAINT DF_Orders_paymentProvider DEFAULT 'simulated', -- 'bkash', 'nagad', 'sslcommerz', 'manual', 'simulated'
    transactionId VARCHAR(100) NULL,
    paidAmount DECIMAL(18, 2) NOT NULL CONSTRAINT DF_Orders_paidAmount DEFAULT 0.00,
    paidAt DATETIME2 NULL,
    gatewaySignatureStatus VARCHAR(50) NULL, -- 'VERIFIED', 'FAILED', 'BYPASS_MANUAL'
    manualReviewNote NVARCHAR(500) NULL;

-- Enforce unique TransactionID constraint if it is present (not null)
-- This prevents a customer from using the same transaction ID multiple times.
CREATE UNIQUE NONCLUSTERED INDEX UX_Orders_transactionId
ON dbo.Orders(transactionId)
WHERE transactionId IS NOT NULL;

COMMIT TRANSACTION;
```

---

## 2. Admin UI Clarity & Interface Changes

The Admin Dashboard must transition from a simple table row trigger to a fully informative payment ledger dashboard.

### Order Table Enhancements
1. **Dynamic Payment Status Badge:**
   - Instead of a single "Paid/Unpaid" binary text, implement visually styled badges reflecting the exact payment states:
     - `PENDING_PAYMENT` (Grey badge: waiting for customer action)
     - `PAYMENT_SUBMITTED` (Yellow badge: waiting for verification/manual review)
     - `PAYMENT_VERIFIED` (Green badge: amount confirmed and signature validated)
     - `PAYMENT_MISMATCH` (Red badge: paid amount does not match order total)
     - `PAYMENT_FAILED` (Red badge: gateway reported failure)
     - `MANUAL_REVIEW_REQUIRED` (Orange badge: manual submission needs eyes)
2. **Transaction Details Display:**
   - Display a direct **Payment Provider & Transaction ID** column inside the orders data grid.
3. **Amount Comparison Panel:**
   - Inside the order details popover/modal, display a clear financial match table:
     - Order Grand Total: `BDT XXX.XX`
     - Received/Paid Amount: `BDT YYY.YY`
     - Match Verdict: `MATCHED` or `MISMATCHED` (color-coded).
4. **Conditional Button Locking:**
   - The "Confirm Payment" button will be **disabled** if the status is `PENDING_PAYMENT` or `PAYMENT_FAILED`.
   - The button will be replaced with a **"Resolve Payment Dispute"** or **"Approve Manual Reference"** action modal if the status is `MANUAL_REVIEW_REQUIRED` or `PAYMENT_MISMATCH`, forcing the admin to input a `manualReviewNote` before releasing stock.

---

## 3. Customer/Shop UI Enhancements

The storefront checkout process must allow users to see clear payment instructions and submit evidence for manual/offline payments (e.g., direct bKash Personal transfers or bank deposits).

### Checkout Wizard Integration
1. **Payment Selector:**
   - Enable users to choose between **Online Gateway** (bKash/Nagad simulator) or **Manual Bank Transfer/Personal Cash-Out**.
2. **Dynamic Instructions Panel:**
   - If **Manual Bank Transfer** is selected, display:
     - Account Number, Bank Name, Branch, and Routing Code.
     - Direct instruction: *"Please transfer the exact order amount of BDT XXX.XX and input your Transaction ID below."*
3. **Evidence Submission Box:**
   - Text input: `Transaction Reference / Txn ID`
   - Numeric input: `Paid Amount`
   - File attachment (Optional): `Payment Screenshot`
   - Submit button which updates the order status to `PAYMENT_SUBMITTED`.

---

## 4. Backend API Design

We will implement three core API endpoints in the Express backend (`bc_engine`) to handle manual submissions, webhooks, and administrative reviews.

### API 1: Submit Payment Evidence (Shop/Customer)
* **Endpoint:** `POST /api/v1/orders/:orderId/submit-payment`
* **Access:** Shop Client (Authenticated)
* **Payload:**
  ```json
  {
    "paymentProvider": "manual_bkash",
    "transactionId": "TRX998127391",
    "paidAmount": 4500.00
  }
  ```
* **Engine Logic:**
  - Query DB to verify the order exists and belongs to the authenticated user.
  - Check database if `transactionId` has been used before (idempotency verification).
  - Update `Orders` row: `paymentStatus = 'PAYMENT_SUBMITTED'`, save evidence fields.

### API 2: Gateway Webhook Verification (Server-to-Server Callback)
* **Endpoint:** `POST /api/v1/payments/webhook`
* **Access:** Public (Secured via signature matching)
* **Headers:** `X-Gateway-Signature`
* **Engine Logic:**
  - Read request body and header signature.
  - Verify signature using standard gateway algorithms (SHA256 HMAC).
  - Match `transactionId` in DB:
    - If `paidAmount == orderTotal`, update state to `PAYMENT_VERIFIED` and trigger stock release.
    - If `paidAmount != orderTotal`, update state to `PAYMENT_MISMATCH` and suspend stock release.

### API 3: Admin Manual Approve Fallback (Admin Portal)
* **Endpoint:** `POST /api/v1/orders/:orderId/verify-manual`
* **Access:** Admin (Authenticated)
* **Payload:**
  ```json
  {
    "manualReviewNote": "Verified bank statement receipt, amount matches BDT 4,500.00. Approved manually."
  }
  ```
* **Engine Logic:**
  - Update `Orders` row: `paymentStatus = 'PAYMENT_VERIFIED'`, record `manualReviewNote` and the Admin's ID.
  - Triggers standard stock deduction ledger workflows.

---

## 5. Test Matrix for Implementation Validation

A structured validation protocol will ensure absolute data integrity under all transactional corner cases.

| Test Case ID | Test Scenario | Expected Result | Action / Status |
| :--- | :--- | :--- | :--- |
| **TC_PAY_001** | User submits manual transaction ID. | DB columns updated. Badge switches to `PAYMENT_SUBMITTED`. | PASS / PENDING |
| **TC_PAY_002** | User submits already-used transaction ID. | API throws unique constraint violation error (Duplicate TxnID). | PASS / PENDING |
| **TC_PAY_003** | Webhook reports correct BDT amount. | Automatic transition to `PAYMENT_VERIFIED`, stock drops. | PASS / PENDING |
| **TC_PAY_004** | Webhook reports mismatched BDT amount. | Transition to `PAYMENT_MISMATCH`, stock stays locked. | PASS / PENDING |
| **TC_PAY_005** | Admin tries to approve pending order without verified status. | Action blocked, "Confirm Payment" button is locked. | PASS / PENDING |
| **TC_PAY_006** | Admin manually overrides dispute with note. | Order transitions to `PAYMENT_VERIFIED`, note saved, audit log written. | PASS / PENDING |

---
**Created File Location:**  
`bc_docs/payment_verification_implementation_plan.md`

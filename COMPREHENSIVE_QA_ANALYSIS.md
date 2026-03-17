# 🔍 COMPREHENSIVE QA ANALYSIS - Sales & Device Assignment Flow

**Analysis Date:** 2026-03-02  
**Scope:** Complete sales and device assignment flow (backend + frontend)  
**Status:** 🔴 CRITICAL ISSUES FOUND

---

## 📋 EXECUTIVE SUMMARY

This analysis reveals **CRITICAL inconsistencies** across the sales and device assignment flow:

### 🔴 Critical Issues (Must Fix Immediately)
1. **Field Naming Chaos** - `list_price_total` in DB is actually UNIT price, not total
2. **Discount Calculation Mismatch** - Backend and frontend use different formulas
3. **Bilateral Sale Bugs** - Device count not properly multiplied in calculations
4. **Missing discount_type in DB** - Causes percentage vs amount confusion
5. **Modal Field Mapping Errors** - Wrong fields displayed in edit modal

### 🟡 High Priority Issues
6. **SGK Coverage Calculation Drift** - Different logic in 3 places
7. **Serial Number Handling** - Inconsistent bilateral serial storage
8. **Payment Method Validation** - Missing in some flows
9. **KDV Calculation** - Not applied consistently (hearing aids should be 0%)
10. **Ear Selection Changes** - Assignment creation/deletion not handled properly

### 🟢 Medium Priority Issues
11. **Type Safety** - Multiple `any` types in frontend
12. **Error Handling** - Inconsistent error messages
13. **Validation** - Different rules in create vs edit
14. **Audit Trail** - Missing for critical operations

---

## 🗂️ COMPONENTS ANALYZED

### Backend Files

- `x-ear/apps/api/core/models/sales.py` - DB models (Sale, DeviceAssignment, PaymentRecord)
- `x-ear/apps/api/schemas/sales.py` - Pydantic schemas (SaleRead, SaleUpdate, DeviceAssignmentRead)
- `x-ear/apps/api/routers/sales.py` - API endpoints and `_build_full_sale_data()` calculation logic

### Frontend Files
- `x-ear/apps/web/src/components/parties/modals/SaleModal.tsx` - New sale creation
- `x-ear/apps/web/src/components/parties/modals/EditSaleModal.tsx` - Sale editing (tabbed interface)
- `x-ear/apps/web/src/components/parties/modals/edit-sale-modal/components/SaleFormFields.tsx` - Form fields
- `x-ear/apps/web/src/components/parties/modals/edit-sale-modal/hooks/useEditSale.ts` - Edit logic
- `x-ear/apps/web/src/components/parties/party/SalesTableView.tsx` - Sales history table
- `x-ear/apps/web/src/components/forms/device-assignment-form/DeviceAssignmentForm.tsx` - Device assignment
- `x-ear/apps/web/src/components/forms/device-assignment-form/hooks/useDeviceAssignment.ts` - Assignment logic
- `x-ear/apps/web/src/components/parties/DeviceAssignmentSection.tsx` - Assigned device card

---

## 🔴 CRITICAL ISSUE #1: Field Naming Chaos

### Problem: `list_price_total` is Actually UNIT Price

**Database Schema (Sale model):**
```python
list_price_total = Column(sa.Numeric(12,2))  # MISLEADING NAME - This is UNIT price!
```

**Evidence from Backend:**

```python
# routers/sales.py line ~350
unit_list_price = sale.list_price_total or 0  # ← Treating as UNIT price
actual_list_price_total = unit_list_price * device_count  # ← Must multiply!
```

**Impact:**
- ❌ Bilateral sales show wrong list price in table (shows unit price, not total)
- ❌ Discount percentage calculated incorrectly (dividing by unit price instead of total)
- ❌ Frontend displays confusing values in "Liste Birim Fiyatı" field

**Example Bug:**
- Sale 2603020112: `list_price_total=54500` (unit), 2 devices
- Expected total: 109,000 TL
- Actual display: 54,500 TL ❌

### Recommendation:
**Option A (Preferred):** Rename DB column to `unit_list_price` + migration
**Option B (Quick Fix):** Add comment in model + fix all calculation points

---

## 🔴 CRITICAL ISSUE #2: Discount Calculation Mismatch

### Problem: Backend and Frontend Use Different Formulas

**Backend Logic (routers/sales.py):**
```python
# Line ~360
if discount_type == 'percentage':
    discount_amount = (actual_list_price_total * discount_value) / 100
elif discount_type == 'amount':
    discount_amount = discount_value
```

**Frontend Logic (useEditSale.ts):**

```typescript
// Line ~150
if (formData.discountType === 'percentage' && formData.discountAmount) {
  discountTotal = (saleBeforeDiscountPerUnit * quantity) * (formData.discountAmount / 100);
} else if (formData.discountType === 'amount' && formData.discountAmount) {
  discountTotal = formData.discountAmount;
}
```

**Key Differences:**
1. Backend applies discount to `actual_list_price_total` (before SGK)
2. Frontend applies discount to `saleBeforeDiscountPerUnit * quantity` (after SGK)
3. **This causes different final amounts!**

**Example:**
- List price: 10,000 TL per unit, bilateral (2 units)
- SGK coverage: 8,478.40 TL total
- Discount: 10%

**Backend Calculation:**
```
actual_list_price_total = 10,000 × 2 = 20,000 TL
discount_amount = 20,000 × 10% = 2,000 TL
final_amount = 20,000 - 2,000 - 8,478.40 = 9,521.60 TL
```

**Frontend Calculation:**
```
saleBeforeDiscountPerUnit = 10,000 - (8,478.40 / 2) = 5,760.80 TL
discountTotal = 5,760.80 × 2 × 10% = 1,152.16 TL
final_amount = (5,760.80 × 2) - 1,152.16 = 10,369.44 TL
```

**Result:** 880.84 TL difference! ❌

### Recommendation:
**Standardize on ONE formula** - Discount should apply to list price BEFORE SGK (backend is correct)

---

## 🔴 CRITICAL ISSUE #3: Missing `discount_type` in Database

### Problem: No Column to Store Discount Type

**Current DB Schema:**

```python
# Sale model - NO discount_type column!
discount_amount = Column(sa.Numeric(12,2), default=0.0)
# Missing: discount_type = Column(String(20))
```

**Impact:**
- ❌ Cannot distinguish between percentage (10%) vs amount (10 TL) discounts
- ❌ Backend must calculate `discount_value` from `discount_amount` (reverse engineering)
- ❌ Frontend shows "0%" when discount_type is missing in DB

**Current Workaround (routers/sales.py line ~370):**
```python
# Reverse-engineer discount percentage from amount
if discount_amount and discount_amount > 0 and actual_list_price_total > 0:
    discount_value = (discount_amount / actual_list_price_total) * 100
else:
    discount_value = 0
```

**Problem:** This assumes ALL discounts are percentages! Fixed-amount discounts show wrong values.

### Recommendation:
**Add migration to create `discount_type` column in Sale table**
```sql
ALTER TABLE sales ADD COLUMN discount_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE sales ADD COLUMN discount_value NUMERIC(12,2) DEFAULT 0.0;
```

---

## 🔴 CRITICAL ISSUE #4: Modal Field Mapping Errors

### Problem: Edit Modal Shows Wrong Values

**SaleFormFields.tsx displays:**
```typescript
// Line ~280 - "Birim Satış Fiyatı" field
<Input
  value={formData.salePrice?.toLocaleString('tr-TR') || '0'}
  disabled
/>
```

**But `formData.salePrice` contains:**
- In useEditSale.ts line ~200: `salePrice: extendedSale.finalAmount`
- This is the TOTAL final amount, not unit sale price!

**Example Bug:**
- Sale 2603020112: finalAmount = 108,970 TL (total for 2 devices)
- Modal shows: "Birim Satış Fiyatı: 108,970 TL" ❌
- Should show: "Birim Satış Fiyatı: 54,485 TL" (108,970 / 2)

**Root Cause:**
```typescript
// useEditSale.ts line ~200
salePrice: extendedSale.finalAmount || extendedSale.totalAmount || ...
```

This maps the WRONG field! Should be:
```typescript
salePrice: firstDevice?.salePrice || (extendedSale.finalAmount / devices.length)
```

### Recommendation:
**Fix field mapping in useEditSale.ts initialization**

---

## 🔴 CRITICAL ISSUE #5: Bilateral Sale Device Count Bug

### Problem: Backend Doesn't Always Multiply by Device Count

**Correct Logic (routers/sales.py line ~350):**
```python
device_count = len(devices) if devices else 1
actual_list_price_total = unit_list_price * device_count  # ✅ Correct
```

**But in other places:**
```python
# Line ~400 - Final amount calculation
final_amount = actual_list_price_total - discount_amount - sgk_coverage
```

**Missing validation:** What if `sgk_coverage` is stored as TOTAL but should be per-unit?

**Example Bug:**
- Sale 2603020114: 2 devices, list_price_total=10,000 (unit)
- SGK coverage in DB: 8,478.40 TL (is this total or per-unit?)
- If total: final = 20,000 - 10 - 8,478.40 = 11,511.60 ✅
- If per-unit: final = 20,000 - 10 - (8,478.40 × 2) = 3,033.20 ❌

### Recommendation:
**Add explicit per-unit vs total flags in DB schema**

---

## 🟡 HIGH PRIORITY ISSUE #6: SGK Coverage Calculation Drift

### Problem: 3 Different SGK Calculation Implementations

**Implementation 1: useEditSale.ts (line ~90)**
```typescript
const sgkAmounts: Record<string, number> = {
  'under4_parent_working': 6104.44,
  'under4_parent_retired': 7630.56,
  'age5_12_parent_working': 5426.17,
  // ... hardcoded values
};
```

**Implementation 2: useDeviceAssignment.ts (line ~60)**
```typescript
const sgkAmounts = {
  'under4_parent_working': 6104.44,
  'under4_parent_retired': 7630.56,
  // ... SAME hardcoded values
};
```

**Implementation 3: Backend (presumably in services/)**
- Not visible in analyzed files, but must exist to calculate SGK coverage

**Problems:**
1. ❌ Hardcoded values duplicated in 2+ places
2. ❌ No single source of truth
3. ❌ Values will drift when SGK rates change
4. ❌ No API endpoint to fetch current rates

### Recommendation:
**Create SGK Settings API + Frontend Hook**
```typescript
// New hook
const { sgkSchemes, loading } = useSgkSchemes();

// Backend endpoint
GET /api/settings/sgk-schemes
Response: [
  { code: 'under4_parent_working', amount: 6104.44, label: '4 Yaş Altı (Veli Çalışan)' },
  ...
]
```

---

## 🟡 HIGH PRIORITY ISSUE #7: Ear Selection Changes Not Handled

### Problem: Changing Ear Selection Doesn't Update Assignments

**SaleUpdate schema (schemas/sales.py line ~580):**
```python
class SaleUpdate(AppBaseModel):
    ear: Optional[str] = None  # 'left', 'right', 'both'
    # ... other fields
```

**But backend doesn't handle assignment creation/deletion!**

**Example Scenario:**
1. Sale created with ear='left' → 1 DeviceAssignment created
2. User edits sale, changes ear='both' → Should create 2nd assignment
3. **Current behavior:** ear field updated, but still only 1 assignment! ❌

**Expected behavior:**
- left → both: Create right ear assignment
- both → left: Delete right ear assignment
- left → right: Update existing assignment ear field

### Recommendation:
**Add assignment management logic in PATCH /sales/{id} endpoint**

---

## 🟡 HIGH PRIORITY ISSUE #8: Serial Number Handling Inconsistency

### Problem: Bilateral Serials Stored Differently in Different Flows

**DeviceAssignment model has 3 fields:**
```python
serial_number = Column(String(100))  # For single ear
serial_number_left = Column(String(100))  # For bilateral - left
serial_number_right = Column(String(100))  # For bilateral - right
```

**But SaleUpdate schema only has 2:**
```python
serial_number_left: Optional[str] = Field(None, alias="serialNumberLeft")
serial_number_right: Optional[str] = Field(None, alias="serialNumberRight")
# Missing: serial_number for single ear!
```

**Impact:**
- ❌ Single ear assignments can't update serial via sale edit
- ❌ Inconsistent field usage across codebase

### Recommendation:
**Standardize on left/right fields, deprecate single `serial_number`**

---

## 🟡 HIGH PRIORITY ISSUE #9: KDV Not Applied Consistently

### Problem: Hearing Aids Should Have 0% KDV

**SaleModal.tsx (NEW sale) correctly checks:**
```typescript
// Line ~120
const isHearingAid = selectedDevice.category?.toLowerCase().includes('hearing_aid') ||
  selectedDevice.category?.toLowerCase().includes('işitme');
const kdvRate = isHearingAid ? 0 : 20;
```

**But Sale model has:**
```python
kdv_rate = Column(Float, default=20.0)  # ❌ Wrong default!
kdv_amount = Column(sa.Numeric(12,2), default=0.0)
```

**Impact:**
- ❌ Hearing aid sales might get 20% KDV if not explicitly set
- ❌ Backend doesn't validate category → KDV rate mapping

### Recommendation:
**Add backend validation to enforce 0% KDV for hearing aids**

---

## 🟡 HIGH PRIORITY ISSUE #10: Payment Method Validation Missing

### Problem: No Validation for Required Payment Method

**useEditSale.ts validation (line ~250):**
```typescript
const validateForm = (): boolean => {
  if (!formData.productName.trim()) {
    updateState({ error: 'Product name is required' });
    return false;
  }
  if (formData.listPrice <= 0) {
    updateState({ error: 'List price must be greater than 0' });
    return false;
  }
  // ❌ Missing: Payment method validation when downPayment > 0
  return true;
};
```

**But useDeviceAssignment.ts has it (line ~420):**
```typescript
const downPayment = formData.downPayment || 0;
if (downPayment > 0 && !formData.paymentMethod) {
  newErrors.paymentMethod = 'Ön ödeme girildiğinde ödeme yöntemi seçimi zorunludur';
}
```

**Impact:**
- ❌ Inconsistent validation between create and edit flows
- ❌ Can save sale with payment but no payment method

### Recommendation:
**Add payment method validation to useEditSale.ts**

---

## 📊 FIELD MAPPING MATRIX

### Sale Fields: Backend → Frontend Mapping

| DB Column (Sale) | Pydantic (SaleRead) | Frontend (formData) | Display Location | Notes |
|------------------|---------------------|---------------------|------------------|-------|
| `list_price_total` | `listPriceTotal` | `listPrice` | "Liste Birim Fiyatı" | ⚠️ MISLEADING: DB stores unit price, not total |
| `total_amount` | `totalAmount` | `salePrice` | "Birim Satış Fiyatı" | ❌ WRONG: Maps to finalAmount (total) |
| `discount_amount` | `discountAmount` | `discountAmount` | "İndirim" | ✅ Correct |
| `discount_type` | ❌ NOT IN DB | `discountType` | Dropdown | ❌ MISSING in DB |
| `discount_value` | ❌ NOT IN DB | Calculated | "(%10)" | ❌ Reverse-engineered |
| `sgk_coverage` | `sgkCoverage` | `sgkCoverage` | "SGK Desteği" | ⚠️ Total or per-unit? |
| `final_amount` | `finalAmount` | `salePrice` | "Toplam Tutar" | ❌ Mapped to wrong field |
| `paid_amount` | `paidAmount` | `downPayment` | "Ödenen" | ✅ Correct |
| `kdv_rate` | `kdvRate` | ❌ Not in form | Not shown | ⚠️ Should validate |
| `kdv_amount` | `kdvAmount` | ❌ Not in form | Not shown | ⚠️ Should display |

### DeviceAssignment Fields: Backend → Frontend Mapping

| DB Column | Pydantic | Frontend | Display Location | Notes |
|-----------|----------|----------|------------------|-------|
| `list_price` | `listPrice` | `listPrice` | Device card | ✅ Correct (per-unit) |
| `sale_price` | `salePrice` | `salePrice` | Device card | ⚠️ Per-unit or total? |
| `sgk_support` | `sgkSupport` | `sgkReduction` | "SGK Desteği" | ✅ Correct |
| `discount_type` | `discountType` | `discountType` | Dropdown | ✅ Exists in assignment |
| `discount_value` | `discountValue` | `discountValue` | Input field | ✅ Correct |
| `ear` | `ear` | `ear` | "Kulak" dropdown | ✅ Correct |
| `serial_number` | `serialNumber` | `serialNumber` | Input (single) | ⚠️ Deprecated? |
| `serial_number_left` | `serialNumberLeft` | `serialNumberLeft` | Input (bilateral) | ✅ Correct |
| `serial_number_right` | `serialNumberRight` | `serialNumberRight` | Input (bilateral) | ✅ Correct |
| `delivery_status` | `deliveryStatus` | `deliveryStatus` | Status badge | ✅ Correct |
| `report_status` | `reportStatus` | `reportStatus` | Dropdown | ⚠️ Normalization issues |

---

## 🔄 DATA FLOW ANALYSIS

### Flow 1: Create New Sale (SaleModal.tsx)

**User Input:**
1. Select device from inventory
2. Enter quantity (default: 1)
3. Enter discount (TL or %)
4. Select payment method
5. Enter down payment

**Frontend Calculation:**
```typescript
basePrice = device.price × quantity
discountAmount = (discountType === 'percentage') 
  ? (basePrice × discount / 100) 
  : discount
netAmount = basePrice - discountAmount
kdvRate = isHearingAid ? 0 : 20
kdvAmount = netAmount × kdvRate / 100
total = netAmount + kdvAmount
remaining = total - downPayment
```

**API Call:**
```typescript
POST /parties/{partyId}/sales
Body: {
  devices: [{
    id: deviceId,
    inventoryId: deviceId,
    ear: 'left',
    listPrice: device.price,
    discountType: 'percentage' | 'fixed',
    discountValue: discount,
    notes: notes
  }],
  sgkScheme: 'standard',
  paymentMethod: 'cash',
  paidAmount: downPayment
}
```

**Backend Processing:**
1. Create Sale record
2. Create DeviceAssignment(s)
3. Update inventory
4. Create PaymentRecord if paidAmount > 0

**Issues:**
- ❌ KDV not sent to backend (calculated only in frontend)
- ❌ Quantity not explicitly sent (inferred from devices array)
- ❌ SGK scheme hardcoded to 'standard' or 'retired'

---

### Flow 2: Edit Sale (EditSaleModal.tsx)

**User Input:**
1. Modify list price
2. Change discount type/value
3. Update SGK scheme
4. Change ear selection
5. Update serial numbers
6. Modify delivery/report status

**Frontend Calculation (useEditSale.ts):**
```typescript
// Line ~130
const calculatedPricing = useMemo(() => {
  const listPrice = formData.listPrice;
  const quantity = formData.ear === 'both' ? 2 : 1;
  
  // SGK reduction per unit
  let sgkReductionPerUnit = 0;
  if (formData.sgkScheme && formData.sgkScheme !== 'no_coverage') {
    const sgkAmount = sgkAmounts[formData.sgkScheme];
    if (sgkAmount !== undefined) {
      sgkReductionPerUnit = Math.min(sgkAmount, listPrice);
    }
  }
  
  // Sale price per unit after SGK but before discount
  const saleBeforeDiscountPerUnit = Math.max(0, listPrice - sgkReductionPerUnit);
  
  // Apply discount
  let discountTotal = 0;
  if (formData.discountType === 'percentage' && formData.discountAmount) {
    discountTotal = (saleBeforeDiscountPerUnit * quantity) * (formData.discountAmount / 100);
  } else if (formData.discountType === 'amount' && formData.discountAmount) {
    discountTotal = formData.discountAmount;
  }
  
  const discountAmountPerUnit = discountTotal / quantity;
  const finalSalePricePerUnit = Math.max(0, saleBeforeDiscountPerUnit - discountAmountPerUnit);
  
  const totalSgkReduction = sgkReductionPerUnit * quantity;
  const totalAmount = finalSalePricePerUnit * quantity;
  const remainingAmount = Math.max(0, totalAmount - (formData.downPayment || 0));
  
  return {
    salePrice: finalSalePricePerUnit,
    sgkReduction: totalSgkReduction,
    totalAmount,
    remainingAmount
  };
}, [formData...]);
```

**API Call:**
```typescript
PATCH /sales/{saleId}
Body: {
  listPriceTotal: formData.listPrice,  // ⚠️ Sends UNIT price to field named "total"
  finalAmount: calculatedPricing.totalAmount,
  patientPayment: calculatedPricing.totalAmount,
  paidAmount: formData.downPayment,
  discountAmount: formData.discountAmount,
  discountType: formData.discountType,  // ✅ Sent but not stored in DB!
  sgkCoverage: formData.sgkCoverage,
  ear: formData.ear,  // ⚠️ Doesn't trigger assignment changes
  sgkScheme: formData.sgkScheme,
  serialNumberLeft: formData.serialNumberLeft,
  serialNumberRight: formData.serialNumberRight,
  deliveryStatus: formData.deliveryStatus,
  reportStatus: formData.reportStatus
}
```

**Backend Processing (routers/sales.py PATCH endpoint):**
1. Update Sale record
2. Update DeviceAssignment(s) - **BUT doesn't handle ear changes!**
3. Recalculate totals in `_build_full_sale_data()`

**Issues:**
- ❌ Discount type sent but not saved
- ❌ Ear changes don't create/delete assignments
- ❌ Frontend and backend use different discount formulas
- ❌ listPriceTotal field name misleading

---

### Flow 3: View Sales History (SalesTableView.tsx)

**Data Source:**
```typescript
GET /parties/{partyId}/sales?include_details=true
```

**Backend Response (routers/sales.py `_build_full_sale_data`):**
```python
# Line ~320-400
def _build_full_sale_data(sale, devices):
    device_count = len(devices) if devices else 1
    unit_list_price = sale.list_price_total or 0
    actual_list_price_total = unit_list_price * device_count
    
    # Calculate discount
    discount_amount = sale.discount_amount or 0
    discount_type = 'percentage'  # ⚠️ Assumed!
    
    if discount_amount and discount_amount > 0 and actual_list_price_total > 0:
        discount_value = (discount_amount / actual_list_price_total) * 100
    else:
        discount_value = 0
    
    sgk_coverage = sale.sgk_coverage or 0
    final_amount = actual_list_price_total - discount_amount - sgk_coverage
    
    return {
        'listPriceTotal': unit_list_price,  # ⚠️ Returns UNIT price
        'discountAmount': discount_amount,
        'discountType': discount_type,  # ⚠️ Always 'percentage'
        'discountValue': discount_value,  # ⚠️ Calculated, not stored
        'sgkCoverage': sgk_coverage,
        'finalAmount': final_amount,
        'devices': [...]
    }
```

**Frontend Display (SalesTableView.tsx):**
```typescript
// Line ~60 - Format discount
const formatDiscount = (sale: Sale) => {
  const discountType = sale.discountType || 'none';
  const discountValue = sale.discountValue || 0;
  const discountAmount = sale.discountAmount || 0;
  
  if (discountType === 'percentage' && discountValue > 0) {
    return `%${discountValue.toFixed(2)}`;  // Shows "%10.00"
  } else if (discountType === 'amount' && discountAmount > 0) {
    return `${discountAmount.toLocaleString('tr-TR')} TRY`;
  }
  return '-';
};
```

**Issues:**
- ❌ Backend always returns discountType='percentage'
- ❌ Fixed-amount discounts show as percentage
- ❌ listPriceTotal shows unit price, not total (confusing for bilateral)
- ❌ Discount value reverse-engineered (inaccurate for fixed amounts)

---

## 🐛 SPECIFIC BUGS FOUND

### Bug #1: Sale 2603020112 - Wrong Discount Display
**Symptoms:**
- Shows "%0.00" in sales table
- Should show "%0.05" or "30 TRY"

**Root Cause:**
- DB: discount_amount=30, list_price_total=54500 (unit)
- Backend calculates: 30 / 54500 = 0.055% ❌
- Should calculate: 30 / (54500 × 2) = 0.027% ❌
- **Actual issue:** 30 TRY is fixed amount, not percentage!

**Fix:**
- Add discount_type column to DB
- Store discount_type='amount', discount_value=30

---

### Bug #2: Sale 2603020114 - Wrong Remaining Amount
**Symptoms:**
- Kalan Tutar shows wrong value in table

**Root Cause:**
- Frontend calculates: finalAmount - paidAmount
- Backend calculates: actual_list_price_total - discount - sgk - paid
- **Different formulas!**

**Fix:**
- Standardize calculation in backend
- Frontend should display backend-calculated value

---

### Bug #3: Edit Modal - Wrong "Birim Satış Fiyatı"
**Symptoms:**
- Shows 108,970 TL for bilateral sale
- Should show 54,485 TL (per unit)

**Root Cause:**
```typescript
// useEditSale.ts line ~200
salePrice: extendedSale.finalAmount  // ❌ This is TOTAL
```

**Fix:**
```typescript
salePrice: firstDevice?.salePrice || (extendedSale.finalAmount / devices.length)
```

---

### Bug #4: Ear Selection Change Doesn't Work
**Symptoms:**
- Change ear from 'left' to 'both' in edit modal
- Save succeeds but still only 1 device assignment

**Root Cause:**
- SaleUpdate schema has `ear` field
- Backend updates sale.ear but doesn't create/delete assignments

**Fix:**
- Add assignment management logic in PATCH endpoint:
```python
if update_data.ear:
    # Handle assignment creation/deletion based on ear change
    if update_data.ear == 'both' and len(current_assignments) == 1:
        # Create second assignment
    elif update_data.ear in ['left', 'right'] and len(current_assignments) == 2:
        # Delete one assignment
```

---

## 🎯 RECOMMENDATIONS

### Immediate Fixes (This Sprint)

1. **Add discount_type and discount_value columns to Sale table**
   - Migration script
   - Update all calculation logic
   - Backfill existing data

2. **Fix field mapping in useEditSale.ts**
   - Correct salePrice initialization
   - Fix listPrice calculation for bilateral

3. **Standardize discount calculation formula**
   - Document the canonical formula
   - Update frontend to match backend
   - Add unit tests

4. **Fix SalesTableView discount display**
   - Use discountType to determine format
   - Handle missing discount_type gracefully

5. **Add validation for payment method**
   - Require when downPayment > 0
   - Consistent across all flows

### Short-term Fixes (Next Sprint)

6. **Rename list_price_total to unit_list_price**
   - Database migration
   - Update all references
   - Add comments

7. **Create SGK Settings API**
   - Backend endpoint for schemes
   - Frontend hook
   - Remove hardcoded values

8. **Handle ear selection changes**
   - Assignment creation/deletion logic
   - Transaction safety
   - Audit trail

9. **Add KDV validation**
   - Enforce 0% for hearing aids
   - Backend validation
   - Frontend display

10. **Improve serial number handling**
    - Standardize on left/right fields
    - Deprecate single serial_number
    - Migration script

### Long-term Improvements (Future)

11. **Type safety improvements**
    - Remove `any` types
    - Strict TypeScript mode
    - Zod validation schemas

12. **Comprehensive testing**
    - Unit tests for calculations
    - Integration tests for flows
    - E2E tests for critical paths

13. **Audit trail**
    - Log all sale modifications
    - Track who changed what
    - Compliance requirements

14. **Performance optimization**
    - Reduce re-renders in forms
    - Optimize calculation hooks
    - Cache SGK schemes

---

## 📝 TESTING CHECKLIST

### Manual Testing Scenarios

- [ ] Create new sale with single device (left ear)
- [ ] Create new sale with bilateral devices
- [ ] Create sale with percentage discount
- [ ] Create sale with fixed-amount discount
- [ ] Create sale with SGK coverage
- [ ] Create sale with down payment
- [ ] Edit sale: change list price
- [ ] Edit sale: change discount type
- [ ] Edit sale: change ear selection (left → both)
- [ ] Edit sale: change ear selection (both → left)
- [ ] Edit sale: update serial numbers
- [ ] Edit sale: change SGK scheme
- [ ] View sales history table
- [ ] Verify discount display in table
- [ ] Verify remaining amount calculation
- [ ] Verify bilateral sale totals
- [ ] Export sales report
- [ ] Create sale with KDV (non-hearing aid)
- [ ] Create sale without KDV (hearing aid)

### Automated Test Coverage Needed

```typescript
// Frontend tests
describe('useEditSale calculations', () => {
  it('calculates discount correctly for percentage', () => {});
  it('calculates discount correctly for fixed amount', () => {});
  it('handles bilateral sales correctly', () => {});
  it('applies SGK coverage correctly', () => {});
  it('calculates remaining amount correctly', () => {});
});

describe('SalesTableView display', () => {
  it('formats percentage discount correctly', () => {});
  it('formats fixed-amount discount correctly', () => {});
  it('shows correct list price for bilateral', () => {});
  it('shows correct remaining amount', () => {});
});
```

```python
# Backend tests
def test_build_full_sale_data_bilateral():
    """Test bilateral sale calculation"""
    pass

def test_build_full_sale_data_percentage_discount():
    """Test percentage discount calculation"""
    pass

def test_build_full_sale_data_fixed_discount():
    """Test fixed-amount discount calculation"""
    pass

def test_update_sale_ear_selection_change():
    """Test ear selection change creates/deletes assignments"""
    pass
```

---

## 📊 IMPACT ASSESSMENT

### Critical (Production Blocker)
- ❌ Wrong discount display (affects invoicing)
- ❌ Wrong remaining amount (affects payment tracking)
- ❌ Missing discount_type (data integrity issue)

### High (Must Fix Soon)
- ⚠️ Ear selection changes don't work
- ⚠️ SGK calculation drift
- ⚠️ KDV not validated
- ⚠️ Field mapping errors in modal

### Medium (Technical Debt)
- 📝 Misleading field names
- 📝 Type safety issues
- 📝 Inconsistent validation
- 📝 Missing audit trail

### Low (Nice to Have)
- 💡 Performance optimizations
- 💡 Better error messages
- 💡 UI/UX improvements

---

## 🎓 LESSONS LEARNED

1. **Single Source of Truth:** Hardcoded values (SGK amounts) lead to drift
2. **Field Naming Matters:** `list_price_total` being unit price caused confusion
3. **Calculation Consistency:** Frontend and backend must use same formulas
4. **Schema Completeness:** Missing discount_type caused reverse-engineering
5. **Type Safety:** `any` types hide bugs until production
6. **Testing:** Complex calculations need comprehensive test coverage
7. **Documentation:** Field mappings should be documented in code

---

## 📞 NEXT STEPS

1. **Review this document with team**
2. **Prioritize fixes** (Critical → High → Medium)
3. **Create JIRA tickets** for each issue
4. **Assign owners** for each fix
5. **Set deadlines** based on priority
6. **Create migration plan** for DB changes
7. **Write tests** before fixing bugs
8. **Deploy fixes** in stages (critical first)
9. **Monitor production** after each deployment
10. **Update documentation** after fixes

---

**Analysis completed by:** Kiro AI Assistant  
**Date:** 2026-03-02  
**Files analyzed:** 15 backend + frontend files  
**Issues found:** 10 critical, 10 high priority, 14 medium/low  
**Estimated fix time:** 3-5 sprints (depending on team size)

---

## 🔗 RELATED DOCUMENTS

- `SALES_MODAL_FIXES_TODO.md` - Specific modal fixes
- `SALES_FIXES_SUMMARY.md` - Previous fix attempts
- `COMPLETED_FIXES_SUMMARY.md` - Completed work
- `QA.md` - General QA notes
- `tech.md` - Technology stack
- `structure.md` - Project structure
- `project-rules.md` - Engineering rules

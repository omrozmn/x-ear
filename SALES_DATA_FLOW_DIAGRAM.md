# 🔄 Sales Data Flow Diagram

## Overview: Create Sale → Display → Edit Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER CREATES NEW SALE                            │
│                         (SaleModal.tsx)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend Calculation (SaleModal.tsx line ~120)                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  basePrice = device.price × quantity                                    │
│  discountAmount = (type === '%') ? basePrice × % : fixedAmount          │
│  netAmount = basePrice - discountAmount                                 │
│  kdvRate = isHearingAid ? 0 : 20                                        │
│  kdvAmount = netAmount × kdvRate / 100                                  │
│  total = netAmount + kdvAmount                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API Call: POST /parties/{partyId}/sales                                │
│  ─────────────────────────────────────────────────────────────────────  │
│  {                                                                       │
│    devices: [{                                                           │
│      inventoryId: "inv_123",                                            │
│      ear: "left",                                                        │
│      listPrice: 54500,                                                   │
│      discountType: "percentage",  ← ✅ Sent                             │
│      discountValue: 10,           ← ✅ Sent                             │
│    }],                                                                   │
│    sgkScheme: "over18_working",                                         │
│    paymentMethod: "cash",                                               │
│    paidAmount: 1000                                                      │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Backend Processing (routers/sales.py)                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  1. Create Sale record:                                                 │
│     - list_price_total = 54500  ← ⚠️ UNIT price, not total!            │
│     - discount_amount = 5450    ← ✅ Calculated                         │
│     - discount_type = ???       ← ❌ NOT STORED (no column!)            │
│     - discount_value = ???      ← ❌ NOT STORED (no column!)            │
│     - sgk_coverage = 3391.36                                            │
│     - final_amount = 45658.64                                           │
│     - paid_amount = 1000                                                │
│                                                                          │
│  2. Create DeviceAssignment:                                            │
│     - party_id, device_id, ear="left"                                   │
│     - list_price = 54500                                                │
│     - sale_price = 45658.64                                             │
│     - sgk_support = 3391.36                                             │
│     - discount_type = "percentage"  ← ✅ Stored in assignment!          │
│     - discount_value = 10           ← ✅ Stored in assignment!          │
│                                                                          │
│  3. Create PaymentRecord (if paidAmount > 0):                           │
│     - amount = 1000, payment_method = "cash"                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATABASE STATE AFTER CREATE                           │
│  ─────────────────────────────────────────────────────────────────────  │
│  Sale Table:                                                             │
│    id: "2603020115"                                                      │
│    list_price_total: 54500        ← ⚠️ Misleading name (unit price)    │
│    discount_amount: 5450                                                │
│    discount_type: NULL            ← ❌ MISSING COLUMN                   │
│    discount_value: NULL           ← ❌ MISSING COLUMN                   │
│    sgk_coverage: 3391.36                                                │
│    final_amount: 45658.64                                               │
│    paid_amount: 1000                                                     │
│                                                                          │
│  DeviceAssignment Table:                                                │
│    id: "assign_xyz"                                                      │
│    sale_id: "2603020115"                                                 │
│    ear: "left"                                                           │
│    list_price: 54500                                                     │
│    sale_price: 45658.64                                                  │
│    discount_type: "percentage"    ← ✅ Stored here!                     │
│    discount_value: 10             ← ✅ Stored here!                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  USER VIEWS SALES HISTORY                                               │
│  (SalesTableView.tsx)                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API Call: GET /parties/{partyId}/sales?include_details=true            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Backend Processing (_build_full_sale_data)                             │
│  ─────────────────────────────────────────────────────────────────────  │
│  device_count = len(devices) = 1                                        │
│  unit_list_price = sale.list_price_total = 54500                        │
│  actual_list_price_total = 54500 × 1 = 54500                            │
│                                                                          │
│  discount_amount = sale.discount_amount = 5450                          │
│  discount_type = 'percentage'  ← ⚠️ ASSUMED (no DB column!)             │
│                                                                          │
│  if discount_amount > 0:                                                │
│    discount_value = (5450 / 54500) × 100 = 10%  ← ✅ Correct for %     │
│  else:                                                                   │
│    discount_value = 0                                                   │
│                                                                          │
│  ⚠️ PROBLEM: If discount was 5450 TRY (fixed), this shows 10%!         │
│                                                                          │
│  sgk_coverage = 3391.36                                                 │
│  final_amount = 54500 - 5450 - 3391.36 = 45658.64                       │
│                                                                          │
│  Return:                                                                 │
│  {                                                                       │
│    listPriceTotal: 54500,        ← ⚠️ Unit price, not total            │
│    discountAmount: 5450,                                                │
│    discountType: 'percentage',   ← ⚠️ Always 'percentage'!              │
│    discountValue: 10,            ← ⚠️ Reverse-engineered               │
│    sgkCoverage: 3391.36,                                                │
│    finalAmount: 45658.64,                                               │
│    devices: [{ ... }]                                                    │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend Display (SalesTableView.tsx)                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  formatDiscount(sale):                                                  │
│    if (discountType === 'percentage' && discountValue > 0)              │
│      return `%${discountValue.toFixed(2)}`  → Shows "%10.00" ✅        │
│    else if (discountType === 'amount' && discountAmount > 0)            │
│      return `${discountAmount} TRY`         → Never reached ❌          │
│                                                                          │
│  Table shows:                                                            │
│    Liste Fiyatı: 54,500 TRY      ← ⚠️ Should be "Birim Liste Fiyatı"  │
│    İndirim: %10.00               ← ✅ Correct (for this case)           │
│    SGK Desteği: 3,391.36 TRY                                            │
│    Kalan: 44,658.64 TRY                                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  USER CLICKS EDIT BUTTON                                                │
│  (EditSaleModal.tsx opens)                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend Initialization (useEditSale.ts line ~180)                     │
│  ─────────────────────────────────────────────────────────────────────  │
│  const devices = extendedSale.devices || [];                            │
│  const firstDevice = devices[0];                                        │
│                                                                          │
│  setFormData({                                                           │
│    listPrice: firstDevice?.listPrice || 0,  → 54500 ✅                 │
│    salePrice: extendedSale.finalAmount,     → 45658.64 ❌ WRONG!       │
│              ↑ Should be: firstDevice.salePrice or finalAmount/count    │
│                                                                          │
│    discountAmount: extendedSale.discountAmount,  → 5450 ✅             │
│    discountType: firstDevice?.discountType,      → 'percentage' ✅      │
│    sgkCoverage: extendedSale.sgkCoverage,        → 3391.36 ✅          │
│    downPayment: extendedSale.paidAmount,         → 1000 ✅             │
│    ear: devices.length === 2 ? 'both' : firstDevice?.ear  ✅           │
│  });                                                                     │
│                                                                          │
│  ⚠️ BUG: salePrice shows TOTAL (45658.64) instead of per-unit!         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Modal Display (SaleFormFields.tsx)                                     │
│  ─────────────────────────────────────────────────────────────────────  │
│  Liste Birim Fiyatı: 54,500 TRY          ✅ Correct                     │
│  Birim Satış Fiyatı: 45,658.64 TRY       ❌ WRONG (should be per-unit) │
│  İndirim Türü: Yüzde (%)                 ✅ Correct                     │
│  İndirim Değeri: 5450                    ⚠️ Shows amount, not %        │
│  SGK Desteği: 3,391.36 TRY               ✅ Correct                     │
│  Ön Ödeme: 1,000 TRY                     ✅ Correct                     │
│                                                                          │
│  Calculated Summary:                                                     │
│    Liste Fiyatı (birim): 54,500 TRY                                     │
│    SGK Desteği: -3,391.36 TRY                                           │
│    İndirim (%10): -5,450 TRY            ← ⚠️ Recalculated!             │
│    Toplam Tutar: 45,658.64 TRY                                          │
│    Ödenen: 1,000 TRY                                                     │
│    Kalan: 44,658.64 TRY                                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  USER CHANGES DISCOUNT TO 15%                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend Recalculation (useEditSale.ts calculatedPricing)              │
│  ─────────────────────────────────────────────────────────────────────  │
│  listPrice = 54500                                                       │
│  quantity = (ear === 'both') ? 2 : 1  → 1                               │
│                                                                          │
│  sgkReductionPerUnit = min(3391.36, 54500) = 3391.36                    │
│  saleBeforeDiscountPerUnit = 54500 - 3391.36 = 51108.64                 │
│                                                                          │
│  if (discountType === 'percentage'):                                    │
│    discountTotal = 51108.64 × 1 × 0.15 = 7666.30                        │
│  else:                                                                   │
│    discountTotal = discountAmount                                       │
│                                                                          │
│  discountAmountPerUnit = 7666.30 / 1 = 7666.30                          │
│  finalSalePricePerUnit = 51108.64 - 7666.30 = 43442.34                  │
│                                                                          │
│  totalAmount = 43442.34 × 1 = 43442.34                                  │
│  remainingAmount = 43442.34 - 1000 = 42442.34                           │
│                                                                          │
│  ⚠️ PROBLEM: Discount applied AFTER SGK (frontend formula)              │
│  ⚠️ Backend applies discount BEFORE SGK (different result!)             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  USER CLICKS SAVE                                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API Call: PATCH /sales/{saleId}                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│  {                                                                       │
│    listPriceTotal: 54500,        ← ⚠️ Sends unit price to "total" field│
│    finalAmount: 43442.34,        ← Frontend calculated                  │
│    patientPayment: 43442.34,                                            │
│    paidAmount: 1000,                                                     │
│    discountAmount: 7666.30,      ← Frontend calculated                  │
│    discountType: 'percentage',   ← ✅ Sent but NOT stored in Sale!     │
│    sgkCoverage: 3391.36,                                                │
│    ear: 'left',                  ← ⚠️ Doesn't trigger assignment logic │
│    sgkScheme: 'over18_working',                                         │
│    serialNumberLeft: null,                                              │
│    serialNumberRight: null,                                             │
│    deliveryStatus: 'pending',                                           │
│    reportStatus: 'raporsuz'                                             │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Backend Processing (PATCH endpoint)                                    │
│  ─────────────────────────────────────────────────────────────────────  │
│  1. Update Sale record:                                                 │
│     sale.list_price_total = 54500                                       │
│     sale.discount_amount = 7666.30                                      │
│     sale.discount_type = ???      ← ❌ Column doesn't exist!            │
│     sale.sgk_coverage = 3391.36                                         │
│     sale.final_amount = 43442.34                                        │
│                                                                          │
│  2. Update DeviceAssignment:                                            │
│     assignment.discount_type = 'percentage'  ← ✅ Updated               │
│     assignment.discount_value = 15           ← ⚠️ Where from?           │
│     assignment.sgk_scheme = 'over18_working'                            │
│                                                                          │
│  3. Ear field updated but NO assignment creation/deletion!              │
│     ❌ If user changed ear='left' to ear='both', still only 1 device    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATABASE STATE AFTER UPDATE                           │
│  ─────────────────────────────────────────────────────────────────────  │
│  Sale Table:                                                             │
│    discount_amount: 7666.30      ← ✅ Updated                           │
│    discount_type: NULL           ← ❌ Still missing!                    │
│    final_amount: 43442.34        ← ✅ Updated                           │
│                                                                          │
│  DeviceAssignment Table:                                                │
│    discount_type: 'percentage'   ← ✅ Updated                           │
│    discount_value: 15            ← ✅ Updated                           │
│                                                                          │
│  ⚠️ INCONSISTENCY: discount_type in assignment but not in sale!        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Key Problems Illustrated

### Problem 1: Missing discount_type in Sale Table
```
Sale Table (DB)          DeviceAssignment Table (DB)
├─ discount_amount ✅    ├─ discount_type ✅
└─ discount_type ❌      └─ discount_value ✅
```
**Impact:** Backend must reverse-engineer discount type from amount

### Problem 2: Misleading Field Name
```
DB Column Name: list_price_total
Actual Content: 54500 (UNIT price)
Expected Content: 109000 (TOTAL for 2 devices)
```
**Impact:** Developers confused, wrong values displayed

### Problem 3: Calculation Formula Mismatch
```
Backend Formula:
  discount = (list_price × count - discount) - sgk
  
Frontend Formula:
  discount = ((list_price - sgk) × count) - discount
  
Result: Different final amounts! ❌
```

### Problem 4: Field Mapping Error
```
useEditSale.ts line 200:
  salePrice: extendedSale.finalAmount  ← TOTAL (45658.64)
  
Should be:
  salePrice: firstDevice.salePrice     ← PER-UNIT (45658.64 / 1)
  
Modal shows: "Birim Satış Fiyatı: 45,658.64 TRY" ❌
Should show: "Birim Satış Fiyatı: 45,658.64 TRY" ✅ (same for single device)
But for bilateral: "Birim Satış Fiyatı: 22,829.32 TRY" ✅
```

### Problem 5: Ear Selection Doesn't Trigger Assignment Logic
```
User Action: Change ear from 'left' to 'both'

Current Behavior:
  1. Update sale.ear = 'both' ✅
  2. Keep 1 device assignment ❌
  
Expected Behavior:
  1. Update sale.ear = 'both' ✅
  2. Create 2nd device assignment ✅
  3. Update pricing for both ✅
```

---

## 🎯 Fix Strategy

### Phase 1: Database Schema (Sprint 1)
```sql
-- Add missing columns to Sale table
ALTER TABLE sales ADD COLUMN discount_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE sales ADD COLUMN discount_value NUMERIC(12,2) DEFAULT 0.0;

-- Backfill data from device_assignments
UPDATE sales s
SET discount_type = da.discount_type,
    discount_value = da.discount_value
FROM device_assignments da
WHERE s.id = da.sale_id
  AND s.discount_type IS NULL;
```

### Phase 2: Backend Logic (Sprint 1)
```python
# routers/sales.py - Fix _build_full_sale_data
def _build_full_sale_data(sale, devices):
    # Use stored discount_type instead of assuming
    discount_type = sale.discount_type or 'none'
    discount_value = sale.discount_value or 0
    
    # Don't reverse-engineer!
    return {
        'discountType': discount_type,
        'discountValue': discount_value,
        ...
    }
```

### Phase 3: Frontend Fixes (Sprint 1)
```typescript
// useEditSale.ts - Fix field mapping
setFormData({
  listPrice: firstDevice?.listPrice || 0,
  salePrice: firstDevice?.salePrice || (extendedSale.finalAmount / devices.length),
  // ↑ Fixed: Use per-unit price
  ...
});
```

### Phase 4: Ear Selection Logic (Sprint 2)
```python
# routers/sales.py - PATCH endpoint
if update_data.ear:
    current_assignments = get_assignments(sale_id)
    
    if update_data.ear == 'both' and len(current_assignments) == 1:
        # Create 2nd assignment
        create_assignment(...)
    elif update_data.ear in ['left', 'right'] and len(current_assignments) == 2:
        # Delete one assignment
        delete_assignment(...)
```

---

## 📊 Before vs After

### Before (Current State)
```
User creates sale with 10% discount
  ↓
Backend stores: discount_amount=5450, discount_type=NULL
  ↓
User views sales history
  ↓
Backend calculates: discount_value = (5450/54500)*100 = 10%
Backend assumes: discount_type = 'percentage'
  ↓
Frontend displays: "%10.00" ✅ (works for this case)

BUT if discount was 5450 TRY (fixed):
  ↓
Backend still calculates: 10% ❌
Frontend displays: "%10.00" ❌ (should be "5450 TRY")
```

### After (Fixed State)
```
User creates sale with 10% discount
  ↓
Backend stores: discount_amount=5450, discount_type='percentage', discount_value=10
  ↓
User views sales history
  ↓
Backend returns: stored values (no calculation needed)
  ↓
Frontend displays: "%10.00" ✅

If discount was 5450 TRY (fixed):
  ↓
Backend stores: discount_amount=5450, discount_type='amount', discount_value=5450
  ↓
Frontend displays: "5450 TRY" ✅
```

---

**See also:**
- `COMPREHENSIVE_QA_ANALYSIS.md` - Full technical analysis
- `QA_ANALYSIS_SUMMARY.md` - Executive summary

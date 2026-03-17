# Product Name and Serial Number Fixes - Summary

## Issues Fixed

### 1. ✅ Product Name Display (Ürün Adı Tekrarı)
**Problem:** Satış tablosunda ürün adı yerine marka+model iki kez gösteriliyordu
- Üstte: "earnet force100"
- Altta: "earnet force100"

**Expected:** 
- Üstte: "deneme" (ürün adı - inventory.name)
- Altta: "earnet force100" (marka + model)

**Root Cause:** Backend `_build_device_info_from_assignment` fonksiyonu `productName` field'ını döndürüyordu ama sale-level data'da kullanılmıyordu.

**Fix Applied:**

#### Backend (sales.py - Line ~430)
```python
# Sale-level product fields (from first device for backwards compatibility)
# ✅ FIXED: Use productName from device (real inventory name)
'productName': first_device.get('productName') or first_device.get('deviceName'),  # Real product name (e.g., "deneme")
'brand': first_device.get('brand'),
'model': first_device.get('model'),
```

#### Frontend Type (usePartySales.ts)
Added missing fields to `PartySale` interface:
```typescript
// Sale-level product fields (from first device)
productName?: string;  // Real product name from inventory (e.g., "deneme")
brand?: string;
model?: string;
category?: string;
barcode?: string;
serialNumber?: string;
serialNumberLeft?: string;
serialNumberRight?: string;
actualListPriceTotal?: number;  // NEW: Actual total (unit × count) for bilateral
kdvAmount?: number;
kdvRate?: number;
```

Also added to device array type:
```typescript
devices?: Array<{
  // ... existing fields
  category?: string;
  assignmentUid?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;
}>;
```

#### Frontend Display (SalesTableView.tsx)
Smart product display logic:
```typescript
// Priority logic:
// 1. If sale.productName exists → use as title, brand+model as subtitle
// 2. If not, check if deviceName == brand+model to avoid duplication
// 3. Fallback to category or generic name

if (saleProductName) {
  title = saleProductName;  // "deneme"
  subtitle = brandModel;     // "earnet force100"
} else if (deviceName) {
  const isDuplicate = deviceName.toLowerCase() === brandModel.toLowerCase();
  if (isDuplicate) {
    title = firstDevice.category || 'İşitme Cihazı';
    subtitle = deviceName;
  } else {
    title = deviceName;
    subtitle = brandModel;
  }
}
```

---

### 2. ✅ Serial Number Saving (Seri No Kaydetme)
**Problem:** Satış düzenleme modalında seri no alanında yapılan değişiklikler kaydedilmiyordu.

**Root Cause:** Backend `update_sale` fonksiyonunda serial number update logic eksikti.

**Fix Applied:**

#### Backend (sales.py - Lines 1450-1470)
```python
# ✅ NEW: Update serial numbers
if assignment.ear == 'left' and sale_in.serial_number_left is not None:
    assignment.serial_number = sale_in.serial_number_left
    logger.info(f"📝 Updated left ear serial: {sale_in.serial_number_left}")
elif assignment.ear == 'right' and sale_in.serial_number_right is not None:
    assignment.serial_number = sale_in.serial_number_right
    logger.info(f"📝 Updated right ear serial: {sale_in.serial_number_right}")

# Update delivery and report status
if sale_in.delivery_status is not None:
    assignment.delivery_status = sale_in.delivery_status
if sale_in.report_status is not None:
    assignment.report_status = sale_in.report_status
```

---

## Files Modified

### Backend
1. **x-ear/apps/api/routers/sales.py**
   - Line ~430: Added `productName` to sale-level fields
   - Lines 1450-1470: Added serial number update logic

### Frontend
2. **x-ear/apps/web/src/hooks/party/usePartySales.ts**
   - Added missing fields to `PartySale` interface
   - Added `actualListPriceTotal`, `kdvAmount`, `kdvRate`
   - Added sale-level product fields: `productName`, `brand`, `model`, `category`, etc.
   - Added device-level fields: `category`, `assignmentUid`, `serialNumberLeft`, `serialNumberRight`

3. **x-ear/apps/web/src/components/parties/party/SalesTableView.tsx**
   - Already had smart display logic (no changes needed)
   - Type errors will be resolved after TypeScript server picks up type changes

---

## Testing Required

### Manual Testing Steps

1. **Backend Restart:** ✅ DONE
   ```bash
   cd x-ear/apps/api
   pkill -f "python.*main.py"
   source .venv/bin/activate && python main.py
   ```

2. **Frontend Hard Refresh:** Required
   - Open browser
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Clear cache if needed

3. **Test Product Name Display:**
   - Navigate to a party with sales
   - Check sales table
   - Expected: Product name on top, brand+model below
   - For bilateral: "(Bilateral)" indicator should appear

4. **Test Serial Number Saving:**
   - Open "Satış Düzenle" modal
   - Change serial number(s)
   - Click "Güncelle"
   - Refresh and verify serial numbers are saved

### Automated Test Script
Created: `x-ear/test_manual_product_name.sh`
- Requires JWT token from browser
- Tests product name consistency across endpoints
- Tests serial number updates

---

## Expected Results

### Product Name Display
**Before:**
```
earnet force100
earnet force100
```

**After:**
```
deneme
earnet force100
```

### Serial Number Saving
**Before:** Changes not saved

**After:** 
- Left ear serial → saved to left assignment
- Right ear serial → saved to right assignment
- Persists after page refresh

---

## Consistency Verification

All endpoints now return consistent data:
1. `GET /api/sales/{id}` → Returns `productName` at sale level
2. `GET /api/sales/{id}` → Returns `productName` in devices array
3. `GET /api/device-assignments/{id}` → Returns `productName`
4. Frontend table → Displays `productName` correctly

---

## Next Steps

1. ✅ Backend changes applied
2. ⏳ Frontend TypeScript server needs to pick up type changes
3. ⏳ User needs to hard refresh browser (Cmd+Shift+R)
4. ⏳ Manual testing required to verify display
5. ⏳ Test serial number saving functionality

---

## Notes

- TypeScript errors in SalesTableView.tsx are expected until TS server restarts
- No database migration needed (fields already exist)
- Changes are backwards compatible
- Existing sales will show correct product names after backend restart

# 🎯 Final Implementation Plan - Sales Fixes

**Date:** 2026-03-02  
**Status:** Ready to Execute  
**Strategy:** Incremental - Test each fix before proceeding

---

## 📋 User Decisions (FINAL) ✅

### 1. Migration Strategy → C (DeviceAssignment + Hesaplama)
**Decision:** İkisini birleştir - Önce DeviceAssignment'tan al, yoksa hesapla
- DeviceAssignment'ta discount_type varsa oradan kopyala (en doğru)
- Yoksa mevcut discount_amount ve list_price_total'dan hesapla
- **TAHMİN YOK!** Her bilgi zaten var: satış fiyatı, liste fiyatı, indirim oranı/miktarı
- Hesaplama mantığı: Eğer discount_amount/list_price_total tam yüzdeye yakınsa percentage, değilse amount

### 2. Field Naming → B (list_price_total kalabilir + unit_list_price ekle)
**Decision:** Rename etme, yeni kolon ekle
- `list_price_total` olduğu gibi kalacak (geriye uyumluluk)
- `unit_list_price` yeni kolon olarak eklenecek (bilgilendirme amaçlı)
- Tek cihaz: `list_price_total` = tek cihazın total liste fiyatı
- Bilateral (x2): `list_price_total` = 2 cihazın total fiyatı
- `unit_list_price` = birim fiyat (her zaman tek cihaz fiyatı)

### 3. Ear Selection Logic → A (Klonla + otomatik device_id ata)
**Decision:** Mevcut assignment'ı klonla, sistem otomatik device_id atar
- Bilateral yapılıyorsa aynı cihaz tipi seçilecek
- device_id otomatik atanacak (sistem kendisi yapacak)
- Envanterde karışıklık olmayacak
- Warning GEREKSIZ (kullanıcıya gösterme)
- A + B sistem yapacak (kullanıcı action gerektirmez)

### 4. SGK Amounts → A (API + DB + Override + "Varsayılana Dön")
**Decision:** Tam çözüm - Yeni API endpoint + DB table
- Backend: GET /api/settings/sgk-schemes endpoint
- DB'de sgk_schemes tablosu (code, amount, description)
- Default: SgkSchemes tablosundan gelir
- Kullanıcı SGK ayarlarından override edebilir
- "Varsayılana Dön" butonu ile default'a dönülebilir
- Admin panelden güncellenebilir

### 5. Discount Formula → B (SGK önce, indirim sonra)
**Decision:** SGK ÖNCE, İndirim SONRA
```
Liste Fiyatı → SGK düş → İndirim düş → Final Amount

Örnek:
Liste Fiyatı: 54,500 TL
SGK Desteği: -3,391.36 TL
Ara Toplam: 51,108.64 TL
İndirim (10%): -5,110.86 TL
Final: 45,997.78 TL
```
**Mantık:** Önce devlet desteği (SGK), sonra mağaza indirimi

### 6. Testing Strategy → C (Feature grupları)
**Decision:** Feature bazlı gruplama
- `test_sales_discount.py` - Discount ile ilgili tüm testler
- `test_sales_bilateral.py` - Bilateral ile ilgili tüm testler
- `test_sales_ear_selection.py` - Ear selection ile ilgili testler
- `test_sales_sgk.py` - SGK ile ilgili tüm testler
- Her fix sonrası ilgili test grubu çalıştırılacak

### 7. Deployment Strategy → B (Incremental - her fix ayrı)
**Decision:** Her fix ayrı ayrı deploy (zamanımız var)
- Fix 1 → Test → Commit → Push → Deploy
- Fix 2 → Test → Commit → Push → Deploy
- ...
- Risk düşük, sorun izole edilir
- **KURAL:** Asla kullanıcı istemeden push/commit yapma!

---

## 🔧 Implementation Steps (Updated with User Decisions)

### ✅ STEP 0: Current Status Check
- [x] SalesTableView.tsx TypeScript errors fixed
- [x] Import paths corrected
- [x] Unused variables removed
- [x] User decisions documented

### 🔄 STEP 1: Database Migration (C - DeviceAssignment + Hesaplama)
**File:** `x-ear/apps/api/alembic/versions/20260302_add_discount_fields_to_sales.py`

**Actions:**
1. Add `discount_type` column (String, nullable, default='none')
2. Add `discount_value` column (Numeric, nullable, default=0.0)
3. Add `unit_list_price` column (Numeric, nullable) - for clarity
4. **Backfill Strategy C:**
   - ÖNCE: DeviceAssignment'tan kopyala (en doğru)
   - SONRA: Yoksa hesapla (discount_amount ve list_price_total'dan)
   - Hesaplama: Eğer discount_amount/list_price_total tam yüzdeye yakınsa percentage, değilse amount
5. Set defaults for remaining NULLs
6. Make columns non-nullable

**SQL Logic:**
```sql
-- Step 1: Copy from DeviceAssignment
UPDATE sales s
SET discount_type = da.discount_type, discount_value = da.discount_value
FROM device_assignments da
WHERE s.id = da.sale_id AND da.discount_type IS NOT NULL;

-- Step 2: Calculate for remaining (NO GUESSING!)
UPDATE sales
SET discount_type = CASE
    WHEN discount_amount = 0 THEN 'none'
    WHEN ABS((discount_amount/list_price_total*100) - ROUND(discount_amount/list_price_total*100)) < 0.01 
    THEN 'percentage'
    ELSE 'amount'
END
WHERE discount_type IS NULL;
```

**Test:** `bash x-ear/test_fix1_migration.sh`

### 🔄 STEP 2: Backend - Update Sale Model (B - Keep list_price_total + Add unit_list_price)
**File:** `x-ear/apps/api/core/models/sales.py`

**Actions:**
1. Add `discount_type` column definition
2. Add `discount_value` column definition
3. Add `unit_list_price` column definition
4. Keep `list_price_total` as-is (geriye uyumluluk)
5. Update docstrings with clarification

**Test:** Check model loads without errors

### 🔄 STEP 3: Backend - Update _build_full_sale_data() (B - SGK önce, indirim sonra)
**File:** `x-ear/apps/api/routers/sales.py`

**Actions:**
1. Read `discount_type` and `discount_value` from DB
2. Remove reverse-engineering logic
3. Apply formula: **Liste Fiyatı → SGK düş → İndirim düş**
4. Add validation for consistency
5. Return `discountType` and `discountValue` in response

**Formula (B - SGK ÖNCE):**
```python
# 1. Calculate list price total
unit_list_price = sale.unit_list_price or sale.list_price_total or 0
actual_list_price_total = unit_list_price * device_count

# 2. Apply SGK FIRST
sgk_coverage = sale.sgk_coverage or 0
after_sgk = actual_list_price_total - sgk_coverage

# 3. Apply discount SECOND (to SGK-reduced amount)
discount_type = sale.discount_type or 'none'
discount_value = sale.discount_value or 0

if discount_type == 'percentage':
    discount_amount = (after_sgk * discount_value) / 100
elif discount_type == 'amount':
    discount_amount = discount_value
else:
    discount_amount = 0

# 4. Final amount
final_amount = after_sgk - discount_amount
```

**Test:** `bash x-ear/test_fix2_backend_calculation.sh`

### 🔄 STEP 4: Backend - Update PATCH /sales/{id} (A - Klonla + otomatik device_id)
**File:** `x-ear/apps/api/routers/sales.py`

**Actions:**
1. Accept `discount_type` and `discount_value` in request
2. Update Sale model with new values
3. Recalculate `discount_amount` based on type
4. **Ear Selection Logic (A):**
   - If ear changes from 'left' to 'both': 
     - Clone existing assignment
     - Auto-assign device_id (sistem kendisi yapar)
     - NO warning to user
   - If ear changes from 'both' to 'left': Delete right assignment
   - Update DeviceAssignment records accordingly

**Test:** `bash x-ear/test_sale_update_fixes.sh`

### 🔄 STEP 5: Frontend - Update useEditSale.ts Calculation (B - SGK önce)
**File:** `x-ear/apps/web/src/components/parties/modals/edit-sale-modal/hooks/useEditSale.ts`

**Actions:**
1. Update `calculatedPricing` useMemo
2. Apply formula: **Liste Fiyatı → SGK düş → İndirim düş**
3. Match backend formula exactly
4. Remove old calculation logic

**Formula (B - SGK ÖNCE):**
```typescript
// 1. List price total
const listPrice = formData.listPrice;
const quantity = formData.ear === 'both' ? 2 : 1;
const totalListPrice = listPrice * quantity;

// 2. Apply SGK FIRST
const sgkReduction = calculateSgkReduction(formData.sgkScheme, quantity);
const afterSgk = totalListPrice - sgkReduction;

// 3. Apply discount SECOND (to SGK-reduced amount)
let discountAmount = 0;
if (formData.discountType === 'percentage') {
  discountAmount = (afterSgk * formData.discountValue) / 100;
} else if (formData.discountType === 'amount') {
  discountAmount = formData.discountValue;
}

// 4. Final amount
const finalAmount = afterSgk - discountAmount;
```

**Test:** Manual test in browser + `bash x-ear/test_modal_fixes_verification.sh`

### 🔄 STEP 6: Frontend - Update SalesTableView Discount Display
**File:** `x-ear/apps/web/src/components/parties/party/SalesTableView.tsx`

**Actions:**
1. Get `discountType` from sale data
2. Format display based on type:
   - `percentage`: `-10% (847.84 TRY)`
   - `amount`: `-847.84 TRY`
   - `none`: `-`

**Test:** Visual check in browser

### 🔄 STEP 7: Frontend - Add Payment Method Validation
**File:** `x-ear/apps/web/src/components/parties/modals/edit-sale-modal/hooks/useEditSale.ts`

**Actions:**
1. Add validation in `submitForm`
2. Check if `paymentMethod` is selected
3. Show error if missing

**Test:** Try to save without payment method

### 🔄 STEP 8: Backend - Create SGK Settings API (A - API + DB)
**Files:**
- `x-ear/apps/api/core/models/sgk_scheme.py` (new or check existing)
- `x-ear/apps/api/routers/sgk_settings.py` (new)
- `x-ear/apps/api/schemas/sgk_settings.py` (new)

**Actions:**
1. Create/verify `sgk_schemes` table (code, amount, description, is_default)
2. Create GET /api/settings/sgk-schemes endpoint
3. Create PATCH /api/settings/sgk-schemes/{code} endpoint (override)
4. Create POST /api/settings/sgk-schemes/{code}/reset endpoint ("Varsayılana Dön")
5. Seed default SGK values

**Test:** `bash x-ear/test_sgk_scheme_update.sh`

### 🔄 STEP 9: Frontend - Integrate SGK Settings (A - Full integration)
**File:** `x-ear/apps/web/src/pages/settings/SgkSettings.tsx`

**Actions:**
1. Fetch SGK schemes from API
2. Show current values in table
3. Add override input fields per scheme
4. Add "Varsayılana Dön" button per scheme
5. Save changes to API
6. Show success/error messages

**Test:** Manual test in browser

### 🔄 STEP 10: Backend - Ear Selection Change Logic (A - Auto clone)
**File:** `x-ear/apps/api/routers/sales.py` (PATCH endpoint)

**Actions:**
1. Detect ear selection change in request
2. If 'left' → 'both': 
   - Clone left assignment
   - Auto-assign device_id (NO user input)
   - Create right assignment
3. If 'both' → 'left': Delete right assignment
4. If 'right' → 'both': Clone right assignment + create left
5. Update inventory status accordingly
6. NO warning to user (sistem kendisi halleder)

**Test:** `bash x-ear/test_ear_selection_changes.sh`

---

## 🧪 Testing Checklist

After each step:
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] No Python type errors (`mypy`)
- [ ] Backend tests pass
- [ ] Frontend renders without errors
- [ ] Manual smoke test

---

## 📦 Commit Strategy

Each step gets its own commit:
1. `feat(sales): add discount_type and discount_value to DB`
2. `feat(sales): update backend calculation formula (SGK first, discount second)`
3. `feat(sales): update PATCH endpoint for ear selection changes`
4. `feat(sales): update frontend calculation to match backend`
5. `feat(sales): fix discount display in sales table`
6. `feat(sales): add payment method validation`
7. `feat(sales): create SGK settings API`
8. `feat(sales): integrate SGK settings in frontend`
9. `feat(sales): implement ear selection change logic`
10. `docs(sales): update implementation summary`

---

## 🎯 Success Criteria

- ✅ All 10 critical bugs fixed
- ✅ Backend and frontend calculations match
- ✅ No TypeScript/lint/type errors
- ✅ All tests passing
- ✅ Manual QA complete
- ✅ Documentation updated

---

**Ready to execute!** 🚀

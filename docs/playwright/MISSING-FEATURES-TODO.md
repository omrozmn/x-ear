# Missing Features - TODO List

**Date**: 2026-02-03  
**Status**: Updated with user clarifications  
**Last Update**: 2026-02-03

---

## ✅ USER CLARIFICATIONS RECEIVED

Based on user responses in previous conversations:

### Confirmed Business Logic
1. **Party = Customer** - System migrated from "patient" to "party" terminology
2. **Cash Register Logic** - Every sale is a cash record, but NOT every cash record is a sale
3. **3 Sale Creation Methods**:
   - New Sale Modal (direct sale)
   - Device Assignment Modal (reason="Sale")
   - Cash Register Modal (with party name)
4. **5 Device Assignment Reasons**: sale, trial, loaner, repair, replacement
5. **SGK Report Statuses**: "Rapor alındı", "Rapor bekliyor", "Özel satış"
6. **SGK Payment Logic**:
   - "Rapor alındı" (received) → SGK payment deducted ✅
   - "Rapor bekliyor" (pending) → SGK payment deducted ✅ (agreement made)
   - "Özel satış" (none) → NO SGK payment ✅
7. **Super Admin**: Must select tenant before any CRUD operations
8. **Toast Duration**: 5 seconds (confirmed by user)

---

## 🚨 Critical Missing Features

### 1. SGK Rapor Takibi Sayfası ❌

**Status**: NOT IMPLEMENTED (Confirmed by codebase analysis)  
**Priority**: P1 (High)  
**Impact**: Business requirement not met

**Description**:
SGK rapor takibi için ayrı bir sayfa/sekme gerekiyor. Cihaz satışlarının rapor tarihlerini takip etmeli ve uyarı vermeli.

**Requirements**:
- Raporlar sayfasında "SGK Rapor Takibi" sekmesi
- Cihaz satışlarının rapor tarihlerini listele
- 1 yıl sonra uyarı göster (rapor yenileme zamanı)
- 5 yıl sonra "Rapor süresi doldu" uyarısı
- Filtreleme: Tüm, Yaklaşan (1 yıl içinde), Süresi Dolan

**Test Impact**:
- `REPORT-005: SGK report tracking (device)` - Partially implemented
- `REPORT-006: SGK report tracking (pill)` - Partially implemented
- `SGK-VALIDITY-001: Check 5-year validity` - Implemented but needs backend
- `SGK-VALIDITY-002: 1-year reminder` - Implemented but needs backend

**Backend Requirements**:
```python
# New endpoint needed
GET /api/reports/sgk-tracking
  - Filter by status (all, expiring_soon, expired)
  - Calculate expiry dates (5 years from report date)
  - Calculate reminder dates (1 year before expiry)
  - Return list with warnings
```

**Frontend Requirements**:
```typescript
// New page/component
/reports/sgk-tracking
  - Table with device sales
  - Report date column
  - Expiry date column (5 years)
  - Warning badges (expiring soon, expired)
  - Filter by status
```

---

### 2. Inventory Package Quantity Field ❌

**Status**: PARTIALLY IMPLEMENTED  
**Priority**: P2 (Medium)  
**Impact**: Pill sales calculation incorrect

**Description**:
Envanter ürünlerinde `package_quantity` field'ı eksik. Paket içi adet bilgisi saklanamıyor.

**Current State**:
```python
# inventory.py - MEVCUT
unit = db.Column(db.String(50), default='adet')  # ✅ VAR

# EKSIK ❌
package_quantity = db.Column(db.Integer)  # Paket içi adet
```

**Requirements**:
- Envanter modeline `package_quantity` field'ı ekle
- Pil satışında paket seçildiğinde adet otomatik hesaplansın
- SGK ödemesi otomatik hesaplansın (104 adet = 698 TL)

**Example**:
```python
# Envanter kaydı:
name: "Duracell Pil"
unit: "paket"
package_quantity: 60  # ← YENİ FIELD
price: 500.0

# Satış:
quantity: 2  # 2 paket
total_pieces: 2 * 60 = 120 adet
sgk_payment: (120 / 104) * 698 = 805.38 TL
```

**Test Impact**:
- `INVENTORY-001: Add inventory item` - Needs package_quantity field
- `SALE-003: Create sale from modal (pill only)` - Needs auto-calculation
- `SALE-004: Create sale from modal (pill + SGK)` - Needs SGK calculation

**Backend Requirements**:
```python
# Migration needed
alembic revision --autogenerate -m "add_package_quantity_to_inventory"

# Model update
class InventoryItem(Base):
    # ...
    package_quantity = db.Column(db.Integer, nullable=True)
    
# Schema update
class InventoryItemCreate(BaseModel):
    # ...
    package_quantity: Optional[int] = None
```

**Frontend Requirements**:
```typescript
// Inventory form
<FormField name="packageQuantity" label="Paket İçeriği (Adet)">
  <Input type="number" />
</FormField>

// Sale form - auto-calculate
if (item.unit === 'paket' && item.packageQuantity) {
  totalPieces = quantity * item.packageQuantity;
  sgkPayment = Math.floor(totalPieces / 104) * 698;
}
```

---

### 3. Alışlar (Purchases) Sayfası ❓

**Status**: UNKNOWN  
**Priority**: P2 (Medium)  
**Impact**: Navigation structure incomplete

**Description**:
Kullanıcı "Satışlar-Alışlar" navigasyon yapısından bahsetti. "Alışlar" sayfası var mı?

**Questions**:
- Alışlar sayfası şu anda mevcut mu?
- Yoksa oluşturmamız mı gerekiyor?
- Alışlar = Envanter girişi mi, yoksa ayrı bir modül mü?

**If NOT Implemented**:
```typescript
// Navigation structure
/sales          // Satışlar
/purchases      // Alışlar (YENİ)
/inventory      // Envanter
```

**Test Impact**:
- No tests written yet (waiting for clarification)

---

## ⚠️ Partially Implemented Features

### 4. Device Return Process

**Status**: PARTIALLY IMPLEMENTED  
**Priority**: P1 (High)

**Current State**:
- `delivery_status` field exists (pending, delivered)
- Return status unclear (returned? cancelled?)

**Needs Clarification**:
- What status for returned devices?
- Is there a separate return workflow?
- How to handle return reasons?

**Test Impact**:
- `DEVICE-006: Return device` - Implemented but needs backend verification

---

### 5. Promissory Note Maturity Tracking

**Status**: PARTIALLY IMPLEMENTED  
**Priority**: P1 (High)

**Current State**:
- Promissory notes can be created
- Maturity date tracking unclear

**Needs Clarification**:
- How to track maturity dates?
- Automatic reminders?
- Overdue note handling?

**Test Impact**:
- `PAYMENT-012: Promissory note maturity date` - Implemented but needs backend
- `REPORT-007: Promissory note tracking report` - Implemented but needs backend

---

## 📋 Action Items

### Immediate (Before Phase 4)

1. **Clarify with User**:
   - [ ] Is SGK Rapor Takibi page needed?
   - [ ] Is package_quantity field needed?
   - [ ] Does Alışlar page exist?
   - [ ] Device return status values?
   - [ ] Promissory note maturity tracking?

2. **Update Tests**:
   - [ ] Mark SGK tracking tests as @skip if not implemented
   - [ ] Mark package_quantity tests as @skip if not implemented
   - [ ] Add TODO comments for missing features

3. **Update Documentation**:
   - [ ] Add "Known Limitations" section
   - [ ] Document missing features
   - [ ] Update test inventory with status

### Future (Phase 4+)

1. **Implement Missing Features**:
   - [ ] SGK Rapor Takibi page
   - [ ] package_quantity field
   - [ ] Alışlar page (if needed)

2. **Update Tests**:
   - [ ] Remove @skip tags
   - [ ] Add full assertions
   - [ ] Test new features

---

## 📊 Impact Summary

| Feature | Tests Affected | Priority | Status |
|---------|----------------|----------|--------|
| SGK Rapor Takibi | 4 tests | P1 | ❌ Not Implemented |
| package_quantity | 3 tests | P2 | ❌ Not Implemented |
| Alışlar Page | 0 tests | P2 | ❓ Unknown |
| Device Return | 1 test | P1 | ⚠️ Partial |
| Note Maturity | 2 tests | P1 | ⚠️ Partial |

**Total Affected Tests**: 10 tests (5.3% of 190 tests)

---

## 🔗 Related Documents

- [Test Inventory](./08-TEST-INVENTORY.md)
- [Test Inventory - Cevaplar](./08-TEST-INVENTORY-CEVAPLAR.md)
- [Complete Progress Report](./COMPLETE-PROGRESS-REPORT.md)

---

**Status**: Waiting for User Clarification  
**Next Step**: Discuss with user and update tests accordingly


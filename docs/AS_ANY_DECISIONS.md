# `as any` Refactor — Decision Log (FINAL)

**Oluşturma Tarihi:** 2026-01-18  
**Durum:** ✅ KARARLAR VERİLDİ — BAĞLAYICI  
**Amaç:** `as any` kullanımını tamamen kaldırmak için **otoritatif teknik kararları** belgelemek.  
Bu doküman tamamlanmıştır. Bundan sonra refactor **karar sormadan** ilerler.

---

## Özet

| Kategori | Sayı |
|----------|------|
| Request Payload | 12 |
| Response Mapping | 18 |
| Status Transition | 4 |
| Money/Price | 5 |
| Permission/Auth | 3 |
| **TOPLAM** | **42** |

---

## [ID: ASANY-001] SMS Credit Balance Response Structure — KARAR

**Canonical kaynak:** Backend  

**Canonical response:**
```json
{ "data": { "balance": number } }
```

**Kurallar**
- `balance` HER ZAMAN number
- `string | null | undefined` KESİNLİKLE YASAK
- Farklı format gelirse:
    - Bu backend BUG’ıdır
    - Frontend fallback YAPMAZ
    - Error fırlatılır
    - Kampanya başlatılamaz

**Aksiyon**
- Frontend çoklu fallback kullanmayacak
- OpenAPI spec bu yapıya göre güncellenecek

**Kural:** Para/kredi hesaplamasında tolerans YOK  
**Durum:** 🔴 KIRILAMAZ

---

## [ID: ASANY-002] Party Count Response — KARAR

**Canonical response:**
```json
{ "data": { "count": number } }
```

**Kurallar**
- `count` >= 0
- Hiç kayıt yoksa: count = 0
- `null | undefined` YASAK
- Frontend `?? 0` fallback kullanamaz
- `null` gelirse:
    - Error
    - Kampanya gönderimi engellenir

**Kural:** SMS maliyeti yanlış hesaplanamaz  
**Durum:** 🔴 KIRILAMAZ

---

## [ID: ASANY-003] Subscription Info Nested Data — KARAR

**Canonical response:**
```json
{
  "data": {
    "plan": { ... },
    "tenant": { ... },
    "is_super_admin": boolean,
    "is_expired": boolean
  }
}
```

**Kurallar**
- Çift `data.data` YASAK
- `is_super_admin` SADECE bu seviyeden okunur
- Frontend deep unwrap YAPMAZ
- Yanlış parse:
    - Yetki ihlali
    - Kritik güvenlik hatası

**Aksiyon**
- Backend + OpenAPI düzeltilecek

**Kural:** Auth / permission fallback YOK  
**Durum:** 🔴 KIRILAMAZ

---

## [ID: ASANY-004] Payment Collection Payload — KARAR

**Canonical payload (Backend):**
```json
{
  "party_id": string,
  "sale_id": string,
  "amount": number,
  "payment_method": string
}
```

**Kurallar**
- Backend snake_case bekler
- Frontend camelCase → snake_case dönüşümü:
    - SADECE Orval request transformer ile
    - Backend iki formatı aynı anda kabul ETMEZ

**Kural:** Ödeme payload’ında ambiguity YOK  
**Durum:** 🔴 KIRILAMAZ

---

## [ID: ASANY-005] POS Payment Initiation — KARAR

**Canonical payload:**
```json
{
  "amount": number,
  "installment_count": number,
  "description": string
}
```

**Kurallar**
- `installment_count` ZORUNLU
- Response:
    - `iframe_url` HER ZAMAN GELİR
    - Gelmezse işlem BAŞARISIZ
    - Fallback YOK
    - Error → ödeme başlatılmaz

**Kural:** POS işleminde sessiz hata OLMAZ  
**Durum:** 🔴 KIRILAMAZ

---

## [ID: ASANY-006] Inventory KDV Flags — KARAR

**Canonical field (Backend):**
`price_includes_kdv`

**Kurallar**
- Case standardı: snake_case
- Frontend camelCase kullanabilir AMA:
    - Dönüşüm TEK NOKTADA
    - Alan yoksa default: false
    - Aynı anda iki case kontrolü YASAK

**Kural:** Fiyat yanlış gösterilemez  
**Durum:** 🔴 KIRILAMAZ

---

## [ID: ASANY-007] Inventory Features Update — KARAR

**Canonical payload:**
```json
{ "features": string[] }
```

**Kurallar**
- Backend array kabul eder
- Boş array:
    - Features SİLİNİR
    - String serialize format YASAK

**Durum:** 🟡 Business medium, karar net

---

## [ID: ASANY-008] Sale Status Mapping — KARAR

**Backend status:**
- PENDING
- COMPLETED
- CANCELLED

**Frontend canonical enum:**
- pending
- completed
- cancelled

**Kurallar**
- Explicit mapping (switch / map)
- `toLowerCase()` KULLANILMAZ
- Magic string YOK

**Durum:** 🔴 KIRILAMAZ

---

## [ID: ASANY-009] Party Branch / Tenant ID — KARAR

**Canonical response (Backend):**
- `tenant_id`
- `branch_id`

**Kurallar**
- Frontend Party type Orval’dan gelir
- camelCase fallback kontrolü YASAK
- Mapping tek noktada yapılır

**Durum:** 🔴 Multi-tenant integrity

---

## [ID: ASANY-010] Sale Invoice Check — KARAR

**Kurallar**
- `invoice`:
    - object VEYA
    - null
- `undefined` YASAK
- Kontrol:
    ```typescript
    sale.invoice === null
    ```
- Truthy/falsy hack YASAK

---

## [ID: ASANY-011] User Role Permission — KARAR

**Canonical auth field:**
```json
{ "is_super_admin": boolean }
```

**Kurallar**
- `role === 'super_admin'` KULLANILMAZ
- User type Orval’dan gelir
- Debug UI:
    - SADECE `is_super_admin === true`

**Durum:** 🔴 SECURITY — KIRILAMAZ

---

## [ID: ASANY-012] Admin Invoice Envelope — KARAR

**Canonical admin response:**
```json
{
  "data": {
    "items": [...],
    "pagination": { ... }
  }
}
```

**Kurallar**
- `data.invoices`, `data.plans` vb. YASAK
- Tüm admin listeleri aynı envelope’u kullanır

---

## [ID: ASANY-013] Supplier Payload — KARAR

**Kurallar**
- Supplier form state:
    - Orval type ile BİREBİR
    - Mapper ZORUNLU
    - `as any` YASAK

---

## [ID: ASANY-014] Party Update — KARAR

**Kurallar**
- `PartyUpdate` type OpenAPI’den gelir
- `Partial<Party>` KULLANILMAZ
- Create / Update payload’ları AYRI

---

## [ID: ASANY-015] UTS Bulk Upload — KARAR

**Canonical payload:**
```json
{ "csv": string }
```

**Kurallar**
- CSV raw string
- File / base64 YOK
- Yanlış format:
    - İşlem iptal
    - Error göster

**Durum:** 🔴 SGK — KIRILAMAZ

---

## [ID: ASANY-016] Team Member Toggle — KARAR

**Canonical payload:**
```json
{ "is_active": boolean }
```

**Canonical response:**
```json
{ "data": { "users": User[] } }
```

**Kurallar**
- Çift `as any` YASAK
- Mapper zorunlu

---

## [ID: ASANY-017] Plans Pagination — KARAR

**Canonical params:**
```json
{ "page": number, "limit": number }
```

**Kurallar**
- OpenAPI spec’te zorunlu
- Orval regenerate edilir

---

## [ID: ASANY-018] Plan Features Map — KARAR

**Canonical payload:**
```json
{ "features": Record<string, string> }
```

**Kurallar**
- Backend bu formatı bekler
- Map → object dönüşümü explicit yapılır

---

## 🔒 GLOBAL KURALLAR (BAĞLAYICI)

- `as any` YASAK
- `to_dict()` YASAK
- **Para / SGK / Auth:**
    - Fallback YOK
    - Error VAR
- **Case standardı:**
    - Backend (DB/Python): snake_case
    - API JSON + Frontend: camelCase
- **Response envelope:**
    ```json
    { "data": { ... } }
    ```
    TEK STANDART

# Schemathesis Failure Pattern Analysis

## 922 Başarısız Test Case - Ortak Örüntüler

### 1. Unsupported Methods (472 failure - %51) ℹ️
**Örünt:** TRACE/OPTIONS method'ları
**Mesaj:** "Method Not Allowed"
**Durum:** 405
**Açıklama:** FastAPI default olarak TRACE/OPTIONS desteklemiyor
**Çözüm:** ❌ Gerekli değil - Bu normal davranış
**Öncelik:** P4 - Ignore

---

### 2. Undocumented HTTP Status Codes (301 failure - %33) 📝

#### 2a. 404 Not Found (152 case)
**Örünt:** GET/DELETE endpoint'leri non-existent resource'lar için
**Mesajlar:**
- "Tenant not found" (19)
- "Patient not found" (18)
- "Party not found" (12)
- "Sale not found" (8)
- "User not found" (6)
- "Device not found" (4)

**Sorun:** OpenAPI spec'te 404 status code tanımlı değil
**Çözüm:** ✅ Tüm GET/DELETE endpoint'lerine 404 ekle
**Öncelik:** P1 - High

#### 2b. 403 Forbidden (40 case)
**Mesajlar:**
- "Super admin access required" (19)
- "Admin access required" (9)
- "Forbidden" (12)

**Sorun:** OpenAPI spec'te 403 status code tanımlı değil
**Çözüm:** ✅ Permission gerektiren endpoint'lere 403 ekle
**Öncelik:** P1 - High

#### 2c. 400 Bad Request (44 case)
**Mesajlar:**
- "Validation error" (5)
- "Invalid isoformat string: 'null'" (4)
- "'NULL'" (multiple)
- NOT NULL constraint failed (multiple)

**Sorun:** OpenAPI spec'te 400 status code tanımlı değil
**Çözüm:** ✅ Tüm POST/PUT/PATCH endpoint'lerine 400 ekle
**Öncelik:** P1 - High

#### 2d. 401 Unauthorized (8 case)
**Sorun:** Auth endpoint'lerinde 401 tanımlı değil
**Çözüm:** ✅ Auth endpoint'lerine 401 ekle
**Öncelik:** P2 - Medium

---

### 3. Server Errors (57 failure - %6) ❌

#### 3a. Internal Server Error (22 case)
**Mesaj:** "Internal server error"
**Durum:** 500
**Sorun:** Generic error handling, gerçek hata gizleniyor
**Çözüm:** ✅ Error handling'i iyileştir, spesifik hatalar dön
**Öncelik:** P0 - Critical

#### 3b. Database Constraint Violations (15+ case)
**Mesajlar:**
- "NOT NULL constraint failed: invoices.tenant_id"
- "NOT NULL constraint failed: users.tenant_id"
- "NOT NULL constraint failed: tenants.owner_email"

**Sorun:** Create schema'larında required field'lar eksik
**Çözüm:** ✅ Schema'lara tenant_id, owner_email ekle veya default değer ver
**Öncelik:** P0 - Critical

#### 3c. Attribute Errors (10+ case)
**Mesajlar:**
- "'TemplateCreate' object has no attribute 'bodyText'"
- "'InvoiceCreate' object has no attribute 'tenant_id'"
- "'PlanCreate' object has no attribute 'slug'"
- "'AdminUser' object has no attribute 'get'"

**Sorun:** Schema field mismatch, router'da yanlış field kullanımı
**Çözüm:** ✅ Schema field'larını düzelt, router'ları güncelle
**Öncelik:** P0 - Critical

#### 3d. Type Binding Errors (5+ case)
**Mesajlar:**
- "Error binding parameter 7: type 'list' is not supported"
- "Python int too large to convert to SQLite INTEGER"

**Sorun:** SQLite list binding, integer overflow
**Çözüm:** ✅ JSON serialize list'leri, integer validation ekle
**Öncelik:** P1 - High

#### 3e. Date Parsing Errors (4 case)
**Mesajlar:**
- "Invalid isoformat string: 'null'"
- "Invalid isoformat string: ''"

**Sorun:** Null/empty string'leri datetime'a parse etmeye çalışıyor
**Çözüm:** ✅ Date field'larını Optional yap, validation ekle
**Öncelik:** P1 - High

#### 3f. Missing Dependencies (3 case)
**Mesajlar:**
- "No module named 'core.models.sgk'"
- "name 'sync_service' is not defined"

**Sorun:** Import eksik veya model yok
**Çözüm:** ✅ SGK endpoints disabled edildi, sync_service import ekle
**Öncelik:** P0 - Critical (partially fixed)

---

### 4. Response Schema Violations (32 failure - %3) ⚠️

#### 4a. Unicode Character Issues (10+ case)
**Endpoint'ler:**
- `/api/activity-logs`
- `/api/audit`
- `/api/devices`
- `/api/admin/inventory`

**Sorun:** Unicode karakterler OpenAPI schema'da validate edilemiyor
**Çözüm:** ⚠️ Test data sorunu, production'da olmayabilir
**Öncelik:** P3 - Low

#### 4b. Datetime → String Conversion (8+ case)
**Endpoint'ler:**
- `/api/admin/birfatura/invoices` - `sent_to_gib_at`
- `/api/admin/invoices` - `sent_to_gib_at`
- `/api/sms/admin/headers` - `documents_submitted_at`

**Sorun:** Schema string bekliyor, datetime dönüyor
**Çözüm:** ✅ Field type'ını düzelt veya serializer ekle
**Öncelik:** P0 - Critical

#### 4c. String → Dict/List Parsing (8+ case)
**Endpoint'ler:**
- `/api/sms/headers` - `documents` field
- `/api/sms/audiences` - `filter_criteria` field

**Sorun:** DB'de string olarak saklanmış, schema dict/list bekliyor
**Çözüm:** ✅ Field validator ekle (zaten eklendi)
**Öncelik:** P0 - Critical (fixed)

---

### 5. API Rejected Schema-Compliant Request (49 failure - %5) 🔧

#### 5a. Business Logic Validation (20+ case)
**Mesajlar:**
- "brand, model, and type are required (or provide a valid inventoryId)"
- "Invalid severity: Must be one of: info, warning, error, critical"
- "System-level rates update not yet implemented"

**Sorun:** OpenAPI schema ile business logic validation uyumsuz
**Çözüm:** ✅ OpenAPI schema'yı business logic'e göre güncelle
**Öncelik:** P2 - Medium

#### 5b. Enum Value Mismatches (10+ case)
**Mesajlar:**
- "Input should be 'excel' or 'filter'" (DB'de 'file_upload' var)
- Enum validation errors

**Sorun:** DB'deki enum değerleri OpenAPI'deki ile farklı
**Çözüm:** ✅ Enum değerlerini senkronize et
**Öncelik:** P1 - High

#### 5c. Required vs Optional Mismatch (10+ case)
**Sorun:** OpenAPI'de optional olan field'lar backend'de required
**Çözüm:** ✅ Schema'ları gözden geçir, required field'ları düzelt
**Öncelik:** P2 - Medium

---

### 6. API Accepted Schema-Violating Request (9 failure - %1) 🐛

**Sorun:** Backend invalid data'yı kabul ediyor
**Örnekler:**
- Incorrect type in request body
- Missing required fields
- Invalid enum values

**Çözüm:** ✅ Pydantic validation'ı güçlendir
**Öncelik:** P1 - High

---

### 7. Undocumented Content-Type (2 failure - %0.2%) 📄

**Content-Types:**
- `text/csv; charset=utf-8`
- `application/pdf`

**Sorun:** OpenAPI'de sadece `application/json` tanımlı
**Çözüm:** ✅ Export endpoint'lerine content-type ekle
**Öncelik:** P3 - Low

---

## Özet: En Sık Görülen Sorunlar

### Top 5 Ortak Örünt:

1. **472 case (%51)** - TRACE/OPTIONS method not allowed → ❌ Ignore
2. **152 case (%16)** - 404 Not Found not documented → ✅ Fix OpenAPI
3. **55 case (%6)** - 500 Internal Server Error → ✅ Fix bugs
4. **44 case (%5)** - 400 Bad Request not documented → ✅ Fix OpenAPI
5. **40 case (%4)** - 403 Forbidden not documented → ✅ Fix OpenAPI

### Gerçek Bug Sayısı:

- **Critical Bugs (P0):** ~57 server errors
- **Schema Issues (P1):** ~32 response violations + ~49 validation mismatches
- **Documentation (P1):** ~301 missing status codes
- **Ignore:** 472 unsupported methods

**Toplam Gerçek Bug:** ~138 (server errors + schema issues + validation)
**Toplam Documentation:** ~301 (missing status codes)
**Ignore:** 472 (unsupported methods)

---

## Öncelikli Aksiyonlar

### P0 - Hemen Düzelt (57 bug)
1. ✅ SGK endpoints disabled
2. Fix `sent_to_gib_at` datetime serialization
3. Fix `tenant_id` NOT NULL constraints
4. Fix attribute errors (bodyText, slug, etc.)
5. Fix internal server errors (generic error handling)

### P1 - Bu Sprint (382 issue)
6. Add 404/403/400/401 to OpenAPI specs
7. Fix enum value mismatches
8. Fix date parsing errors
9. Strengthen Pydantic validation

### P2 - Sonraki Sprint (59 issue)
10. Review required vs optional fields
11. Fix business logic validation messages
12. Add 401 to auth endpoints

### P3 - Backlog (14 issue)
13. Handle unicode in test data
14. Add content-type for exports
15. Improve error messages

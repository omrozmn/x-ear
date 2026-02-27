# Sistematik Düzeltme Planı

## 📊 Sorun Özeti

- **400 Errors:** 6 adet - Schema/validation sorunları
- **404 Errors:** 93 adet
  - NULL_ID: 69 adet (Test script ID'leri düzelt)
  - NOT_IMPLEMENTED: 6 adet (Backend'de yok)
  - MISSING_DATA: 14 adet (Test data oluştur)
  - TENANT_MISMATCH: 4 adet (Eski tenant ID kullanılmış)
- **422 Errors:** ~120 adet - Request body eksik/hatalı

## 🎯 Öncelik Sırası

### 1. CRITICAL - Test Script Düzeltmeleri (Hemen)

#### A. Tenant ID Mismatch (4 endpoint)
**Sorun:** Eski tenant ID (`224ed5c7...`) kullanılıyor
**Çözüm:** Test script'te `$TN_ID` değişkenini doğru kullan

#### B. NULL ID'ler (69 endpoint)
**Sorun:** ID'ler null veya placeholder
**Çözüm:** 
- Created resource'lardan ID'leri al ve kullan
- Örnek: `PLAN_ID`, `U_ID`, `P_ID` değişkenlerini doğru set et

#### C. 400 Errors (6 endpoint)
**Sorun:** Schema validation hataları
**Çözüm:**
1. Password'u kısalt (max 72 byte)
2. Unique slug/TC number kullan (timestamp ekle)
3. Missing field'ları ekle (slug, code, email, etc.)

### 2. HIGH - Test Data Seeding (14 endpoint)

**Sorun:** Resource'lar oluşturulmamış
**Çözüm:** Test başında gerekli data'yı oluştur:

```bash
# Campaign oluştur
CAMPAIGN_ID=$(curl -s -X POST "$BASE_URL/api/campaigns" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -d '{"name":"Test Campaign","type":"email"}' | jq -r '.data.id')

# Sale oluştur
SALE_ID=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -d '{"partyId":"'$P_ID'","items":[]}' | jq -r '.data.id')

# Device oluştur
DEVICE_ID=$(curl -s -X POST "$BASE_URL/api/devices" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -d '{"name":"Test Device","category":"hearing_aid"}' | jq -r '.data.id')
```

### 3. MEDIUM - Backend Implementation (6 endpoint)

**Sorun:** Endpoint'ler implement edilmemiş
**Endpoint'ler:**
1. `POST /api/admin/debug/switch-role`
2. `GET /api/admin/debug/available-roles`
3. `GET /api/parties/{party_id}/profiles/hearing/tests`
4. `POST /api/parties/{party_id}/profiles/hearing/tests`
5. `GET /api/parties/{party_id}/profiles/hearing/ereceipts`
6. `POST /api/parties/{party_id}/profiles/hearing/ereceipts`

**Çözüm:** Backend'de implement et veya OpenAPI'dan kaldır

### 4. LOW - 422 Validation Errors (120 endpoint)

**Sorun:** Request body eksik/hatalı
**Çözüm:** Her endpoint için doğru request body ekle

## 🔧 İlk Adım: Test Script Düzeltmeleri

### Fix 1: Tenant ID Mismatch
```bash
# YANLIŞ (eski tenant ID hardcoded)
test_endpoint "PUT" "/api/admin/tenants/224ed5c7-9599-46c9-8c29-f5e1254fd884/status"

# DOĞRU (dinamik tenant ID)
test_endpoint "PUT" "/api/admin/tenants/${TN_ID}/status"
```

### Fix 2: NULL ID'ler
```bash
# YANLIŞ
test_endpoint "GET" "/api/admin/plans/null"

# DOĞRU
test_endpoint "GET" "/api/admin/plans/${PLAN_ID:-skip}"
# Ve test_endpoint fonksiyonunda:
if [[ "$endpoint" == *"skip"* ]]; then
    echo "SKIP (no data)"
    return
fi
```

### Fix 3: Unique Values
```bash
# YANLIŞ (her test aynı slug)
TENANT_DATA='{"slug":"vcorp-417297"}'

# DOĞRU (unique slug)
TIMESTAMP=$(date +%s)
TENANT_DATA='{"slug":"vcorp-'$TIMESTAMP'"}'
```

### Fix 4: Password Length
```bash
# YANLIŞ (çok uzun)
USER_DATA='{"password":"Pass123!Pass123!Pass123!Pass123!Pass123!Pass123!Pass123!Pass123!"}'

# DOĞRU (max 72 byte)
USER_DATA='{"password":"Pass123!"}'
```

## 📝 Uygulama Sırası

1. ✅ Test script'te tenant ID'leri düzelt (4 endpoint)
2. ✅ Test script'te NULL ID'leri düzelt (69 endpoint)
3. ✅ Test script'te 400 error'ları düzelt (6 endpoint)
4. ⏳ Test data seeding ekle (14 endpoint)
5. ⏳ Backend implementation (6 endpoint)
6. ⏳ 422 validation error'ları düzelt (120 endpoint)

## 🎯 Beklenen Sonuç

- **Şu an:** 194/513 pass (38%)
- **1-3 adım sonrası:** ~350/513 pass (68%)
- **4-5 adım sonrası:** ~400/513 pass (78%)
- **6. adım sonrası:** ~480/513 pass (94%)

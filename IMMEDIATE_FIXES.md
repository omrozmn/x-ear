# Hemen Uygulanacak Düzeltmeler

## ✅ Yapılacaklar (Öncelik Sırasıyla)

### 1. Test Data Seeding Ekle (Eksik Resource'lar)

Test script başına eklenecek resource'lar:

```bash
# Campaign
CAMPAIGN_DATA='{"name":"Test Campaign '$TIMESTAMP'","type":"email","status":"draft"}'
campaign_res=$(curl -s -X POST "$BASE_URL/api/campaigns" -H "Authorization: Bearer $TENANT_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: sc-$RANDOM" -d "$CAMPAIGN_DATA")
CAMPAIGN_ID=$(echo "$campaign_res" | jq -r '.data.id // .id')

# Device
DEVICE_DATA='{"name":"Test Device '$TIMESTAMP'","category":"hearing_aid","brand":"Test Brand","model":"Model X","price":1000}'
device_res=$(curl -s -X POST "$BASE_URL/api/devices" -H "Authorization: Bearer $TENANT_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: sd-$RANDOM" -d "$DEVICE_DATA")
DEVICE_ID=$(echo "$device_res" | jq -r '.data.id // .id')

# Inventory Item
ITEM_DATA='{"name":"Test Item '$TIMESTAMP'","category":"accessory","quantity":10,"unit":"piece"}'
item_res=$(curl -s -X POST "$BASE_URL/api/inventory" -H "Authorization: Bearer $TENANT_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: si-$RANDOM" -d "$ITEM_DATA")
ITEM_ID=$(echo "$item_res" | jq -r '.data.id // .id')

# Sale
SALE_DATA='{"partyId":"'$P_ID'","items":[],"totalAmount":0,"status":"draft"}'
sale_res=$(curl -s -X POST "$BASE_URL/api/sales" -H "Authorization: Bearer $TENANT_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: ss-$RANDOM" -d "$SALE_DATA")
SALE_ID=$(echo "$sale_res" | jq -r '.data.id // .id')

# Appointment
APPT_DATA='{"partyId":"'$P_ID'","appointmentDate":"2026-03-01T10:00:00Z","type":"consultation","status":"scheduled"}'
appt_res=$(curl -s -X POST "$BASE_URL/api/appointments" -H "Authorization: Bearer $TENANT_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: sa-$RANDOM" -d "$APPT_DATA")
APPT_ID=$(echo "$appt_res" | jq -r '.data.id // .id')

# Role
ROLE_DATA='{"name":"test_role_'$TIMESTAMP'","description":"Test role","permissions":[]}'
role_res=$(curl -s -X POST "$BASE_URL/api/roles" -H "Authorization: Bearer $TENANT_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: sr-$RANDOM" -d "$ROLE_DATA")
ROLE_ID=$(echo "$role_res" | jq -r '.data.id // .id')

# Notification
NOTIF_DATA='{"title":"Test Notification","message":"Test message","type":"info"}'
notif_res=$(curl -s -X POST "$BASE_URL/api/notifications" -H "Authorization: Bearer $TENANT_TOKEN" -H "Content-Type: application/json" -H "Idempotency-Key: sn-$RANDOM" -d "$NOTIF_DATA")
NOTIF_ID=$(echo "$notif_res" | jq -r '.data.id // .id')
```

### 2. Unique Values Kullan (400 Error Fix)

```bash
# Timestamp ekle
TIMESTAMP=$(date +%s)
RANDOM_SUFFIX=$RANDOM

# Unique slug
TENANT_DATA='{"slug":"vcorp-'$TIMESTAMP'",...}'

# Unique TC number
PARTY_DATA='{"tcNumber":"111'$TIMESTAMP'",...}'

# Kısa password (max 72 byte)
USER_DATA='{"password":"Pass123!",...}'
```

### 3. NULL ID Check Ekle

test_endpoint fonksiyonuna ekle:

```bash
test_endpoint() {
    local method=$1
    local endpoint=$2
    
    # Skip if endpoint contains null
    if [[ "$endpoint" == *"/null"* ]] || [[ "$endpoint" == *"/null/"* ]]; then
        printf "  -> [%s] %s ... ${RED}SKIP${NC} (null ID)\n" "$cat" "$desc"
        return
    fi
    
    # ... rest of function
}
```

### 4. Missing Field'ları Ekle

```bash
# Plan'a slug ekle
PLAN_DATA='{"name":"...","slug":"plan-'$TIMESTAMP'",...}'

# Affiliate lookup'a param ekle
test_endpoint "GET" "/api/affiliates/lookup?code=test" ...

# Commission audit'e param ekle
test_endpoint "GET" "/api/commissions/audit?commission_id=test" ...
```

## 📊 Beklenen İyileşme

| Kategori | Şu An | Sonra | İyileşme |
|----------|-------|-------|----------|
| 400 Errors | 6 | 0 | +6 pass |
| 404 (null ID) | 69 | 0 | +69 skip (doğru) |
| 404 (missing data) | 14 | 0 | +14 pass |
| **TOPLAM** | **194/513** | **~280/513** | **+86 pass** |

## 🎯 Sonraki Adımlar

1. ✅ Bu düzeltmeleri uygula
2. ⏳ Test'i çalıştır
3. ⏳ 422 validation error'larını düzelt
4. ⏳ Backend implementation eksiklerini tamamla

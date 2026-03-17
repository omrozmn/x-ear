# 400 Error Fixes

## 1. POST /api/admin/users - password too long
**Hata:** `password cannot be longer than 72 bytes`
**Sebep:** Bcrypt max 72 byte
**Çözüm:** Test script'te password'u kısalt

## 2. POST /api/admin/tenants - UNIQUE constraint
**Hata:** `UNIQUE constraint failed: tenants.slug`
**Sebep:** Aynı slug ile tekrar tenant oluşturuluyor
**Çözüm:** Her test için unique slug (timestamp/random ekle)

## 3. POST /api/admin/plans - missing slug
**Hata:** `'PlanCreate' object has no attribute 'slug'`
**Sebep:** Schema'da slug field'ı yok veya required
**Çözüm:** Backend schema'yı kontrol et, slug ekle veya auto-generate yap

## 4. GET /api/affiliates/lookup - missing param
**Hata:** `code or email required`
**Sebep:** Query parameter eksik
**Çözüm:** Test script'e `?code=test` veya `?email=test@test.com` ekle

## 5. POST /api/parties - duplicate TC
**Hata:** `Party with this TC number already exists`
**Sebep:** Aynı TC ile tekrar party oluşturuluyor
**Çözüm:** Her test için unique TC number (timestamp/random)

## 6. GET /api/commissions/audit - missing param
**Hata:** `commission_id is required`
**Sebep:** Query parameter eksik
**Çözüm:** Test script'e `?commission_id=xxx` ekle

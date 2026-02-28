# Kalan Sorunlar

## 🔴 CRITICAL: Bilateral Seri No Sorunu

### Problem
Bilateral (iki kulak) cihaz atamasında:
- Frontend'de her iki kulak için seri no giriliyor
- Backend'e gönderiliyor
- Ama database'de sadece `serial_number` alanına kaydediliyor
- `serial_number_left` ve `serial_number_right` NULL kalıyor

### Test Sonucu
```bash
Sale ID: 2602280101
  Kulak: both
  Seri No (Tek): 2025df345  ✅ VAR
  Seri No (Sol): None        ❌ YOK
  Seri No (Sağ): None        ❌ YOK
```

### Root Cause
Backend'de cihaz ataması oluştururken bilateral durumda seri nolar yanlış alana kaydediliyor.

### Fix Needed
`apps/api/routers/` veya `services/` içinde device assignment oluşturma kodunu kontrol et:
- `ear == "both"` durumunda
- `serialNumberLeft` → `serial_number_left` alanına
- `serialNumberRight` → `serial_number_right` alanına
- Kaydedilmeli

---

## ✅ FIXED: Peşin Ödeme Görünmüyor

### Problem
- Satış sırasında 2000 TRY peşin ödeme alındı
- Ama satış geçmişi tablosunda "Alınan Ödeme" kolonunda 0.00 TRY görünüyor

### Root Cause
Backend'de `create_sale` fonksiyonu `down_payment` alanını kullanmıyordu ve payment record oluşturmuyordu.

### Fix Applied
`apps/api/routers/sales.py` - `create_sale` fonksiyonu:
1. `down_payment` alanı öncelikli olarak kullanılıyor (paid_amount'tan önce)
2. `down_payment` > 0 ise otomatik olarak PaymentRecord oluşturuluyor
3. Payment type: `down_payment`, status: `paid`

### Test Sonucu
```bash
Sale ID: 2602280102
Paid Amount: 3000.0 TRY    ✅ DOĞRU
Payment Records: 1 adet    ✅ DOĞRU
  - 3000.0 TRY (cash) - down_payment
Remaining: 7000.0 TRY      ✅ DOĞRU
```

---

## 🟡 MEDIUM: Stoğa Al Butonu

### Problem
Emanet cihaz kartında "Stoğa Al" butonuna tıklayınca:
- İki cihazı birden stoğa alıyor
- Her cihaz için ayrı ayrı almalı
- Onay dialogu olmalı: "Emin misiniz?"

### Fix Needed
1. Her cihaz kartında ayrı "Stoğa Al" butonu olmalı
2. Butona tıklayınca onay dialogu göster
3. Onaylanırsa sadece o cihazı stoğa al

---

## ✅ FIXED: Barkod ve Seri No Görünümü

- ✅ Barkod artık görünüyor
- ✅ Seri no boyutu küçültüldü
- ✅ "Cihaz" başlığı kaldırıldı → Marka + Model
- ✅ Emanet cihaz seçimi düzeldi

---

## Öncelik Sırası

1. **CRITICAL**: Bilateral seri no sorunu (backend fix)
2. **MEDIUM**: Stoğa al butonu (frontend fix)

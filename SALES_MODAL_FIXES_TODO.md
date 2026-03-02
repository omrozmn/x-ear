# Satış Modal Düzeltmeleri - TODO

## 🔴 YAPILACAK GÖREVLER

### 1. Seri Numaraları Renkleri - SalesTableView ve EditSaleModal
**Durum:** ✅ ÇÖZÜLDÜ
**Sorun:** 
- Satış geçmişi tablosunda seri numaraları renksiz görünüyordu
- Sol kulak MAVİ, Sağ kulak KIRMIZI olmalıydı
- Backend'den `serialNumberLeft` ve `serialNumberRight` geliyordu ama boştu

**Çözüm:**
- Backend'de `_build_device_info_from_assignment` fonksiyonunda seri numaralarını `earSide`'a göre doğru field'a kopyaladık
- Sol kulak için: `serialNumberLeft` = `serialNumber`
- Sağ kulak için: `serialNumberRight` = `serialNumber`
- Frontend'de SalesTableView zaten doğru kodu vardı, backend düzeltmesi yeterli oldu

**Dosyalar:**
- `x-ear/apps/api/routers/sales.py` - `_build_device_info_from_assignment` fonksiyonu

---

### 2. SGK Desteği Bilateral için x2
**Durum:** ✅ ÇÖZÜLDÜ
**Sorun:**
- Yeni satış modalında bilateral seçilince SGK desteği tutarı x2 olmuyordu
- Örnek: SGK desteği 4.239,20 TRY ise bilateral için 8.478,40 TRY olmalıydı

**Çözüm:**
- `PartySaleFormRefactored.tsx`'da pricing calculation'a `ear` state'i eklendi
- Bilateral seçildiğinde SGK tutarı x2 yapılıyor: `sgkMultiplier = ear === 'both' ? 2 : 1`
- useMemo dependency array'ine `ear` eklendi

**Dosyalar:**
- `x-ear/apps/web/src/components/forms/party-sale-form/PartySaleFormRefactored.tsx`

---

### 3. SGK Desteği ve Rapor Durumu - Backend'e Kaydedilmiyor
**Durum:** ❌ Çözülmedi
**Sorun:**
- Yeni satış modalında SGK desteği ve rapor durumu seçiliyor
- Ama satış düzenleme modalında aynı değerler gelmiyor
- Backend'e doğru kaydedilmiyor olabilir

**Kontrol:**
1. Frontend'den backend'e gönderilen data'yı kontrol et
2. Backend'de `create_sale` fonksiyonunda `sgk_scheme` ve `report_status` kaydediliyor mu?
3. `_build_full_sale_data` fonksiyonunda bu field'lar döndürülüyor mu?

**Dosyalar:**
- `x-ear/apps/web/src/components/forms/party-sale-form/PartySaleFormRefactored.tsx` (frontend)
- `x-ear/apps/api/routers/sales.py` (backend - create_sale, _build_full_sale_data)

---

### 4. Atama Sebebi Dropdown - Yetkisiz Değişiklik GERİ ALINDI
**Durum:** ✅ GERİ ALINDI
**Sorun:**
- Kullanıcı izni olmadan "Satış" seçeneği eklenmişti
- Bu seçenek tüm alanları doğru kaydetmiyordu

**Çözüm:**
- Eklenen `{ value: 'sale', label: 'Satış' }` ve `{ value: 'Satış', label: 'Satış' }` seçenekleri SİLİNDİ
- Dropdown eski haline döndürüldü
- Sadece: service, repair, trial, replacement, proposal, other seçenekleri kaldı

**Dosyalar:**
- `x-ear/apps/web/src/components/forms/device-assignment-form/components/AssignmentDetailsForm.tsx`

---

## ✅ TAMAMLANAN GÖREVLER

### 1. Satış Geçmişi Sıralaması
- Backend'de `order_by(Sale.sale_date.desc(), Sale.id.desc())` eklendi
- En yeni satış en üstte görünüyor

### 2. Kulak Seçimi Daha Belirgin
- Border kalınlığı 4px
- Shadow efekti
- Bold font

### 3. Seri Numarası Girişi - Yeni Satış Modalı
- Bilateral için ayrı input'lar (sol mavi, sağ kırmızı)
- Backend'e gönderiliyor

### 4. Report Status & SGK - Device Assignment
- Device assignment'lara `report_status` eklendi
- `sgk_scheme` kopyalanıyor

---

## 📝 NOTLAR

- Backend'den gelen data formatı:
  ```json
  {
    "serialNumber": "...",
    "serialNumberLeft": "...",
    "serialNumberRight": "...",
    "earSide": "left|right|both"
  }
  ```

- Renk kodları:
  - Sol kulak: `text-blue-600`
  - Sağ kulak: `text-red-600`

- **ÖNEMLİ:** Kullanıcı izni olmadan değişiklik YAPMA! Sadece istenen işi yap.

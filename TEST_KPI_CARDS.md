# KPI Kartları Test Senaryosu

## Sorun
KPI kartları (Toplam, Aktif, Pasif, Cihazlı) tüm hastalardan hesaplanıyordu. Filtreleme yapıldığında kartlar güncellenmiyordu.

## Çözüm
Stats hesaplaması `filteredParties` array'inden yapılacak şekilde değiştirildi.

## Kod Değişikliği

**Önceki Kod** (Yanlış):
```typescript
// Mock stats for now
const stats = {
  total: (parties?.length || 0),
  active: parties.filter(p => p.status === 'ACTIVE').length,
  inactive: parties.filter(p => p.status === 'INACTIVE').length,
  withDevices: 0
};
```

**Yeni Kod** (Doğru):
```typescript
// Stats based on FILTERED parties (updates dynamically with filters)
const stats = {
  total: filteredParties.length,
  active: filteredParties.filter(p => {
    const status = String(p.status || '').toUpperCase();
    return status === 'ACTIVE';
  }).length,
  inactive: filteredParties.filter(p => {
    const status = String(p.status || '').toUpperCase();
    return status === 'INACTIVE';
  }).length,
  withDevices: 0 // TODO: Add device count when available
};
```

## Test Adımları

### 1. Başlangıç Durumu
- Hasta listesi sayfasını aç
- KPI kartlarını kontrol et:
  - **Toplam**: Tüm hastaların sayısı
  - **Aktif**: Aktif hastaların sayısı
  - **Pasif**: Pasif hastaların sayısı
  - **Cihazlı**: 0 (henüz implement edilmedi)

### 2. Durum Filtresi Testi
- "Filtreler" butonuna tıkla
- "Durum" filtresinden "Aktif" seç
- KPI kartlarını kontrol et:
  - **Toplam**: Sadece aktif hastaların sayısı
  - **Aktif**: Toplam ile aynı olmalı
  - **Pasif**: 0 olmalı

### 3. Segment Filtresi Testi
- "Segment" filtresinden "Yeni" seç
- KPI kartlarını kontrol et:
  - **Toplam**: Sadece aktif VE yeni segment'teki hastaların sayısı
  - **Aktif**: Filtrelenmiş hastalar içindeki aktif sayısı
  - **Pasif**: Filtrelenmiş hastalar içindeki pasif sayısı

### 4. Arama Testi
- Arama kutusuna bir isim yaz (örn: "Ahmet")
- KPI kartlarını kontrol et:
  - **Toplam**: Arama sonucunda bulunan hasta sayısı
  - **Aktif**: Arama sonucundaki aktif hastalar
  - **Pasif**: Arama sonucundaki pasif hastalar

### 5. Filtreleri Temizle Testi
- "Temizle" butonuna tıkla
- KPI kartları başlangıç değerlerine dönmeli

### 6. Kombine Filtre Testi
- Durum: "Aktif"
- Segment: "Yeni"
- Kazanım Türü: "Referans"
- Arama: "A" harfi
- KPI kartları tüm bu filtrelerin kesişimini göstermeli

## Beklenen Davranış

✅ KPI kartları her zaman filtrelenmiş hasta listesini yansıtmalı
✅ Filtre değiştiğinde kartlar otomatik güncellenmelidir
✅ Arama yapıldığında kartlar arama sonucunu göstermelidir
✅ Filtreler temizlendiğinde kartlar tüm hastaları göstermelidir

## Teknik Detaylar

**Dosya**: `x-ear/apps/web/src/pages/DesktopPartiesPage.tsx`

**Hesaplama Sırası**:
1. `parties` - Backend'den gelen tüm hastalar
2. `filteredParties` - Filtreler ve arama uygulanmış hastalar
3. `sortedParties` - Sıralanmış hastalar
4. `stats` - Filtrelenmiş hastalardan hesaplanan istatistikler ✅
5. `paginatedParties` - Sayfalanmış hastalar

**Status Normalizasyonu**:
- Backend'den gelen status değerleri büyük/küçük harf karışık olabilir
- `String(p.status || '').toUpperCase()` ile normalize edilir
- "ACTIVE", "active", "Active" hepsi "ACTIVE" olarak değerlendirilir

## Sonuç

KPI kartları artık filtrelenmiş verilere göre dinamik olarak güncelleniyor ✅

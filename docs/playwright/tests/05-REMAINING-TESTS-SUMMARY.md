# Kalan Test Kategorileri - Özet

**Durum**: Test senaryoları belirlendi, detaylar oluşturulacak  
**Toplam**: 90 test senaryosu

---

## 05-INVOICE-TESTS (15 test)

**Komponent**: `InvoiceModal`  
**Öncelik**: P0 (Revenue Critical)

### Test Senaryoları:
1. **INVOICE-001**: Fatura Oluşturma (Satıştan) - P0
2. **INVOICE-002**: Fatura Oluşturma (Manuel) - P1
3. **INVOICE-003**: E-Fatura Gönderimi - P0
4. **INVOICE-004**: Fatura PDF İndirme - P1
5. **INVOICE-005**: Fatura İptali - P1
6. **INVOICE-006**: SGK Faturası Oluşturma - P0
7. **INVOICE-007**: Fatura Güncelleme - P1
8. **INVOICE-008**: Fatura Arama (Fatura No) - P1
9. **INVOICE-009**: Fatura Filtreleme (Tarih) - P1
10. **INVOICE-010**: Fatura Filtreleme (Durum) - P1
11. **INVOICE-011**: Fatura Detay Görüntüleme - P1
12. **INVOICE-012**: Toplu Fatura Oluşturma - P2
13. **INVOICE-013**: Fatura Export (Excel) - P2
14. **INVOICE-014**: Fatura Hatırlatıcısı - P2
15. **INVOICE-015**: Fatura Pagination - P1

**Tahmini Süre**: ~250 dakika (~4 saat)

---

## 06-DEVICE-TESTS (15 test)

**Komponent**: `DeviceAssignmentModal`  
**Öncelik**: P0 (Core Business)

### Test Senaryoları:
1. **DEVICE-001**: Cihaz Atama (Satış) - P0
2. **DEVICE-002**: Cihaz Atama (Test/Deneme) - P0
3. **DEVICE-003**: Cihaz Atama (Loaner/Emanet) - P1
4. **DEVICE-004**: Cihaz Atama (Tamir) - P1
5. **DEVICE-005**: Cihaz Atama (Değişim) - P1
6. **DEVICE-006**: Cihaz Geri Alma - P1
7. **DEVICE-007**: Cihaz Değiştirme - P1
8. **DEVICE-008**: Cihaz Geçmişi Görüntüleme - P1
9. **DEVICE-009**: Cihaz Arama (Seri No) - P1
10. **DEVICE-010**: Cihaz Filtreleme (Durum) - P1
11. **DEVICE-011**: Cihaz Filtreleme (Marka) - P2
12. **DEVICE-012**: Cihaz Export (CSV) - P2
13. **DEVICE-013**: Cihaz Stok Uyarısı - P2
14. **DEVICE-014**: Cihaz Garanti Takibi - P2
15. **DEVICE-015**: Cihaz Pagination - P1

**Tahmini Süre**: ~240 dakika (~4 saat)

---

## 07-INVENTORY-TESTS (10 test)

**Komponent**: `InventoryModal`  
**Öncelik**: P1

### Test Senaryoları:
1. **INVENTORY-001**: Envanter Ekleme - P1
2. **INVENTORY-002**: Envanter Güncelleme - P1
3. **INVENTORY-003**: Envanter Silme - P2
4. **INVENTORY-004**: Stok Girişi - P1
5. **INVENTORY-005**: Stok Çıkışı - P1
6. **INVENTORY-006**: Stok Arama - P1
7. **INVENTORY-007**: Stok Filtreleme (Kategori) - P1
8. **INVENTORY-008**: Stok Uyarısı (Minimum Seviye) - P2
9. **INVENTORY-009**: Stok Export (Excel) - P2
10. **INVENTORY-010**: Stok Pagination - P1

**Tahmini Süre**: ~150 dakika (~2.5 saat)

---

## 08-CASH-TESTS (10 test)

**Komponent**: `CashRecordDetailModal`  
**Öncelik**: P1

### Test Senaryoları:
1. **CASH-001**: Kasa Kaydı (Gelir) - P1
2. **CASH-002**: Kasa Kaydı (Gider) - P1
3. **CASH-003**: Kasa Kaydı (Etiket ile) - P1
4. **CASH-004**: Kasa Kaydı Güncelleme - P1
5. **CASH-005**: Kasa Kaydı Silme - P2
6. **CASH-006**: Kasa Arama - P1
7. **CASH-007**: Kasa Filtreleme (Tarih) - P1
8. **CASH-008**: Kasa Filtreleme (Tip) - P1
9. **CASH-009**: Kasa Export (PDF) - P2
10. **CASH-010**: Kasa Özeti (Dashboard) - P1

**Tahmini Süre**: ~140 dakika (~2.5 saat)

---

## 09-REPORT-TESTS (10 test)

**Komponent**: Reports Pages  
**Öncelik**: P2

### Test Senaryoları:
1. **REPORT-001**: Satış Raporu (Günlük) - P2
2. **REPORT-002**: Satış Raporu (Aylık) - P2
3. **REPORT-003**: Tahsilat Raporu - P2
4. **REPORT-004**: Stok Raporu - P2
5. **REPORT-005**: SGK Rapor Takibi (Cihaz) - P1
6. **REPORT-006**: SGK Rapor Takibi (Pil) - P1
7. **REPORT-007**: Senet Takip Raporu - P2
8. **REPORT-008**: Müşteri Raporu - P2
9. **REPORT-009**: Rapor Export (Excel) - P2
10. **REPORT-010**: Rapor Export (PDF) - P2

**Tahmini Süre**: ~160 dakika (~2.5 saat)

---

## 10-ADMIN-TESTS (10 test)

**Komponent**: Admin Panel  
**Öncelik**: P1

### Test Senaryoları:
1. **ADMIN-001**: Super Admin Login - P0
2. **ADMIN-002**: Tenant Seçimi - P0
3. **ADMIN-003**: Role Impersonation - P1
4. **ADMIN-004**: Tenant Oluşturma - P1
5. **ADMIN-005**: Tenant Güncelleme - P1
6. **ADMIN-006**: Kullanıcı Oluşturma - P1
7. **ADMIN-007**: Kullanıcı Rol Atama - P1
8. **ADMIN-008**: Permission Yönetimi - P2
9. **ADMIN-009**: Audit Log Görüntüleme - P2
10. **ADMIN-010**: System Settings - P2

**Tahmini Süre**: ~150 dakika (~2.5 saat)

---

## 📊 Kalan Testler Özeti

| Kategori | Test Sayısı | Öncelik | Tahmini Süre |
|----------|-------------|---------|--------------|
| INVOICE | 15 | P0 | ~4 saat |
| DEVICE | 15 | P0 | ~4 saat |
| INVENTORY | 10 | P1 | ~2.5 saat |
| CASH | 10 | P1 | ~2.5 saat |
| REPORT | 10 | P2 | ~2.5 saat |
| ADMIN | 10 | P1 | ~2.5 saat |

**Toplam**: 90 test, ~18.5 saat

---

## 🎯 Sonraki Adımlar

1. ✅ AUTH testleri (10 test) - TAMAMLANDI
2. ✅ PARTY testleri (15 test) - TAMAMLANDI
3. ✅ SALE testleri (20 test) - TAMAMLANDI
4. ✅ PAYMENT testleri (15 test) - TAMAMLANDI
5. ⏳ INVOICE testleri (15 test) - DETAYLANDIRILACAK
6. ⏳ DEVICE testleri (15 test) - DETAYLANDIRILACAK
7. ⏳ INVENTORY testleri (10 test) - DETAYLANDIRILACAK
8. ⏳ CASH testleri (10 test) - DETAYLANDIRILACAK
9. ⏳ REPORT testleri (10 test) - DETAYLANDIRILACAK
10. ⏳ ADMIN testleri (10 test) - DETAYLANDIRILACAK

**İlerleme**: 60/150 test (%40 tamamlandı)

---

## 💡 Notlar

### Kritik Bulgular
1. **Toast Duration**: 5 saniye (codebase'den bulundu)
2. **PaymentTrackingModal**: Tahsilat ve senet takibi tek modalda
3. **InvoiceModal**: 4 varyant (normal, quick, template, device)
4. **CashRecordDetailModal**: Gelir/gider kayıtları
5. **TestID Standardı**: `{component}-{element}-{action}`

### Eksik Özellikler (Uygulanacak)
1. **package_quantity** field'ı (envanter için)
2. **SGK Rapor Takibi** sayfası (yeni özellik)
3. **Satışlar-Alışlar** navigasyon yapısı (değişiklik)

### Test Yazma Öncelikleri
1. **Faz 1** (Exploratory): P0 testler önce
2. **Faz 2** (Pattern Analysis): P1 testler
3. **Faz 3** (Fix): Ortak sorunlar
4. **Faz 4** (Harden): Tüm testler sertleştirilecek

---

## 📝 Detaylı Test Dökümanları

Kalan kategoriler için detaylı test senaryoları (flow, assertion, TestID, fail nedenleri) ayrı dosyalarda oluşturulacak:

- `05-INVOICE-TESTS-DETAILED.md`
- `06-DEVICE-TESTS-DETAILED.md`
- `07-INVENTORY-TESTS-DETAILED.md`
- `08-CASH-TESTS-DETAILED.md`
- `09-REPORT-TESTS-DETAILED.md`
- `10-ADMIN-TESTS-DETAILED.md`

**Gerekirse oluşturulabilir!**

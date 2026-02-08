# Sales Tests (SALE)

**Kategori**: Sales Management  
**Öncelik**: P0 (Revenue Critical)  
**Toplam Test**: 20

---

## SALE-001: Yeni Satış Modalı ile Cihaz Satışı

**Faz**: 1 (Exploratory)  
**Öncelik**: P0 (Revenue Critical)  
**Tahmini Süre**: 25 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Satışlar" sekmesine tıkla
4. "Yeni Satış" butonuna tıkla
5. Modal açıldı
6. Cihaz seç (autocomplete): "Phonak Audeo"
7. Fiyat otomatik doldu: 15000 TL
8. SGK indirimi otomatik hesaplandı: -3000 TL
9. Ödeme yöntemi: "Nakit" seç
10. "Kaydet" butonuna tıkla
11. Success toast göründü
12. Cihaz otomatik atandı (atama nedeni: "Sale")
13. Satış listesinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="sale-list-item"]').first()).toContainText('15000');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Success toast
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Satış başarıyla oluşturuldu');

// Modal kapandı
await expect(page.locator('[data-testid="sale-modal"]')).not.toBeVisible();

// Satış listesinde görünüyor
const firstSale = page.locator('[data-testid="sale-list-item"]').first();
await expect(firstSale).toContainText('Phonak Audeo');
await expect(firstSale).toContainText('15000');
await expect(firstSale).toContainText('Nakit');

// Cihaz atandı
await page.locator('[data-testid="devices-tab"]').click();
await expect(page.locator('[data-testid="device-assignment-row"]').first()).toContainText('Phonak Audeo');
await expect(page.locator('[data-testid="device-assignment-row"]').first()).toContainText('Sale');

// API call başarılı
await page.waitForResponse(response => 
  response.url().includes('/sales') && 
  response.status() === 201
);
```

**Gerekli TestID'ler**:
- `sales-tab`
- `sale-create-button`
- `sale-modal`
- `sale-device-autocomplete`
- `sale-price-input`
- `sale-sgk-discount-display`
- `sale-payment-method-select`
- `sale-submit-button`
- `success-toast`
- `sale-list-item`
- `devices-tab`
- `device-assignment-row`

**Olası Fail Nedenleri**:
- [ ] Autocomplete çalışmıyor
- [ ] Fiyat otomatik dolmuyor
- [ ] SGK hesaplaması yanlış
- [ ] Cihaz ataması yapılmıyor
- [ ] API call başarısız

---

## SALE-002: Cihaz Atama Modalı ile Satış

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Cihazlar" sekmesine tıkla
4. "Cihaz Ata" butonuna tıkla
5. Modal açıldı
6. Cihaz seç: "Phonak Audeo"
7. Atama nedeni: "Sale" seç
8. Fiyat bilgileri otomatik doldu
9. Ödeme yöntemi: "Kredi Kartı" seç
10. "Kaydet" butonuna tıkla
11. Success toast göründü
12. Satış kaydı oluşturuldu
13. Cihaz atandı
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `devices-tab`
- `device-assign-button`
- `device-assignment-modal`
- `device-select`
- `assignment-reason-select`
- `device-price-input`
- `device-payment-method-select`
- `device-submit-button`

---

## SALE-003: Kasa Kaydı ile Satış (Hasta Adı İLE)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Komponent**: `CashRecordDetailModal`

**Flow**:
```
1. Login ol
2. Dashboard'a git
3. "Kasa Kaydı Ekle" butonuna tıkla
4. Modal açıldı
5. Hasta seç (autocomplete): "Ahmet Yılmaz"
6. Tutar: 5000 TL
7. Ürün seç (opsiyonel): "Pil"
8. "Kaydet" butonuna tıkla
9. Success toast: "İlgili hasta adına satış olarak kaydedildi"
10. Kasa kaydı listesinde görünüyor
11. Hasta detayına git → Satışlar sekmesi
12. Satış kaydı görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('satış olarak kaydedildi');
```

**Gerekli TestID'ler**:
- `cash-record-create-button`
- `cash-record-modal`
- `cash-record-party-autocomplete`
- `cash-record-amount-input`
- `cash-record-product-select`
- `cash-record-submit-button`
- `success-toast`

---

## SALE-004: Kasa Kaydı (Hasta Adı OLMADAN)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Dashboard'a git
3. "Kasa Kaydı Ekle" butonuna tıkla
4. Modal açıldı
5. Hasta seçme (boş bırak)
6. Tutar: 500 TL
7. Etiket: "Kargo" seç
8. "Kaydet" butonuna tıkla
9. Success toast: "Kasa kaydı oluşturuldu"
10. Kasa kaydı listesinde görünüyor
11. Satış kaydı OLUŞTURULMADI
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Kasa kaydı oluşturuldu');
await expect(page.locator('[data-testid="success-toast"]')).not.toContainText('satış');
```

**Gerekli TestID'ler**:
- `cash-record-amount-input`
- `cash-record-tag-select`
- `cash-record-submit-button`

---

## SALE-005: Pil Satışı (Raporlu)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 25 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Satışlar" sekmesine tıkla
4. "Yeni Satış" butonuna tıkla
5. Ürün seç: "Duracell Pil" (kategori: Pil)
6. Paket seç: "60'lı Paket"
7. Adet: 2 paket (120 adet otomatik hesaplandı)
8. Rapor durumu: "Rapor alındı" seç
9. SGK ödemesi otomatik hesaplandı: (120/104) * 698 = 805 TL
10. Toplam tutar: 1000 - 805 = 195 TL
11. "Kaydet" butonuna tıkla
12. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="sale-sgk-discount-display"]')).toContainText('805');
```

**Gerekli TestID'ler**:
- `sale-product-select`
- `sale-package-select`
- `sale-quantity-input`
- `sale-total-pieces-display`
- `sale-report-status-select`
- `sale-sgk-discount-display`
- `sale-total-amount-display`

---

## SALE-006: Pil Satışı (Rapor Bekliyor)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Yeni Satış" butonuna tıkla
4. Ürün seç: "Duracell Pil"
5. Adet: 104
6. Rapor durumu: "Rapor bekliyor" seç
7. SGK ödemesi düşüldü: 698 TL (anlaşma yapılmış)
8. "Kaydet" butonuna tıkla
9. Success toast göründü
10. Raporlar sayfasına git → SGK Rapor Takibi
11. "Bekleyen Raporlar" listesinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="sale-sgk-discount-display"]')).toContainText('698');
```

**Gerekli TestID'ler**:
- `sale-report-status-select`
- `sale-sgk-discount-display`

---

## SALE-007: Pil Satışı (Özel Satış)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Yeni Satış" butonuna tıkla
4. Ürün seç: "Duracell Pil"
5. Adet: 104
6. Rapor durumu: "Özel satış" seç
7. SGK ödemesi düşülmedi: 0 TL
8. Toplam tutar: Tam fiyat
9. "Kaydet" butonuna tıkla
10. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-sgk-discount-display"]')).toContainText('0');
```

---

## SALE-008: İndirimli Satış (Yüzde)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Yeni Satış" butonuna tıkla
4. Cihaz seç: "Phonak Audeo" (15000 TL)
5. İndirim tipi: "Yüzde" seç
6. İndirim: %10
7. İndirim tutarı otomatik hesaplandı: 1500 TL
8. Toplam: 15000 - 1500 - SGK = 10500 TL
9. "Kaydet" butonuna tıkla
10. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-discount-amount-display"]')).toContainText('1500');
```

**Gerekli TestID'ler**:
- `sale-discount-type-select`
- `sale-discount-input`
- `sale-discount-amount-display`
- `sale-total-amount-display`

---

## SALE-009: İndirimli Satış (Tutar)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Yeni Satış" butonuna tıkla
4. Cihaz seç: "Phonak Audeo" (15000 TL)
5. İndirim tipi: "Tutar" seç
6. İndirim: 2000 TL
7. Toplam: 15000 - 2000 - SGK = 10000 TL
8. "Kaydet" butonuna tıkla
9. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-total-amount-display"]')).toContainText('10000');
```

---

## SALE-010: Ön Ödemeli Satış

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Yeni Satış" butonuna tıkla
4. Cihaz seç: "Phonak Audeo" (15000 TL)
5. Ön ödeme: 5000 TL
6. Kalan tutar: 10000 TL
7. "Kaydet" butonuna tıkla
8. Success toast göründü
9. Tahsilat modalını aç
10. Ön ödeme görünüyor: 5000 TL
11. Kalan tutar: 10000 TL
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-prepayment-input"]')).toHaveValue('5000');
await expect(page.locator('[data-testid="sale-remaining-amount-display"]')).toContainText('10000');
```

**Gerekli TestID'ler**:
- `sale-prepayment-input`
- `sale-remaining-amount-display`

---

## SALE-011: Satış Güncelleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Satışlar" sekmesine tıkla
4. İlk satışın "Düzenle" butonuna tıkla
5. Modal açıldı (bilgiler dolu)
6. Fiyat'ı 16000 TL olarak değiştir
7. "Kaydet" butonuna tıkla
8. Success toast göründü
9. Satış listesinde güncellenen fiyat görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="sale-list-item"]').first()).toContainText('16000');
```

**Gerekli TestID'ler**:
- `sale-edit-button`
- `sale-modal`
- `sale-price-input`
- `sale-submit-button`

---

## SALE-012: Satış Silme

**Faz**: 1 (Exploratory)  
**Öncelik**: P2  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Satışlar" sekmesine tıkla
4. İlk satışın "Sil" butonuna tıkla
5. Onay dialog'u açıldı
6. "Evet, Sil" butonuna tıkla
7. Success toast göründü
8. Satış listeden kayboldu
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `sale-delete-button`
- `confirm-dialog`
- `confirm-dialog-yes-button`

---

## SALE-013: Satışlar Sayfası (Tüm Satışlar)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**NOT**: Bu sayfa YENİ oluşturulacak (şu anda "Faturalar" sekmesi var, "Satışlar-Alışlar" olacak)

**Flow**:
```
1. Login ol
2. Sidebar'dan "Satışlar-Alışlar" → "Satışlar" sekmesine git
3. Tüm satışlar listeleniyor
4. Filtreler:
   - Tarih aralığı
   - Hasta adı
   - Ödeme durumu
   - Fatura durumu
5. Arama yap: Hasta adı
6. Sonuçlar filtrelendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page).toHaveURL('/sales');
await expect(page.locator('[data-testid="sale-list-item"]')).toHaveCount(10);
```

**Gerekli TestID'ler**:
- `sales-page`
- `sale-list-item`
- `sale-date-filter`
- `sale-party-filter`
- `sale-payment-status-filter`
- `sale-invoice-status-filter`
- `sale-search-input`

---

## SALE-014: Satış Detay Görüntüleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Satışlar" sekmesine tıkla
4. İlk satışa tıkla
5. Satış detay modalı açıldı
6. Tüm bilgiler görünüyor:
   - Ürün/Cihaz bilgileri
   - Fiyat bilgileri
   - İndirim bilgileri
   - SGK bilgileri
   - Ödeme bilgileri
   - Fatura durumu
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-detail-modal"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `sale-list-item`
- `sale-detail-modal`
- `sale-detail-product`
- `sale-detail-price`
- `sale-detail-discount`
- `sale-detail-sgk`
- `sale-detail-payment`
- `sale-detail-invoice-status`

---

## SALE-015: Satış Arama (Hasta Adı)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Satışlar" sayfasına git
3. Arama input'a "Ahmet" yaz
4. Tabloda sadece "Ahmet" içeren satışlar görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-list-item"]')).toHaveCount(2);
```

---

## SALE-016: Satış Filtreleme (Tarih)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. "Satışlar" sayfasına git
3. Tarih filtresi: "Son 7 gün" seç
4. Tabloda sadece son 7 gündeki satışlar görünüyor
5. Tarih filtresi: "Bu ay" seç
6. Tabloda bu ayki satışlar görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-list-item"]')).toHaveCount(5);
```

---

## SALE-017: Satış Filtreleme (Ödeme Durumu)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Satışlar" sayfasına git
3. Ödeme durumu filtresi: "Ödenmedi" seç
4. Tabloda sadece ödenmemiş satışlar görünüyor
5. Ödeme durumu filtresi: "Kısmi Ödendi" seç
6. Tabloda kısmi ödenmiş satışlar görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-list-item"]')).toHaveCount(3);
```

---

## SALE-018: Satış Filtreleme (Fatura Durumu)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Satışlar" sayfasına git
3. Fatura durumu filtresi: "Fatura Kesilmedi" seç
4. Tabloda sadece faturası kesilmemiş satışlar görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-list-item"]')).toHaveCount(4);
```

---

## SALE-019: Satış Export (CSV)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Satışlar" sayfasına git
3. "Dışa Aktar" butonuna tıkla
4. CSV dosyası indirildi
5. CSV dosyasını aç
6. Tüm satışlar CSV'de görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
const download = await page.waitForEvent('download');
expect(download.suggestedFilename()).toContain('.csv');
```

---

## SALE-020: Satış Pagination

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Satışlar" sayfasına git
3. Sayfa 1'de 10 satış görünüyor
4. "Sonraki" butonuna tıkla
5. Sayfa 2'de 10 satış görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sale-list-item"]')).toHaveCount(10);
```

---

## 📊 SALE Tests Özeti

| Test ID | Açıklama | Öncelik | Faz | Süre |
|---------|----------|---------|-----|------|
| SALE-001 | Yeni Satış Modalı (Cihaz) | P0 | 1 | 25 dk |
| SALE-002 | Cihaz Atama ile Satış | P0 | 1 | 20 dk |
| SALE-003 | Kasa Kaydı (Hasta İLE) | P0 | 1 | 20 dk |
| SALE-004 | Kasa Kaydı (Hasta OLMADAN) | P1 | 1 | 15 dk |
| SALE-005 | Pil Satışı (Raporlu) | P0 | 1 | 25 dk |
| SALE-006 | Pil Satışı (Rapor Bekliyor) | P1 | 1 | 20 dk |
| SALE-007 | Pil Satışı (Özel Satış) | P1 | 1 | 15 dk |
| SALE-008 | İndirimli Satış (Yüzde) | P1 | 1 | 15 dk |
| SALE-009 | İndirimli Satış (Tutar) | P1 | 1 | 15 dk |
| SALE-010 | Ön Ödemeli Satış | P1 | 1 | 20 dk |
| SALE-011 | Satış Güncelleme | P1 | 1 | 15 dk |
| SALE-012 | Satış Silme | P2 | 1 | 10 dk |
| SALE-013 | Satışlar Sayfası | P1 | 1 | 15 dk |
| SALE-014 | Satış Detay | P1 | 1 | 15 dk |
| SALE-015 | Satış Arama | P1 | 1 | 10 dk |
| SALE-016 | Satış Filtreleme (Tarih) | P1 | 1 | 15 dk |
| SALE-017 | Satış Filtreleme (Ödeme) | P1 | 1 | 10 dk |
| SALE-018 | Satış Filtreleme (Fatura) | P1 | 1 | 10 dk |
| SALE-019 | Satış Export | P2 | 2 | 10 dk |
| SALE-020 | Satış Pagination | P1 | 1 | 10 dk |

**Toplam Süre**: ~305 dakika (~5 saat)

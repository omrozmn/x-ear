# Payment & Collection Tests (PAYMENT)

**Kategori**: Payment Management  
**Öncelik**: P0 (Revenue Critical)  
**Toplam Test**: 15  
**Komponent**: `PaymentTrackingModal`

---

## PAYMENT-001: Tahsilat Modalı Açma

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Satışlar" sekmesine tıkla
4. İlk satışa tıkla
5. Satış detay modalı açıldı
6. "Tahsilat" butonuna tıkla
7. PaymentTrackingModal açıldı
8. Satış bilgileri görünüyor
9. Kalan tutar görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="payment-tracking-modal"]')).toBeVisible();
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Modal açıldı
await expect(page.locator('[data-testid="payment-tracking-modal"]')).toBeVisible();

// Satış bilgileri görünüyor
await expect(page.locator('[data-testid="payment-sale-info"]')).toContainText('Phonak Audeo');
await expect(page.locator('[data-testid="payment-total-amount"]')).toContainText('15000');

// Kalan tutar görünüyor
await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText('15000');

// Ödeme geçmişi boş
await expect(page.locator('[data-testid="payment-history-empty"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `sale-detail-modal`
- `sale-payment-button`
- `payment-tracking-modal`
- `payment-sale-info`
- `payment-total-amount`
- `payment-remaining-amount`
- `payment-history-empty`

---

## PAYMENT-002: Nakit Ödeme Ekleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → Satışlar → Tahsilat modalı aç
3. "Ödeme Ekle" butonuna tıkla
4. Tutar: 5000 TL
5. Ödeme yöntemi: "Nakit" seç
6. Tarih: Bugün
7. "Kaydet" butonuna tıkla
8. Success toast göründü
9. Ödeme geçmişinde görünüyor
10. Kalan tutar güncellendi: 10000 TL
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText('10000');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Success toast
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Ödeme başarıyla eklendi');

// Ödeme geçmişinde görünüyor
const firstPayment = page.locator('[data-testid="payment-history-item"]').first();
await expect(firstPayment).toContainText('5000');
await expect(firstPayment).toContainText('Nakit');
await expect(firstPayment).toContainText('Bugün');

// Kalan tutar güncellendi
await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText('10000');

// Toplam tahsilat güncellendi
await expect(page.locator('[data-testid="payment-total-collected"]')).toContainText('5000');

// API call başarılı
await page.waitForResponse(response => 
  response.url().includes('/payments') && 
  response.status() === 201
);
```

**Gerekli TestID'ler**:
- `payment-add-button`
- `payment-amount-input`
- `payment-method-select`
- `payment-date-input`
- `payment-submit-button`
- `success-toast`
- `payment-history-item`
- `payment-remaining-amount`
- `payment-total-collected`

---

## PAYMENT-003: Kredi Kartı Ödemesi (Taksitli)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. "Ödeme Ekle" butonuna tıkla
4. Tutar: 6000 TL
5. Ödeme yöntemi: "Kredi Kartı" seç
6. Taksit sayısı: 3 seç
7. Komisyon oranı: %5 (otomatik hesaplandı)
8. Komisyon tutarı: 300 TL
9. Net tutar: 5700 TL
10. "Kaydet" butonuna tıkla
11. Success toast göründü
12. Ödeme geçmişinde görünüyor (3 taksit bilgisi ile)
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="payment-history-item"]').first()).toContainText('3 taksit');
```

**Gerekli TestID'ler**:
- `payment-method-select`
- `payment-installment-select`
- `payment-commission-rate-input`
- `payment-commission-amount-display`
- `payment-net-amount-display`

---

## PAYMENT-004: Havale Ödemesi

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. "Ödeme Ekle" butonuna tıkla
4. Tutar: 4000 TL
5. Ödeme yöntemi: "Havale" seç
6. Banka: "Ziraat Bankası"
7. Referans no: "REF123456"
8. "Kaydet" butonuna tıkla
9. Success toast göründü
10. Ödeme geçmişinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="payment-history-item"]').first()).toContainText('Havale');
```

**Gerekli TestID'ler**:
- `payment-bank-input`
- `payment-reference-input`

---

## PAYMENT-005: Senet Ödemesi

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 25 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. "Ödeme Ekle" butonuna tıkla
4. Tutar: 5000 TL
5. Ödeme yöntemi: "Senet" seç
6. Senet no: "SN-001"
7. Vade tarihi: 30 gün sonra
8. Banka: "İş Bankası"
9. "Kaydet" butonuna tıkla
10. Success toast göründü
11. Ödeme geçmişinde görünüyor
12. "Senet Takip" sekmesine git
13. Yeni senet görünüyor (durum: "Beklemede")
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="promissory-note-item"]').first()).toContainText('SN-001');
```

**Gerekli TestID'ler**:
- `payment-method-select`
- `payment-promissory-note-number-input`
- `payment-promissory-note-due-date-input`
- `payment-promissory-note-bank-input`
- `promissory-notes-tab`
- `promissory-note-item`

---

## PAYMENT-006: Parçalı Ödeme (Nakit + Kredi Kartı + Senet)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 30 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç (Toplam: 15000 TL)
3. Ödeme 1: 3000 TL Nakit ekle
4. Kalan: 12000 TL
5. Ödeme 2: 7000 TL Kredi Kartı (3 taksit) ekle
6. Kalan: 5000 TL
7. Ödeme 3: 5000 TL Senet ekle
8. Kalan: 0 TL
9. Success toast: "Ödeme tamamlandı"
10. Satış durumu: "Ödendi" olarak güncellendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText('0');
await expect(page.locator('[data-testid="success-toast"]')).toContainText('tamamlandı');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Kalan tutar 0
await expect(page.locator('[data-testid="payment-remaining-amount"]')).toContainText('0');

// Toplam tahsilat 15000
await expect(page.locator('[data-testid="payment-total-collected"]')).toContainText('15000');

// 3 ödeme geçmişinde
await expect(page.locator('[data-testid="payment-history-item"]')).toHaveCount(3);

// Satış durumu güncellendi
await page.locator('[data-testid="payment-modal-close"]').click();
await expect(page.locator('[data-testid="sale-payment-status"]')).toContainText('Ödendi');
```

---

## PAYMENT-007: Fazla Ödeme Engelleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç (Toplam: 15000 TL, Kalan: 5000 TL)
3. "Ödeme Ekle" butonuna tıkla
4. Tutar: 6000 TL (fazla)
5. "Kaydet" butonuna tıkla
6. Error toast: "Ödeme tutarı kalan tutarı aşamaz"
7. Ödeme eklenmedi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="error-toast"]')).toContainText('aşamaz');
```

**Gerekli TestID'ler**:
- `error-toast`

---

## PAYMENT-008: Ödeme Silme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. İlk ödemenin "Sil" butonuna tıkla
4. Onay dialog'u açıldı
5. "Evet, Sil" butonuna tıkla
6. Success toast göründü
7. Ödeme geçmişinden silindi
8. Kalan tutar güncellendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="payment-history-item"]')).toHaveCount(2);
```

**Gerekli TestID'ler**:
- `payment-delete-button`
- `confirm-dialog`
- `confirm-dialog-yes-button`

---

## PAYMENT-009: Senet Tahsil Etme

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. "Senet Takip" sekmesine git
4. Vadesi gelen senetin "Tahsil Et" butonuna tıkla
5. Tahsil modalı açıldı
6. Tahsil tarihi: Bugün
7. Tahsil yöntemi: "Nakit" seç
8. Not: "Tahsil edildi"
9. "Kaydet" butonuna tıkla
10. Success toast göründü
11. Senet durumu: "Tahsil Edildi" olarak güncellendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="promissory-note-status"]')).toContainText('Tahsil Edildi');
```

**Gerekli TestID'ler**:
- `promissory-notes-tab`
- `promissory-note-collect-button`
- `promissory-note-collect-modal`
- `promissory-note-collect-date-input`
- `promissory-note-collect-method-select`
- `promissory-note-collect-note-input`
- `promissory-note-collect-submit-button`
- `promissory-note-status`

---

## PAYMENT-010: Vadesi Geçmiş Senet Uyarısı

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. "Senet Takip" sekmesine git
4. Vadesi geçmiş senet kırmızı renkte görünüyor
5. Uyarı ikonu var
6. Tooltip: "Vade tarihi geçti"
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="promissory-note-overdue"]')).toBeVisible();
await expect(page.locator('[data-testid="promissory-note-overdue"]')).toHaveClass(/text-red/);
```

**Gerekli TestID'ler**:
- `promissory-note-overdue`
- `promissory-note-warning-icon`

---

## PAYMENT-011: Ödeme Geçmişi Filtreleme

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. Ödeme yöntemi filtresi: "Nakit" seç
4. Sadece nakit ödemeler görünüyor
5. Ödeme yöntemi filtresi: "Tümü" seç
6. Tüm ödemeler görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="payment-history-item"]')).toHaveCount(3);
```

**Gerekli TestID'ler**:
- `payment-method-filter`

---

## PAYMENT-012: Ödeme Geçmişi Export (PDF)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. "Dışa Aktar" butonuna tıkla
4. PDF dosyası indirildi
5. PDF'i aç
6. Tüm ödemeler PDF'de görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
const download = await page.waitForEvent('download');
expect(download.suggestedFilename()).toContain('.pdf');
```

**Gerekli TestID'ler**:
- `payment-export-button`

---

## PAYMENT-013: Toplu Tahsilat (Birden Fazla Satış)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 25 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → Satışlar sekmesi
3. Birden fazla satış seç (checkbox)
4. "Toplu Tahsilat" butonuna tıkla
5. Toplu tahsilat modalı açıldı
6. Toplam tutar: 30000 TL (3 satış)
7. Ödeme ekle: 30000 TL Nakit
8. "Kaydet" butonuna tıkla
9. Success toast: "3 satış için ödeme eklendi"
10. Tüm satışların ödeme durumu güncellendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('3 satış');
```

**Gerekli TestID'ler**:
- `sale-checkbox`
- `bulk-collection-button`
- `bulk-collection-modal`
- `bulk-collection-total-amount`
- `bulk-collection-submit-button`

---

## PAYMENT-014: Ödeme İptali (İade)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Tahsilat modalı aç
3. İlk ödemenin "İptal Et" butonuna tıkla
4. İptal nedeni modalı açıldı
5. Neden: "Müşteri talebi"
6. "İptal Et" butonuna tıkla
7. Success toast göründü
8. Ödeme durumu: "İptal Edildi"
9. Kalan tutar güncellendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="payment-status"]')).toContainText('İptal Edildi');
```

**Gerekli TestID'ler**:
- `payment-cancel-button`
- `payment-cancel-modal`
- `payment-cancel-reason-input`
- `payment-cancel-submit-button`
- `payment-status`

---

## PAYMENT-015: Ödeme Hatırlatıcısı

**Faz**: 3 (Fix Common Issues)  
**Öncelik**: P2  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Dashboard'a git
3. "Bekleyen Ödemeler" widget'ı görünüyor
4. 5 satış için ödeme bekliyor
5. Toplam tutar: 50000 TL
6. "Detayları Gör" butonuna tıkla
7. Bekleyen ödemeler sayfası açıldı
8. Tüm bekleyen satışlar listeleniyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="pending-payments-widget"]')).toBeVisible();
await expect(page.locator('[data-testid="pending-payments-count"]')).toContainText('5');
```

**Gerekli TestID'ler**:
- `pending-payments-widget`
- `pending-payments-count`
- `pending-payments-total`
- `pending-payments-details-button`

---

## 📊 PAYMENT Tests Özeti

| Test ID | Açıklama | Öncelik | Faz | Süre |
|---------|----------|---------|-----|------|
| PAYMENT-001 | Tahsilat Modalı Açma | P0 | 1 | 10 dk |
| PAYMENT-002 | Nakit Ödeme | P0 | 1 | 15 dk |
| PAYMENT-003 | Kredi Kartı (Taksitli) | P0 | 1 | 20 dk |
| PAYMENT-004 | Havale Ödemesi | P1 | 1 | 15 dk |
| PAYMENT-005 | Senet Ödemesi | P0 | 1 | 25 dk |
| PAYMENT-006 | Parçalı Ödeme | P0 | 1 | 30 dk |
| PAYMENT-007 | Fazla Ödeme Engelleme | P1 | 1 | 15 dk |
| PAYMENT-008 | Ödeme Silme | P1 | 1 | 15 dk |
| PAYMENT-009 | Senet Tahsil Etme | P0 | 1 | 20 dk |
| PAYMENT-010 | Vadesi Geçmiş Senet | P1 | 2 | 15 dk |
| PAYMENT-011 | Ödeme Filtreleme | P2 | 2 | 15 dk |
| PAYMENT-012 | Ödeme Export | P2 | 2 | 15 dk |
| PAYMENT-013 | Toplu Tahsilat | P2 | 2 | 25 dk |
| PAYMENT-014 | Ödeme İptali | P2 | 2 | 20 dk |
| PAYMENT-015 | Ödeme Hatırlatıcısı | P2 | 3 | 20 dk |

**Toplam Süre**: ~275 dakika (~4.5 saat)

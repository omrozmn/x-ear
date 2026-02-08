# Communication Tests (COMM)

**Kategori**: Communication (SMS, Email, Notifications)  
**Öncelik**: P0 (Critical - Customer Communication)  
**Toplam Test**: 15

---

## COMM-001: SMS Gönderimi (Tekil)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "İletişim" sekmesine tıkla
4. "SMS Gönder" butonuna tıkla
5. SMS modalı açıldı
6. Şablon seç: "Randevu Hatırlatma"
7. Mesaj otomatik doldu
8. Mesajı düzenle (opsiyonel)
9. "Gönder" butonuna tıkla
10. Success toast: "SMS gönderildi"
11. SMS geçmişinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('SMS gönderildi');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Success toast
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('SMS gönderildi');

// SMS geçmişinde
const firstSMS = page.locator('[data-testid="sms-history-item"]').first();
await expect(firstSMS).toContainText('Randevu Hatırlatma');
await expect(firstSMS).toContainText('Bugün');
await expect(firstSMS).toContainText('Gönderildi');

// API call başarılı
await page.waitForResponse(response => 
  response.url().includes('/sms/send') && 
  response.status() === 200
);

// Kredi düştü
const creditBefore = await page.locator('[data-testid="sms-credit"]').textContent();
await page.reload();
const creditAfter = await page.locator('[data-testid="sms-credit"]').textContent();
expect(parseInt(creditAfter)).toBe(parseInt(creditBefore) - 1);
```

**Gerekli TestID'ler**:
- `communication-tab`
- `sms-send-button`
- `sms-modal`
- `sms-template-select`
- `sms-message-input`
- `sms-submit-button`
- `success-toast`
- `sms-history-item`
- `sms-credit`

---

## COMM-002: SMS Gönderimi (Toplu)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 25 dakika

**Flow**:
```
1. Login ol
2. "Hastalar" sayfasına git
3. Birden fazla hasta seç (checkbox)
4. "Toplu SMS" butonuna tıkla
5. SMS modalı açıldı
6. Alıcı sayısı: 10 hasta
7. Şablon seç: "Kampanya Bildirimi"
8. Mesaj otomatik doldu
9. "Gönder" butonuna tıkla
10. Success toast: "10 SMS gönderildi"
11. SMS kredi düştü: -10
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('10 SMS');
```

**Gerekli TestID'ler**:
- `party-checkbox`
- `bulk-sms-button`
- `sms-modal`
- `sms-recipient-count`
- `sms-template-select`
- `sms-submit-button`

---

## COMM-003: Email Gönderimi (Tekil)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "İletişim" sekmesine tıkla
4. "Email Gönder" butonuna tıkla
5. Email modalı açıldı
6. Konu: "Randevu Hatırlatma"
7. Şablon seç: "Randevu Hatırlatma"
8. İçerik otomatik doldu
9. Ek dosya ekle (opsiyonel)
10. "Gönder" butonuna tıkla
11. Success toast: "Email gönderildi"
12. Email geçmişinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Email gönderildi');
```

**Gerekli TestID'ler**:
- `email-send-button`
- `email-modal`
- `email-subject-input`
- `email-template-select`
- `email-content-input`
- `email-attachment-input`
- `email-submit-button`
- `email-history-item`

---

## COMM-004: Email Gönderimi (Toplu)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 25 dakika

**Flow**:
```
1. Login ol
2. "Hastalar" sayfasına git
3. Birden fazla hasta seç (checkbox)
4. "Toplu Email" butonuna tıkla
5. Email modalı açıldı
6. Alıcı sayısı: 10 hasta
7. Konu: "Kampanya Bildirimi"
8. Şablon seç
9. "Gönder" butonuna tıkla
10. Success toast: "10 email gönderildi"
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toContainText('10 email');
```

---

## COMM-005: SMS Şablon Oluşturma

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. "Ayarlar" → "SMS Şablonları" sayfasına git
3. "Yeni Şablon" butonuna tıkla
4. Şablon adı: "Ödeme Hatırlatma"
5. Mesaj: "Sayın {hasta_adi}, {tutar} TL borcunuz bulunmaktadır."
6. "Kaydet" butonuna tıkla
7. Success toast göründü
8. Şablon listesinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="sms-template-item"]').first()).toContainText('Ödeme Hatırlatma');
```

**Gerekli TestID'ler**:
- `sms-template-create-button`
- `sms-template-modal`
- `sms-template-name-input`
- `sms-template-message-input`
- `sms-template-submit-button`
- `sms-template-item`

---

## COMM-006: Email Şablon Oluşturma

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. "Ayarlar" → "Email Şablonları" sayfasına git
3. "Yeni Şablon" butonuna tıkla
4. Şablon adı: "Ödeme Hatırlatma"
5. Konu: "Ödeme Hatırlatma"
6. İçerik: HTML editor ile oluştur
7. Değişkenler ekle: {hasta_adi}, {tutar}
8. "Kaydet" butonuna tıkla
9. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

---

## COMM-007: Bildirim Gönderimi (In-App)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol (Kullanıcı A)
2. Başka bir tarayıcıda login ol (Kullanıcı B)
3. Kullanıcı A: Yeni satış oluştur
4. Kullanıcı B: Bildirim geldi (bell icon)
5. Bildirim: "Yeni satış oluşturuldu"
6. Bildirime tıkla
7. Satış detay sayfası açıldı
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="notification-badge"]')).toBeVisible();
await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');
```

**Gerekli TestID'ler**:
- `notification-bell`
- `notification-badge`
- `notification-dropdown`
- `notification-item`

---

## COMM-008: Bildirim Ayarları

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. "Ayarlar" → "Bildirimler" sayfasına git
3. Email bildirimleri: Aç
4. SMS bildirimleri: Kapat
5. In-app bildirimleri: Aç
6. Bildirim tipleri seç:
   - Yeni satış: ✓
   - Yeni randevu: ✓
   - Ödeme alındı: ✓
7. "Kaydet" butonuna tıkla
8. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `notification-settings-email-toggle`
- `notification-settings-sms-toggle`
- `notification-settings-inapp-toggle`
- `notification-type-checkbox`
- `notification-settings-submit-button`

---

## COMM-009: SMS Kredi Yükleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "SMS Kredisi" sayfasına git
3. Mevcut kredi: 100
4. "Kredi Yükle" butonuna tıkla
5. Paket seç: 1000 SMS (50 TL)
6. Ödeme yöntemi: Kredi Kartı
7. "Satın Al" butonuna tıkla
8. Ödeme sayfası açıldı (POS entegrasyonu)
9. Ödeme başarılı
10. Success toast: "1000 SMS kredisi yüklendi"
11. Mevcut kredi: 1100
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toContainText('1000 SMS');
await expect(page.locator('[data-testid="sms-credit"]')).toContainText('1100');
```

**Gerekli TestID'ler**:
- `sms-credit-load-button`
- `sms-credit-package-select`
- `sms-credit-payment-method-select`
- `sms-credit-submit-button`
- `sms-credit`

---

## COMM-010: SMS Geçmişi Görüntüleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → İletişim
3. "SMS Geçmişi" sekmesine tıkla
4. Tüm gönderilen SMS'ler listeleniyor
5. Durum: Gönderildi/Başarısız
6. Tarih, saat, mesaj içeriği görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sms-history-item"]')).toHaveCount(5);
```

---

## COMM-011: Email Geçmişi Görüntüleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → İletişim
3. "Email Geçmişi" sekmesine tıkla
4. Tüm gönderilen email'ler listeleniyor
5. Durum: Gönderildi/Açıldı/Başarısız
6. Tarih, konu, içerik görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="email-history-item"]')).toHaveCount(3);
```

---

## COMM-012: SMS Filtreleme (Durum)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "İletişim" → "SMS Geçmişi" sayfasına git
3. Durum filtresi: "Başarısız" seç
4. Sadece başarısız SMS'ler görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="sms-history-item"]')).toHaveCount(2);
```

---

## COMM-013: Email Filtreleme (Tarih)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "İletişim" → "Email Geçmişi" sayfasına git
3. Tarih filtresi: "Son 7 gün" seç
4. Sadece son 7 gündeki email'ler görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="email-history-item"]')).toHaveCount(5);
```

---

## COMM-014: SMS/Email Export (Excel)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "İletişim" → "SMS Geçmişi" sayfasına git
3. "Dışa Aktar" butonuna tıkla
4. Excel dosyası indirildi
```

**Minimal Assertion (Faz 1)**:
```typescript
const download = await page.waitForEvent('download');
expect(download.suggestedFilename()).toContain('.xlsx');
```

---

## COMM-015: Bildirim Temizleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. Bildirim bell icon'a tıkla
3. 5 bildirim var
4. "Tümünü Okundu İşaretle" butonuna tıkla
5. Bildirim badge'i kayboldu
6. Bildirimler "okundu" olarak işaretlendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
```

---

## 📊 COMM Tests Özeti

| Test ID | Açıklama | Öncelik | Faz | Süre |
|---------|----------|---------|-----|------|
| COMM-001 | SMS Gönderimi (Tekil) | P0 | 1 | 20 dk |
| COMM-002 | SMS Gönderimi (Toplu) | P0 | 1 | 25 dk |
| COMM-003 | Email Gönderimi (Tekil) | P0 | 1 | 20 dk |
| COMM-004 | Email Gönderimi (Toplu) | P0 | 1 | 25 dk |
| COMM-005 | SMS Şablon Oluşturma | P1 | 1 | 15 dk |
| COMM-006 | Email Şablon Oluşturma | P1 | 1 | 20 dk |
| COMM-007 | Bildirim (In-App) | P0 | 1 | 15 dk |
| COMM-008 | Bildirim Ayarları | P1 | 1 | 15 dk |
| COMM-009 | SMS Kredi Yükleme | P0 | 1 | 20 dk |
| COMM-010 | SMS Geçmişi | P1 | 1 | 10 dk |
| COMM-011 | Email Geçmişi | P1 | 1 | 10 dk |
| COMM-012 | SMS Filtreleme | P1 | 1 | 10 dk |
| COMM-013 | Email Filtreleme | P1 | 1 | 10 dk |
| COMM-014 | SMS/Email Export | P2 | 2 | 10 dk |
| COMM-015 | Bildirim Temizleme | P1 | 1 | 10 dk |

**Toplam Süre**: ~235 dakika (~4 saat)

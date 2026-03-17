# Appointment Tests (APPOINTMENT)

**Kategori**: Appointment Management  
**Öncelik**: P0 (Critical - Customer Experience)  
**Toplam Test**: 15

---

## APPOINTMENT-001: Randevu Oluşturma

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git
3. "Randevular" sekmesine tıkla
4. "Yeni Randevu" butonuna tıkla
5. Modal açıldı
6. Tarih: Yarın
7. Saat: 14:00
8. Randevu tipi: "Kontrol" seç
9. Doktor/Uzman seç
10. Not: "İlk kontrol"
11. "Kaydet" butonuna tıkla
12. Success toast göründü
13. Randevu listesinde görünüyor
14. Takvimde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="appointment-list-item"]').first()).toContainText('14:00');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Success toast
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Randevu başarıyla oluşturuldu');

// Randevu listesinde
const firstAppointment = page.locator('[data-testid="appointment-list-item"]').first();
await expect(firstAppointment).toContainText('14:00');
await expect(firstAppointment).toContainText('Kontrol');
await expect(firstAppointment).toContainText('Yarın');

// Takvimde görünüyor
await page.locator('[data-testid="calendar-view"]').click();
await expect(page.locator('[data-testid="calendar-appointment"]')).toBeVisible();

// API call başarılı
await page.waitForResponse(response => 
  response.url().includes('/appointments') && 
  response.status() === 201
);
```

**Gerekli TestID'ler**:
- `appointments-tab`
- `appointment-create-button`
- `appointment-modal`
- `appointment-date-input`
- `appointment-time-input`
- `appointment-type-select`
- `appointment-doctor-select`
- `appointment-note-input`
- `appointment-submit-button`
- `success-toast`
- `appointment-list-item`
- `calendar-view`
- `calendar-appointment`

---

## APPOINTMENT-002: Randevu Güncelleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → Randevular
3. İlk randevunun "Düzenle" butonuna tıkla
4. Modal açıldı (bilgiler dolu)
5. Saat'i 15:00 olarak değiştir
6. "Kaydet" butonuna tıkla
7. Success toast göründü
8. Randevu listesinde güncellendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="appointment-list-item"]').first()).toContainText('15:00');
```

**Gerekli TestID'ler**:
- `appointment-edit-button`
- `appointment-modal`
- `appointment-time-input`
- `appointment-submit-button`

---

## APPOINTMENT-003: Randevu İptali

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → Randevular
3. İlk randevunun "İptal Et" butonuna tıkla
4. İptal nedeni modalı açıldı
5. Neden: "Hasta talebi" seç
6. "İptal Et" butonuna tıkla
7. Success toast göründü
8. Randevu durumu: "İptal Edildi"
9. Takvimden kaldırıldı
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="appointment-status"]')).toContainText('İptal Edildi');
```

**Gerekli TestID'ler**:
- `appointment-cancel-button`
- `appointment-cancel-modal`
- `appointment-cancel-reason-select`
- `appointment-cancel-submit-button`
- `appointment-status`

---

## APPOINTMENT-004: Randevu Hatırlatıcısı (SMS)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → Randevular
3. Yarınki randevunun "Hatırlatıcı Gönder" butonuna tıkla
4. SMS hatırlatıcı modalı açıldı
5. Mesaj şablonu otomatik doldu
6. "Gönder" butonuna tıkla
7. Success toast: "SMS gönderildi"
8. Randevu detayında "SMS gönderildi" işareti
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('SMS gönderildi');
```

**Gerekli TestID'ler**:
- `appointment-reminder-button`
- `appointment-reminder-modal`
- `appointment-reminder-message-input`
- `appointment-reminder-submit-button`
- `appointment-sms-sent-badge`

---

## APPOINTMENT-005: Randevu Takvim Görünümü

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. "Randevular" sayfasına git
3. Takvim görünümü açıldı
4. Bu haftanın randevuları görünüyor
5. Randevuya tıkla
6. Randevu detay modalı açıldı
7. Hasta bilgileri görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
await expect(page.locator('[data-testid="calendar-appointment"]')).toHaveCount(5);
```

**Gerekli TestID'ler**:
- `calendar-view`
- `calendar-appointment`
- `appointment-detail-modal`

---

## APPOINTMENT-006: Randevu Çakışma Kontrolü

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Yeni randevu oluştur
3. Tarih: Yarın 14:00
4. Doktor: Dr. Ahmet
5. "Kaydet" butonuna tıkla
6. Başka bir randevu oluştur
7. Tarih: Yarın 14:00 (aynı saat)
8. Doktor: Dr. Ahmet (aynı doktor)
9. "Kaydet" butonuna tıkla
10. Error toast: "Bu saatte randevu var"
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="error-toast"]')).toContainText('randevu var');
```

---

## APPOINTMENT-007: Randevu Tamamlama

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → Randevular
3. Bugünkü randevunun "Tamamla" butonuna tıkla
4. Tamamlama modalı açıldı
5. Not: "Kontrol yapıldı"
6. "Tamamla" butonuna tıkla
7. Success toast göründü
8. Randevu durumu: "Tamamlandı"
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="appointment-status"]')).toContainText('Tamamlandı');
```

---

## APPOINTMENT-008: Randevu Filtreleme (Tarih)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Randevular" sayfasına git
3. Tarih filtresi: "Bugün" seç
4. Sadece bugünkü randevular görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="appointment-list-item"]')).toHaveCount(3);
```

---

## APPOINTMENT-009: Randevu Filtreleme (Durum)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Randevular" sayfasına git
3. Durum filtresi: "Beklemede" seç
4. Sadece bekleyen randevular görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="appointment-list-item"]')).toHaveCount(5);
```

---

## APPOINTMENT-010: Randevu Arama (Hasta Adı)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Randevular" sayfasına git
3. Arama input'a "Ahmet" yaz
4. Sadece "Ahmet" içeren randevular görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="appointment-list-item"]')).toHaveCount(2);
```

---

## APPOINTMENT-011: Toplu Randevu Oluşturma

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. "Randevular" sayfasına git
3. "Toplu Randevu" butonuna tıkla
4. Excel dosyası yükle (10 randevu)
5. "Yükle" butonuna tıkla
6. Success toast: "10 randevu oluşturuldu"
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toContainText('10 randevu');
```

---

## APPOINTMENT-012: Randevu Export (Excel)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. "Randevular" sayfasına git
3. "Dışa Aktar" butonuna tıkla
4. Excel dosyası indirildi
```

**Minimal Assertion (Faz 1)**:
```typescript
const download = await page.waitForEvent('download');
expect(download.suggestedFilename()).toContain('.xlsx');
```

---

## APPOINTMENT-013: Randevu Tekrarlama (Periyodik)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Yeni randevu oluştur
3. "Tekrarla" checkbox'ını işaretle
4. Tekrar tipi: "Haftalık" seç
5. Tekrar sayısı: 4
6. "Kaydet" butonuna tıkla
7. Success toast: "4 randevu oluşturuldu"
8. Takvimde 4 randevu görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toContainText('4 randevu');
```

---

## APPOINTMENT-014: Randevu Bildirimi (Dashboard)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. Dashboard'a git
3. "Bugünkü Randevular" widget'ı görünüyor
4. 5 randevu var
5. "Detayları Gör" butonuna tıkla
6. Randevular sayfası açıldı
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="today-appointments-widget"]')).toBeVisible();
await expect(page.locator('[data-testid="today-appointments-count"]')).toContainText('5');
```

---

## APPOINTMENT-015: Randevu Geçmişi

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. Hasta detayına git → Randevular
3. "Geçmiş Randevular" sekmesine tıkla
4. Tamamlanan ve iptal edilen randevular görünüyor
5. Toplam: 10 randevu
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="appointment-history-item"]')).toHaveCount(10);
```

---

## 📊 APPOINTMENT Tests Özeti

| Test ID | Açıklama | Öncelik | Faz | Süre |
|---------|----------|---------|-----|------|
| APPOINTMENT-001 | Randevu Oluşturma | P0 | 1 | 20 dk |
| APPOINTMENT-002 | Randevu Güncelleme | P0 | 1 | 15 dk |
| APPOINTMENT-003 | Randevu İptali | P0 | 1 | 15 dk |
| APPOINTMENT-004 | Randevu Hatırlatıcısı (SMS) | P0 | 1 | 20 dk |
| APPOINTMENT-005 | Takvim Görünümü | P1 | 1 | 15 dk |
| APPOINTMENT-006 | Çakışma Kontrolü | P0 | 1 | 15 dk |
| APPOINTMENT-007 | Randevu Tamamlama | P1 | 1 | 15 dk |
| APPOINTMENT-008 | Filtreleme (Tarih) | P1 | 1 | 10 dk |
| APPOINTMENT-009 | Filtreleme (Durum) | P1 | 1 | 10 dk |
| APPOINTMENT-010 | Arama (Hasta Adı) | P1 | 1 | 10 dk |
| APPOINTMENT-011 | Toplu Randevu | P2 | 2 | 20 dk |
| APPOINTMENT-012 | Export (Excel) | P2 | 2 | 10 dk |
| APPOINTMENT-013 | Tekrarlama (Periyodik) | P2 | 2 | 20 dk |
| APPOINTMENT-014 | Bildirim (Dashboard) | P1 | 1 | 10 dk |
| APPOINTMENT-015 | Randevu Geçmişi | P1 | 1 | 10 dk |

**Toplam Süre**: ~215 dakika (~3.5 saat)

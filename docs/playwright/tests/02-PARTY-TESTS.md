# Party (Müşteri) Tests (PARTY)

**Kategori**: Party Management (CRUD)  
**Öncelik**: P0 (Core Business Logic)  
**Toplam Test**: 15

---

## PARTY-001: Party Oluşturma (Temel Bilgiler)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Yeni Müşteri" butonuna tıkla
4. Form modal'ı açıldı
5. Ad: "Ahmet" yaz
6. Soyad: "Yılmaz" yaz
7. Telefon: "+905551234567" yaz
8. "Kaydet" butonuna tıkla
9. Success toast göründü
10. Tabloda yeni party görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="party-table-row"]').first()).toContainText('Ahmet');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Success toast
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Müşteri başarıyla oluşturuldu');

// Toast 5 saniye sonra kayboldu
await expect(page.locator('[data-testid="success-toast"]')).not.toBeVisible({ timeout: 6000 });

// Modal kapandı
await expect(page.locator('[data-testid="party-form-modal"]')).not.toBeVisible();

// Tabloda görünüyor
const firstRow = page.locator('[data-testid="party-table-row"]').first();
await expect(firstRow).toContainText('Ahmet Yılmaz');
await expect(firstRow).toContainText('+905551234567');

// API call başarılı
await page.waitForResponse(response => 
  response.url().includes('/parties') && 
  response.status() === 201
);
```

**Gerekli TestID'ler**:
- `party-create-button`
- `party-form-modal`
- `party-first-name-input`
- `party-last-name-input`
- `party-phone-input`
- `party-submit-button`
- `success-toast`
- `party-table-row`

**Olası Fail Nedenleri**:
- [ ] TestID eksik
- [ ] Modal açılmıyor
- [ ] Form validation çalışmıyor
- [ ] API call başarısız
- [ ] Toast gösterilmiyor
- [ ] Tablo güncellen miyor

---

## PARTY-002: Party Oluşturma (Tüm Alanlar)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Yeni Müşteri" butonuna tıkla
4. Tüm alanları doldur:
   - Ad: "Mehmet"
   - Soyad: "Demir"
   - Telefon: "+905551234568"
   - Email: "mehmet@example.com"
   - TC Kimlik: "12345678901"
   - Adres: "İstanbul"
   - Doğum Tarihi: "01/01/1990"
5. "Kaydet" butonuna tıkla
6. Success toast göründü
7. Party detayına git
8. Tüm bilgilerin doğru göründüğünü kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `party-first-name-input`
- `party-last-name-input`
- `party-phone-input`
- `party-email-input`
- `party-tc-input`
- `party-address-input`
- `party-birth-date-input`
- `party-submit-button`

---

## PARTY-003: Party Güncelleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. İlk party'nin "Düzenle" butonuna tıkla
4. Form modal'ı açıldı (bilgiler dolu)
5. Ad'ı "Ayşe" olarak değiştir
6. "Kaydet" butonuna tıkla
7. Success toast göründü
8. Tabloda güncellenen party görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="party-table-row"]').first()).toContainText('Ayşe');
```

**Gerekli TestID'ler**:
- `party-edit-button`
- `party-form-modal`
- `party-first-name-input`
- `party-submit-button`
- `success-toast`

---

## PARTY-004: Party Silme (Soft Delete)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. İlk party'nin "Sil" butonuna tıkla
4. Onay dialog'u açıldı
5. "Evet, Sil" butonuna tıkla
6. Success toast göründü
7. Party tablodan kayboldu
8. "Arşivlenenler" sekmesine git
9. Silinen party görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="party-table-row"]').first()).not.toContainText('Ahmet');
```

**Gerekli TestID'ler**:
- `party-delete-button`
- `confirm-dialog`
- `confirm-dialog-yes-button`
- `success-toast`
- `archived-tab`

---

## PARTY-005: Party Arama (İsim)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. Arama input'a "Ahmet" yaz
4. Tabloda sadece "Ahmet" içeren party'ler görünüyor
5. Arama input'u temizle
6. Tüm party'ler görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="party-table-row"]')).toHaveCount(1);
await expect(page.locator('[data-testid="party-table-row"]').first()).toContainText('Ahmet');
```

**Gerekli TestID'ler**:
- `party-search-input`
- `party-table-row`

---

## PARTY-006: Party Arama (Telefon)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. Arama input'a "555123" yaz
4. Tabloda sadece telefonu "555123" içeren party'ler görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="party-table-row"]')).toHaveCount(1);
```

**Gerekli TestID'ler**:
- `party-search-input`
- `party-table-row`

---

## PARTY-007: Party Filtreleme (Rol)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. Rol filtresi: "PATIENT" seç
4. Tabloda sadece PATIENT rolü olan party'ler görünüyor
5. Rol filtresi: "Tümü" seç
6. Tüm party'ler görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="party-table-row"]')).toHaveCount(5);
```

**Gerekli TestID'ler**:
- `party-role-filter`
- `party-table-row`

---

## PARTY-008: Party Pagination

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. Sayfa 1'de 10 party görünüyor
4. "Sonraki" butonuna tıkla
5. Sayfa 2'de 10 party görünüyor
6. "Önceki" butonuna tıkla
7. Sayfa 1'e geri döndü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="party-table-row"]')).toHaveCount(10);
```

**Gerekli TestID'ler**:
- `pagination-next-button`
- `pagination-prev-button`
- `pagination-page-number`
- `party-table-row`

---

## PARTY-009: Party Detay Görüntüleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. İlk party'ye tıkla
4. Party detay sayfası açıldı
5. Tüm bilgiler görünüyor:
   - Ad, Soyad
   - Telefon, Email
   - TC Kimlik
   - Adres
   - Doğum Tarihi
   - Roller
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page).toHaveURL(/\/parties\/[a-z0-9-]+/);
await expect(page.locator('[data-testid="party-detail-name"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `party-table-row`
- `party-detail-name`
- `party-detail-phone`
- `party-detail-email`
- `party-detail-tc`
- `party-detail-address`
- `party-detail-birth-date`
- `party-detail-roles`

---

## PARTY-010: Party Bulk Upload (CSV)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Toplu Yükle" butonuna tıkla
4. CSV dosyası seç (10 party)
5. "Yükle" butonuna tıkla
6. Progress bar göründü
7. Success toast: "10 müşteri başarıyla eklendi"
8. Tabloda yeni party'ler görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('10 müşteri');
```

**Gerekli TestID'ler**:
- `party-bulk-upload-button`
- `party-bulk-upload-modal`
- `party-bulk-upload-file-input`
- `party-bulk-upload-submit-button`
- `party-bulk-upload-progress`
- `success-toast`

---

## PARTY-011: TC Kimlik Validasyonu

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Yeni Müşteri" butonuna tıkla
4. TC Kimlik: "12345" yaz (geçersiz)
5. "Kaydet" butonuna tıkla
6. Error message: "Geçersiz TC Kimlik numarası"
7. TC Kimlik: "12345678901" yaz (geçerli)
8. "Kaydet" butonuna tıkla
9. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="party-tc-input-error"]')).toBeVisible();
await expect(page.locator('[data-testid="party-tc-input-error"]')).toContainText('Geçersiz');
```

**Gerekli TestID'ler**:
- `party-tc-input`
- `party-tc-input-error`
- `party-submit-button`

---

## PARTY-012: Telefon Formatı Validasyonu

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Yeni Müşteri" butonuna tıkla
4. Telefon: "123" yaz (geçersiz)
5. "Kaydet" butonuna tıkla
6. Error message: "Geçersiz telefon numarası"
7. Telefon: "+905551234567" yaz (geçerli)
8. "Kaydet" butonuna tıkla
9. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="party-phone-input-error"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `party-phone-input`
- `party-phone-input-error`

---

## PARTY-013: Email Formatı Validasyonu

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Yeni Müşteri" butonuna tıkla
4. Email: "invalid-email" yaz (geçersiz)
5. "Kaydet" butonuna tıkla
6. Error message: "Geçersiz email adresi"
7. Email: "test@example.com" yaz (geçerli)
8. "Kaydet" butonuna tıkla
9. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="party-email-input-error"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `party-email-input`
- `party-email-input-error`

---

## PARTY-014: Party Export (CSV)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Dışa Aktar" butonuna tıkla
4. CSV dosyası indirildi
5. CSV dosyasını aç
6. Tüm party'ler CSV'de görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
const download = await page.waitForEvent('download');
expect(download.suggestedFilename()).toContain('.csv');
```

**Gerekli TestID'ler**:
- `party-export-button`

---

## PARTY-015: Party Arşivden Geri Yükleme

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Arşivlenenler" sekmesine git
4. İlk party'nin "Geri Yükle" butonuna tıkla
5. Onay dialog'u açıldı (Super admin onayı gerekli)
6. Super admin olarak onayla
7. Success toast göründü
8. "Aktif" sekmesine git
9. Geri yüklenen party görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `archived-tab`
- `party-restore-button`
- `confirm-dialog`
- `success-toast`

---

## 📊 PARTY Tests Özeti

| Test ID | Açıklama | Öncelik | Faz | Süre |
|---------|----------|---------|-----|------|
| PARTY-001 | Party Oluşturma (Temel) | P0 | 1 | 15 dk |
| PARTY-002 | Party Oluşturma (Tüm Alanlar) | P1 | 1 | 20 dk |
| PARTY-003 | Party Güncelleme | P0 | 1 | 15 dk |
| PARTY-004 | Party Silme | P1 | 1 | 10 dk |
| PARTY-005 | Party Arama (İsim) | P1 | 1 | 10 dk |
| PARTY-006 | Party Arama (Telefon) | P1 | 1 | 10 dk |
| PARTY-007 | Party Filtreleme (Rol) | P2 | 2 | 10 dk |
| PARTY-008 | Party Pagination | P1 | 1 | 10 dk |
| PARTY-009 | Party Detay Görüntüleme | P1 | 1 | 10 dk |
| PARTY-010 | Party Bulk Upload | P2 | 2 | 20 dk |
| PARTY-011 | TC Kimlik Validasyonu | P1 | 1 | 10 dk |
| PARTY-012 | Telefon Validasyonu | P1 | 1 | 10 dk |
| PARTY-013 | Email Validasyonu | P1 | 1 | 10 dk |
| PARTY-014 | Party Export | P2 | 2 | 10 dk |
| PARTY-015 | Arşivden Geri Yükleme | P2 | 2 | 15 dk |

**Toplam Süre**: ~185 dakika (~3 saat)

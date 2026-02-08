# Settings & User Management Tests (SETTINGS)

**Kategori**: Settings, User Management, Branch Management  
**Öncelik**: P0 (Critical - System Configuration)  
**Toplam Test**: 20

---

## SETTINGS-001: Kullanıcı Profili Güncelleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. User menu → "Profil" tıkla
3. Profil sayfası açıldı
4. Ad: "Mehmet" olarak değiştir
5. Telefon: "+905559876543" olarak değiştir
6. "Kaydet" butonuna tıkla
7. Success toast göründü
8. User menu'de yeni ad görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="user-name"]')).toContainText('Mehmet');
```

**Gerekli TestID'ler**:
- `user-menu`
- `user-profile-link`
- `profile-first-name-input`
- `profile-phone-input`
- `profile-submit-button`
- `success-toast`
- `user-name`

---

## SETTINGS-002: Şifre Değiştirme

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. User menu → "Profil" → "Şifre Değiştir"
3. Mevcut şifre: "oldpassword"
4. Yeni şifre: "newpassword123"
5. Yeni şifre tekrar: "newpassword123"
6. "Kaydet" butonuna tıkla
7. Success toast göründü
8. Logout ol
9. Yeni şifre ile login ol
10. Login başarılı
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page).toHaveURL('/dashboard');
```

**Gerekli TestID'ler**:
- `password-change-button`
- `password-current-input`
- `password-new-input`
- `password-confirm-input`
- `password-submit-button`

---

## SETTINGS-003: Kullanıcı Oluşturma

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Kullanıcılar" sayfasına git
3. "Yeni Kullanıcı" butonuna tıkla
4. Modal açıldı
5. Ad: "Ayşe"
6. Soyad: "Demir"
7. Email: "ayse@example.com"
8. Telefon: "+905551112233"
9. Rol: "Audiologist" seç
10. Şube: "Merkez Şube" seç
11. "Kaydet" butonuna tıkla
12. Success toast göründü
13. Kullanıcı listesinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="user-list-item"]').first()).toContainText('Ayşe');
```

**Gerekli TestID'ler**:
- `user-create-button`
- `user-modal`
- `user-first-name-input`
- `user-last-name-input`
- `user-email-input`
- `user-phone-input`
- `user-role-select`
- `user-branch-select`
- `user-submit-button`
- `user-list-item`

---

## SETTINGS-004: Kullanıcı Rol Atama

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Kullanıcılar" sayfasına git
3. İlk kullanıcının "Düzenle" butonuna tıkla
4. Rol: "Manager" olarak değiştir
5. "Kaydet" butonuna tıkla
6. Success toast göründü
7. Kullanıcı listesinde rol güncellendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="user-list-item"]').first()).toContainText('Manager');
```

---

## SETTINGS-005: Kullanıcı Deaktif Etme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Kullanıcılar" sayfasına git
3. İlk kullanıcının "Deaktif Et" butonuna tıkla
4. Onay dialog'u açıldı
5. "Evet, Deaktif Et" butonuna tıkla
6. Success toast göründü
7. Kullanıcı durumu: "Deaktif"
8. Kullanıcı login yapamıyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="user-status"]')).toContainText('Deaktif');
```

---

## SETTINGS-006: Şube Oluşturma

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Şubeler" sayfasına git
3. "Yeni Şube" butonuna tıkla
4. Modal açıldı
5. Şube adı: "Kadıköy Şubesi"
6. Adres: "Kadıköy, İstanbul"
7. Telefon: "+902161234567"
8. Email: "kadikoy@example.com"
9. Yönetici: "Mehmet Yılmaz" seç
10. "Kaydet" butonuna tıkla
11. Success toast göründü
12. Şube listesinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="branch-list-item"]').first()).toContainText('Kadıköy');
```

**Gerekli TestID'ler**:
- `branch-create-button`
- `branch-modal`
- `branch-name-input`
- `branch-address-input`
- `branch-phone-input`
- `branch-email-input`
- `branch-manager-select`
- `branch-submit-button`
- `branch-list-item`

---

## SETTINGS-007: Şube Güncelleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Şubeler" sayfasına git
3. İlk şubenin "Düzenle" butonuna tıkla
4. Telefon: "+902169876543" olarak değiştir
5. "Kaydet" butonuna tıkla
6. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

---

## SETTINGS-008: Rol İzinleri Yönetimi

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 25 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Roller ve İzinler" sayfasına git
3. "Audiologist" rolüne tıkla
4. İzinler listesi açıldı
5. İzinler:
   - parties.view: ✓
   - parties.create: ✓
   - parties.edit: ✓
   - parties.delete: ✗
   - sales.view: ✓
   - sales.create: ✓
   - invoices.view: ✓
   - invoices.create: ✗
6. "Kaydet" butonuna tıkla
7. Success toast göründü
8. Audiologist kullanıcısı ile login ol
9. Party silemez (buton disabled)
10. Fatura oluşturamaz (buton disabled)
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="party-delete-button"]')).toBeDisabled();
```

**Gerekli TestID'ler**:
- `role-list-item`
- `permission-checkbox`
- `permission-submit-button`

---

## SETTINGS-009: Yeni Rol Oluşturma

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Roller ve İzinler" sayfasına git
3. "Yeni Rol" butonuna tıkla
4. Rol adı: "Sales Manager"
5. Açıklama: "Satış yöneticisi"
6. İzinler seç:
   - parties.*: ✓
   - sales.*: ✓
   - payments.*: ✓
   - invoices.view: ✓
7. "Kaydet" butonuna tıkla
8. Success toast göründü
9. Rol listesinde görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="role-list-item"]').first()).toContainText('Sales Manager');
```

---

## SETTINGS-010: Sistem Ayarları (Genel)

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Sistem Ayarları" sayfasına git
3. Şirket adı: "X-Ear Klinik"
4. Logo yükle
5. Varsayılan dil: "Türkçe"
6. Varsayılan para birimi: "TRY"
7. Zaman dilimi: "Europe/Istanbul"
8. "Kaydet" butonuna tıkla
9. Success toast göründü
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `system-company-name-input`
- `system-logo-upload`
- `system-language-select`
- `system-currency-select`
- `system-timezone-select`
- `system-submit-button`

---

## SETTINGS-011: SGK Ayarları

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "SGK Ayarları" sayfasına git
3. SGK şemaları:
   - 0-18 yaş: 3000 TL
   - 18+ çalışan: 3500 TL
   - 18+ emekli: 4000 TL
   - 65+ yaş: 4500 TL
4. Pil ödemesi: 698 TL (104 adet)
5. "Kaydet" butonuna tıkla
6. Success toast göründü
7. Yeni satışta SGK hesaplaması güncellendi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `sgk-scheme-input`
- `sgk-pill-payment-input`
- `sgk-submit-button`

---

## SETTINGS-012: E-Fatura Ayarları

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "E-Fatura Ayarları" sayfasına git
3. Entegrasyon: "BirFatura" seç
4. API Key: "xxx-xxx-xxx"
5. Test modu: Aç
6. "Bağlantıyı Test Et" butonuna tıkla
7. Success toast: "Bağlantı başarılı"
8. "Kaydet" butonuna tıkla
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Bağlantı başarılı');
```

---

## SETTINGS-013: SMS Ayarları

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "SMS Ayarları" sayfasına git
3. Sağlayıcı: "VatanSMS" seç
4. API Key: "xxx-xxx-xxx"
5. Gönderici adı: "XEAR"
6. "Bağlantıyı Test Et" butonuna tıkla
7. Test SMS gönderildi
8. Success toast: "Test SMS gönderildi"
9. "Kaydet" butonuna tıkla
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Test SMS');
```

---

## SETTINGS-014: Email Ayarları (SMTP)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Email Ayarları" sayfasına git
3. SMTP Host: "smtp.gmail.com"
4. SMTP Port: "587"
5. SMTP User: "noreply@xear.com"
6. SMTP Password: "xxx"
7. "Bağlantıyı Test Et" butonuna tıkla
8. Test email gönderildi
9. Success toast: "Test email gönderildi"
10. "Kaydet" butonuna tıkla
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Test email');
```

---

## SETTINGS-015: Yedekleme Ayarları

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Yedekleme" sayfasına git
3. Otomatik yedekleme: Aç
4. Yedekleme sıklığı: "Günlük"
5. Yedekleme saati: "03:00"
6. "Kaydet" butonuna tıkla
7. Success toast göründü
8. "Şimdi Yedekle" butonuna tıkla
9. Yedekleme başladı
10. Success toast: "Yedekleme tamamlandı"
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Yedekleme tamamlandı');
```

---

## SETTINGS-016: Audit Log Görüntüleme

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Audit Log" sayfasına git
3. Tüm sistem olayları listeleniyor:
   - Kullanıcı login
   - Party oluşturma
   - Satış oluşturma
   - Fatura kesme
   - Ayar değişikliği
4. Filtreleme: "Satış oluşturma" seç
5. Sadece satış olayları görünüyor
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="audit-log-item"]')).toHaveCount(10);
```

**Gerekli TestID'ler**:
- `audit-log-item`
- `audit-log-filter`

---

## SETTINGS-017: Kullanıcı Aktivite Raporu

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol (Admin)
2. "Ayarlar" → "Kullanıcı Aktivitesi" sayfasına git
3. Kullanıcı seç: "Mehmet Yılmaz"
4. Tarih aralığı: "Son 30 gün"
5. Aktivite raporu göründü:
   - Login sayısı: 45
   - Oluşturulan party: 20
   - Oluşturulan satış: 15
   - Kesilen fatura: 10
6. "Dışa Aktar" butonuna tıkla
7. PDF indirildi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="activity-report"]')).toBeVisible();
```

---

## SETTINGS-018: Tema Ayarları

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P3  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. User menu → "Ayarlar"
3. Tema: "Koyu Mod" seç
4. "Kaydet" butonuna tıkla
5. Success toast göründü
6. Tema koyu moda geçti
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('body')).toHaveClass(/dark/);
```

---

## SETTINGS-019: Dil Ayarları

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P3  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. Login ol
2. User menu → "Ayarlar"
3. Dil: "English" seç
4. "Kaydet" butonuna tıkla
5. Success toast göründü
6. Tüm metinler İngilizce'ye çevrildi
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Dashboard');
```

---

## SETTINGS-020: İki Faktörlü Kimlik Doğrulama (2FA)

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. User menu → "Güvenlik"
3. "2FA Aktif Et" butonuna tıkla
4. QR kod göründü
5. Authenticator app ile tara
6. Doğrulama kodu gir: "123456"
7. "Aktif Et" butonuna tıkla
8. Success toast: "2FA aktif edildi"
9. Logout ol
10. Login ol
11. 2FA kodu istendi
12. Kodu gir
13. Login başarılı
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="2fa-input"]')).toBeVisible();
```

---

## 📊 SETTINGS Tests Özeti

| Test ID | Açıklama | Öncelik | Faz | Süre |
|---------|----------|---------|-----|------|
| SETTINGS-001 | Kullanıcı Profili | P0 | 1 | 15 dk |
| SETTINGS-002 | Şifre Değiştirme | P0 | 1 | 15 dk |
| SETTINGS-003 | Kullanıcı Oluşturma | P0 | 1 | 20 dk |
| SETTINGS-004 | Kullanıcı Rol Atama | P0 | 1 | 15 dk |
| SETTINGS-005 | Kullanıcı Deaktif Etme | P1 | 1 | 15 dk |
| SETTINGS-006 | Şube Oluşturma | P0 | 1 | 20 dk |
| SETTINGS-007 | Şube Güncelleme | P1 | 1 | 15 dk |
| SETTINGS-008 | Rol İzinleri | P0 | 1 | 25 dk |
| SETTINGS-009 | Yeni Rol Oluşturma | P1 | 1 | 20 dk |
| SETTINGS-010 | Sistem Ayarları | P1 | 1 | 15 dk |
| SETTINGS-011 | SGK Ayarları | P0 | 1 | 20 dk |
| SETTINGS-012 | E-Fatura Ayarları | P0 | 1 | 20 dk |
| SETTINGS-013 | SMS Ayarları | P0 | 1 | 20 dk |
| SETTINGS-014 | Email Ayarları | P0 | 1 | 20 dk |
| SETTINGS-015 | Yedekleme | P2 | 2 | 15 dk |
| SETTINGS-016 | Audit Log | P1 | 1 | 15 dk |
| SETTINGS-017 | Aktivite Raporu | P2 | 2 | 15 dk |
| SETTINGS-018 | Tema Ayarları | P3 | 2 | 10 dk |
| SETTINGS-019 | Dil Ayarları | P3 | 2 | 10 dk |
| SETTINGS-020 | 2FA | P2 | 2 | 20 dk |

**Toplam Süre**: ~335 dakika (~5.5 saat)

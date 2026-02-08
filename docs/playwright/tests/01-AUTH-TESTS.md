# Authentication Tests (AUTH)

**Kategori**: Authentication & Authorization  
**Öncelik**: P0 (CI Blocker)  
**Toplam Test**: 10

---

## AUTH-001: Email ile Login (Happy Path)

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. /login sayfasına git
2. Email input'a "test@example.com" yaz
3. Password input'a "password123" yaz
4. "Giriş Yap" butonuna tıkla
5. /dashboard'a yönlendirildiğini kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page).toHaveURL('/dashboard');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// URL check
await expect(page).toHaveURL('/dashboard');

// User menu visible
await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

// User name displayed
await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');

// Auth token in cookies
const cookies = await context.cookies();
expect(cookies.find(c => c.name === 'access_token')).toBeDefined();

// No error toast
await expect(page.locator('[data-testid="error-toast"]')).not.toBeVisible();
```

**Gerekli TestID'ler**:
- `login-identifier-input`
- `login-password-input`
- `login-submit-button`
- `user-menu`
- `user-name`
- `error-toast`

**Olası Fail Nedenleri**:
- [ ] TestID eksik
- [ ] Auth token cookie'ye yazılmıyor
- [ ] Redirect timing problemi
- [ ] Toast overlay blocking

---

## AUTH-002: Telefon ile Login + OTP

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. /login sayfasına git
2. Phone input'a "+905551234567" yaz
3. "Giriş Yap" butonuna tıkla
4. OTP modal'ının açıldığını kontrol et
5. OTP input'a "123456" yaz (test OTP - mock)
6. "Doğrula" butonuna tıkla
7. /dashboard'a yönlendirildiğini kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="otp-modal"]')).toBeVisible();
await expect(page).toHaveURL('/dashboard');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// OTP modal açıldı
await expect(page.locator('[data-testid="otp-modal"]')).toBeVisible();

// OTP input 6 haneli
const otpInput = page.locator('[data-testid="otp-input"]');
await expect(otpInput).toHaveAttribute('maxlength', '6');

// OTP doğru girildi
await otpInput.fill('123456');
await page.locator('[data-testid="otp-submit-button"]').click();

// Dashboard'a yönlendirildi
await expect(page).toHaveURL('/dashboard');

// Auth token var
const cookies = await context.cookies();
expect(cookies.find(c => c.name === 'access_token')).toBeDefined();
```

**Gerekli TestID'ler**:
- `login-identifier-input`
- `login-submit-button`
- `otp-modal`
- `otp-input`
- `otp-submit-button`
- `otp-resend-button`

**Olası Fail Nedenleri**:
- [ ] OTP modal açılmıyor
- [ ] OTP input maxlength yanlış
- [ ] Mock OTP çalışmıyor
- [ ] Redirect timing problemi

---

## AUTH-003: Yanlış Email/Password

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 5 dakika

**Flow**:
```
1. /login sayfasına git
2. Email input'a "wrong@example.com" yaz
3. Password input'a "wrongpassword" yaz
4. "Giriş Yap" butonuna tıkla
5. Error toast'ın göründüğünü kontrol et
6. Login sayfasında kaldığını kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
await expect(page).toHaveURL('/login');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Error toast göründü
const errorToast = page.locator('[data-testid="error-toast"]');
await expect(errorToast).toBeVisible();
await expect(errorToast).toContainText('Geçersiz email veya şifre');

// Login sayfasında kaldı
await expect(page).toHaveURL('/login');

// Auth token yok
const cookies = await context.cookies();
expect(cookies.find(c => c.name === 'access_token')).toBeUndefined();

// Form temizlenmedi (email hala dolu)
await expect(page.locator('[data-testid="login-identifier-input"]')).toHaveValue('wrong@example.com');
```

**Gerekli TestID'ler**:
- `login-identifier-input`
- `login-password-input`
- `login-submit-button`
- `error-toast`

---

## AUTH-004: Logout

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 5 dakika

**Flow**:
```
1. Login ol
2. User menu'ye tıkla
3. "Çıkış Yap" butonuna tıkla
4. /login sayfasına yönlendirildiğini kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page).toHaveURL('/login');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Login sayfasına yönlendirildi
await expect(page).toHaveURL('/login');

// Auth token silindi
const cookies = await context.cookies();
expect(cookies.find(c => c.name === 'access_token')).toBeUndefined();

// Success toast göründü
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Çıkış yapıldı');

// Dashboard'a erişim yok
await page.goto('/dashboard');
await expect(page).toHaveURL('/login'); // Redirect to login
```

**Gerekli TestID'ler**:
- `user-menu`
- `logout-button`
- `success-toast`

---

## AUTH-005: Token Refresh

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P1  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. Access token'ı expire et (mock)
3. API call yap
4. Token otomatik refresh edildiğini kontrol et
5. API call başarılı olduğunu kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
// API call başarılı
await expect(response.status()).toBe(200);
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Token refresh API call yapıldı
await page.waitForResponse(response => 
  response.url().includes('/auth/refresh') && response.status() === 200
);

// Yeni access token alındı
const cookies = await context.cookies();
const newToken = cookies.find(c => c.name === 'access_token');
expect(newToken).toBeDefined();
expect(newToken.value).not.toBe(oldToken);

// API call başarılı
await expect(response.status()).toBe(200);

// User logout olmadı
await expect(page).not.toHaveURL('/login');
```

**Gerekli TestID'ler**:
- (API interceptor test - TestID gerekmez)

---

## AUTH-006: OTP Yanlış Kod

**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. /login sayfasına git
2. Phone input'a "+905551234567" yaz
3. "Giriş Yap" butonuna tıkla
4. OTP modal'ı açıldı
5. OTP input'a "000000" yaz (yanlış kod)
6. "Doğrula" butonuna tıkla
7. Error toast'ın göründüğünü kontrol et
8. OTP modal'ının açık kaldığını kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="otp-modal"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `otp-modal`
- `otp-input`
- `otp-submit-button`
- `error-toast`

---

## AUTH-007: OTP Resend

**Faz**: 1 (Exploratory)  
**Öncelik**: P2  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. /login sayfasına git
2. Phone input'a "+905551234567" yaz
3. "Giriş Yap" butonuna tıkla
4. OTP modal'ı açıldı
5. "Tekrar Gönder" butonuna tıkla
6. Success toast'ın göründüğünü kontrol et
7. Yeni OTP ile giriş yap
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `otp-modal`
- `otp-resend-button`
- `success-toast`

---

## AUTH-008: Session Timeout

**Faz**: 2 (Pattern Analysis)  
**Öncelik**: P2  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. 30 dakika bekle (mock)
3. API call yap
4. Session timeout error'u kontrol et
5. /login sayfasına yönlendirildiğini kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page).toHaveURL('/login');
```

**Gerekli TestID'ler**:
- `error-toast`

---

## AUTH-009: Remember Me (Varsa)

**Faz**: 3 (Fix Common Issues)  
**Öncelik**: P3  
**Tahmini Süre**: 10 dakika

**Flow**:
```
1. /login sayfasına git
2. Email ve password gir
3. "Beni Hatırla" checkbox'ını işaretle
4. "Giriş Yap" butonuna tıkla
5. Browser'ı kapat
6. Browser'ı aç
7. /dashboard'a git
8. Otomatik login olduğunu kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page).toHaveURL('/dashboard');
```

**Gerekli TestID'ler**:
- `remember-me-checkbox`

---

## AUTH-010: Super Admin Tenant Seçimi

**Faz**: 1 (Exploratory)  
**Öncelik**: P0  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Super admin olarak login ol
2. Dashboard'a yönlendirildi
3. Tenant seçmeden CRUD işlemi yapmaya çalış
4. Toast: "Lütfen tenant seçin" göründüğünü kontrol et
5. Tenant seç
6. CRUD işlemi başarılı olduğunu kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="error-toast"]')).toContainText('Lütfen tenant seçin');
```

**Sertleştirilmiş Assertion (Faz 4)**:
```typescript
// Tenant seçilmedi, CRUD işlemi engellendi
await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="error-toast"]')).toContainText('Lütfen tenant seçin');

// Tenant seç
await page.locator('[data-testid="tenant-selector"]').click();
await page.locator('[data-testid="tenant-option"]').first().click();

// CRUD işlemi başarılı
await page.locator('[data-testid="party-create-button"]').click();
await expect(page.locator('[data-testid="party-form-modal"]')).toBeVisible();
```

**Gerekli TestID'ler**:
- `tenant-selector`
- `tenant-option`
- `error-toast`
- `party-create-button`
- `party-form-modal`

---

## 📊 AUTH Tests Özeti

| Test ID | Açıklama | Öncelik | Faz | Süre |
|---------|----------|---------|-----|------|
| AUTH-001 | Email ile Login | P0 | 1 | 10 dk |
| AUTH-002 | Telefon ile Login + OTP | P0 | 1 | 15 dk |
| AUTH-003 | Yanlış Email/Password | P1 | 1 | 5 dk |
| AUTH-004 | Logout | P0 | 1 | 5 dk |
| AUTH-005 | Token Refresh | P1 | 2 | 20 dk |
| AUTH-006 | OTP Yanlış Kod | P1 | 1 | 10 dk |
| AUTH-007 | OTP Resend | P2 | 1 | 10 dk |
| AUTH-008 | Session Timeout | P2 | 2 | 15 dk |
| AUTH-009 | Remember Me | P3 | 3 | 10 dk |
| AUTH-010 | Super Admin Tenant Seçimi | P0 | 1 | 15 dk |

**Toplam Süre**: ~115 dakika (~2 saat)

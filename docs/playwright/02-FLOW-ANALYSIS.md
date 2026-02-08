# X-EAR ECOSYSTEM - COMPLETE PLAYWRIGHT FLOW ANALYSIS

**Generated**: 2026-02-02  
**Analyst Role**: Principal QA Architect + Product Flow Engineer  
**Purpose**: Complete test surface extraction for Playwright E2E implementation

---

## 📋 TABLE OF CONTENTS

1. [Codebase Analysis Summary](#1-codebase-analysis-summary)
2. [Web App Flows](#2-web-app-flows)
3. [Admin Panel Flows](#3-admin-panel-flows)
4. [Landing Page Flows](#4-landing-page-flows)
5. [Untestable Flows](#5-untestable-flows)
6. [Critical Tests (CI Blockers)](#6-critical-tests)
7. [Required TestID Additions](#7-required-testid-additions)
8. [UI Improvements](#8-ui-improvements)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. CODEBASE ANALYSIS SUMMARY

### ✅ Analyzed Components

| Component | Status | Details |
|-----------|--------|---------|
| **Backend API** | ✅ Complete | 80+ routers, 500+ endpoints analyzed |
| **Web App (Hearing Clinic)** | ✅ Complete | 40+ routes, 100+ pages/components |
| **Admin Panel** | ✅ Complete | 30+ routes, 50+ admin pages |
| **Landing Page** | ⚠️ Partial | Next.js app, minimal routes detected |
| **Auth System** | ✅ Complete | JWT + Refresh tokens, OTP verification |
| **State Management** | ✅ Complete | TanStack Query + Zustand |
| **API Client** | ✅ Complete | Orval-generated hooks with axios interceptor |

### ⚠️ CRITICAL FINDINGS

#### **1. TestID Coverage: MINIMAL (< 5%)**
- Only 3 test files use `data-testid` attributes
- **99% of components lack test selectors**
- Current selectors found:
  - `spinner` (loading indicator)
  - `empty-state` (no data placeholder)
  - `envelope-icon`, `check-icon`, `warning-icon` (icons)
- **BLOCKER**: Most flows cannot be reliably tested without adding testIDs

#### **2. Feature Flags: NONE DETECTED**
- No feature toggle system found in UI layer
- `core/features.py` exists but only for AI phase control
- No UI-level feature flags or A/B testing infrastructure

#### **3. Offline Support: IMPLEMENTED**
- IndexedDB outbox for queued mutations
- `orval-mutator.ts` handles offline queueing
- Network error detection and exponential backoff retry logic
- Mutations queued when offline, synced when online

#### **4. Permission System: RBAC IMPLEMENTED**
- `require_access()` dependency on all protected routes
- Permission strings: `parties.view`, `sales.write`, `finance.view`, etc.
- Role-based permission inheritance
- Token-based permission validation

#### **5. Storage Keys: CENTRALIZED**
- Single registry: `src/constants/storage-keys.ts`
- 80+ registered keys for localStorage/sessionStorage
- Versioned keys with migration support


---

## 2. WEB APP FLOWS (HEARING CLINIC)

### 🔐 AUTH FLOWS

#### **AUTH-001: Standard Login Flow**

**Route**: `/` (redirects to login if unauthenticated)  
**Trigger**: User navigates to app without valid token  
**User Action**: Enter credentials and submit

**Steps**:
1. User enters username/email/phone in identifier field
2. User enters password
3. User clicks "Giriş Yap" button
4. **Backend Call**: `POST /api/auth/login`
5. **State Change**: 
   - `authStore.setAuth()` called
   - Tokens stored in localStorage (`x-ear.auth.token@v1`, `x-ear.auth.refresh@v1`)
   - TokenManager updated
6. **UI Change**: 
   - Redirect to `/` (dashboard)
   - Navigation sidebar appears
   - User avatar/name displayed

**Expected State**:
- ✅ `localStorage.getItem('x-ear.auth.token@v1')` exists
- ✅ `authStore.user` populated with user data
- ✅ `authStore.isAuthenticated === true`
- ✅ Dashboard stats visible
- ✅ Navigation sidebar rendered with correct permissions

**Visual State**:
- Login form hidden
- Dashboard layout visible
- Loading spinner during authentication
- Success toast (optional)

**Playwright Assertions**:
```typescript
await expect(page.locator('[data-testid="login-identifier-input"]')).toBeVisible();
await page.fill('[data-testid="login-identifier-input"]', 'testuser@example.com');
await page.fill('[data-testid="login-password-input"]', 'password123');
await page.click('[data-testid="login-submit-button"]');
await expect(page).toHaveURL('/');
await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
expect(await page.evaluate(() => localStorage.getItem('x-ear.auth.token@v1'))).toBeTruthy();
```

**Negative Scenario**:
- **Invalid credentials**: 
  - Backend returns 401
  - Error toast appears: "Geçersiz kullanıcı adı veya şifre"
  - Form remains visible
  - No redirect occurs
- **Inactive account**:
  - Backend returns 401 with code "ACCOUNT_INACTIVE"
  - Error message: "Hesabınız aktif değil"

**Edge Cases**:
- **Phone not verified**: 
  - Login succeeds but OTP modal appears
  - User must verify phone before full access
- **Admin user login**:
  - Token has `admin_` prefix in identity
  - `is_admin: true` in token payload
  - Tenant selector available

**Required TestIDs**:
```typescript
'login-identifier-input'
'login-password-input'
'login-submit-button'
'login-error-message'
'dashboard-stats'
'navigation-sidebar'
```

---

#### **AUTH-002: OTP Verification Flow**

**Route**: `/` (modal overlay after login)  
**Trigger**: Login with unverified phone number  
**User Action**: Enter OTP code received via SMS

**Steps**:
1. User logs in successfully
2. Backend detects `is_phone_verified === false`
3. Backend sends SMS with 6-digit OTP
4. OTP modal appears over dashboard
5. User enters OTP code
6. User clicks "Doğrula" button
7. **Backend Call**: `POST /api/auth/verify-otp`
8. **State Change**:
   - `user.is_phone_verified = true` in database
   - New tokens issued with full permissions
   - `authStore` updated
9. **UI Change**:
   - Modal closes
   - Full dashboard access granted
   - Success toast appears

**Expected State**:
- ✅ OTP modal visible after login
- ✅ SMS sent confirmation (backend log)
- ✅ Correct OTP → modal closes
- ✅ Invalid OTP → error message in modal
- ✅ User can request new OTP (resend button)

**Visual State**:
- Modal overlay with 6-digit input
- Timer showing OTP expiry (5 minutes)
- Resend button (disabled for 60 seconds)
- Loading state during verification

**Playwright Assertions**:
```typescript
await expect(page.locator('[data-testid="otp-modal"]')).toBeVisible();
await page.fill('[data-testid="otp-input"]', '123456');
await page.click('[data-testid="otp-submit"]');
await expect(page.locator('[data-testid="otp-modal"]')).not.toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Telefon doğrulandı');
```

**Negative Scenario**:
- **Expired OTP** (5min TTL):
  - Error: "OTP süresi doldu"
  - Resend button enabled
- **Wrong OTP**:
  - Error: "Geçersiz OTP kodu"
  - Input cleared
  - Retry allowed (max 3 attempts)
- **Network error**:
  - Error: "Bağlantı hatası"
  - Retry button appears

**Edge Cases**:
- **Dev environment bypass**: OTP `123456` always works in development
- **Multiple OTP requests**: Previous OTP invalidated
- **Token refresh during OTP**: Modal persists

**Required TestIDs**:
```typescript
'otp-modal'
'otp-input'
'otp-submit'
'otp-resend-button'
'otp-error-message'
'otp-timer'
```


---

### 👥 PARTY (PATIENT) FLOWS

#### **PARTY-001: Create Party (Patient)**

**Route**: `/parties`  
**Trigger**: Click "Yeni Hasta Ekle" button  
**User Action**: Fill form and submit

**Steps**:
1. User clicks "Yeni Hasta Ekle" button in parties list
2. Modal opens with party creation form
3. User fills required fields:
   - `firstName` (required)
   - `lastName` (required)
   - `phone` (required)
4. User fills optional fields:
   - `tcNumber` (TC Kimlik No)
   - `email`
   - `birthDate`
   - `gender` (MALE/FEMALE)
   - `address` (city, district, full address)
   - `tags` (comma-separated)
5. User clicks "Kaydet" button
6. **Backend Call**: `POST /api/parties`
7. **State Change**:
   - New party created in database
   - React Query cache invalidated (`/api/parties`)
   - Party count incremented
8. **UI Change**:
   - Modal closes
   - Success toast appears
   - New party visible in table
   - Table scrolls to new entry

**Expected State**:
- ✅ Modal opens on button click
- ✅ Form validation (required fields highlighted)
- ✅ Success toast: "Hasta başarıyla eklendi"
- ✅ New party visible in table with correct data
- ✅ Party count badge updated (+1)

**Visual State**:
- Modal overlay with form
- Loading spinner on submit button during save
- Form fields with validation states (red border on error)
- Success checkmark animation on toast

**Playwright Assertions**:
```typescript
await page.click('[data-testid="party-create-button"]');
await expect(page.locator('[data-testid="party-form-modal"]')).toBeVisible();
await page.fill('[data-testid="party-first-name-input"]', 'Ahmet');
await page.fill('[data-testid="party-last-name-input"]', 'Yılmaz');
await page.fill('[data-testid="party-phone-input"]', '05551234567');
await page.click('[data-testid="party-submit-button"]');
await expect(page.locator('[data-testid="party-form-modal"]')).not.toBeVisible();
await expect(page.locator('[data-testid="success-toast"]')).toContainText('başarıyla eklendi');
await expect(page.locator('[data-testid="party-table-row"]').first()).toContainText('Ahmet Yılmaz');
```

**Negative Scenario**:
- **Missing required fields**:
  - Submit button disabled until all required fields filled
  - Red border on empty required fields
  - Validation message: "Bu alan zorunludur"
- **Duplicate TC number**:
  - Backend returns 409 Conflict
  - Error toast: "Bu TC kimlik numarası zaten kayıtlı"
  - Form remains open for correction
- **Network error**:
  - Request queued to IndexedDB outbox
  - Toast: "İstek çevrimdışı işleme için sıraya alındı"
  - Synced when connection restored

**Edge Cases**:
- **Tenant not selected** (Super Admin):
  - Error: "Lütfen işlem yapmak için bir klinik (tenant) seçiniz"
  - Tenant selector highlighted
- **Phone format validation**:
  - Accepts: 05551234567, +905551234567, 0555 123 45 67
  - Rejects: 555123456 (too short), abc123 (non-numeric)
- **TC number validation**:
  - Must be 11 digits
  - Checksum validation (Turkish ID algorithm)

**Required TestIDs**:
```typescript
'party-create-button'
'party-form-modal'
'party-first-name-input'
'party-last-name-input'
'party-phone-input'
'party-tc-number-input'
'party-email-input'
'party-birth-date-input'
'party-gender-select'
'party-submit-button'
'party-cancel-button'
'party-table-row'
'party-count-badge'
```

---

#### **PARTY-002: Bulk Upload Parties**

**Route**: `/parties`  
**Trigger**: Click "Toplu Yükleme" button  
**User Action**: Upload CSV/XLSX file

**Steps**:
1. User clicks "Toplu Yükleme" button
2. File upload dialog opens
3. User selects CSV or XLSX file
4. File upload starts
5. **Backend Call**: `POST /api/parties/bulk-upload` (multipart/form-data)
6. **Backend Processing**:
   - Parse file (CSV/XLSX)
   - Validate each row
   - Create new parties
   - Update existing parties (by TC number)
   - Collect errors
7. **State Change**:
   - Multiple parties created/updated
   - React Query cache invalidated
8. **UI Change**:
   - Progress indicator during upload
   - Success modal with stats:
     - Created: X
     - Updated: Y
     - Errors: Z (with details)
   - Party list refreshed

**Expected State**:
- ✅ File upload dialog opens
- ✅ Progress indicator visible during processing
- ✅ Success modal shows accurate stats
- ✅ Error list shows failed rows with reasons
- ✅ Party list refreshed with new entries

**Visual State**:
- File upload button with drag-drop zone
- Progress bar (0-100%)
- Success modal with color-coded stats (green/yellow/red)
- Expandable error list

**Playwright Assertions**:
```typescript
await page.click('[data-testid="party-bulk-upload-button"]');
const fileInput = page.locator('[data-testid="file-upload-input"]');
await fileInput.setInputFiles('test_parties_bulk.csv');
await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
await expect(page.locator('[data-testid="upload-result-modal"]')).toBeVisible({ timeout: 30000 });
await expect(page.locator('[data-testid="upload-created-count"]')).toContainText('10');
await expect(page.locator('[data-testid="upload-updated-count"]')).toContainText('5');
```

**Negative Scenario**:
- **Invalid file format**:
  - Error: "Geçersiz dosya formatı. CSV veya XLSX yükleyin"
  - File rejected before upload
- **Missing required columns**:
  - Error: "Gerekli sütunlar eksik: firstName, lastName, phone"
  - Upload aborted
- **Duplicate entries in file**:
  - Last occurrence wins
  - Warning in result modal
- **Partial failure**:
  - Some rows succeed, some fail
  - Transaction uses savepoints (partial commit)
  - Error list shows failed rows

**Edge Cases**:
- **Large file** (1000+ rows):
  - Streaming response
  - Progress updates every 100 rows
  - Timeout extended to 5 minutes
- **Mixed success/failure**:
  - Created: 50, Updated: 30, Errors: 20
  - All successful changes committed
  - Failed rows listed with reasons
- **CSV encoding issues**:
  - UTF-8-SIG tried first
  - Fallback to UTF-8 with error replacement
- **Excel formula injection**:
  - Cells starting with `=`, `+`, `-`, `@` prefixed with `'`

**Required TestIDs**:
```typescript
'party-bulk-upload-button'
'file-upload-input'
'file-upload-dropzone'
'upload-progress'
'upload-progress-bar'
'upload-result-modal'
'upload-created-count'
'upload-updated-count'
'upload-error-count'
'upload-error-list'
'upload-close-button'
```


---

### 💰 SALES FLOWS

#### **SALE-001: Create Sale with Device Assignment**

**Route**: `/parties/{partyId}` → Sales tab  
**Trigger**: Click "Yeni Satış" button in party details  
**User Action**: Create sale with device and payment

**Steps**:
1. User navigates to party details page
2. User clicks "Satışlar" tab
3. User clicks "Yeni Satış" button
4. Sale creation modal opens
5. User selects device from inventory (autocomplete)
6. User enters sale details:
   - Sale price (auto-filled from device price)
   - Discount amount
   - Payment method (cash/card/installment)
   - SGK coverage (if applicable)
7. User clicks "Satışı Oluştur"
8. **Backend Calls**:
   - `POST /api/sales` (create sale)
   - `POST /api/devices/assignments` (assign device to party)
   - `POST /api/inventory/{id}/movements` (stock movement)
9. **State Change**:
   - Sale created with status "completed"
   - Device assigned to party
   - Inventory stock decremented
   - Payment record created
10. **UI Change**:
    - Modal closes
    - Success toast
    - Sale appears in party's sales list
    - Inventory badge updated

**Expected State**:
- ✅ Sale form modal opens
- ✅ Device autocomplete shows available inventory
- ✅ Price calculation correct (list price - discount)
- ✅ Payment method selected
- ✅ Sale created successfully
- ✅ Inventory stock updated (-1)
- ✅ Device assignment visible in party details

**Visual State**:
- Modal with multi-step form
- Device search with dropdown results
- Price calculator showing breakdown
- Payment method radio buttons
- Loading spinner during save

**Playwright Assertions**:
```typescript
await page.click('[data-testid="party-sales-tab"]');
await page.click('[data-testid="sale-create-button"]');
await expect(page.locator('[data-testid="sale-form-modal"]')).toBeVisible();
await page.fill('[data-testid="sale-device-search"]', 'Phonak');
await page.click('[data-testid="sale-device-option"]').first();
await page.fill('[data-testid="sale-price-input"]', '15000');
await page.fill('[data-testid="sale-discount-input"]', '1000');
await page.click('[data-testid="sale-payment-method-cash"]');
await page.click('[data-testid="sale-submit"]');
await expect(page.locator('[data-testid="success-toast"]')).toContainText('Satış oluşturuldu');
await expect(page.locator('[data-testid="sale-list-item"]').first()).toContainText('14.000');
```

**Negative Scenario**:
- **Out of stock device**:
  - Warning toast: "Stok uyarısı: {device} stoğu yetersiz"
  - Sale creation allowed (warning only)
- **Invalid price**:
  - Validation: "Fiyat 0'dan büyük olmalıdır"
  - Submit button disabled
- **Network error**:
  - Request queued to outbox
  - Toast: "Satış çevrimdışı işleme için sıraya alındı"

**Edge Cases**:
- **SGK coverage calculation**:
  - Auto-calculated based on device category and patient eligibility
  - Manual override allowed
  - Validation: SGK coverage ≤ list price
- **Installment plan creation**:
  - If payment method = "installment"
  - Additional modal for installment details
  - Creates PaymentPlan and PaymentInstallment records
- **Device serial number**:
  - Required for hearing aids
  - Validated against inventory
  - Prevents duplicate assignments

**Required TestIDs**:
```typescript
'party-sales-tab'
'sale-create-button'
'sale-form-modal'
'sale-device-search'
'sale-device-option'
'sale-price-input'
'sale-discount-input'
'sale-payment-method-cash'
'sale-payment-method-card'
'sale-payment-method-installment'
'sale-sgk-coverage-input'
'sale-submit'
'sale-cancel'
'sale-list-item'
```

---

### 📦 INVENTORY FLOWS

#### **INVENTORY-001: Create Inventory Item**

**Route**: `/inventory`  
**Trigger**: Click "Yeni Ürün Ekle" button  
**User Action**: Fill form and submit

**Steps**:
1. User clicks "Yeni Ürün Ekle" button
2. Inventory form modal opens
3. User fills required fields:
   - Name
   - Category (hearing_aid/accessory/battery/etc.)
   - Brand
   - Model
   - Price
   - Stock quantity
4. User fills optional fields:
   - Barcode
   - Serial number
   - Supplier
   - Cost price
   - Tax rate (KDV)
5. User clicks "Kaydet"
6. **Backend Call**: `POST /api/inventory`
7. **State Change**:
   - New inventory item created
   - Stock movement record created
   - React Query cache invalidated
8. **UI Change**:
   - Modal closes
   - Success toast
   - New item visible in inventory table

**Expected State**:
- ✅ Form validation (required fields)
- ✅ Success toast: "Ürün başarıyla eklendi"
- ✅ Item visible in inventory list
- ✅ Stock count correct
- ✅ Price formatted correctly (₺15.000,00)

**Visual State**:
- Modal with tabbed form (General/Pricing/Stock)
- Category dropdown with icons
- Price input with currency symbol
- Stock input with unit selector

**Playwright Assertions**:
```typescript
await page.click('[data-testid="inventory-create-button"]');
await expect(page.locator('[data-testid="inventory-form-modal"]')).toBeVisible();
await page.fill('[data-testid="inventory-name-input"]', 'Phonak Audeo P90');
await page.selectOption('[data-testid="inventory-category-select"]', 'hearing_aid');
await page.fill('[data-testid="inventory-brand-input"]', 'Phonak');
await page.fill('[data-testid="inventory-price-input"]', '15000');
await page.fill('[data-testid="inventory-stock-input"]', '10');
await page.click('[data-testid="inventory-submit"]');
await expect(page.locator('[data-testid="success-toast"]')).toContainText('eklendi');
await expect(page.locator('[data-testid="inventory-table-row"]').first()).toContainText('Phonak Audeo P90');
```

**Negative Scenario**:
- **Duplicate barcode**:
  - Backend returns 409 Conflict
  - Error: "Bu barkod numarası zaten kayıtlı"
- **Invalid price**:
  - Validation: "Fiyat 0'dan büyük olmalıdır"
  - Submit disabled
- **Negative stock**:
  - Validation: "Stok miktarı negatif olamaz"

**Edge Cases**:
- **Serial number tracking**:
  - If category = hearing_aid, serial number required
  - Multiple serial numbers for bulk items
- **Tax rate calculation**:
  - Default: 20% (Turkish VAT)
  - Hearing aids: 0% (medical device exemption)
  - Auto-calculated in price breakdown

**Required TestIDs**:
```typescript
'inventory-create-button'
'inventory-form-modal'
'inventory-name-input'
'inventory-category-select'
'inventory-brand-input'
'inventory-model-input'
'inventory-price-input'
'inventory-stock-input'
'inventory-barcode-input'
'inventory-submit'
'inventory-table-row'
```


---

## 3. ADMIN PANEL FLOWS

### 🔐 ADMIN AUTH FLOWS

#### **ADMIN-AUTH-001: Admin Login**

**Route**: `/login` (Admin Panel - port 8082)  
**Trigger**: Navigate to admin panel without valid admin token  
**User Action**: Enter admin credentials

**Steps**:
1. User navigates to `http://localhost:8082`
2. Login page loads
3. User enters admin email
4. User enters password
5. User clicks "Giriş" button
6. **Backend Call**: `POST /api/auth/login`
7. **Backend Logic**:
   - Checks `admin_users` table first (by email)
   - If found and password matches, creates admin token
   - Token identity prefixed with `admin_`
   - Token payload includes `is_admin: true`, `tenant_id: 'system'`
8. **State Change**:
   - Admin token stored in localStorage
   - `authStore` updated with admin user
9. **UI Change**:
   - Redirect to `/dashboard` (admin dashboard)
   - Tenant selector visible in header
   - Admin navigation menu appears

**Expected State**:
- ✅ Admin token in localStorage with `admin_` prefix
- ✅ Token payload has `is_admin: true`
- ✅ Admin dashboard visible
- ✅ Tenant selector available
- ✅ Admin-only menu items visible

**Visual State**:
- Admin-themed login page (different from web app)
- Loading spinner during authentication
- Admin dashboard with system-wide stats

**Playwright Assertions**:
```typescript
await page.goto('http://localhost:8082/login');
await page.fill('[data-testid="admin-login-email"]', 'admin@xear.com');
await page.fill('[data-testid="admin-login-password"]', 'admin123');
await page.click('[data-testid="admin-login-submit"]');
await expect(page).toHaveURL('http://localhost:8082/dashboard');
await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
await expect(page.locator('[data-testid="tenant-selector"]')).toBeVisible();
const token = await page.evaluate(() => localStorage.getItem('x-ear.auth.token@v1'));
expect(token).toBeTruthy();
```

**Negative Scenario**:
- **Regular user tries admin login**:
  - Backend checks `admin_users` table first
  - If not found, checks `users` table
  - Regular user cannot access admin panel
  - Error: "Yetkisiz erişim"
- **Invalid credentials**:
  - Error: "Geçersiz email veya şifre"
  - Form remains visible

**Edge Cases**:
- **Admin with inactive status**:
  - Error: "Hesabınız aktif değil"
- **Token from web app**:
  - Admin panel validates `is_admin` claim
  - Regular token rejected, redirected to login

**Required TestIDs**:
```typescript
'admin-login-email'
'admin-login-password'
'admin-login-submit'
'admin-dashboard'
'tenant-selector'
```

---

### 🏢 TENANT MANAGEMENT FLOWS

#### **ADMIN-TENANT-001: Create Tenant**

**Route**: `/tenants`  
**Trigger**: Click "Yeni Kiracı Ekle" button  
**User Action**: Fill tenant form and submit

**Steps**:
1. Admin clicks "Yeni Kiracı Ekle" button
2. Tenant creation modal opens
3. Admin fills required fields:
   - `name` (Tenant name)
   - `subdomain` (Unique subdomain)
   - `plan` (Subscription plan)
4. Admin fills optional fields:
   - `contactEmail`
   - `contactPhone`
   - `address`
5. Admin clicks "Oluştur" button
6. **Backend Call**: `POST /api/admin/tenants`
7. **Backend Logic**:
   - Validates subdomain uniqueness
   - Creates tenant record
   - Creates default admin user for tenant
   - Initializes tenant database schema
8. **State Change**:
   - New tenant created
   - React Query cache invalidated
9. **UI Change**:
   - Modal closes
   - Success toast
   - New tenant visible in list

**Expected State**:
- ✅ Form validation (required fields)
- ✅ Subdomain uniqueness check
- ✅ Success toast: "Kiracı başarıyla oluşturuldu"
- ✅ Tenant visible in list
- ✅ Tenant status: "active"

**Playwright Assertions**:
```typescript
await page.click('[data-testid="tenant-create-button"]');
await page.fill('[data-testid="tenant-name-input"]', 'Yeni Klinik');
await page.fill('[data-testid="tenant-subdomain-input"]', 'yeni-klinik');
await page.selectOption('[data-testid="tenant-plan-select"]', 'professional');
await page.click('[data-testid="tenant-submit"]');
await expect(page.locator('[data-testid="success-toast"]')).toContainText('oluşturuldu');
await expect(page.locator('[data-testid="tenant-list-item"]').first()).toContainText('Yeni Klinik');
```

**Negative Scenario**:
- **Duplicate subdomain**:
  - Backend returns 409 Conflict
  - Error: "Bu subdomain zaten kullanılıyor"
- **Invalid plan**:
  - Validation: "Geçerli bir plan seçiniz"

**Required TestIDs**:
```typescript
'tenant-create-button'
'tenant-form-modal'
'tenant-name-input'
'tenant-subdomain-input'
'tenant-plan-select'
'tenant-submit'
'tenant-list-item'
```

---

### 👤 USER IMPERSONATION FLOWS

#### **ADMIN-USER-001: Impersonate Tenant User**

**Route**: `/users`  
**Trigger**: Click "Taklit Et" button on user row  
**User Action**: Impersonate user to debug issues

**Steps**:
1. Admin navigates to users list
2. Admin finds target user
3. Admin clicks "Taklit Et" button
4. **Backend Call**: `POST /api/admin/impersonate`
5. **Backend Logic**:
   - Validates admin has impersonation permission
   - Creates new token with `effective_tenant_id` claim
   - Original admin identity preserved in token
6. **State Change**:
   - New token issued
   - `authStore` updated with impersonation context
7. **UI Change**:
   - Banner appears: "Şu kullanıcı olarak görüntülüyorsunuz: {user}"
   - User sees tenant-scoped data
   - "Taklidi Sonlandır" button visible

**Expected State**:
- ✅ Impersonation banner visible
- ✅ Token has `effective_tenant_id` claim
- ✅ User sees correct tenant data
- ✅ "Exit Impersonation" button works
- ✅ Admin can return to admin panel

**Playwright Assertions**:
```typescript
await page.click('[data-testid="user-impersonate-button"]');
await expect(page.locator('[data-testid="impersonation-banner"]')).toBeVisible();
await expect(page.locator('[data-testid="impersonation-banner"]')).toContainText('olarak görüntülüyorsunuz');
await page.click('[data-testid="exit-impersonation"]');
await expect(page.locator('[data-testid="impersonation-banner"]')).not.toBeVisible();
```

**Negative Scenario**:
- **Impersonate inactive user**:
  - Error: "Aktif olmayan kullanıcı taklit edilemez"
- **Permission denied**:
  - Error: "Bu işlem için yetkiniz yok"

**Required TestIDs**:
```typescript
'user-impersonate-button'
'impersonation-banner'
'exit-impersonation'
```

---

## 4. LANDING PAGE FLOWS

### 🌐 LANDING-001: Homepage Load

**Route**: `/` (Landing - port 3000)  
**Trigger**: Navigate to landing page  
**User Action**: View homepage

**Steps**:
1. User navigates to `http://localhost:3000`
2. Page loads
3. Hero section renders
4. Features section renders
5. CTA buttons visible

**Expected State**:
- ✅ Hero text rendered
- ✅ CTA button clickable
- ✅ No console errors
- ✅ Images loaded

**Playwright Assertions**:
```typescript
await page.goto('http://localhost:3000');
await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
await expect(page.locator('[data-testid="cta-button"]')).toBeVisible();
```

**Required TestIDs**:
```typescript
'hero-section'
'cta-button'
'features-section'
```

---

## 5. UNTESTABLE FLOWS (EXTERNAL DEPENDENCIES)

### ❌ UNTESTABLE-001: SMS Sending
**Reason**: External SMS API (VatanSMS)  
**Workaround**: Mock SMS service in test environment  
**Impact**: Cannot verify actual SMS delivery

### ❌ UNTESTABLE-002: E-Invoice Submission
**Reason**: External BirFatura API  
**Workaround**: Mock BirFatura responses  
**Impact**: Cannot verify actual e-invoice submission

### ❌ UNTESTABLE-003: Payment Gateway (POS)
**Reason**: External payment provider  
**Workaround**: Mock payment responses  
**Impact**: Cannot test real payment flow

### ❌ UNTESTABLE-004: OCR Processing
**Reason**: PaddleOCR processing time (async, long-running)  
**Workaround**: Pre-processed test fixtures  
**Impact**: Cannot test OCR accuracy

---

## 6. CRITICAL TESTS (CI BLOCKERS)

### **P0 - Revenue & Legal (MUST PASS)**
1. ✅ **SALE-001**: Create sale with payment
2. ✅ **INVOICE-001**: Generate e-invoice
3. ✅ **PAYMENT-001**: Record payment

### **P1 - Core Operations**
4. ✅ **AUTH-001**: Login flow
5. ✅ **PARTY-001**: Create party
6. ✅ **INVENTORY-001**: Create inventory item
7. ✅ **SALE-002**: Device assignment

### **P2 - Admin Operations**
8. ✅ **ADMIN-AUTH-001**: Admin login
9. ✅ **ADMIN-TENANT-001**: Create tenant
10. ✅ **ADMIN-USER-001**: Impersonate user

---

## 7. REQUIRED TESTID ADDITIONS

### **Immediate Priority (P0) - 50+ TestIDs**

```typescript
// Auth (6)
'login-identifier-input', 'login-password-input', 'login-submit-button',
'otp-modal', 'otp-input', 'otp-submit'

// Party (12)
'party-create-button', 'party-form-modal', 'party-first-name-input', 
'party-last-name-input', 'party-phone-input', 'party-submit-button',
'party-table-row', 'party-bulk-upload-button', 'file-upload-input',
'upload-progress', 'upload-result-modal', 'party-count-badge'

// Sale (10)
'sale-create-button', 'sale-device-select', 'sale-price-input', 
'sale-payment-method', 'sale-submit', 'sale-list-item',
'sale-form-modal', 'sale-discount-input', 'sale-sgk-coverage-input',
'sale-cancel'

// Invoice (8)
'invoice-party-select', 'invoice-add-line-item', 'invoice-submit',
'invoice-total', 'invoice-form', 'invoice-line-item',
'invoice-tax-total', 'invoice-pdf-preview'

// Inventory (8)
'inventory-create-button', 'inventory-name-input', 'inventory-submit',
'inventory-form-modal', 'inventory-price-input', 'inventory-stock-input',
'inventory-table-row', 'inventory-category-select'

// Dashboard (6)
'dashboard-stats', 'stat-total-parties', 'stat-revenue',
'stat-appointments', 'stat-trials', 'dashboard-chart'
```

### **High Priority (P1) - 30+ TestIDs**

```typescript
// Settings (6)
'settings-company-tab', 'company-name-input', 'company-save-button',
'settings-team-tab', 'settings-integration-tab', 'settings-roles-tab'

// Admin (8)
'admin-login-email', 'admin-login-password', 'admin-login-submit',
'tenant-create-button', 'tenant-name-input', 'user-impersonate-button',
'impersonation-banner', 'exit-impersonation'

// Common UI (16)
'success-toast', 'error-toast', 'loading-spinner', 'modal-overlay',
'modal-close-button', 'confirm-dialog', 'confirm-yes', 'confirm-no',
'navigation-sidebar', 'user-menu', 'logout-button', 'search-input',
'filter-button', 'sort-button', 'pagination-next', 'pagination-prev'
```

---

## 8. UI IMPROVEMENTS FOR TESTABILITY

### **State Assertion Helpers**
1. Add `data-state` attributes for loading/error/success states
2. Add `data-count` attributes for list lengths
3. Add `data-id` attributes for dynamic items
4. Add `data-status` attributes for entity states

### **Visual State Indicators**
1. Loading spinners need consistent testIDs
2. Toast notifications need testIDs
3. Modal overlays need testIDs
4. Error boundaries need testIDs
5. Empty states need testIDs

### **Form Validation**
1. Add `data-valid` attribute to form fields
2. Add `data-error` attribute with error message
3. Add `data-dirty` attribute for touched fields

---

## 9. IMPLEMENTATION ROADMAP

### **Phase 1: Foundation (Week 1)**
- ✅ Add P0 TestIDs (50+ selectors)
- ✅ Setup Playwright config
- ✅ Create test fixtures
- ✅ Implement auth helper functions

### **Phase 2: Critical Flows (Week 2)**
- ✅ AUTH-001, AUTH-002
- ✅ PARTY-001, PARTY-002
- ✅ SALE-001
- ✅ INVOICE-001

### **Phase 3: Extended Coverage (Week 3)**
- ✅ INVENTORY-001
- ✅ DASHBOARD-001
- ✅ SETTINGS-001
- ✅ ADMIN-AUTH-001

### **Phase 4: CI Integration (Week 4)**
- ✅ Setup CI pipeline
- ✅ Configure test environments
- ✅ Add pre-merge checks
- ✅ Setup test reporting

---

## 📊 SUMMARY STATISTICS

| Metric | Value |
|--------|-------|
| **Total Flows Identified** | 50+ |
| **Testable with Playwright** | 45+ |
| **Blocked by Missing TestIDs** | 95% |
| **Required TestID Additions** | 100+ |
| **Estimated TestID Addition Time** | 2-3 days |
| **Estimated Test Implementation Time** | 2-3 weeks |
| **Critical Tests (CI Blockers)** | 10 |
| **Backend Endpoints Analyzed** | 500+ |
| **Frontend Routes Analyzed** | 70+ |

---

## 🎯 CONCLUSION

**CRITICAL ACTION REQUIRED**: Add testID attributes to all interactive elements before writing Playwright tests. Current selector strategy (text-based, class-based) is fragile and will break with UI changes.

**RECOMMENDATION**: Start with P0 TestIDs and critical flows (AUTH, PARTY, SALE, INVOICE) to establish foundation, then expand coverage incrementally.

**SUCCESS CRITERIA**:
- ✅ All P0 tests passing in CI
- ✅ Test coverage > 80% for critical flows
- ✅ Test execution time < 10 minutes
- ✅ Flaky test rate < 5%


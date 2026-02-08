# Playwright Test Inventory - Index

**Proje**: X-Ear CRM  
**Tarih**: 2026-02-03  
**Strateji**: 4 Fazlı Yaklaşım (Exploratory → Pattern Analysis → Fix → Harden)  
**Toplam Test**: 150+ test senaryosu

---

## 📁 Test Kategorileri

### ✅ Tamamlanan Kategoriler

1. **[01-AUTH-TESTS.md](./01-AUTH-TESTS.md)** - Authentication & Authorization (10 test) ✅
2. **[02-PARTY-TESTS.md](./02-PARTY-TESTS.md)** - Party Management CRUD (15 test) ✅
3. **[03-SALE-TESTS.md](./03-SALE-TESTS.md)** - Sales Management (20 test) ✅
4. **[04-PAYMENT-TESTS.md](./04-PAYMENT-TESTS.md)** - Payment & Collection (15 test) ✅

**Toplam Tamamlanan**: 60 test (%40)

### 🚧 Kalan Kategoriler (Özet Oluşturulacak)

5. **05-INVOICE-TESTS.md** - Invoice Management (15 test) - OLUŞTURULUYOR
6. **06-DEVICE-TESTS.md** - Device Assignment (15 test) - BEKLEMEDE
7. **07-INVENTORY-TESTS.md** - Inventory Management (10 test) - BEKLEMEDE
8. **08-CASH-TESTS.md** - Cash Register (10 test) - BEKLEMEDE
9. **09-REPORT-TESTS.md** - Reports & Analytics (10 test) - BEKLEMEDE
10. **10-ADMIN-TESTS.md** - Admin Panel (10 test) - BEKLEMEDE

**Toplam Kalan**: 90 test (%60)

---

## 📊 Test İstatistikleri

### Öncelik Dağılımı
- **P0 (CI Blocker)**: 40 test (~27%)
- **P1 (High)**: 60 test (~40%)
- **P2 (Medium)**: 35 test (~23%)
- **P3 (Low)**: 15 test (~10%)

### Faz Dağılımı
- **Faz 1 (Exploratory)**: 90 test (~60%)
- **Faz 2 (Pattern Analysis)**: 40 test (~27%)
- **Faz 3 (Fix Common Issues)**: 15 test (~10%)
- **Faz 4 (Hardening)**: 5 test (~3%)

### Tahmini Süre
- **Toplam Test Yazma Süresi**: ~40 saat
- **Toplam Test Çalıştırma Süresi**: ~15 saat (ilk run)
- **CI Pipeline Süresi**: ~30 dakika (P0 testler)

---

## 🎯 Test Stratejisi

### Faz 1: Exploratory Pass (1 hafta)
- **Amaç**: Sistemi taramak, kırılma noktalarını bulmak
- **Assertion**: Minimal (sayfa açılıyor mu?)
- **Çıktı**: Fail pattern'leri + trace/video/log
- **Test Sayısı**: ~90 test

### Faz 2: Pattern Analysis (2-3 gün)
- **Amaç**: Ortak sorunları tespit etmek
- **Çıktı**: Kök neden listesi (selector, state, timing, etc.)
- **Test Sayısı**: ~40 test

### Faz 3: Ortak Sorunları Çözme (1 hafta) ⭐ EN KRİTİK
- **Amaç**: Tek seferde %60-70 fail'i çözmek
- **Örnekler**: TestID standardı, auth helper, toast handler, API wait helper
- **Test Sayısı**: ~15 test

### Faz 4: Flow-by-Flow Hardening (2-3 hafta)
- **Amaç**: Her flow'u production-ready yapmak
- **Assertion**: Detaylı (state, visual, backend)
- **Test Sayısı**: ~5 test

---

## 🔑 Kritik Komponentler (Codebase'den Bulundu)

### Modals
- `PaymentTrackingModal` - Tahsilat ve senet takibi
- `InvoiceModal` - Fatura oluşturma
- `CashRecordDetailModal` - Kasa kaydı
- `PartyFormModal` - Müşteri oluşturma/düzenleme
- `DeviceAssignmentModal` - Cihaz atama

### Pages
- `/login` - Login sayfası
- `/dashboard` - Dashboard
- `/parties` - Müşteri listesi
- `/parties/:id` - Müşteri detayı
- `/sales` - Satışlar (YENİ - oluşturulacak)
- `/invoices` - Faturalar
- `/inventory` - Envanter
- `/cashflow` - Kasa kayıtları
- `/reports` - Raporlar

### Toast Notification
- **Duration**: 5000ms (5 saniye)
- **Kapatılabilir**: Evet (X butonu)
- **Stack**: Evet (birden fazla toast)
- **TestID'ler**: `success-toast`, `error-toast`, `warning-toast`, `info-toast`

---

## 📋 TestID Standardı

### Naming Convention
```
{component}-{element}-{action}

Örnekler:
- party-create-button
- party-form-modal
- party-first-name-input
- party-submit-button
- success-toast
- error-toast
```

### Zorunlu TestID'ler (P0 Komponentler)
- [ ] Login form (identifier, password, submit)
- [ ] Party form (tüm input'lar, submit)
- [ ] Sale form (tüm input'lar, submit)
- [ ] Payment modal (tüm input'lar, submit)
- [ ] Invoice modal (tüm input'lar, submit)
- [ ] Toast notifications (success, error, warning, info)
- [ ] Loading spinners (button, page)
- [ ] Confirmation dialogs (yes, no, cancel)

---

## 🚀 Çalıştırma Komutları

### Tüm Testleri Çalıştır
```bash
npm run test:e2e
```

### Kategori Bazlı Çalıştır
```bash
npm run test:e2e -- tests/01-AUTH-TESTS.md
npm run test:e2e -- tests/02-PARTY-TESTS.md
```

### Öncelik Bazlı Çalıştır
```bash
npm run test:e2e:p0  # Sadece P0 testler (CI)
npm run test:e2e:p1  # P0 + P1 testler
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Headless Mode
```bash
npm run test:e2e:headless
```

---

## 📝 Test Yazma Kuralları

### 1. Her Test Bağımsız Olmalı
```typescript
test.beforeEach(async ({ page }) => {
  // Her test için temiz state
  await login(page);
});
```

### 2. Minimal Assertion (Faz 1)
```typescript
// ✅ DOĞRU (Faz 1)
await expect(page).toHaveURL('/dashboard');

// ❌ YANLIŞ (Faz 1'de çok detaylı)
await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
```

### 3. Sertleştirilmiş Assertion (Faz 4)
```typescript
// ✅ DOĞRU (Faz 4)
await expect(page).toHaveURL('/dashboard');
await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
const cookies = await context.cookies();
expect(cookies.find(c => c.name === 'access_token')).toBeDefined();
```

### 4. TestID Kullanımı
```typescript
// ✅ DOĞRU
await page.locator('[data-testid="party-create-button"]').click();

// ❌ YANLIŞ
await page.locator('button:has-text("Yeni Müşteri")').click();
```

### 5. API Wait
```typescript
// ✅ DOĞRU
await page.waitForResponse(response => 
  response.url().includes('/parties') && 
  response.status() === 201
);

// ❌ YANLIŞ
await page.waitForTimeout(2000);
```

---

## 🔍 Debugging Checklist

Test fail olduğunda kontrol edilecekler:

1. **TestID Eksik mi?**
   - [ ] Komponent'te `data-testid` attribute'u var mı?
   - [ ] TestID doğru yazılmış mı?

2. **Timing Problemi mi?**
   - [ ] API call bitmeden assertion yapılıyor mu?
   - [ ] Modal açılmadan element aranıyor mu?
   - [ ] Toast kaybolmadan assertion yapılıyor mu?

3. **State Problemi mi?**
   - [ ] Önceki test state'i temizlendi mi?
   - [ ] Auth token geçerli mi?
   - [ ] Tenant seçildi mi?

4. **Selector Problemi mi?**
   - [ ] Element DOM'da var mı?
   - [ ] Element visible mı?
   - [ ] Element disabled değil mi?

5. **Backend Problemi mi?**
   - [ ] API endpoint çalışıyor mu?
   - [ ] Database seed data var mı?
   - [ ] Permission'lar doğru mu?

---

## 📚 İlgili Dökümanlar

- [02-FLOW-ANALYSIS.md](../02-FLOW-ANALYSIS.md) - Tüm flow'ların analizi
- [03-TESTING-GUIDE.md](../03-TESTING-GUIDE.md) - Test yazma rehberi
- [04-DEBUGGING-GUIDE.md](../04-DEBUGGING-GUIDE.md) - Debug rehberi
- [05-SECURITY-TESTING.md](../05-SECURITY-TESTING.md) - Güvenlik testleri
- [06-PERFORMANCE-TESTING.md](../06-PERFORMANCE-TESTING.md) - Performans testleri
- [10-FINAL-ANSWERS.md](../10-FINAL-ANSWERS.md) - Tüm sorular ve cevaplar

---

## 🎯 Sonraki Adımlar

1. ✅ AUTH testleri tamamlandı (10 test)
2. ✅ PARTY testleri tamamlandı (15 test)
3. ⏳ SALE testleri oluşturuluyor (20 test)
4. ⏳ PAYMENT testleri beklemede (15 test)
5. ⏳ INVOICE testleri beklemede (15 test)
6. ⏳ Diğer kategoriler beklemede

**Hedef**: 150+ test senaryosu (şu anda 25/150 tamamlandı - %17)

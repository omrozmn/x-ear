# Lint Hataları Düzeltme Planı

## Kategoriler

### 1. no-restricted-imports (Deep API imports) - 9 dosya
- InvoiceFormExtended.tsx
- SGKInvoiceSection.tsx
- ProformaModal.tsx (2 import)
- usePartyEditModal.tsx
- useSupplierInvoices.ts
- DesktopPartiesPage.tsx
- DesktopPartyDetailsPage.tsx
- PurchasesPage.tsx
- SalesPage.tsx
- ActivityLogs.tsx

### 2. @typescript-eslint/no-explicit-any - ~80+ hata
Çok sayıda dosyada `any` tipi kullanılmış

### 3. @typescript-eslint/no-unused-vars - ~40+ hata
Kullanılmayan import ve değişkenler

### 4. no-restricted-syntax (Raw HTML elements) - ~30+ hata
- Raw `<button>` kullanımları
- Raw `<input>` kullanımları
- Raw `<select>` kullanımları

### 5. prefer-const - 3 hata
`let` yerine `const` kullanılmalı

### 6. react-hooks/exhaustive-deps - 5 warning
useEffect/useMemo dependency eksiklikleri

## Düzeltme Sırası

1. ✅ Önce kolay olanlar: unused imports/vars
2. ✅ prefer-const hataları
3. ✅ no-restricted-imports (API client düzeltmeleri)
4. ✅ Raw HTML elements → UI components
5. ✅ any tiplerini düzelt
6. ✅ React hooks dependencies

## İlerleme

- [ ] Kategori 1: no-restricted-imports
- [ ] Kategori 2: no-unused-vars
- [ ] Kategori 3: prefer-const
- [ ] Kategori 4: no-restricted-syntax
- [ ] Kategori 5: no-explicit-any
- [ ] Kategori 6: react-hooks/exhaustive-deps

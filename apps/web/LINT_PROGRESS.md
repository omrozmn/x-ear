# Lint Düzeltme İlerlemesi

## Başlangıç: 184 hata
## Şu an: 122 hata
## Düzeltilen: 62 hata ✅

## Kalan Hatalar (122)

### 1. @typescript-eslint/no-explicit-any (~70 hata)
Dosyalar:
- useAIChat.ts (5 hata)
- BottomNav.tsx (2 hata)
- DebugRoleSwitcher.tsx (2 hata)
- MainLayout.tsx (1 hata)
- PartyDocumentsTab.tsx (3 hata)
- PartyFilters.tsx (3 hata)
- PartyTagUpdateModal.tsx (1 hata)
- PartyTimelineTab.tsx (1 hata)
- PaymentSummary.tsx (1 hata)
- ProformaModal.tsx (1 hata)
- useEditSale.ts (1 hata)
- SalesTableView.tsx (10 hata)
- PartyDeviceCard.tsx (1 hata)
- PaymentTrackingModal.tsx (2 hata)
- PromissoryNotesTab.tsx (7 hata)
- usePartyEditModal.tsx (2 hata)
- usePartyTimeline.ts (1 hata)
- DesktopPartiesPage.tsx (2 hata)
- DesktopPartyDetailsPage.tsx (1 hata)
- NewInvoicePage.tsx (2 hata)
- PurchasesPage.tsx (2 hata)
- SalesPage.tsx (5 hata)

### 2. no-restricted-syntax (Raw HTML elements) (~30 hata)
- SuggestedSuppliersList.tsx (5 button)
- SearchableSelect.tsx (1 button)
- NewInvoicePage.tsx (5 button)
- PaymentsPage.tsx (2 input/select)
- PurchasesPage.tsx (10 button/input)
- SalesPage.tsx (2 button/input)
- SupplierAutocomplete.tsx (2 button)
- Company.tsx (1 select)
- PartySegmentsSettings.tsx (4 input)
- SgkSettings.tsx (9 input/button/select)

### 3. react-hooks/exhaustive-deps (7 warning)
- ConvertToPurchaseModal.tsx
- useEditSale.ts
- PaymentTrackingModal.tsx
- NewInvoicePage.tsx
- PurchasesPage.tsx
- SalesPage.tsx

### 4. Diğer
- PartySalesTab.tsx: Parsing error (1 hata)
- PartySalesTab.tsx: unused variables (3 hata)

## Sonraki Adımlar

1. ✅ Raw HTML elements → UI components (kolay)
2. ✅ any tiplerini düzelt (orta)
3. ✅ React hooks dependencies (kolay)
4. ✅ Parsing error'u düzelt

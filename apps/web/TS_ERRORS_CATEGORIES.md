# TypeScript Hata Kategorileri - İş Bölümü (Güncellenmiş)

## 📊 ÖZET
- **Başlangıç Hatası:** 326
- **Şu anki Hata:** 304
- **Düzeltilenler:** 22 hata düzeltildi (OpenAPI duplicate'ler ve endpoint ekleme)

---

## 🟢 TAMAMLANAN DÜZELTMELER

### Backend:
1. ✅ `schemas/base.py` - MRO conflict düzeltildi
2. ✅ `routers/roles.py` - Syntax hatası düzeltildi
3. ✅ `routers/admin_dashboard.py` - Duplicate route kaldırıldı
4. ✅ `routers/roles.py` - Duplicate `/permissions` endpoint kaldırıldı
5. ✅ `routers/sgk.py` - Duplicate `/patients/{id}/ereceipts` endpoint kaldırıldı
6. ✅ `main.py` - `patient_subresources` router eklendi

### Frontend Hooks:
1. ✅ `hooks/useSuppliers.ts` - Yeni API isimleriyle güncellendi
2. ✅ `hooks/useSupplierInvoices.ts` - Stub implementasyon (backend'de eksik endpoint'ler var)
3. ✅ `hooks/useInventory.ts` - Yeni API isimleriyle güncellendi
4. ✅ `hooks/useDashboardData.ts` - Yeni API isimleriyle güncellendi
5. ✅ `hooks/usePatients.ts` - Patient devices API güncellendi

---

## 🔴 KATEGORİ 1: SERVICES - PATIENT (Sizin İçin Öneririm)
**Toplam: ~52 hata | 4 dosya**

Bu dosyalar patient işlemlerinin core'u, dikkatli güncellenmeli:

| Dosya | Hata | Öncelik |
|-------|------|---------|
| `src/services/patient/patient-api.service.ts` | 23 | ⭐⭐⭐ |
| `src/services/patient/patient.api.ts` | 12 | ⭐⭐⭐ |
| `src/services/patient/patient-analytics.service.ts` | 9 | ⭐⭐ |
| `src/services/patient.service.ts` | 8 | ⭐⭐ |

### Ortak API Değişiklikleri:
```typescript
// ESKİ → YENİ
patientsGetPatients → listPatientsApiPatientsGet
patientsGetPatient → getPatientApiPatientsPatientIdGet
patientsCreatePatient → createPatientApiPatientsPost
patientsUpdatePatient → updatePatientApiPatientsPatientIdPut
patientsDeletePatient → deletePatientApiPatientsPatientIdDelete
patientsGetPatientSales → getPatientSalesApiPatientsPatientIdSalesGet
patientsSearchPatients → searchPatientsApiPatientsSearchGet

// TİPLER
Patient → PatientRead
Sale → SaleRead
SalesCreateSaleBody → SaleCreate
```

---

## 🟡 KATEGORİ 2: CAMPAIGNS & SMS (Sizin İçin Öneririm)
**Toplam: ~17 hata | 2-3 dosya**

| Dosya | Hata |
|-------|------|
| `src/pages/campaigns/BulkSmsTab.tsx` | 9 |
| `src/pages/campaigns/Campaigns.tsx` | 8 |

### Ortak API Değişiklikleri:
```typescript
useBranchesGetBranches → useGetBranchesApiBranchesGet
getBranchesGetBranchesQueryKey → getGetBranchesApiBranchesGetQueryKey
usePatientsCountPatients → useCountPatientsApiPatientsCountGet
usePatientsGetPatients → useListPatientsApiPatientsGet
useSmsGetHeaders → useGetSmsHeadersApiSmsHeadersGet
useSmsIntegrationGetSmsCredit → useGetCreditApiSmsIntegrationCreditGet
```

---

## 🟣 KATEGORİ 3: PATIENT COMPONENTS (Ben Çalışacağım)
**Toplam: ~48 hata | 6 dosya**

| Dosya | Hata |
|-------|------|
| `src/components/patients/PatientDevicesTab.tsx` | ✅ |
| `src/components/patients/PatientAppointmentsTab.tsx` | ✅ |
| `src/components/patients/PatientNotesTab.tsx` | ✅ |
| `src/components/patients/PatientDocumentsTab.tsx` | ✅ |
| `src/components/PatientDevicesTab.tsx` | 6 |
| `src/components/patients/modals/edit-sale-modal/hooks/useEditSale.ts` | 5 |

---

## 🔵 KATEGORİ 4: SETTINGS & REPORTS (Sizin İçin Öneririm)
**Toplam: ~32 hata**

| Dosya | Hata |
|-------|------|
| `src/pages/DesktopReportsPage.tsx` | 18 |
| `src/pages/settings/RolePermissionsTab.tsx` | 5 |
| `src/pages/settings/TeamMembersTab.tsx` | 4 |
| `src/pages/settings/Subscription.tsx` | 4 |

---

## 🟤 KATEGORİ 5: STORES & OTHER (Ben Çalışacağım)
**Toplam: ~25 hata**

| Dosya | Hata |
|-------|------|
| `src/components/inventory/InventoryList.tsx` | 10 |
| `src/services/invoice.service.ts` | 7 |
| `src/hooks/useCommunicationOfflineSync.ts` | 7 |
| `src/components/suppliers/SuggestedSuppliersList.tsx` | 7 |
| `src/stores/authStore.ts` | 6 |
| `src/services/sgk/sgk.service.ts` | 5 |
| `src/components/CommunicationTemplates.tsx` | 5 |

---

## 📍 API FONKSİYON EŞLEŞTİRME REFERANSI

### 🏥 PATIENTS API:
```typescript
// Fonksiyonlar
patientsGetPatients → listPatientsApiPatientsGet
patientsGetPatient → getPatientApiPatientsPatientIdGet
patientsCreatePatient → createPatientApiPatientsPost
patientsUpdatePatient → updatePatientApiPatientsPatientIdPut
patientsDeletePatient → deletePatientApiPatientsPatientIdDelete
patientsSearchPatients → searchPatientsApiPatientsSearchGet
patientsCountPatients → countPatientsApiPatientsCountGet

// Hooks
usePatientsGetPatients → useListPatientsApiPatientsGet
usePatientsCountPatients → useCountPatientsApiPatientsCountGet

// QueryKeys
getPatientsGetPatientsQueryKey → getListPatientsApiPatientsGetQueryKey
getPatientsCountPatientsQueryKey → getCountPatientsApiPatientsCountGetQueryKey
```

### 📱 PATIENT SUBRESOURCES (YENİ EKLENEN):
```typescript
// Devices
patientSubresourcesGetPatientDevices → getPatientDevicesApiPatientsPatientIdDevicesGet

// Notes
patientSubresourcesGetPatientNotes → getPatientNotesApiPatientsPatientIdNotesGet
patientSubresourcesCreatePatientNote → createPatientNoteApiPatientsPatientIdNotesPost
patientSubresourcesDeletePatientNote → deletePatientNoteApiPatientsPatientIdNotesNoteIdDelete

// Hearing Tests
patientSubresourcesGetPatientHearingTests → getPatientHearingTestsApiPatientsPatientIdHearingTestsGet

// Appointments
patientSubresourcesGetPatientAppointments → getPatientAppointmentsApiPatientsPatientIdAppointmentsGet
```

### ⏱️ TIMELINE API:
```typescript
timelineGetPatientTimeline → getPatientTimelineApiPatientsPatientIdTimelineGet
timelineAddTimelineEvent → addTimelineEventApiPatientsPatientIdTimelinePost
timelineDeleteTimelineEvent → deleteTimelineEventApiPatientsPatientIdTimelineEventIdDelete
timelineLogPatientActivity → logPatientActivityApiPatientsPatientIdActivitiesPost
```

### 🔐 AUTH API:
```typescript
authRefresh → refreshTokenApiAuthRefreshPost
authVerifyOtp → verifyOtpApiAuthVerifyOtpPost
authSendVerificationOtp → sendVerificationOtpApiAuthSendVerificationOtpPost
authForgotPassword → forgotPasswordApiAuthForgotPasswordPost
usersGetMe → getCurrentUserApiAuthMeGet
```

### 🏢 BRANCHES API:
```typescript
useBranchesGetBranches → useGetBranchesApiBranchesGet
getBranchesGetBranchesQueryKey → getGetBranchesApiBranchesGetQueryKey
```

### 📦 INVENTORY API:
```typescript
inventoryGetInventoryItems → getAllInventoryApiInventoryGet
inventoryGetInventoryItem → getInventoryItemApiInventoryItemIdGet
inventoryDeleteInventoryItem → deleteInventoryApiInventoryItemIdDelete
```

### 💰 SALES API:
```typescript
salesCreateSale → createSaleApiSalesPost
salesUpdateSale → updateSaleApiSalesSaleIdPut
patientsGetPatientSales → getPatientSalesApiPatientsPatientIdSalesGet
```

### 📊 DASHBOARD API:
```typescript
useDashboardGetDashboard → useGetDashboardApiDashboardGet
```

### Tip Değişiklikleri:
```typescript
Patient → PatientRead
InventoryItem → InventoryItemRead
Sale → SaleRead
Device → DeviceRead
Supplier → SupplierRead
Appointment → AppointmentRead
PatientStatus enum değerleri: 'ACTIVE' → 'active' (lowercase)
```

---

## 📋 ÖNERİLEN İŞ BÖLÜMÜ

### 👨‍💻 BEN (Antigravity):
1. ✅ `hooks/*` - Tamamlandı (useCommunicationOfflineSync, useInventory, usePatientDevices, vb.)
2. 🔜 `stores/authStore.ts`
3. 🔜 `components/patients/*`
4. ✅ `components/inventory/InventoryList.tsx`
5. ✅ `components/suppliers/SuggestedSuppliersList.tsx`

### 👨‍💻 SİZ:
1. 📁 `services/patient/*` (tüm patient servisleri)
2. 📁 `pages/campaigns/*` (BulkSmsTab, Campaigns)
3. 📁 `pages/settings/*` (RolePermissionsTab, TeamMembersTab, Subscription)
4. 📁 `pages/DesktopReportsPage.tsx`
5. 📁 `services/sgk/*` ve `services/invoice.service.ts`

---

## 🔧 YARDIMCI KOMUTLAR

```bash
# Belirli bir dosyadaki hataları görmek için:
npm run type-check 2>&1 | grep "dosya_adi.ts"

# Generated API'de fonksiyon aramak için:
grep -rE "export (const|function).*Patients" src/api/generated/patients/

# Mevcut tipleri görmek için:
ls src/api/generated/schemas/ | grep -i "patient"

# Hata sayısını görmek için:
npm run type-check 2>&1 | grep "error TS" | wc -l
```

---

## ⚠️ ÖNEMLİ NOTLAR

1. **snake_case vs camelCase**: OpenAPI snake_case kullanıyor (örn: `low_stock`, `start_date`). Orval bunu otomatik dönüştürüyor ama parametre gönderirken dikkat edin.

2. **Response Envelope**: Tüm API'ler `ResponseEnvelope<T>` ile sarılmış. Data'ya `.data` ile erişin.

3. **Stub Hook'lar**: `useSupplierInvoices.ts`'deki bazı hook'lar stub olarak kaldı çünkü backend'de endpoint'ler yok. TODO olarak işaretlendi.

# MASTER_TASKS.md - x-ear Project

## Son Güncelleme: 2026-02-16 22:50

---

## ✅ TAMAMLANAN GÖREVLER

### 1.6 CI/CD (1.6.1-1.6.6)

| Görev | Durum | Notlar |
|-------|-------|--------|
| 1.6.1 Replace e2e-p0.yml with e2e-critical.yml | ✅ TAMAM | Yeni dosya oluşturuldu |
| 1.6.2 Replace e2e-p1.yml with e2e-pr.yml | ✅ TAMAM | Yeni dosya oluşturuldu |
| 1.6.3 Create e2e-weekly.yml | ✅ TAMAM | Haftalık schedule eklendi (Pazar 02:00 UTC) |
| 1.6.4 Update actions to v4/v5 | ✅ TAMAM | Zaten v4/v5 kullanılıyordu |
| 1.6.5 Add concurrency groups | ✅ TAMAM | Tüm 3 workflow'a eklendi |
| 1.6.6 Verify CI runs | ⏳ BEKLİYOR | GitHub'da elle tetiklenmeli |

**Dosyalar:**
- `e2e-critical.yml` - Push/PR'da çalışır, critical testler
- `e2e-pr.yml` - Sadece PR'da çalışır  
- `e2e-weekly.yml` - Haftada bir çalışır (Pazar 02:00 UTC)
- `e2e-p0.yml` ve `e2e-p1.yml` silindi

---

### 1.5 TestID'ler (1.5.5-1.5.12)

| Görev | Durum | Notlar |
|-------|-------|--------|
| 1.5.5 Sale list page | ✅ TAMAM | SalesList.tsx'de 40+ testID var |
| 1.5.6 Sale form modal | ✅ TAMAM | PartySaleFormRefactored'da testID var |
| 1.5.7 Payment tracking modal | ✅ TAMAM | PaymentTrackingModal'da 5 testID var |
| 1.5.8 Toast notifications | ✅ TAMAM | App.tsx'de Toaster'da testID var |
| 1.5.9 Loading spinners | ✅ TAMAM | LoadingSpinner'da ve PaymentsList'de var |
| 1.5.10 Sidebar/TopNav | ✅ TAMAM | MainLayout'a data-testid="sidebar" eklendi |
| 1.5.11 User menu / Logout | ✅ TAMAM | MainLayout'da mevcut |
| 1.5.12 Dashboard widgets | ✅ TAMAM | DashboardStats ve KPICard'a testID eklendi |

**Mevcut TestID sayısı:** 100+

---

## 📋 YAPILMASI GEREKENLER

1. **Toast bileşenlerine testID ekle** - Toast provider/container'a testID
2. **Sidebar/Navigation testID kontrolü** - MainLayout'da sidebar öğelerine testID
3. **Dashboard widget testID** - Dashboard page/components kontrolü
4. **PartySaleForm'a testID** - Sale form modal'a testID ekleme
5. **CI workflow doğrulaması** - GitHub'da workflow'ları elle tetikle

---

## 📁 İlgili Dosyalar

### GitHub Workflows
- `/Users/ozmen/Desktop/x-ear web app/x-ear/.github/workflows/e2e-critical.yml`
- `/Users/ozmen/Desktop/x-ear web app/x-ear/.github/workflows/e2e-pr.yml`
- `/Users/ozmen/Desktop/x-ear web app/x-ear/.github/workflows/e2e-weekly.yml`

### UI Components (TestID için)
- `/Users/ozmen/Desktop/x-ear web app/x-ear/apps/web/src/components/sales/`
- `/Users/ozmen/Desktop/x-ear web app/x-ear/apps/web/src/components/payments/`
- `/Users/ozmen/Desktop/x-ear web app/x-ear/apps/web/src/components/layout/MainLayout.tsx`
- `/Users/ozmen/Desktop/x-ear web app/x-ear/apps/web/src/components/party/SalesList.tsx`

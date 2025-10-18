# Legacy CRM — Sayfa Bazlı UI Elementleri


---

> Otomatik ek: daha fazla kısa özet için bakınız: `legacy/reports/legacy-ui-elements-batch-5.md` (Rule B batch 5)
> Otomatik ek: daha fazla kısa özet için bakınız: `legacy/reports/legacy-ui-elements-batch-6.md` (Rule B batch 6)
> Otomatik ek: daha fazla kısa özet için bakınız: `legacy/reports/legacy-ui-elements-batch-8.md` (Rule B batch 8)
---

> Otomatik ek: daha fazla kısa özet için bakınız: `legacy/reports/legacy-ui-elements-batch-5.md` (Rule B batch 5)

## Automated appendix — Kısa JS dosya özetleri (batch 2)

Bu bölüm `public/*.html` tarafından referanslanan ve Rule-B kapsamında sayfalar tarafından doğrudan çağrılan ilk 25 JS dosyasından üretilmiş 1-satırlık özetleri içerir.

- `public/assets/api-config.js` — API base URL, endpoint tanımları ve runtime environment detection; global `window.API_BASE_URL` atıyor. Göç notu: tekil tipli config servis/ortam değişkeni olarak taşınmalı, sabit URL'ler env ile yönetilmeli.
- `public/assets/api/migration-flags-browser.js` — Göç özellik bayrakları ve phased rollout stratejisi (localStorage tabanlı); runtime feature-flag yönetimi. Göç notu: server-side/remote flags veya feature-toggle servisi ile değiştirilmeli; testlerle desteklenmeli.
- `public/assets/js/activity-logger.js` — Etkinlik kaydı; API'ye post, localStorage fallback ve outbox mantığı. Göç notu: logging servisini küçük bir paket/servis olarak ayırın; outbox/queue IndexedDB ile izole edilmeli.
- `public/assets/js/advanced-automation.js` — İleri seviye otomasyon motoru (kurallar, zamanlanmış kontroller, SMS/task scheduling). Göç notu: kural yürütücüsü backend veya worker/cron ile dışarı taşınmalı; kurallar veri tabanında saklanmalı.
- `public/assets/js/api-client-wrapper.js` — Optimistic API client; offline outbox, retry, conflict (409) handling. Göç notu: servis katmanı (tanımlı tiplerle) ve testlerle yeniden yazılmalı; outbox IndexedDB/worker ile ayrılmalı.
- `public/assets/js/api-client.js` — (legacy API client, Orval/manuel fallback karışımı) fetch wrapper ve canonicalize helper'lar. Göç notu: Orval üretilen client ile birleştirilip tiplenmiş servis katmanına dönüştürün.
- `public/assets/js/api-connectivity-test.js` — Backend / DB / servis health-check helper ve raporlama. Göç notu: küçük bir test-suit/diagnostic endpoint aracına çevirin; UI tarafında hook ile kullanılmalı.
- `public/assets/js/api-url-wrapper.js` — Orval/generate edilmiş fonksiyonların baseURL ile sarmalanması; runtime URL düzeltmeleri. Göç notu: Orval konfigürasyonu ve ortam yönetimi ile kaldırılmalı; wrapper minimal adapter olabilir.
- `public/assets/js/app.js` — Global AppState, UIState ve uygulama bootstrap mantığı; çok sayıda global mutable state içeriyor. Göç notu: AppState parçalanıp React konteks/Store (Zustand) olarak yeniden organize edilmeli.
- `public/assets/js/appointments/appointment-data.js` — Randevu veri yükleme/normalize, Orval fallback ve local fallback; appointment model helpers. Göç notu: data-fetch hook'larına (TanStack Query) ve saf util'lere bölünmeli.
- `public/assets/js/appointments/appointment-modal.js` — Randevu modalı: form, prefill, date/time handling ve DOM modal yönetimi. Göç notu: react-hook-form içeren küçük Modal bileşeni olarak taşınmalı.
- `public/assets/js/appointments/appointments-main.js` — Appointments sayfası init orchestration (module init sırası). Göç notu: Route container içinde useEffect ile orchestration yapılmalı, modüller lazy-load olmalı.
- `public/assets/js/appointments/calendar-manager.js` — Takvim üretimi ve view switching; day/week/month view render mantığı. Göç notu: takvim UI component'leri React'e (virtualized/performant) port edilmeli; state store ile bağlantı kurulmalı.
- `public/assets/js/appointments/drag-drop.js` — Drag & drop handler (appointments) ve drop hedef yönetimi. Göç notu: modern React drag-drop (dnd-kit) veya HTML5 wrapper ile yeniden yazılmalı; DOM mutation'ları azaltın.
- `public/assets/js/appointments/keyboard-navigation.js` — Klavye kısayolları ve global key handling. Göç notu: global key binding hook (useHotkeys) ile centralize edin; modal/forma erişimi test edin.
- `public/assets/js/appointments/search-filter.js` — Randevu arama/filtreleme UI mantığı ve sonuç render. Göç notu: arama hook + küçük ResultList bileşeni; debounce ve accesibility eklenmeli.
- `public/assets/js/appointments/utils.js` — Appointments için genel util'ler (toast, date/time, debounce, sanitize). Göç notu: bu util'leri packages/shared altında saf fonksiyon olarak tutun.
- `public/assets/js/auth.js` — Basit auth helper ve dev-mode stubs; token yönetimi için localStorage kullanım örnekleri. Göç notu: gerçek auth akışı OAuth/OpenID veya backend token flow ile yeniden düzenlenecek.
- `public/assets/js/auth/client-auth.js` — Client-side auth flows; user-load, logout ve permission helpers. Göç notu: auth servis/sorguları tiplenmiş bir auth provider (context) içine alınsın.
- `public/assets/js/automation-engine.js` — Genel automation engine (event queue, triggers, actions). Göç notu: frontend tarafında yalnızca event dispatching bırakılmalı; ağır iş mantığı backend/worker tarafına kaydırılmalı.
- `public/assets/js/automation-manager.js` — Automation yönetim UI: rule editor, stats, logs. Göç notu: yönetim UI React form + table bileşenlerine bölünmeli; rule payload'ları backend'e taşıyın.
- `public/assets/js/backend-service-manager.js` — Backend API servislerinin init ve adapter'ları (PatientService, AppointmentService...). Göç notu: tekil typed servis paketlerine bölünmeli; Orval client ile birleşsin.
- `public/assets/js/cashflow.js` — Kasa yönetimi sayfası: filtreler, lista, API fallback ve sidebar/widget init. Göç notu: cashflow container + small components (list, filters, modals) olarak parçalayın.
- `public/assets/js/components/category-brand-autocomplete.js` — Kategori/marka autocomplete; fuzzy search, create-on-the-fly ve dropdown UI. Göç notu: UI component ≤500 LOC olacak şekilde `packages/ui-web`'e taşınabilir; fuzzy search servis olarak izole edilsin.
- Buttons:
  - `#dashboard-refresh` (yenile)
  - KPI kart click (her kart `onclick` ile sayfaya yönlendirir)
- Inputs:
  - `#date-range-selector` (select)
- Tables/Lists:
  - None central, çeşitli KPI grid öğeleri
- Modals:
  - `openCashRegisterModal()` (kasa modal)
  - `openPricingCalculatorModal()` (fiyat hesaplama)
- Widgets:
  - Sidebar (`assets/js/widgets/sidebar.js`) — navigasyon
  - Header (`assets/js/widgets/header.js`)

## Inventory (`public/inventory.html`)
- Buttons:
  - "Ürün Ekle" (openAddItemModal)
  - "Bulk Upload" (openBulkUploadModal)
  - Bulk action buttons (openBulkActionsModal, clearSelection)
  - Table action buttons per row: Update stock, Edit, View details, Delete
- Inputs:
  - `#searchInput` (text)
  - Filters: `#categoryFilter`, `#brandFilter`, `#statusFilter`, `#featureFilter`
  - `#selectAll` checkbox
- Tables:
  - `#inventoryTableBody` (table rows rendered by `InventoryTable`)
  - Preview table `#previewTableBody`
- Modals:
  - Add/Edit Item Modal (`InventoryModal`) — form fields for item attrs
  - Bulk actions modal
  - Delete confirm modal (modern modal from inventory-table.js)
- Other elements:
  - Sortable `th` elements with onclick `sortTable('field')`

## Patients (`public/patients.html`)
- Buttons:
  - Yeni hasta ekle
  - Bulk actions
  - Row action buttons (edit, view)
- Inputs:
  - Search box
  - Date filters (modern-datepicker)
- Tables:
  - Patient list table
- Modals:
  - Patient create/edit modal
- Other:
  - `patient-storage-sync.js` and `patients-corrected.js` implement CRUD behaviors

## Patient Details (modular)
- Global areas (div ids):
  - `#header-container`
  - `#patient-list-sidebar-container`
  - `#patient-header-card-container`
  - `#stats-container`
  - `#tabs-container`
  - `#tab-content`
- Buttons/Elements per tab (examples):
  - Notes: Add note button, save
  - Devices: Assign device, open inventory modal, serial list button (`#serialListBtn`)
  - Sales: Create sale, edit sale
  - Invoice/Proforma: Create invoice/proforma, invoice widget trigger
- Modals:
  - Device assignment modal
  - Document management modals (upload, preview)
  - Invoice/proforma modals
- Inputs:
  - Various form inputs in invoice widget

## New Invoice (`public/new-invoice.html`)
- Main form: `#invoiceForm`
- Inputs:
  - `#customerType` select
  - Customer identifiers (tax number / TC)
  - Line item fields: `items[][description]`, `items[][quantity]`, `items[][price]` (dynamic rows)
- Buttons:
  - `#previewInvoiceBtn` (preview)
  - `#createInvoiceBtn` (create)
  - Row actions: add/remove item, edit quantity
- Modals:
  - Product selection / autocomplete
- Other:
  - Uses `flatpickr` datepicker
  - `DynamicInvoiceForm` manages conditional sections and validation

## Reports (`public/reports.html`)
- Elements:
  - Tab buttons `.tab-button` with `data-tab` attributes
  - `#dateRangeFilter` select
  - `exportReports()` button
- Charts:
  - `#campaignPerformanceChart` (Chart.js canvas)
- Tables:
  - Various summary tables (dynamic)

## Appointments (`public/appointments.html`)
- Calendar view (custom DOM canvas / grid)
- Buttons:
  - Yeni randevu, filtreler
- Modals:
  - Appointment create/edit modal
- Inputs:
  - Date/time pickers (modern-date/time pickers)
- Drag-drop interactions and keyboard nav

## SGK Flow (`public/sgk.html`)
- Upload area (drag/drop)
- Buttons: Upload, process, candidate select
- Modals: candidate modal, eReceipt modal
- Tables: processing logs, candidate lists

---

## Automated appendix — Kısa JS dosya özetleri (batch 5 — SGK bundle)

Aşağıda `public/assets/js/sgk` altındaki HTML tarafından kullanılan dosyalar için otomatik üretilmiş kısa özetler ve kısa göç/inceleme notları bulunmaktadır. (Özet: ne yaptığı — önemli yan-etki — göçte dikkat edilecek nokta)

- `public/assets/js/sgk/index.js` — `window.SGK` isim alanını normalize eder ve eski global referansları bu namespace altına taşır. (Yan-etki: global `window` atamaları). Göç notu: bu dosya SGK yüzeyi için küçük bir adapter; React tarafında merkezi bir SGK-context olarak yeniden yazılmalı.
- `public/assets/js/sgk/helpers.js` — OCR/isim/tarih benzerliği, dataURL↔Blob dönüşümleri ve hasta çıkarımı yardımcıları. (Yan-etki: bir dizi helper'ı `window.SGK.helpers` olarak ekler). Göç notu: saf fonksiyonlar olarak taşınabilir; testler yazılmalı.
- `public/assets/js/sgk/init.js` — sayfa başlatma, bulk upload handler, dinamik script yüklemeleri (pipeline, quick-look) ve sidebar/header başlatma mantığı. (Yan-etki: DOM event attach ve dinamik <script> ekleme). Göç notu: sayfa-boot davranışı React lifecycle içinde yeniden uygulanmalı; dinamik modüller import edilerek lazy-load yapılmalı.
- `public/assets/js/sgk/page.js` — sayfa-seviyesinde `updateStatistics`, preview/download ve storage helper'ları; `SGK.page` ve bazı global fonksiyonlar sağlar. (Yan-etki: localStorage okuma/yazma ve global fonksiyonlar). Göç notu: UI aksiyonları küçük hook'lara ve servis çağrılarına bölünmeli.
- `public/assets/js/sgk/processing.js` — ana belge işleme/pipeline sarmalayıcısı ve basic OCR fallback; `processedDocuments` globalini yönetir. (Yan-etki: ağır async işlem, global state mutation). Göç notu: pipeline soyutlanmalı; web worker/async servis olarak taşınması değerlendirilmeli.
- `public/assets/js/sgk/sgk-api.js` — SGK sunucu entegrasyonları; önce Orval client'ı deneyip, fallback olarak `APIConfig.makeRequest` veya fetch kullanır. (Yan-etki: HTTP istekleri, idempotency header kullanımı). Göç notu: Orval çıktısı varsa React servis katmanında yeniden kullanılmalı; idempotency/kimlik yönetimi açıkça test edilmeli.
- `public/assets/js/sgk/storage.js` — SGK belgelerinin saklanması için localStorage/SGKStorage sarmalayıcıları, migrate ve quota cleanup yardımcıları. (Yan-etki: localStorage yoğun kullanımı). Göç notu: IndexedDB/Server storage stratejileri ayrıştırılıp, migration script'leri hazırlanmalı.
- `public/assets/js/sgk/ui.js` — OCR sonuç kartları, hasta arama UI, preview/kaydet butonları ve card render'ları. (Yan-etki: DOM üretimi, event wiring). Göç notu: her kart küçük React bileşenlerine bölünmeli; patient-search davranışı backend çağrılarıyla hook haline getirilmeli.
- `public/assets/js/sgk/modals/candidate-modal.js` — aday seçim modalı; DOM modal oluşturur ve seçim sonrası atama çağrılarına proxy yapar. (Yan-etki: modal DOM insertion). Göç notu: modal olarak React `Modal` içinde yeniden üretilecek.
- `public/assets/js/sgk/modals/ereceipt-modal.js` — e-reçete modalı; malzeme listeleme, tarih uygulama, seçme ve kaydetme akışları (local fallback). (Yan-etki: fallback localStorage persist). Göç notu: form validation + submit akışı `react-hook-form` ile yeniden yazılmalı.
- `public/assets/js/sgk/modals/upload-modal.js` — dosya yükleme modalı ve `manager.handleFileUpload` çağrıları. (Yan-etki: form submit handling). Göç notu: upload UI ve backend upload servisinin ayrıştırılması gerekiyor.
- `public/assets/js/sgk/manager/sgk-storage-manager.js` — arka plan kaydetme/queue ve farklı strateji iskeleti (kopya/summarized). (Yan-etki: potansiyel worker/arka plan iş parçacığı yönetimi). Göç notu: bu manager büyük; ayrı bir servis/worker ve test seti ile taşınmalı.
- `public/assets/js/sgk/vendor/advanced-automation-wrapper.js` — runtime olarak `/assets/js/advanced-automation.js` dosyasını yükleyen küçük wrapper. (Yan-etki: dinamik script yükler). Göç notu: wrapper'lar referans verdikleri dosyaları takip etmemizi sağlıyor; bu hedef dosyaları da işleme al.
- `public/assets/js/sgk/vendor/core-app-wrapper.js` — `/assets/js/core/app.js` yükleyicisi (wrapper). (Yan-etki: dinamik script yükler). Göç notu: core app bağımlılığı incelenecek.
- `public/assets/js/sgk/vendor/header-wrapper.js` — header widget yükleyicisi. (Yan-etki: header script dinamik yükleniyor). Göç notu: header widget React'e öncelikli taşınmalı.
- `public/assets/js/sgk/vendor/image-processor-wrapper.js` — `image-processor.js` yükleyicisi. (Yan-etki: görüntü ön-işleme bağımlılığı). Göç notu: bu bağımlılık pipeline ile sıkı bağlı, migration planı ayrı.
- `public/assets/js/sgk/vendor/ocr-engine-wrapper.js` — `ocr-engine.js` yükleyicisi. (Yan-etki: OCR engine runtime yükleniyor). Göç notu: OCR engine tarafı harici servis/worker ile soyutlanmalı.
- `public/assets/js/sgk/vendor/paddle-backend-wrapper.js` — `paddle-backend-client.js` yükleyicisi. (Yan-etki: üçüncü taraf backend client). Göç notu: bu entegrasyon güvenlik ve API anahtarı yönetimi açısından incelenmeli.

---

Bu ek SGK özeti hem `legacy/reports/legacy-features-and-file-map.md` hem de `legacy/reports/legacy-ui-elements-per-page.md` içinde referans amaçlı kullanılabilir; bir sonraki adım olarak wrapper'ların işaret ettiği hedef dosyaları (pipeline, quick-look modal, advanced-automation, core app, widgets, image-processor, ocr-engine, paddle client) okuyup aynı formatta eklemeye devam ediyorum.

---

## Automated appendix — Kısa JS dosya özetleri (batch 7 — Inventory & Invoice)

Aşağıda en öncelikli inventory ve invoice modülleri için otomatik üretilmiş kısa özetler ve göç notları bulunmaktadır.

- `public/assets/modules/inventory/inventory-main.js` — Inventory sayfası başlatıcısı: `InventoryData`, `InventoryTable`, `InventoryModal`, `InventoryFilters`, `InventoryBulk`, `InventoryStats` örneklerini yaratır ve global event wiring yapar. (Yan-etki: bir dizi `window.*` global ataması). Göç notu: sayfa init davranışı container/route-level React effect/hook olarak taşınmalı; modüller küçük bileşenlere bölünmeli.
- `public/assets/modules/inventory/inventory-table.js` — Tablo render, satır/checkbox seçimleri, sıralama, satır aksiyon butonları (edit/view/delete), bulk selection handling. (Yan-etki: inline onclick handler stringleri). Göç notu: Table/Row bileşenleri ve selection store (Zustand) olarak yeniden yazılmalı; event handler'ları DOM-onclick yerine prop şeklinde verilmeli.
- `public/assets/modules/inventory/inventory-modal.js` — Add/Edit item modal: dinamik form, validation, loading overlay ve fallback localStorage persist. (Yan-etki: modal DOM injection). Göç notu: modal React form (react-hook-form + zod) + controlled inputs şeklinde yeniden yazılmalı.
- `public/assets/modules/invoice/dynamic-form.js` — DynamicInvoiceForm: Orval üzerinden şema çekip conditional alanları DOM ile oluşturur; preview/create butonları ve client-side conditional logic içerir. (Yan-etki: schema-driven DOM üretimi). Göç notu: schema-driven formlar `react-jsonschema-form` veya formik/react-hook-form + dynamic field rendering ile yeniden üretilebilir; Orval client doğrudan kullanılmalı.
`public/assets/modules/components/invoice-widget.js` — Invoice widget: modal & form renderer, hasta/sales modülleri tarafından çağrılır. (Dosya mevcut: `public/assets/modules/components/invoice-widget.js` — arşiv kopyası `legacy/archive/orphan-js/2025-10-14T14-52-51-532Z/public/assets/modules/components/invoice-widget.js`). Göç notu: büyük bir widget; React tarafında `DynamicInvoiceForm`/`InvoiceModal` şeklinde parçalanmalı ve form logic `react-hook-form` ile yeniden yazılmalı.
- `public/assets/modules/api-client.js` — API client wrapper: fetch bazlı istekler, response envelope handling, canonicalizePatient helper'ı ve CRUD method'lar. (Yan-etki: fetch çağrıları doğrudan yapılır). Göç notu: fetch wrapper servis katmanına taşınmalı; Orval ile birleşme kontrolü yapılmalı.
- `public/assets/js/components/category-brand-autocomplete.js` — Marka/Kategori autocomplete: fuzzy search, API fallback ve create-on-the-fly davranışı; input wrapper ve dropdown yönetimi. Göç notu: Autocomplete küçük reusable component (≤500 LOC) olarak `packages/ui-web` içine taşınmalı.
- `public/assets/js/components/multi-select-search.js` — Çoklu seçimli arama dropdown bileşeni; arama, filtre, seçim temizleme ve seçenek render'ı. Göç notu: React'te accessible multi-select component'e dönüştürülmeli.

---

---

## Automated appendix — Kısa JS dosya özetleri (batch 6 — SGK bağımlılıkları)

Aşağıda wrapper'ların işaret ettiği hedef dosyalar (pipeline ve ilgili modüller) için otomatik üretilmiş kısa özetler bulunmaktadır.

- `public/assets/js/domain/sgk/sgk-document-pipeline.js` — SGK belge işleme pipeline'ının ana sınıfı; FileValidator, ImageProcessor, OCREngine, PatientMatcher, PDFConverter ve StorageManager gibi (global) modülleri kullanır. (Yan-etki: ağır async işlem, localStorage ve global sınıf örnekleri). Göç notu: pipeline ayrı bir servis/web-worker ve küçük, test edilebilir modüllere bölünmeli; bağımlılıklar servis sınırlarıyla soyutlanmalı.
- `public/assets/js/components/quick-look-modal.js` — QuickLook modal bileşeni; DOM bazlı modal oluşturma, FileReader ile preview, event wiring ve fallback toast'lar. (Yan-etki: DOM ekleme/çıkarma). Göç notu: React'te `QuickLookModal` olarak yeniden yazılmalı; FileReader/preview mantığı servis olarak ayrılmalı.
- `public/assets/js/advanced-automation.js` — İleri seviye otomasyon kural motoru; zamanlanmış kontroller, event listener'lar ve SMS/task scheduling aksiyonları içerir. (Yan-etki: setInterval, global event abonelikleri, queue islemleri). Göç notu: kural tanımları veri olarak saklanmalı; yürütme motoru ayrı bir microservice veya backend-scheduled worker olabilir.
- `public/assets/js/core/app.js` — Uygulama global durumu (`AppState`), UI helper'lar (`UIState`) ve SavedViews/Storage yönetimi. Çok büyük ve pek çok global mutable state içeriyor. Göç notu: AppState parçalanıp React konteksleri/Store'lara (Zustand/Redux) taşınmalı; Storage API soyutlanmalı.
- `public/assets/js/widgets/header.js` — Header widget: bildirim dropdown'u, profil menüsü, karanlık mod toggle; localStorage üzerinden notification persist. Göç notu: Header hızlıca React bileşeni olarak taşınmalı; bildirim API'sı servisleştirilmelidir.
- `public/assets/js/image-processor.js` — ImageProcessor/FileValidator/OCREngine/PDFConverter/StorageManager için hafif fallback shim'leri ve minimal implementasyonlar içeriyor (public build için). (Yan-etki: global konstruktorlar atıyor). Göç notu: Gerçek image processing bağımlılıkları (GPU/wasm) ayrı bir paket veya backend/worker içinde yönetilmeli; shim'ler test amaçlı tutulmalı.
- `public/assets/js/ocr-engine.js` — OCR motoru (Tesseract entegrasyonu), NLP entegrasyonu ve cache mekanizmaları; Tesseract worker, NLP servisleri ve dil paketleriyle yoğun I/O/CPU kullanımı. Göç notu: OCR ağır; backend veya web-worker + Tesseract WASM şeklinde taşınmalı; NLP çağrıları backend'e devredilmeli.
- `public/assets/js/paddle-backend-client.js` — PaddleOCR backend client wrapper; health check, /process, /entities uç noktalarını kullanır ve fallback JS simülasyonu destekler. (Yan-etki: network çağrıları, bağlantı durumunu global kaydeder). Göç notu: client, React servis layer'ında tek bir instans olarak tutulmalı; güvenlik (baseURL/keys) kontrol edilmeli.

---

## Global Widgets / Shared Elements
- `Header` (top bar): profile, notifications, quick actions
- `Sidebar` (nav): links to pages, branch selector
- `Modal` pattern: many pages create modals dynamically using DOM append (common behavior)
- `Toast` / `Utils.showToast`: show success/error messages
- Datepicker: `modern-datepicker.js` / flatpickr usage

---

## React'e taşınacak component adayı (önceliklendirilmiş)
1. Core layout: `Header`, `Sidebar`, `PageContainer`.
2. Form primitives: `FormField`, `Select`, `Checkbox`, `DatePicker`.
3. Data table primitives: `Table`, `TableRow`, `Pagination`, `SortHeader`.
4. Modals: `Modal`, `ConfirmModal`, `FormModal`.
5. Inventory-specific: `InventoryTable`, `InventoryFilters`, `InventoryModals`.
6. Patient-specific: `PatientHeader`, `PatientTabs`, `PatientNotes`, `DeviceManagement`.
7. Invoices: `DynamicInvoiceForm`, `InvoiceWidget`.
8. SGK: `SgkUploader`, `SgkCandidateModal` (domain-specific — lower priority)


---

## Automated appendix — Rule B batch 1 (patient-details-modular.html referenced scripts)

Bu ek, `public/patient-details-modular.html` içinde doğrudan referans verilen ilk 25 script dosyası için otomatik üretilmiş 1-satırlık Türkçe özetler ve kısa göç notlarını içerir. Kural B kapsamında yalnızca HTML tarafından referanslanan dosyalar ilk olarak inceleniyor.

- `assets/js/darkMode.js` — Dark mode durumunu localStorage ile yönetir ve global `DarkMode` API'si sağlar. Göç notu: React'te context veya custom hook (useDarkMode) olarak taşınmalı.
- `assets/js/darkModeInitializer.js` — Dark mode CSS/JS yüklemelerini sayfa başında güvenli şekilde yapar. Göç notu: app bootstrap/entry effect içinde statik import veya lazy load ile yeniden uygulanmalı.
- `demo/auto-loader.js` — Demo modunda dinamik demo bootstrap script'ini yükler. Göç notu: sadece demo/QA amaçlı; prod trail için conditional dev-only loader yapılandırılmalı.
- `assets/api-config.js` — Çalışma zamanı API base URL ve endpoint konfigürasyonlarını belirler; APIConfig sınıfı sağlar. Göç notu: config servis/ortam değişkenleri ile değiştirilmeli; istemci kodu TypeScript servis katmanına alınmalı.
- `utils/storage-helper.js` — LocalStorage anahtarları ve güvenli get/set helper'ları. Göç notu: saf util modülü; packages/domain veya shared utils olarak taşınmalı ve test edilmeli.
- `assets/js/core/app.js` — Uygulamanın global AppState, UIState ve yardımcı fonksiyonları (çok büyük). Göç notu: parçalanmalı; AppState parçaları React kontekslerine veya store (Zustand) modüllerine dönüştürülmeli.
- `assets/js/lib/xear-backbone.js` — Canonicalizer, EventBus, ApiClient wrapper ve yardımcı domain fonksiyonları içerir. Göç notu: domain helper'ları paketlenmeli; EventBus yerine React/Store temelli olay yönetimi kullanılmalı.
- `assets/js/widgets/sidebar.js` — Sidebar navigasyon render ve etkileşimleri (collapsed state, submenus). Göç notu: taşıması kolay presentational component; layout-level React bileşeni yap.
- `assets/js/widgets/header.js` — Header (bildirimler, profil, dark-mode toggle) bileşeni ve dropdown logic'i. Göç notu: React Header bileşeni olarak hızlıca taşı; notification store ile entegre et.
- `assets/widgets/stats-card.js` — Dashboard/Patient KPI kartları için küçük presentational widget. Göç notu: UI kütüphanesine (packages/ui-web) taşınabilir küçük bileşen.
- `assets/modules/utils/patient-normalize-init.js` — Hasta nesnesini normalize eden başlatıcı adaptör. Göç notu: canonicalizePatient util'ını tek bir servis altında topla ve test et.
- `assets/js/lib/typescript-data-loader.js` — Derlenmiş TS data servislerini dinamik import edip global sampleData objesi sağlar. Göç notu: dynamic imports kullanımı korunarak yeni servis katmanına bağlanmalı; window marshalling azaltılmalı.
- `assets/js/utils/fuzzy-search.js` — Levenshtein tabanlı fuzzy search yardımcıları. Göç notu: saf fonksiyonlar paketlenip test edilmeli; bir search servisinde yeniden kullanılabilir.
- `assets/js/generated/orval-api-commonjs.js` — Orval ile üretilmiş API stub'ları / client fonksiyonları. Göç notu: Orval çıktısı doğrudan TS servis katmanına dahil edilmeli; wrapper'lar minimal tutulmalı.
- `assets/modules/api-client.js` — ApiClient sınıfı: fetch wrapper, response handling, canonicalizePatient adaptörleri. Göç notu: servis katmanında tek bir instans ve tiplerle yeniden yazılmalı.
- `assets/modules/patient-details/patient-header-card.js` — Hasta header kartı, yaş hesaplama ve gösterim. Göç notu: presentational + small utils; React component ve helper fonksiyonlarına bölünmeli.
- `assets/modules/patient-details/patient-tabs.js` — Sekme yapısı (Genel/Cihaz/Satış/SGK/Belgeler). Göç notu: React tab navigation + lazy-loaded tab bileşenleri ile değiştirilmeli.
- `assets/modules/patient-details/patient-tab-content.js` — Tab-level renderer, async yüklemeler ve tab içeriklerinin orchestration'ı. Göç notu: her alt tab ayrı React komponenti; data-loading için kullanışlı hook'lar yazılmalı.
- `assets/modules/patient-details/device-modals.js` — Cihaz ile ilgili modal sistemleri (assign/edit/replace) ve toast/modal util'ları. Göç notu: modal ve toast küçük bileşenlere ve bir UI layer'a alınmalı; imperative DOM injection azaltılmalı.
- `assets/modules/patient-details/patient-management.js` — Hasta edit/create flow: validation, API-first persist, TC kontrolü. Göç notu: react-hook-form + zod ile yeniden yazılmalı; business validation servis katmanına taşınmalı.
- `assets/js/modern-datepicker.js` — Kendi modern datepicker bileşimi (fallback/özelleştirilmiş). Göç notu: mümkünse `flatpickr` veya React tarih çözümleri ile değiştir; UI kit içinde paketle.
- `assets/modules/patient-details/patient-notes.js` — Hasta notları: add/edit modal, API/localStorage fallback, event dispatch. Göç notu: notes context + optimistic updates ile taşınmalı; event bus azaltılmalı.
- `assets/modules/components/sgk-management.js` — SGK tabı için kapsamlı yönetim: doküman listesi, sorgu, rapor indirme vs. Göç notu: domain-specific; SGK servisleri ve presentational component'lere bölünmeli.
- `assets/modules/components/device-management.js` — Envanter/cihaz yönetimi: inventory expansion, serial handling, device assignment helpers (çok büyük). Göç notu: inventory servis + device UI bileşenlerine ayır; inventory logic test edilebilir modüllere bölünmeli.
- `assets/widgets/invoice-preview.js` — Fatura önizleme modalı, GİB etkileşimleri ve print/preview. Göç notu: Invoice modal + DynamicInvoiceForm olarak yeniden kullanılabilir parçalar halinde taşınmalı.


---

Dosya oluşturuldu: `legacy/reports/legacy-ui-elements-per-page.md`

---

Not: Eğer bu iki MD'de aradığınız bir JS dosyasını bulamıyorsanız, otomatik taranmış ve raporlanmış bir listeyi kontrol edin: `legacy/reports/missing-js-mapping.md` — bu dosya `public` altındaki tüm `.js` dosyalarını tarar ve hangi HTML sayfalarında kullanıldıklarını listeler. Dist/generated dosyalar burada ayrı işaretlenmiştir.

Ek Batch 3 özeti: kısaltılmış Rule‑B özetleri için bakınız: `legacy/reports/legacy-ui-elements-batch-3.md` (entries 26–50).

**Not:** Batch 4 (entries 51–75) özetleri için bakınız: `legacy/reports/legacy-ui-elements-batch-4.md`.
---
## Proje-özgü React dosya yapısı önerisi (x-ear mevcut yapısına göre)

Mevcut `x-ear/apps/web` ve `x-ear/packages/ui-web` yapısını göz önünde bulundurarak, aşağıdaki dosya/komponent haritasını öneriyorum. Amacımız tek sorumluluk ilkesi ve her dosyanın 500 LOC sınırını korumak.

Kök önerisi: `x-ear/apps/web/src`

  - pages/
    - Dashboard/
      - DashboardPage.tsx
      - DashboardKpi.tsx
    - Inventory/
      - InventoryPage.tsx
      - InventoryTable/
        - InventoryTable.tsx
        - InventoryRow.tsx
      - InventoryFilters.tsx
      - InventoryModals/
        - InventoryEditModal.tsx
        - InventoryBulkModal.tsx
    - Patients/
      - PatientsPage.tsx
      - PatientList.tsx
    - PatientDetails/
      - PatientDetailsPage.tsx
      - PatientHeader.tsx
      - PatientTabs.tsx
      - PatientNotes.tsx
    - NewInvoice/
      - NewInvoicePage.tsx
      - DynamicInvoiceForm.tsx
  - components/
    - layout/
      - Header.tsx
      - Sidebar.tsx
    - ui/ (primitives, mümkünse `packages/ui-web`'den import edin)
      - Button.tsx
      - Modal.tsx
      - Table.tsx
      - FormField.tsx
      - Datepicker.tsx
  - services/
    - apiClient.ts
    - invoiceService.ts
    - inventoryService.ts
  - hooks/
    - useApi.ts
    - useModal.ts
  - stores/

    ## React önerisi (x-ear) — hızlı referans

    Aşağıda `x-ear/apps/web` köküne hızlıca uygulayabileceğiniz, her bileşenin 500 LOC sınırını koruyan minimum React+TypeScript dosya/klasör önerisi bulunmaktadır. Bu bölüm, iki ana raporun sonuna eklenmiş olup, migration sırasında doğrudan kopyalanıp parça parça uygulanabilir.

    Kök: `x-ear/apps/web/src`

    - pages/
      - Dashboard/
        - DashboardPage.tsx         # container + composed small components
        - DashboardKpi.tsx
      - Inventory/
        - InventoryPage.tsx
        - InventoryTable/
          - InventoryTable.tsx
          - InventoryRow.tsx
        - InventoryFilters.tsx
        - InventoryModals/
          - InventoryEditModal.tsx
          - InventoryBulkModal.tsx
      - Patients/
        - PatientsPage.tsx
        - PatientList.tsx
      - PatientDetails/
        - PatientDetailsPage.tsx
        - PatientHeader.tsx
        - PatientTabs.tsx
        - PatientNotes.tsx
      - NewInvoice/
        - NewInvoicePage.tsx
        - DynamicInvoiceForm.tsx

    - components/
      - layout/
        - Header.tsx
        - Sidebar.tsx
      - ui/
        - Button.tsx
        - Modal.tsx
        - Table.tsx
        - FormField.tsx
        - Datepicker.tsx

    - services/
      - apiClient.ts       # Orval wrapper + typed services
      - invoiceService.ts
      - inventoryService.ts

    - hooks/
      - useApi.ts
      - useModal.ts

    - stores/
      - uiStore.ts         # small zustand store for UI state
      - inventoryStore.ts

    Notlar:
    - Her dosya 500 LOC sınırına uymalı; büyük modüller küçük presentational ve logic parçalarına bölünmeli.
    - `services/*` Orval ile oluşturulmuş client'ı tekrar kullanmalı; `apiClient.ts` sadece adaptör görevi görmeli.
    - Ağır iş (OCR, PDF, image processing) web-worker veya backend servislerine taşınmalı; frontend'te yalnızca queue/hook ve progress UI tutulmalı.

    ### Hızlı bileşen sözleşmeleri (örnekler)

    Aşağıda en yüksek öncelikli birkaç bileşen için küçük "contract" şablonları, input/output ve 2-3 edge-case yer almaktadır. Bunları doğrudan `x-ear/apps/web/src/components` içinde oluşturabilirsiniz.

    - Header.tsx
      - Inputs: {user: User, notificationsCount: number}
      - Outputs: onToggleSidebar(): void, onLogout(): void
      - Error modes: network failures fetching notifications (render cached state + skeleton)
      - Edge cases: notifikasyon listesi çok büyük => virtualize; offline user state

    - Sidebar.tsx
      - Inputs: {menuItems: MenuItem[], currentRoute: string}
      - Outputs: onNavigate(route): void
      - Edge cases: deep nested menus, permission-based items (render placeholders if missing)

    - Modal.tsx
      - Inputs: {open: boolean, title?: string, onClose: () => void}
      - Outputs: onSubmit(data): Promise<void>
      - Edge cases: focus-trap, escape key handling, nested modals

    - InventoryTable.tsx
      - Inputs: {items: InventoryItem[], onEdit(item), onDelete(id), selectedIds: string[]}
      - Outputs: onSelect(ids: string[]), onBulkAction(action)
      - Edge cases: large lists => server-side pagination or virtualization; concurrent edits

    - DynamicInvoiceForm.tsx
      - Inputs: {schema: InvoiceSchema, initial?: Partial<InvoicePayload>}
      - Outputs: onPreview(payload) => Modal, onSubmit(payload) => Promise<void>
      - Error modes: validation errors from server (map field errors), pricing calc failures (fallback UI)

    - SgkUploader.tsx (domain)
      - Inputs: {onProcessed(documentMeta)}
      - Outputs: shows progress, reports per-file results
      - Notes: heavy CPU => use web-worker for preprocess + call backend for OCR when available

    ## Entegre ekler — Batch 5–8 (tam içerik)

    Aşağıda Rule B kapsamında oluşturulmuş batch 5, 6, 7 ve 8 için otomatik üretilen kısa özetlerin tam içerikleri yer almaktadır. Bu sayede ayrı dosyalara bakmaya gerek kalmadan tüm özetleri okuyabilirsiniz.

    ---

    <!-- Batch 5 start -->

    Automated appendix — Kısa JS dosya özetleri (batch 5 — entries 76–100)

    Aşağıdaki liste, `legacy/.cache/html_referenced_js.txt` içindeki 76–100 aralığında bulunan HTML tarafından referanslanan JS dosyaları için otomatik üretilmiş 1-satırlık Türkçe özetler ve kısa göç/inceleme notlarıdır (Rule B: yalnızca HTML tarafından çağrılan dosyalar ve doğrudan import'ları). Her satır: dosya yolu — kısa açıklama. Eksik dosyalar disk üzerinde bulunamadıysa "(dosya bulunamadı)" olarak işaretlenmiştir.

    - `assets/js/notification-system.js` — (dosya bulunamadı) — Not: notification sistemi HTML tarafından referanslanmış ancak repo üzerinde beklenen yolda bulunamadı; arşiv/backup kontrolü gerek.
    - `assets/js/ocr-engine.js` — Tesseract worker tabanlı OCR motoru; NLP entegrasyonu, ön-işleme ve cache yönetimi içeriyor. Göç notu: ağır CPU işi web-worker veya sunucu servisine taşınmalı; OCR parametreleri ve `tessdata` yolu konfigüre edilebilir, tipi ve bağımlılıkları netleştirilmeli.
    - `assets/js/ocr-integration.js` — (dosya bulunamadı) — Not: OCR entegrasyon sarmalayıcısı HTML'de referanslı ancak diskte yok; doğru yol/versiyon aranmalı.
    - `assets/js/paddle-backend-client.js` — PaddleOCR Python backend client; health-check, initialize ve fallback simülasyonu içerir. Göç notu: backend servis istemcisi olarak tiplenmiş, testli bir servis adapterına dönüştürülsün; fallback stratejileri açıkça dokümante edilsin.
    - `assets/js/paddle-nlp-service.js` — PaddleNLP servis wrapper'ı; model yükleme, fallback JS simülasyonu ve entity/similarity fonksiyonları. Göç notu: NLP ağır iş yükü sunucu/servis tarafına alınmalı; client-side küçük shim/adapter olarak bırakılabilir.
    - `assets/js/patient-actions.js` — Hasta sayfası için 'saved views', bulk actions, export ve helper glue kodu. Göç notu: UI işlemleri React bileşenlerine; bulk/export logic servis katmanına alınmalı.
    - `assets/js/patient-compat.js` — `PatientManager` uyumluluk shim'leri: eksik fonksiyonları sağlıyor. Göç notu: migrate sırasında adapter olarak faydalı; nihai olarak kaldırılıp gerçek manager/servis kullanılmalı.
    - `assets/js/pdf-converter.js` — Görüntü→PDF dönüştürücü: EXIF düzeltme, köşe algılama, optimizasyon ve jsPDF kullanımı. Göç notu: dönüşüm ağırsa worker/backend'e taşınmalı; küçük util'ler testli modüllere ayrılmalı.
    - `assets/js/sales-tab.js` — (dosya bulunamadı) — Not: sales tab script'i HTML tarafından referanslı fakat diskte beklenen konumda yok; arşiv kontrolü önerilir.
    - `assets/js/sgk/helpers.js` — SGK yardımcı fonksiyonları: string/date similarity, dataURL↔Blob, hasta çıkarımı heuristikleri. Göç notu: saf util modüller olarak taşınmalı ve birim testleri eklenmeli.
    - `assets/js/sgk/index.js` — SGK global namespace normalizasyonu; eski global referansları `window.SGK` altına map'ler. Göç notu: React tarafında merkezi bir SGK-context/adaptor olarak yeniden yazılmalı.
    - `assets/js/sgk/init.js` — SGK sayfa-initialize; bulk upload handler, dinamik script yükleme, pipeline başlatma. Göç notu: lifecycle davranışı React container içine; background processing manager lazy-load edilerek worker/servis ayrıştırılmalı.
    - `assets/js/sgk/manager/sgk-storage-manager.js` — Arka plan kaydetme/queue ve storage stratejileri (localStorage/indexedDB/server) için manager iskelesi. Göç notu: büyük, stateful ve I/O yoğun; web-worker + server storage mimarisi ile taşınmalı.
    - `assets/js/sgk/modals/candidate-modal.js` — Aday seçim modalı; DOM tabanlı modal render ve atama callback'leri. Göç notu: küçük React Modal bileşeni olarak yeniden yazılmalı.
    - `assets/js/sgk/modals/ereceipt-modal.js` — E-reçete modalı; malzeme listeleme, tarih uygulama ve kaydetme akışları. Göç notu: form validation ve submit `react-hook-form` ile; server save adapter'ı netleştirilmeli.
    - `assets/js/sgk/modals/upload-modal.js` — Upload modalı; dosya seçme ve manager.handleFileUpload çağrıları. Göç notu: upload UI ve upload servis ayrılmalı.
    - `assets/js/sgk/page.js` — Sayfa-seviyesi preview/download/updateStatistics helper'ları ve SGK.page namespace. Göç notu: UI eylemleri küçük hook'lar ve servis çağrılarına bölünmeli.
    - `assets/js/sgk/processing.js` — SGK belge işleme pipeline sarmalayıcısı; pipeline/fallback mantığı, `processedDocuments` globali. Göç notu: pipeline modülleri test edilebilir alt-modüllere bölünsün; ağır işler worker veya backend'e taşınsın.
    - `assets/js/sgk/sgk-api.js` — SGK sunucu entegrasyonları; Orval client öncelikli, fallback fetch/APIConfig. Göç notu: Orval/typed client varsa doğrudan kullanılsın; idempotency ve hata senaryoları test edilsin.
    - `assets/js/sgk/sgk-storage.js` — SGK localStorage sarmalayıcısı: read/save/listByPatient vb. Göç notu: IndexedDB/Server storage stratejileri ile değiştirilmeli; migration path hazırlanmalı.
    - `assets/js/sgk/ui.js` — OCR sonuç kartları, hasta arama, preview/kaydet butonları; DOM render ve event wiring. Göç notu: her kart React bileşeni; patient-search backend hook ile değiştirilmeli.
    - `assets/js/sgk/vendor/advanced-automation-wrapper.js` — runtime olarak `/assets/js/advanced-automation.js` yükleyen küçük wrapper. Göç notu: wrapper'lar hedef dosyaları işaret eder, o hedefleri de işleme alın.
    - `assets/js/sgk/vendor/core-app-wrapper.js` — `/assets/js/core/app.js` yükleyicisi (wrapper). Göç notu: core app bağımlılığı incelenecek.
    - `assets/js/sgk/vendor/header-wrapper.js` — header widget yükleyicisi. Göç notu: header React'e öncelikli taşınmalı.
    - `assets/js/sgk/vendor/image-processor-wrapper.js` — `image-processor.js` yükleyicisi; pipeline bağlılığı. Göç notu: görüntü-işleme modülü izole edilmeli.
    - `assets/js/sgk/vendor/ocr-engine-wrapper.js` — `ocr-engine.js` yükleyicisi. Göç notu: OCR engine runtime yükleme adaptörü; OCR motoru servis/worker'e taşınmalı.

  <!-- Batch 6 start -->

    Automated appendix — Kısa JS dosya özetleri (batch 6)

    Aşağıda Rule B kapsamında (HTML tarafından referanslanan dosyalar + doğrudan importları) gelen 101–125 aralığındaki JS dosyaları için otomatik üretilmiş 1-satırlık özetler ve kısa göç notları bulunmaktadır.

    - `public/assets/js/sgk/vendor/image-processor-wrapper.js` — Görüntü ön-işleme/processor script'ini runtime yükleyen küçük wrapper. Göç notu: wrapper hedefini takip edin; gerçek image-processor bağımlılığı web-worker veya backend servisine taşınmalı.
    - `public/assets/js/sgk/vendor/ocr-engine-wrapper.js` — OCR engine (ocr-engine.js) loader wrapper. Göç notu: OCR ağır işlem; web-worker / backend servisine taşıma planı oluşturun.
    - `public/assets/js/sgk/vendor/paddle-backend-wrapper.js` — Paddle backend client'ını dinamik yükleyen adaptor. Göç notu: entegrasyon anahtarları ve güvenlik kontrolüyle birlikte tekil servis katmanına alınmalı.
    - `public/assets/js/sgk/vendor/paddle-nlp-wrapper.js` — Paddle NLP servis wrapper'ı (NLP/ner işlemleri). Göç notu: NLP çağrılarını backend'e taşıyın ve client'ta sadece tipli servis adapter tutun.
    - `public/assets/js/sgk/vendor/patient-matching-wrapper.js` — Hasta eşleştirme modülünü runtime yükleyen wrapper. Göç notu: hasta-matching algoritmasını küçük, test edilebilir bir servis modülüne dönüştürün.
    - `public/assets/js/sgk/vendor/quicklook-wrapper.js` — Quick-look modal (preview) loader wrapper. Göç notu: QuickLook modal React bileşeni olarak hızlıca yeniden üretin; FileReader/preview logic servisleştirilsin.
    - `public/assets/js/sgk/vendor/ts-loader-wrapper.js` — typescript-data-loader gibi tipli veri loader'larını yükleyen küçük loader. Göç notu: tipli loader'ları module/worker olarak yeniden paketleyin.
    - `public/assets/js/sgk/vendor/utils-wrapper.js` — core utils'u runtime'da yükleyen küçük sarmalayıcı. Göç notu: util'leri packages/shared içine taşıyın ve doğrudan import edin.
    - `public/assets/js/storage-keys.js` — Tüm uygulamada kullanılan canonical storage key'lerini tanımlar (`window.STORAGE_KEYS`). Göç notu: anahtarları merkezi konfigürasyona taşıyın ve tipli anahtar enum'u oluşturun.
    - `public/assets/js/storage-manager.js` — `XEarStorageManager` sınıfı: get/set/migrate/clear, migration logic ve quota cleanup; localStorage yoğun kullanımı. Göç notu: IndexedDB/Server storage stratejileri düşünülsün; migration script'leri yazılmalı.
    - `public/assets/js/suppliers/suppliers-main.js` — Suppliers modülü init flow'u, DOMContentLoaded hook'ları ve `SuppliersApp` export. Göç notu: sayfa/container-level React component + servis olarak yeniden yazılmalı.
    - `public/assets/js/utils.js` — Genel yardımcılar: date-format, toast, validation, small DOM helpers. Göç notu: saf util fonksiyonlarına bölün; `packages/shared` içinde test edilsin.
    - `public/assets/js/utils/fuzzy-search.js` — Levenshtein/tabanlı fuzzy search yardımcıları ve benzerlik hesapları. Göç notu: arama servisi olarak izole edin, frontend tarafında performans için web-worker değerlendirilsin.
    - `public/assets/js/widgets/header.js` — Header widget: bildirim dropdown, profil menüsü, karanlık mod toggle; DOM tabanlı render. Göç notu: hızlıca React Header bileşenine taşıyın; notification servisleri ayrıştırılsın.
    - `public/assets/js/widgets/sidebar.js` — Sidebar widget: menüler, SGK/Fatura alt menüleri, responsive davranış. Göç notu: Sidebar navigasyonu React Router ile yeniden kurgulayın; menu items veri-odaklı hale getirilsin.
    - `public/assets/js/widgets/widget-loader.js` — Widget loader: dinamik script yükleme, widget register/get/remove ve `initPageWidgets`. Göç notu: widget runtime bootstrap'ını React lazy/route-level olarak yeniden tasarlayın.
    - `public/assets/js/wrap-tables.js` — Tablo sarmalama yardımcı script'i (responsive wrapper). Göç notu: küçük DOM util; React component'in render wrapper'ı ile değiştirin.
    - `public/assets/modules/admin-panel/apps.js` — Admin Apps sayfa modülü: init, render ve modal yönetimi; `api` modülünü kullanır. Göç notu: Admin panelleri küçük React sayfalarına dönüştürülsün; yetki kontrolleri merkezi auth provider'da olsun.
    - `public/assets/modules/admin-panel/audit.js` — Admin audit log modülü: audit kayıtlarını çeker ve listeler. Göç notu: audit endpoint'lerini typed servis katmanına taşıyın; liste component'i lazy-load edilsin.
    - `public/assets/modules/admin-panel/features.js` — Özellik yönetimi UI: feature toggle'lar, plan atamaları ve güncelleme istekleri. Göç notu: feature flags yönetimini server-side/feature-service'e taşıyın; UI küçük bileşenlere bölünsün.
    - `public/assets/modules/admin-panel/permissions.js` — İzinler yönetimi: izin oluşturma, listeleme. Göç notu: permissions service + modal component olarak taşınmalı.
    - `public/assets/modules/admin-panel/roles.js` — Roller yönetimi: rol oluşturma, izin atama, rol detay modalı. Göç notu: role/permission modellerini domain paketine taşıyın ve modal React ile yeniden uygulayın.
    - `public/assets/modules/admin-panel/router.js` — Basit hash-router admin panel için; container göster/gizle. Göç notu: React Router ile değiştirin; client-side hash navigasyon bırakılabilir.
    - `public/assets/modules/api-client.js` — API client wrapper: fetch wrapper, response envelope handling ve `canonicalizePatient` helper. Göç notu: Orval üretilen client ile entegre edin, tekil typed servis katmanı oluşturun.

  <!-- Batch 7 start -->

    Automated appendix — Kısa JS dosya özetleri (batch 7)

    Aşağıda Rule B kapsamında (HTML tarafından referanslanan dosyalar + doğrudan importları) gelen 126–150 aralığındaki JS dosyaları için otomatik üretilmiş 1-satırlık özetler ve kısa göç notları bulunmaktadır.

    - `public/assets/modules/components/device-management.js` — Cihaz envanteri/seri genişletme ve assignment akışlarını yöneten büyük komponent; hem API hem localStorage fallback içerir. Göç notu: inventory/device assignment logiğini servis + küçük React bileşenlerine ayırın; seri-genişletme ve ağır normalize işlemleri worker/servis tarafına taşıyın.
    - `public/assets/modules/components/document-management-legacy.js` — Legacy document upload/storage (localStorage) implementasyonu; drag/drop ve base64 saklama. Göç notu: sadece arşiv amaçlı tutun; modern upload + server/IndexedDB stratejisiyle değiştirin.
    - `public/assets/modules/components/document-management.js` — Hasta belgelerinin render/upload/preview koordinatörü; enhanced kontrol entegrasyonları var. Göç notu: DocumentList ve Upload modal küçük React bileşenlerine bölünecek; storage adapter API-first olmalı.
    - `public/assets/modules/components/invoice-management.js` — Fatura oluşturma modalı ve device→invoice orchestration; global event dinleyicisi ile cache yönetimi. Göç notu: Invoice modal/confirm UI React'e taşınmalı; fatura servis katmanı typed Orval client ile birleşsin.
    - `public/assets/modules/components/invoice-widget.js` — Yeniden kullanılabilir invoice widget: modal, form ve preview; sale/device prefill logic içerir. Göç notu: bu widget React tarafında tekil, test edilebilir bileşen olmalı (≤500 LOC parçalar).
    - `public/assets/modules/components/proforma-management.js` — Proforma (teklif) yaratma ve backend fallback; localStorage cache. Göç notu: proforma flow backend-first olmalı; UI küçük bileşenlere ve servis katmanına ayrılmalı.
    - `public/assets/modules/components/promissory-note.js` — Senet oluşturma UI ve taksit önizleme; flatpickr yüklemeleri ve modal heavy logic. Göç notu: form validation + taksit hesaplamaları saf util'lere; modal React ile yeniden yapılandırılsın.
    - `public/assets/modules/components/sales-management.js` — Sales coordinator: alt modülleri instantiate eder ve global window export'ları yapar. Göç notu: coordinator bir Route container'a dönüşmeli; alt modüller lazy-load edilmiş React bileşenleri olmalı.
    - `public/assets/modules/components/sgk-management.js` — SGK dashboard: belge yönetimi, durum sorgulama ve finansal özetler; SGKStorage entegrasyonu. Göç notu: SGK tabloları ve cards küçük bileşenlere bölünsün; SGKStorage → IndexedDB/Server adapte edilsin.
    - `public/assets/modules/invoice/dynamic-form.js` — Orval tarafından sağlanan/çeşitli senaryolara göre şema-driven dinamik invoice form. Göç notu: schema-driven formu react-hook-form + dynamic renderer ile yeniden üretin; Orval schema doğrudan kullanılsın.
    - `public/assets/modules/patient-details/device-assignment-handler.js` — Device assignment form validation ve inventory select populate; ear-mode toggling. Göç notu: bu logic küçük hook'lara ve controlled form bileşenlerine taşınmalı; validation zod ile tiplenmeli.
    - `public/assets/modules/patient-details/device-modals.js` — Cihaz edit/delete/replace modal helper'ları ve toast/confirm sistemleri. Göç notu: modal ve toast altyapısını Radix/Headless UI + global notification servis ile değiştirin.
    - `public/assets/modules/patient-details/document-management-enhanced.js` — Gelişmiş belge kontrol + quick-upload ve bulk-upload modal'ları. Göç notu: bulk upload ve preview UI'ı React/worker ile yeniden yazılmalı; tipli upload servisleri kullanılmalı.
    - `public/assets/modules/patient-details/document-management-globals.js` — Dokümanlara dair global helper fonksiyonlar ve küçük adaptörler. Göç notu: saf util'ler packages/shared içine taşınsın ve side-effect-free olsun.
    - `public/assets/modules/patient-details/document-management.js` — Patient-level document tab renderer ve legacy upload modal; enhancedControls entegrasyonu. Göç notu: Tab renderer React route/tab component olacak; upload modal React + controlled form olarak taşınsın.
    - `public/assets/modules/patient-details/patient-appointments.js` — Hasta randevu yükleme/normalize + async render fallback'ları (DomainManager/legacyBridge/API). Göç notu: appointment list ve modallar ayrı bileşen; normalize util'leri domain paketine taşıyın.
    - `public/assets/modules/patient-details/patient-header-card.js` — Hasta header presentational component (normalizer kullanıyor, yaş hesaplama). Göç notu: küçük presentational React component; canonicalizePatient servisi ortak kullanılsın.
    - `public/assets/modules/patient-details/patient-list-sidebar.js` — Hasta listesi sidebar: search, collapse state, layout margin sync. Göç notu: sidebar komponenti React + virtualized list'e dönüştürülmeli; layout sync event'leri daha deterministic yapılmalı.
    - `public/assets/modules/patient-details/patient-management.js` — Hasta edit modal ve save flow (API-first, local fallback, TC validation). Göç notu: edit form react-hook-form + zod ile yeniden yazılsın; API hata haritalama servis katmanına alınsın.
    - `public/assets/modules/patient-details/patient-notes.js` — Not ekleme/edit flow; API fallback ve localStorage outbox. Göç notu: Notes context + optimistic updates (TanStack Query) ile taşının; offline queue IndexedDB'e alınsın.
    - `public/assets/modules/patient-details/patient-page-initializer.js` — Patient details page orchestration; header/sidebar/component init ve DomainManager bridge. Göç notu: bu initializer Strangler pattern ile parçalanacak; React route container görevini almalı.
    - `public/assets/modules/patient-details/patient-stats-cards.js` — Patient stats card widgets composition (legacy StatsCardWidget kullanımı). Göç notu: küçük presentational cards paket olarak taşınmalı ve test edilmeli.
    - `public/assets/modules/patient-details/patient-tab-content.js` — Tab-level renderer delegating to per-tab renderers and async fallbacks. Göç notu: each tab → lazy React component with domain hooks; normalize/passthrough utilities centralized.
    - `public/assets/modules/patient-details/patient-tabs.js` — Tabs UI (hash-based handlers in some places). Göç notu: replace with React Router tabs and accessible tablist patterns.
    - `public/assets/modules/patient-details/patient-utils.js` — Various patient helper utilities (formatters, toggles, global helpers). Göç notu: split into pure utils under packages/domain; remove side-effects.
    - `public/assets/modules/sales/sales-collection.js` — Sales collection/tahsilat module; collection modal & API orchestration. Göç notu: collection modal + data-fetch hooks (TanStack Query) and small components recommended.

  <!-- Batch 8 start -->

    Batch 8 — canonical entries 151–168

    Bu belge, Rule B listesinin 151–168 aralığındaki dosyalar için alınan ilk ~200 satırın kısa özetlerini ve küçük göç notlarını içerir. Her satır: `dosya yolu — 1 satır Türkçe özet. Göç notu (React/TS önerisi)`

    1. public/assets/modules/sales/sales-collection.js — Tahsilat modalı: hasta bazlı bekleyen ödemeler ve senetler listelenip tahsilat başlatma butonları sağlanıyor. Göç notu: Modal + listeyi küçük React bileşenlerine ayır (CollectionModal, SaleItem, PromissoryNote), TanStack Query ile API çağrılarını taşımak.

    2. public/assets/modules/sales/sales-details.js — Satış detay modalı: ödeme dökümü, cihaz listesi ve finansal özet oluşturan render fonksiyonları bulunuyor. Göç notu: hesaplama util'lerini ayrı hook/servise taşı; UI parçalarını yeniden kullanılabilir bileşenlere böl (PaymentDetails, DevicesSection).

    3. public/assets/modules/sales/sales-edit.js — Satış düzenleme modalı; cihaz atama modalını yeniden kullanarak edit iş akışını sağlıyor. Göç notu: modal entegrasyonunu component props ile yap, bağlanan global window api'larını tipli wrapper ile sarmala.

    4. public/assets/modules/sales/sales-form.js — Satış formu: ürün arama (fuzzy), fiyatlama, ödeme seçenekleri, SGK/indirim hesaplama ve form submit. Göç notu: formu react-hook-form + zod ile modelle, ürün aramasını ayrı servise aktar ve arama için küçük bir <Search /> bileşeni yaz.

    5. public/assets/modules/sales/sales-invoice.js — Fatura modalı: satıģ ve hasta verisi çekilip fatura oluşturma/önyüz önizleme sağlanıyor. Göç notu: InvoiceModal, InvoiceForm gibi bileşenlere böl; e-Arşiv/GİB entegrasyonunu servis katmanına taşı.

    6. public/assets/modules/sales/sales-returns.js — İade/değişim yönetimi: iade listesi, iade faturası oluşturma, GİB gönderimi kontrolleri. Göç notu: iade akışını stateful component'lere ayır, API tabanlı iş akışlarını TanStack Query ile yönlendir.

    7. public/assets/modules/utils/patient-normalize-init.js — Hasta listesi normalizasyonu: localStorage anahtarlarını okuyup canonicalize fonksiyonunu uyguluyor. Göç notu: migrasyon sırasında bu normalizasyonu backend veya bir migration script'e almak; küçük utility modülü oluştur.

    8. public/assets/modules/widgets/document-list.js — Hasta belgelerini modal içinde gösteren hafif widget; legacy documentManagement renderer'ı kullanıyor. Göç notu: DocumentList bileşeni oluşturup mevcut documentManagement wrapper'ını adaptör şeklinde kullan.

    9. public/assets/widgets/header.js — Uygulama üst çubuğu: bildirimler, kullanıcı menüsü ve karanlık mod toggle içeriyor. Göç notu: Header, NotificationsDropdown, ProfileMenu bileşenlerine böl; bildirimleri Context/Zustand ile yönet.

    10. public/assets/widgets/invoice-preview.js — Fatura önizleme modalı: GİB durumu, imza, fatura kalemleri ve yazdırma/önizle eylemleri. Göç notu: InvoicePreview bileşenini presentational + action container olarak ayır; PDF/gönderim servislerini ayrı module'a taşı.

    11. public/assets/widgets/modal.js — Genel modal yardımcı sınıfı (XEarModalWidget) ve statik alert/confirm yardımcıları. Göç notu: Radix UI/Headless UI modal yapısına uyarlama; küçük wrapper ile server-side güvenli alternatifleri sun.

    12. public/assets/widgets/sidebar.js — Sol navigasyon: SGK, faturalar, raporlar gibi submenu'leri yönetiyor ve collapsed state localStorage'ta saklıyor. Göç notu: Sidebar bileşenini router-linked menü şeklinde yeniden tasarla; submenu state'lerini URL veya global store ile eşitle.

    13. public/assets/widgets/stats-card.js — Tekil istatistik kartı bileşeni (render helper). Göç notu: Küçük bir <StatsCard /> component'i; ikon/color props'u ile yeniden kullanılabilir şekilde yaz.

    14. public/assets/widgets/tab-navigation.js — Sekmeli navigasyon / dinamik load destekli TabNavigationWidget. Göç notu: React Tabs (dinamik yükleme) yapısına ayır; tab loader'ı promise-based olarak service tarafına taşı.

    15. public/assets/widgets/widget-loader.js — Widget dinamik yükleyici ve ortak widget registry. Göç notu: React'te lazy() + Suspense ile widgetleri yükle; global window'ı azalt ve registry'yi context içinde tut.

    16. demo/auto-loader.js — (dosya eksik) Beklenen: demo/bootstrapping auto-loader; bu repo yolunda dosya bulunamadı. Göç notu: eksikse arşivlerde ara veya demo kodunu ayrı bir docs/ dizinine taşı.

    17. demo/demo-bootstrap.js — (dosya eksik) Demo bootstrap dosyası bulunamadı. Göç notu: demo bootstrap varsa örnek bootstrap'ı README ile dök; değilse pointer bırak.

    18. public/assets/js/orval-api-commonjs.js — (dosya eksik) Orval çıkışı CommonJS sürümü bekleniyor; dosya bulunamadı. Göç notu: Orval üzerinden yeniden jenerasyon öner (TS + fetch adapter), ya da orval çıkışını /src/api-client/ altında yeniden üret.

    19. utils/storage-helper.js — (dosya eksik) yardımcı storage util dosyası eksik. Göç notu: storage-manager wrapper'ını taşımadan önce mevcut helper'ı repo içinde ara/yeniden oluştur.

    ---

  <!-- Automated appendix — Rule B batch 3 (inlined) -->

  Aşağıdaki satırlar Rule‑B kapsamındaki (HTML tarafından direkt referans verilen dosyalar / onların doğrudan etkileri) otomatik okunup çıkarılmış kısa özetlerdir. Her satır kısa göç-notu içerir (entries 26–50).

- `public/assets/js/components/multi-select-search.js` — Multi-select dropdown ve arama; keyboard erişilebilirliği, seçili etiketler ve filtre uygulaması. Göç notu: küçük erişilebilir bileşen olarak yeniden yazın.
- `public/assets/js/components/supplier-autocomplete.js` — API tabanlı tedarikçi autocomplete; yeni öğe oluşturma akışı içerir. Göç notu: useSupplierSearch hook + presentational component olarak ayırın.
- `public/assets/js/core/app.js` — Global app bootstrap ve UIState; heavy global side-effects içeriyor. Göç notu: container/tab-level app state'e parçalayın.
- `public/assets/js/core/utils.js` — Helper fonksiyonlar: tarih, format, toast. Göç notu: pure util fonksiyonlarına ayırıp shared package içinde test edin.
- `public/assets/js/core/xear-backbone.js` — Canonicalizer, EventBus, ApiClient wrapper ve domain helper'lar. Göç notu: domain servislerine dönüştürün; EventBus yerine store/context tercih edin.
- `public/assets/js/darkMode.js` — Dark mode yönetimi (localStorage + prefers-color-scheme). Göç notu: useDarkMode hook ve CSS sınıf yönetimi ile değiştirin.
- `public/assets/js/darkModeInitializer.js` — Dark mode başlangıç loader (CSS/JS inject). Göç notu: app entry effect ile statik/lazy import yapın; runtime script inject azaltılsın.
- `public/assets/js/dashboard-cashflow.js` — Kasa/cashflow UI: hasta arama, kayıt listesi ve export. Göç notu: küçük presentational parçalar + servis ile TanStack Query kullanın.
- `public/assets/js/dashboard.js` — Dashboard manager: KPI yükleme, chart render ve quick actions. Göç notu: DashboardPage container + KPI/Chart presentational bileşenlerine bölünmeli.
- `public/assets/js/data-export-import.js` — Data export/import: CSV/Excel/JSON/PDF export ve drag/drop import. Göç notu: export worker/backend delegasyonu; UI componentleri basit tutulmalı.
- `public/assets/js/device-manager.js` — (HTML referansı var; çalışma dizininde yok) Device manager davranışı arşivlenmiş olabilir. Göç notu: backups/ dizinlerini kontrol edip mapping yapın; DeviceAssignment UI'yı yeniden oluşturmadan önce kaynak doğrulayın.
- `public/assets/js/devices-tab.js` — (archived/missing) Legacy devices tab; backup: `backups/legacy/devices-tab.js.backup`. Göç notu: devices tab fonksiyonları DeviceManagement container'ına bölünsün.
- `public/assets/js/devices.js` — (referenced, çalışma dizininde bazı versiyonlar widget altında olabilir) Device widget/logic; Göç notu: device UI parçalarını küçük component'lere ayırın, serial/UTS etkileşimini servisleştirin.
- `public/assets/js/document-manager.js` — DocumentManager: OCR/image pipeline entegrasyonu, preview ve SGK pipeline fallback. Göç notu: ağır processing web-worker/backend'e; UI modüller componentize edilsin.
- `public/assets/js/domain/inventory/data-service.js` — InventoryDataService ve sample data export; localStorage ↔ API sync. Göç notu: TypeScript hizmet olarak tekilleştirin; API-first pattern uygulayın.
- `public/assets/js/domain/patients/patient-matching-service.js` — Patient matching: fuzzy + NLP destekli skorlamalar. Göç notu: NLP/CPU-ağır iş parçaları backend/worker'a taşınmalı; client hafif scoring yapsın.
- `public/assets/js/domain/patients/patient-storage-sync.js` — Storage sync shim: legacy↔modern key senkronizasyonu. Göç notu: migration bootstrap veya migration scriptlerine taşıyın.
- `public/assets/js/domain/sgk/sgk-automation.js` — SGK otomasyon: rapor oluşturma, görevler ve status handling. Göç notu: otomasyon backend/queue olarak kurgulanmalı; frontend sadece task UI gösterimi yapsın.
- `public/assets/js/domain/sgk/sgk-document-pipeline.js` — SGK document pipeline: FileValidator, ImageProcessor, OCREngine, PDFConverter vs. Göç notu: pipeline'ı worker/service olarak soyutlayın; bağımlılıkları modüler yapın.
- `public/assets/js/domain/sgk/sgk.js` — SGK domain manager: hak/validity hesapları ve SGK durumları. Göç notu: domain servis + unit-test ile yeniden yazın.
- `public/assets/js/domain/sms/sms-gateway.js` — SMS gateway adapter: çoklu provider, queue ve rate-limit. Göç notu: SMS gönderimi backend'de yapılmalı; frontend minimal client sunmalı.
- `public/assets/js/domain/uts/uts-status-indicator.js` — UTS status presentational component + tooltip. Göç notu: küçük presentational React component; veri UTS service'den çekilsin.
- `public/assets/js/email-manager.js` — Email manager: provider config, queue ve history. Göç notu: e-posta gönderimleri backend'e devredilsin; frontend konfig UI küçük component olsun.
- `public/assets/js/form-pipeline.js` — Unified form pipeline: validate → local save → related records → sync → activity log. Göç notu: pipeline sync/retry servis olarak ayrılmalı; UI sadece trigger sağlamalı.
- `public/assets/js/generated/orval-api-commonjs.js` — Orval üretilmiş API stub'ları. Göç notu: Orval çıktısını TS servis katmanında tek bir apiClient ile sarmalayın, cross-cutting header/idempotency ekleyin.

  <!-- Automated appendix — Rule B batch 4 (inlined) -->

  Aşağıda Rule‑B kapsamında `public/*.html` tarafından doğrudan referanslanan ve/veya bu dosyaların doğrudan import ettiği (ilk ~200 satır incelenerek) 25 JS dosyası için otomatik üretilmiş 1-satırlık Türkçe özetler ve kısa göç notları bulunmaktadır.

  - `public/assets/js/global-device-management.js` — Cihaz atama/çıkarma/edit akışlarını sağlayan global wrapper; modal üretimi, stok güncelleme ve timeline entegrasyonu yapıyor. Göç notu: DeviceAssignment bileşeni + Inventory/Hooks (TanStack Query) ile state izole edilmeli.
  - `public/assets/js/global-search.js` — Global arama/komut paleti; NLP entegrasyonu, intent handler'lar ve modal arayüzü içeriyor. Göç notu: arama kutusu ve sonuç listesi React bileşenleri; NLP client servis olarak soyutlanmalı.
  - `public/assets/js/image-processor.js` — Görüntü kırpma/ön işleme ve fallback shim; ImageProcessor API benzeri global shim sağlıyor. Göç notu: image-processing pipeline web-worker veya servis olarak taşınmalı, UI tarafı küçük komponentlerle bağlanmalı.
  - `public/assets/js/inventory-manager.js` — (HTML referansı var ancak dosya repo'da bulunamadı / eksik). Göç notu: kayıp dosya için arşiv/mapping kontrolü; eğer gerçekse InventoryManager davranışı ayrı bir service/hook olarak yeniden üretilmeli.
  - `public/assets/js/inventory/inventory-bulk.js` — Toplu işlemler (CSV upload, kategori/price/stock batch update) yönetimi; modal tabanlı bulk UI. Göç notu: bulk uploader küçük React form + worker (CSV parsing) ile ayrıştırılsın.
  - `public/assets/js/inventory/inventory-data.js` — Envanter veri katmanı; localStorage önbellek, canonicalize ve optimistic-post event handling. Göç notu: servis katmanına (typed) ve TanStack Query cache stratejisine taşınmalı.
  - `public/assets/js/inventory/inventory-filters.js` — Filtre veri yükleme, multi-select ve fuzzy search entegrasyonu; filtre UI initialization. Göç notu: filtre bileşenleri küçük kontrollü bileşenlere dönüştürülsün; filtre verisi servisten alınsın.
  - `public/assets/js/inventory/inventory-main.js` — Inventory sayfası orchestration: modülleri başlatıyor ve global `window.*` örnekleri oluşturuyor. Göç notu: route container içinde lazy init useEffect + modülleri component'lere bölün.
  - `public/assets/js/inventory/inventory-modal.js` — Add/Edit item modal: dinamik form, validation ve loading overlay; DOM insert/cleanup yoğun. Göç notu: Modal + Form react-hook-form ile yeniden yazılmalı.
  - `public/assets/js/inventory/inventory-stats.js` — Envanter istatistikleri; API fallback ve lokal hesaplama; dashboard kartlarına render. Göç notu: istatistik hesapları saf util'lere alınıp küçük presentational bileşenler yapın.
  - `public/assets/js/inventory/inventory-table.js` — Tablo render, pagination, seçim ve satır aksiyonları; HTML string render yoğun. Göç notu: Table/Row bileşenleri, virtualization ve erişilebilir seçim store (Zustand) ile yeniden yazılsın.
  - `public/assets/js/inventory/inventory-utils.js` — CSV export/print, barcode gen ve yardımcı format fonksiyonları. Göç notu: helper fonksiyonlar packages/shared altında saf util olarak tutulmalı.
  - `public/assets/js/lib/typescript-data-loader.js` — Dinamik TypeScript modül loader; window.sampleData/populate ve type module import fallback flow. Göç notu: ES module konfigürasyonu ve bootstrap logic server-side/entrypoint tarafına taşınmalı; global bırakılmamalı.
  - `public/assets/js/lib/xear-backbone.js` — Canonicalize helper'lar, EventBus, ApiClient shim ve ortak enum/yardımcılar. Göç notu: küçük util paketlerine bölünmeli; EventBus yerine React context/store tercih edin.
  - `public/assets/js/mobileOptimizer.js` — Mobil UX optimizasyonları: sidebar toggle, responsive table wrapper, touch-target düzenlemeleri. Göç notu: CSS/tailwind ile responsive davranış ve küçük React helper hook'lar (useMobile) ile yeniden üretin.
  - `public/assets/js/modal-helper.js` — Global modal focus-trap, ESC kapama, click-outside ve programmatic open/close helpers. Göç notu: Radix/Dialog veya benzeri accessible modal ile değiştirin ve kodu minimal helper'lara bölün.
  - `public/assets/js/modern-datepicker.js` — Zengin, erişilebilir tarih seçici; kendi DOM/picker implementasyonu ve stilleri içeriyor. Göç notu: mevcut component React'e taşınmalı veya dayjs/flatpickr wrapper'ı ile replace edilecek küçük bileşen yazılmalı.
  - `public/assets/js/modern-timepicker.js` — Zengin timepicker component; hours/minutes column list ve selection logic. Göç notu: React timepicker bileşeni olarak port edilip test edilmeli.
  - `public/assets/js/modules/patients/patient-details-modals.js` — Hasta detaylarında modal helper'lar ve validation (TC, phone), label/update modal. Göç notu: her modal küçük React form bileşeni (react-hook-form) olarak yeniden yazılmalı.
  - `public/assets/js/modules/patients/patient-details-tab-loader.js` — Patient details için tab content dinamik loader; inline content generation fallback'ı var. Göç notu: her tab bir React alt-route / lazy-loaded component olmalı; dinamik loader yerine import() kullanılmalı.
  - `public/assets/js/modules/patients/patient-details.js` — Hasta detay yönetimi: state, tabs, widgets, timeline, device interactions; büyük monolitik sınıf. Göç notu: parçalanmış container ve child component'ler, servis tabanlı veri erişimi ile yeniden yapılandırılmalı.
  - `public/assets/js/modules/patients/patients-corrected.js` — Daha güvenli, API-first PatientManager alternatifi; Orval/APIConfig fallback mantığı içeriyor. Göç notu: bu daha modern dosya referans alınarak React container/hook'lara adapt edin.
  - `public/assets/js/modules/patients/patients.js` — Legacy patient manager: event wiring, localStorage/Service fallback ve render logic. Göç notu: eski davranış referans alınarak yeni PatientList ve search bileşenleri yazılmalı.
  - `public/assets/js/modules/products/product-activity.js` — Ürün aktivite loglama (API + localStorage fallback) ve render helper'ları. Göç notu: activity logging servis katmanına taşınmalı; UI küçük ActivityList bileşeni olsun.
  - `public/assets/js/modules/products/product-serials.js` — Seri no modal ve per-serial input yönetimi; dynamic modal ve bulk upload. Göç notu: serial modal React modal + controlled inputs ile yeniden yazılmalı; CSV worker ile toplu yükleme desteklensin.

  <!-- End integrated batches -->


    - uiStore.ts
    - inventoryStore.ts
  - App.tsx
  - main.tsx

Notlar ve entegrasyon:

Bu bölüm eklendi: proje-özgü dosya yapısı önerisi (uygulandı).

---

## Automated appendix — Kısa JS dosya özetleri (batch 3)

The following one-line summaries were auto-extracted from the next batch of legacy JS sources. Review before migration appendices.

- `public/assets/modules/inventory/inventory-main.js` — InventoryMain: initializes inventory subsystems, wires window.inventory* globals, and coordinates UI boot (filters -> table -> stats).
- `public/assets/modules/inventory/inventory-table.js` — InventoryTable: renders table rows, sorting, row selection, bulk actions and per-row buttons (edit/view/delete) tied to global handlers.
- `public/assets/modules/inventory/inventory-modal.js` — InventoryModal: add/edit item modal builder, loading overlay helpers, and form submit handling.
- `public/assets/modules/inventory/inventory-filters.js` — InventoryFilters: debounced filter application, dropdown population and filter matching logic.
- `public/assets/modules/invoice/dynamic-form.js` — DynamicInvoiceForm: schema-driven invoice form; loads Orval schema, generates conditional form sections, and handles preview/create actions.
- `public/assets/modules/invoice/invoice-widget.js` — MISSING in workspace (file not found) — referenced by invoice-management fallbacks; verify if generated/omitted or located elsewhere.
- `public/assets/modules/patient-details/patient-header-card.js` — PatientHeaderCardComponent: normalizes patient data, calculates age, initials, and display helpers for patient header UI.
- `public/assets/modules/patient-details/patient-notes.js` — PatientNotesComponent: add/edit notes modal, prefers API but falls back to localStorage, dispatches patient:updated events.
- `public/assets/modules/patient-details/patient-list-sidebar.js` — PatientListSidebarComponent: loads patient list (API/local fallback), renders sidebar items, handles collapse state and search filtering.
- `public/assets/modules/components/device-management.js` — DeviceManagementComponent: loads device inventory (expands serials), assignments, and localStorage/API fallbacks for devices and assignments.
- `public/assets/modules/components/invoice-management.js` — InvoiceManagementComponent: creates device invoices, shows confirm modal, persists invoices locally and listens to global invoiceCreated events.
- `public/assets/modules/components/sgk-management.js` — SGKManagementComponent: heavy domain module for SGK flows — upload/query/send, SGK document storage, statuses and UI render of SGK tab.
- `public/assets/modules/sales/sales-invoice.js` — SalesInvoiceModule: builds invoice modal for sales, fetches sale/patient data, preview and print helpers.
- `public/assets/modules/sales/sales-returns.js` — SalesReturnsModule: handles returns/exchanges UI, replacement fetching, rendering, and return-invoice flows.
- `public/assets/js/core/utils.js` — UtilsClass: shared formatting and validation utilities (dates, currency, toasts, date constraints) used widely across pages.
- `public/assets/js/widgets/header.js` — HeaderWidget: topbar with notifications, dark-mode toggle, profile dropdown and notification dropdown rendering.
- `public/assets/js/widgets/sidebar.js` — SidebarWidget: navigation rendering, submenus (SGK/Fatura), collapsed behavior and collapsed-submenu icons.
- `public/assets/js/appointments/calendar-manager.js` — CalendarManager: calendar generation (month/day/week/list views), appointment rendering, drag/drop and view switching.
- `public/assets/modules/api-client.js` — ApiClient: small fetch wrapper that handles response envelopes, canonicalizes patient objects and provides convenience API methods.

---


---

## Automated appendix — Kısa JS dosya özetleri (otomatik ekstrakt)
Bu liste, `legacy/reports/missing-js-mapping.md` içindeki dosyalardan seçilmiş ve otomatik olarak çıkarılmış kısa açıklamaları içerir. Her iki rapora da hızlı referans olarak eklendi.

- `public/assets/api-config.js` — Central API base URL + endpoints ve basit connectivity test/utility (APIConfig sınıfı).
- `public/assets/js/api-client-wrapper.js` — Optimistic API client: offline outbox, optimistic POST/PUT, conflict (409) handling.
- `public/assets/js/api-connectivity-test.js` — Bütün backend endpoint'lerini test eden ve rapor üreten connectivity test aracı.
- `public/assets/js/api-url-wrapper.js` — Orval üretilmiş fonksiyonları runtime base URL ile sarmalayan küçük wrapper (legacy compatibility).
- `public/assets/js/auth.js` — Development-mode auth shim (mock current user, logout helper) ve global `authManager`.
- `public/assets/js/components/supplier-autocomplete.js` — Supplier autocomplete UI component with API search + fuzzy fallback.
- `public/assets/js/darkMode.js` — Dark mode yönetimi (localStorage + prefers-color-scheme + event dispatch).
- `public/assets/js/inventory/inventory-utils.js` — Inventory helper utilities (CSV export, print, barcode gen, currency formatting).
- `public/assets/js/inventory/inventory-stats.js` — Inventory KPI/statistics widget (API-first, local fallback calculation).
- `public/assets/js/widget-loader.js` — Dynamic widget loader (script tag injection, register/get/remove widget pattern).

## Automated appendix — Kısa JS dosya özetleri (batch 2)

The following one-line summaries were auto-generated from the legacy JS sources. Use them as quick pointers when reviewing files for migration.

- `public/assets/modules/components/document-list-widget.js` — Reusable document list widget: renders document cards, filters, upload area, and quick-upload buttons for patient documents.
- `public/assets/modules/components/document-management-legacy.js` — Legacy document management: localStorage-backed upload, base64 storage, drag/drop handlers and upload processing.
- `public/assets/modules/components/document-viewer-widget.js` — Modal document viewer with fullscreen, download, and metadata display for documents.
- `public/assets/modules/components/patient-sidebar.js` — Patient sidebar: loads patients, search, collapse/toggle, and selection logic; falls back to sample/localStorage data.
- `public/assets/modules/components/promissory-note.js` — Promissory note (senet) modal and form builder with flatpickr integration and sale prefill logic.
- `public/assets/modules/components/sales-management.js` — High-level Sales management coordinator; delegates to collection/edit/details/invoice modules and exposes global refs for onclick handlers.
- `public/assets/modules/inventory/inventory-stats.js` — Inventory statistics calculator and renderer that listens to inventoryUpdated events and updates stat cards.
- `public/assets/modules/page-module-loader.js` — (empty) page module loader placeholder (no content).
- `public/assets/modules/patient-details-manager.js` — PatientDetailsManager: localStorage-backed patient CRUD, search, and history utilities.
- `public/assets/modules/patient-details-module.js` — (empty) patient details module placeholder (no content).
- `public/assets/modules/patient-details/device-assignment-handler.js` — Device assignment form handler: toggles modes, loads inventory into selects, and validates assignment before enabling submit.
- `public/assets/modules/patient-details/device-modals.js` — Device modal helpers and global toasts/confirm/alert systems used across patient-detail flows.
- `public/assets/modules/patient-details/document-management-enhanced.js` — Enhanced document management: quick-upload buttons, typed filters, bulk upload modal, and UI helpers.
- `public/assets/modules/patient-details/document-management-globals.js` — Global helpers for document view/download/delete and upload modal control (thin wrappers around window.documentManagement).
- `public/assets/modules/patient-details/document-management.js` — DocumentManagementComponent: render logic for documents tab, enhanced-controls integration, and upload modal HTML.
- `public/assets/modules/patient-details/patient-appointments.js` — Patient appointments component: fetches, normalizes, and renders appointment lists and add/edit actions.
- `public/assets/modules/patient-details/patient-hearing-test.js` — Audiometry/hearing test UI renderer and placeholder audiogram component exposure.
- `public/assets/modules/patient-details/patient-stats-cards.js` — Patient stats-cards component building StatsCardWidget instances with legacy static data rendering.
- `public/assets/modules/patient-details/patient-tab-loader.js` — PatientTabLoader: cache-driven tab content generator and loader with fallback content.
- `public/assets/modules/patient-details/patient-tabs-navigation.js` — Tabs navigation component that switches tab, updates UI, and initializes tab-specific features.
- `public/assets/modules/patient-details/patient-utils.js` — Patient utility functions (phone formatting, sidebar toggles, global tab switch helpers).
- `public/assets/modules/sales/sales-collection.js` — Sales collection modal and promissory note integration; computes outstanding totals and opens payment forms.
- `public/assets/modules/sales/sales-details.js` — Sales details renderer: calculation helpers (patient payment, down payment) and detailed modal builder.
- `public/assets/modules/sales/sales-edit.js` — Sales edit flow that reuses device assignment modal for editing sale-related device assignments and prefill logic.
- `public/assets/modules/sales/sales-form.js` — Sales form module: product search, fuzzy search utility, product details, and payment option UI.

## Automated appendix — Kısa JS dosya özetleri (batch 4)

These one-line summaries were auto-generated from a batch read of legacy JS file heads; they help identify UI/side-effect behaviour to consider when mapping elements to React components.

- `public/assets/api-config.js` — Runtime API configuration and endpoint map; sets `window.API_BASE_URL` and provides connectivity testing.
- `public/assets/api/api/index.js` — Unified API adapter (getPatients/getDevices/etc.) that chooses generated or legacy clients and supports shadow validation.
- `public/assets/api/legacy.js` — Legacy fetch wrapper and legacy* API functions with response normalization and error shaping for older endpoints.
- `public/assets/js/advanced-automation.js` — Automation rules engine powering scheduled SMS, tasks and campaign-like actions (triggers/events → actions).
- `public/assets/js/api-client-wrapper.js` — Optimistic API wrapper with offline queuing, conflict resolution, and events for pending/processed updates.
- `public/assets/js/components/category-brand-autocomplete.js` — Reusable category/brand autocomplete with fuzzy search, synonyms and create-new support used in inventory modals.
- `public/assets/js/components/multi-select-search.js` — Multi-select searchable dropdown primitive (search input, checkbox rows, selection display).
- `public/assets/js/components/quick-look-modal.js` — Document quick-preview modal used across SGK/document flows; robust DOM readiness and save/cancel hooks.
- `public/assets/js/inventory/inventory-bulk.js` — Bulk inventory CSV upload and bulk-edit UI (category/price/stock changes) integrated with modals.
- `public/assets/js/indexeddb-outbox.js` — Client-side IndexedDB outbox for offline requests with deduplication and prioritized sync.
- `public/assets/js/inventory/inventory-orval-adapter.js` — Adapter that proxies inventory calls to Orval-generated client when available.
- `public/assets/js/invoice-conditional.js` — UI conditional logic for invoice type/scenario (show/hide groups like tevkifat, ozelMatrah, SGK variants).
- `public/assets/js/invoices.js` — Invoices list manager rendering table rows, actions (send, edit, delete) and filtering controls.
- `public/assets/js/new-invoice.js` — New invoice dynamic form implementation (line items, tax calculations and scenario arrays) used on invoice creation pages.
- `public/assets/js/notifications/notification-client.js` — Small notification helper exposing post/fetch and native-notification helpers used by header widgets.
- `public/assets/js/patient-compat.js` — Back-compat shims for PatientManager to avoid page crashes and provide simple helpers (stats, reminders, renderStats).
- `public/assets/js/storage-keys.js` — Shared storage key registry so multiple legacy modules reference consistent localStorage keys.
- `public/assets/js/image-processor.js` — Lightweight fallback shims for ImageProcessor/OCREngine/PDF conversion used by SGK/document upload flows.

---

## Automated appendix — Kısa UI envanteri (batch 8 — Patients & Sales)

Bu bölüm `public/*.html` tarafından referanslanan Patients ve Sales modülleri için sayfa düzeyinde bulunan önemli UI elementlerini kısaca listeler ve göç sırasında dikkat edilmesi gerekenleri belirtir.

- patients / patient-details sayfaları
  - Header kartı (`patient-header-card.js`): hasta adı, etiketler, yaş; action butonları (düzenle, not ekle). Göç notu: header presentational component olarak yenilenmeli.
  - Sekmeler (`patient-tabs.js` + `patient-tab-content.js`): tab nav, lazy-loaded içerik; her tab'da ayrı container. Göç notu: React lazy route/tab pattern.
  - Hasta düzenleme modal (`patient-management.js`): input'lar, validation (TC), kaydet/cancel butonları. Göç notu: react-hook-form migrasyonu.
  - Notlar bölümü (`patient-notes.js`): note list, add-note modal, save butonu. Göç notu: optimistic UI + notes store.
  - Sidebar patient list (`patient-list-sidebar.js`): arama input, patient list table/rows, seç-me butonları. Göç notu: virtualized list önerilir.

- Sales (patient-details içindeki sales tab)
  - Satış list ve detay modal (`sales-details.js`): tablo satırları, 'detay' butonu, ödeme kırılımı bölümü. Göç notu: hesaplama fonksiyonları saf util olmalı.
  - Tahsilat modal (`sales-collection.js`): borç/ödenen, input miktar, tahsil et butonu, senet yönetimi. Göç notu: ödeme modalı tekilleştirilmeli.
  - Fatura modal (`sales-invoice.js`): openForSale delegation -> `invoice-widget` veya fallback DOM form; preview/print, submit. Göç notu: Invoice component + print helper.
  - Satış oluştur/düzenle formu (`sales-form.js`, `sales-edit.js`): ürün arama (fuzzy), adet, fiyat, ödeme seçenekleri (nakit, kredi, senet). Göç notu: product-autocomplete component + payment-method components.
  - İade akışı (`sales-returns.js`): iade form, onay modal, iade fişi/creation. Göç notu: backend iş akışları test edilmeli.

- Missing/Archive note
  - `public/assets/modules/sales/sales-device-form.js` referansı çalışma dizininde okunamadı (mapping listesinde var). Bu modül device-assignment UI'sı olabilir; göç önceliği yüksek — dosya yolu/arsiv kontrolü gerektirir.

---



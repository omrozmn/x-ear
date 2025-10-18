# Legacy CRM — Özellikler ve Dosya Haritası

## Automated appendix — Kısa JS dosya özetleri (batch 2)

The following one-line summaries were auto-generated from the legacy JS sources. Use them as quick pointers when reviewing files for migration.

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


Not: Batch 4 (entries 51–75) özetleri için bakınız: `legacy/reports/legacy-ui-elements-batch-4.md`.

Not: Batch 6 (entries 101–125) özetleri için bakınız: `legacy/reports/legacy-ui-elements-batch-6.md`.
Not: Batch 7 (entries 126–150) özetleri için bakınız: `legacy/reports/legacy-ui-elements-batch-7.md`.
Not: Batch 8 (entries 151–168) özetleri için bakınız: `legacy/reports/legacy-ui-elements-batch-8.md`.

---

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
- `assets/js/sgk/ui.js` — OCR sonuç kartları, hasta arama, preview/kaydet butonları; DOM render ve event wiring. Göç notu: her kart React bileşen; patient-search backend hook ile değiştirilmeli.
- `assets/js/sgk/vendor/advanced-automation-wrapper.js` — runtime olarak `/assets/js/advanced-automation.js` yükleyen küçük wrapper. Göç notu: wrapper'lar hedef dosyaları işaret eder, o hedefleri de işleme alın.
- `assets/js/sgk/vendor/core-app-wrapper.js` — `/assets/js/core/app.js` yükleyicisi (wrapper). Göç notu: core app bağımlılığı incelenecek.
- `assets/js/sgk/vendor/header-wrapper.js` — header widget yükleyicisi. Göç notu: header React'e öncelikli taşınmalı.
- `assets/js/sgk/vendor/image-processor-wrapper.js` — `image-processor.js` yükleyicisi; pipeline bağlılığı. Göç notu: görüntü-işleme modülü izole edilmeli.
- `assets/js/sgk/vendor/ocr-engine-wrapper.js` — `ocr-engine.js` yükleyicisi. Göç notu: OCR engine runtime yükleme adaptörü; OCR motoru servis/worker'e taşınmalı.

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

## Automated appendix — Kısa JS dosya özetleri (batch 8 — Patients & Sales)

Aşağıda `public/*.html` tarafından referanslanan Patients ve Sales ile ilgili en önemli modüller için otomatik üretilmiş kısa özetler ve göç notları bulunmaktadır.

- `public/assets/modules/patient-details/patient-page-initializer.js` — Patient details sayfası başlatıcısı: header/sidebar init, hasta yükleme (localStorage → sample → API), `PatientDetailsManager` inicializasyonu ve component orchestration. (Yan-etki: global window atamaları). Göç notu: sayfa-init davranışı React route container'ına alınmalı; `PatientDetailsManager` servis/context olarak soyutlanmalı.
- `public/assets/modules/patient-details/patient-header-card.js` — Hasta header kartı: hasta normalizasyonu, yaş hesaplama, durum/etiket gösterimleri. Göç notu: küçük presentational component + utility fonksiyonlarına bölünmeli; canonicalizePatient helper'ı tek bir servis haline getirilmeli.
- `public/assets/modules/patient-details/patient-tabs.js` — Patient sekme yapısı (Genel, Cihazlar, Satışlar, SGK, Belgeler, Zaman Çizelgesi). Göç notu: React Router tab yapısı ve dinamik lazy-loaded tab bileşenlerine dönüştürülecek.
- `public/assets/modules/patient-details/patient-tab-content.js` — Sekme içeriği render mantığı: tab-level renderer'lar, domainManager/legacyBridge destekli async yükleyici; satış/cihaz/SGK renderları. Göç notu: her tab ayrı React component'i (async data-loading hook ile) olmalı; normalization logic ortak util'e alınmalı.
- `public/assets/modules/patient-details/patient-management.js` — Hasta düzenleme formu/validation/save flow; API-first, fallback localStorage; TC doğrulama, form validation. Göç notu: `react-hook-form` + Zod ile yeniden yazılmalı; API hata senaryoları servis katmanına taşınmalı.
- `public/assets/modules/patient-details/patient-notes.js` — Hasta notları: add/edit modal, API persistence with local fallback, event dispatch (patient:note:created). Göç notu: Notes context + optimistic updates ile React'e taşınmalı; event bus yerine state/store (Zustand) kullanılmalı.
- `public/assets/modules/patient-details/patient-list-sidebar.js` — Hasta listesi sidebar: API-first load, localStorage fallback, search/filter, responsive layout and positioning. Göç notu: searchable list component + virtualized list (react-window) ile değiştirilmeli.
- `public/assets/js/modules/patients/patient-details-manager.js` — PatientDetailsManager: localStorage CRUD, history, normalization utilities. Göç notu: tekil servis paketi (packages/domain) olarak taşınmalı; side-effect-free model fonksiyonları test edilmeli.
- `public/assets/modules/components/sales-management.js` — Sales high-level coordinator: modülleri instantiate eder (collection/edit/details/invoice/form/returns), global onclick handler'ları export eder. Göç notu: bu coordinator React container'a dönüşmeli; alt modüller bağımsız component/servislere bölünmeli.
- `public/assets/modules/sales/sales-collection.js` — Tahsilat & senet yönetimi: collection modal, outstanding hesaplama, promissory note list. Göç notu: ödeme modalı ve tahsilat logic'i ayrı servis + component olarak ayrılmalı; ödeme iş akışları backend ile test edilmeli.
- `public/assets/modules/sales/sales-invoice.js` — Satış fatura modülü: sale/patient verisi çekme, invoice modal render, preview/print ve submit. Göç notu: invoice UI `InvoiceModal` + `DynamicInvoiceForm` olarak yeniden kullanılabilir parçalara bölünmeli.
- `public/assets/modules/sales/sales-details.js` — Satış detayları: ödeme kırılımı, taksit/senet hesaplama, detay modal. Göç notu: hesaplama yardımcıları saf fonksiyonlara taşınmalı; modal presentational component olarak yeniden yazılmalı.
- `public/assets/modules/sales/sales-edit.js` — Sales edit flow: device-assignment modal ile entegre etme (prefill sale context), fallback edit modal. Göç notu: DeviceAssignment formu tekilleştirilmeli; sale edit workflow React form + modal ile yeniden kurgulanmalı.
- `public/assets/modules/sales/sales-form.js` — Satış formu: product search (fuzzy), pricing preview, payment options, SGK/pricing logic. Göç notu: product-autocomplete, pricing engine ve payment method selector küçük bileşenlere ayrılmalı; fuzzy search servis olarak izole edilmeli.
- `public/assets/modules/sales/sales-returns.js` — İade/değişim yönetimi: return/invoice/GİB iş akışları, replacement handling. Göç notu: returns workflow backend-heavy; frontend yalnızca UI ve request orchestration sağlamalı.
- `public/assets/modules/sales/sales-device-form.js` — (MISSING / ARCHIVE) — ana mapping'ler `public/assets/modules/sales/sales-device-form.js` için giriş gösteriyor ancak çalışma dizininde okunabilir dosya yok; arşiv kopyası bulunabilir (`legacy/reports/confirmed-unused-archived-2025-10-14T14-52-51-532Z.md`). Göç notu: arşiv/kaynak kontrolü, eğer aktifse path restore veya referans güncellemesi gerekli.
  
  Follow-up & resolution: Repo-wide case-insensitive search ve archive listing çalıştırıldı. Doğrudan `sales-device-form.js` isimli bir dosya bulunamadı (hiçbir .js/.ts dosyası bu basename ile eşleşmedi). Ancak kaynak kod incelendiğinde `public/assets/modules/components/sales-management.js` içinde `SalesFormModule` örneği yaratılıyor ve şu satır teyit edildi:

  ```js
  this.deviceFormModule = new SalesFormModule(apiClient);
  window.salesDeviceForm = this.deviceFormModule;
  ```

  Ayrıca repo'da `public/assets/modules/sales/sales-form.js` dosyası mevcut olup (SalesFormModule) satış/cihaz form davranışlarını uygulamaktadır. Sonuç olarak, `sales-device-form.js` mapping girdisinin muhtemel açıklaması: dosya daha önce farklı isimle (veya aynı isimle) saklanmış ancak şu an fonksiyonel karşılığı `public/assets/modules/sales/sales-form.js`'dir. Arşivde eşleşen okunabilir bir kopya bulunamadı; ancak canlı kod `sales-form.js` olarak mevcut ve `window.salesDeviceForm` referansını sağlıyor.

  Eylem önerisi:
  - `legacy/reports/js-mapping.md` içindeki `public/assets/modules/sales/sales-device-form.js` entry'sini not ile güncelle (renamed -> `sales-form.js`) veya sil/alias olarak işaretle.
  - MD'lerde `sales-device-form.js` için "RESOLVED (mapped to `public/assets/modules/sales/sales-form.js`)" notu ekle. Eğer tarihçe mutlaka korunacaksa, arşivde daha geniş snapshot aramaları yapılabilir ama şu an göç/migration dökümanı için `sales-form.js` kullanılması uygun.

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
Bu doküman, legacy (vanilla) CRM'in temel özelliklerini, bu özellikleri uygulayan dosyaları ve hangi sayfada kullanıldıklarını özetler. Amaç: React'a geçişte eksik veya tekrar eden davranışları, bağımlılıkları ve yeniden kullanılabilir parça adaylarını belirlemek.

Not: Kaynaklar `public/*.html`, `public/assets/modules/**`, `public/assets/js/**` ve `legacy/backend` klasörlerinden tarandı. Sayfa isimleri legacy `public/` altındaki HTML dosya adlarıdır.

---

## Özet yaklaşım
- HTML sayfalarındaki script importlarını ve `assets/modules`/`assets/js` dosyalarını eşleştirdim.
- Modülerleştirilmiş sayfalar (`patient-details-modular.html`, inventory modules vb.) ayrı listelendi.
- Global yardımcılar ve widget'lar (`widgets/*`, `core/*`, `generated/orval-api-commonjs.js`) ayrı bir bölümde notlandı.

---

## Sayfa bazlı özellik haritası (önemli/öncelikli sayfalar)
Aşağıda her sayfa için öne çıkan özellikler ve ilgili dosyalar listeleniyor.

### Dashboard (`public/dashboard.html`)
- Öne çıkan özellikler: KPI kartları, grafikleri, kasa kaydı hızlı modalı, fiyat hesaplama modalı, navigasyon linkleri.
- İlgili dosyalar:
  - `public/dashboard.html`
  - `assets/js/generated/orval-api-commonjs.js` (API client)
  - `assets/js/core/utils.js`
  - `assets/js/core/xear-backbone.js`
  - `assets/js/core/app.js`
  - `assets/js/backend-service-manager.js`
  - `assets/js/dashboard.js`
  - `assets/js/dashboard-cashflow.js`
  - `assets/js/automation-engine.js`
  - `assets/js/domain/sgk/sgk-automation.js`
  - `assets/js/widgets/sidebar.js`, `assets/js/widgets/header.js`

### Inventory (`public/inventory.html`)
- Öne çıkan özellikler: arama, filtreler, sortable tablo, satır seçimleri ve bulk-actionlar, add/edit item modal, CSV/bulk upload.
- İlgili dosyalar:
  - `public/inventory.html`
  - `public/assets/modules/inventory/inventory-main.js` (initialization)
  - `public/assets/modules/inventory/inventory-table.js` (render, seçim, sorting)
  - `public/assets/modules/inventory/inventory-modal.js`
  - `public/assets/modules/inventory/inventory-filters.js`
  - `public/assets/modules/inventory/inventory-data.js`
  - `assets/js/widgets/header.js`, `assets/js/widgets/sidebar.js`
  - `window`-tabanlı API: `window.inventoryData`, `window.inventoryTable`, `window.inventoryModal`

### Patients (`public/patients.html`)
- Öne çıkan özellikler: hasta listesi, arama, hasta senkronizasyon/normalizasyon, modaller (hasta oluştur/güncelle), datepicker.
- İlgili dosyalar:
  - `public/patients.html`
  - `assets/js/generated/orval-api-commonjs.js`
  - `assets/js/core/utils.js`, `assets/js/backend-service-manager.js`
  - `assets/js/lib/typescript-data-loader.js`
  - `assets/js/modules/patients/patients-corrected.js` (liste)
  - `assets/js/patient-actions.js`
  - `assets/js/modern-datepicker.js`
  - `assets/js/widgets/header.js`, `assets/js/widgets/sidebar.js`

### Patient details (modular) (`public/patient-details-modular.html`)
- Öne çıkan özellikler: Hasta header, tablar, notlar, cihaz yönetimi, satışlar/faturalar/proforma, belge yönetimi, patient-list-sidebar (senkronize), SGK yönetimi.
- İlgili dosyalar (modüler):
  - `public/patient-details-modular.html`
  - `assets/modules/patient-details/patient-page-initializer.js`
  - `assets/modules/patient-details/patient-header-card.js`
  - `assets/modules/patient-details/patient-tabs.js`
  - `assets/modules/patient-details/patient-tab-content.js`
  - `assets/modules/patient-details/patient-management.js`
  - `assets/modules/patient-details/patient-notes.js`
  - `assets/modules/patient-details/patient-list-sidebar.js`
  - `assets/modules/patient-details/document-management*.js`
  - Components: `assets/modules/components/sgk-management.js`, `device-management.js`, `invoice-management.js`, `proforma-management.js`, `invoice-widget.js`
  - Sales modules: `assets/modules/sales/*.js` (sales-edit, sales-form, sales-invoice, sales-collection)

Not: Bu sayfa en fazla bağımlılık içeren sayfadır; birçok alt bileşen bağımsız modül olarak tutulmuş.

### Yeni Fatura / New Invoice (`public/new-invoice.html`)
- Öne çıkan özellikler: Dynamic invoice form (şema tabanlı), invoice type & scenario, create/preview/reset, flatpickr datepicker.
- İlgili dosyalar:
  - `public/new-invoice.html`
  - `assets/modules/api-client.js`
  - `assets/modules/invoice/dynamic-form.js` (DynamicInvoiceForm — şemayı orval üzerinden çekip DOM oluşturur)
  - `assets/js/widgets/sidebar.js`, `assets/js/widgets/header.js`
  - `flatpickr` CDN yüklemesi

### Reports (`public/reports.html`)
- Öne çıkan özellikler: Tablar (overview/patients/financial/campaigns), date range filter, charts (Chart.js), export butonu.
- İlgili dosyalar:
  - `public/reports.html`
  - `assets/js/core/app.js`
  - `assets/js/lib/typescript-data-loader.js`
  - `assets/js/core/utils.js`
  - `assets/js/widgets/sidebar.js`, `assets/js/widgets/header.js`
  - `https://cdn.jsdelivr.net/npm/chart.js` (CDN)

### Appointments (`public/appointments.html`)
- Özellikler: takvim görünümü, modal (randevu oluştur/düzenle), drag-drop, keyboard navigation.
- Dosyalar:
  - `public/appointments.html`
  - `assets/js/appointments/*` (calendar-manager.js, appointment-modal.js, drag-drop.js, appointments-main.js)
  - `modern-datepicker.js`, `modern-timepicker.js`


## Automated appendix — Rule B batch 1 (patient-details-modular.html referenced scripts)

Bu ek, `public/patient-details-modular.html` içinde doğrudan referans verilen ilk 25 script dosyası için otomatik üretilmiş 1-satırlık Türkçe özetler ve kısa göç notlarını içerir. Kural B kapsamında yalnızca HTML tarafından referanslanan dosyalar ilk olarak inceleniyor.

- `assets/js/darkMode.js` — Dark mode durumunu localStorage ile yönetir ve global `DarkMode` API'si sağlar. Göç notu: küçük bir util; React'te context veya custom hook (useDarkMode) olarak taşınmalı.
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


### SGK (domain) (`public/sgk.html`)
- Özellikler: OCR, image processing, candidate modal, eReceipt flow, büyük bir domain pipeline.
- Dosyalar:
  - `public/sgk.html`
  - `assets/js/sgk/*` (vendor wrappers, api, storage, helpers, processing, ui, modals, init)

### Invoices list / Invoices page (`public/invoices.html`)
- Özellikler: liste, filtreler, aktiviteler, modal helperlar, form-pipeline.
- Dosyalar:
  - `public/invoices.html`
  - `assets/js/*` (modal-helper.js, wrap-tables.js, form-pipeline.js, activity-logger.js)
  - `assets/modules/api-client.js`

### Admin panel (`public/admin-panel.html`)
- Özellikler: kullanıcı/rol/permission yönetimi, audit, router.
- Dosyalar:
  - `public/admin-panel.html`
  - `assets/modules/admin-panel/*.js` (apps.js, roles.js, permissions.js, audit.js, features.js, router.js)

---

## Ortak / Core modüller
- `assets/js/core/*` — Uygulama önyükleme, global helper'lar, event bus.
- `assets/js/widgets/*` — Header, Sidebar ve diğer küçük widget'lar. Bu widget'lar çoğu sayfada tekrar kullanılıyor.
- `public/assets/modules/api-client.js` ve `assets/js/generated/orval-api-commonjs.js` — API client katmanı (Orval ile üretilmiş).
- `assets/js/lib/typescript-data-loader.js` — Sayfalara hazır veri (sample) yükleme mekanizması.
- Global pattern: window.<ModuleName> şeklinde global sınıf örnekleri (ör. `window.inventoryTable`, `window.patientDetailsManager`) kullanılıyor.

---

## Backend notları (kısa)
- Backend Python/Flask tabanlı: `backend/app.py`, `backend/routes`, `backend/models*`.
- OpenAPI/OpenAPI generated artifacts mevcut (`openapi.yaml`, `orval.config.js`) ve frontend Orval client'ı kullanılıyor.

---

## Kodlama/bağımlılık patternleri — React'e geçişte dikkat
- Çok sayıda globalliğe dayalı state ve `window`-exposure var. Bunları React ile explicit props/context/store'a çevirmek gerekir.
- Modal, toast, datepicker, form validation gibi cross-cutting UI parçaları tekil reusable componentler olmalı.
- API client Orval ile üretilmiş; React tarafında tekrar kullanılabilir servis katmanı olarak bırakılabilir.
- Bazı modüller `type="module"` ile import ediliyor; modern ES module yapısına uyum iyi.

---

## Önerilen yeni React dosya yapısı (max 500 LOC per component kuralı ile)
Aşağıdaki yapı `x-ear` monorepo yapınızı göz önünde bulundurarak basit, component-odaklı bir öneridir. (Mevcut `x-ear`'de `packages/ui-web`/`packages/core` olduğu gözlendi — bunları kullanın.)

Örnek ağaç (kök: `x-ear/apps/web` veya `x-ear/packages/ui-web` içinde):

- src/
  - pages/
    - DashboardPage.tsx            # Orta boy: container + compose edilen küçük component'ler
    - InventoryPage.tsx
    - PatientsPage.tsx
    - PatientDetailsPage.tsx
    - NewInvoicePage.tsx
    - ReportsPage.tsx
  - components/
    - layout/
      - Header.tsx
      - Sidebar.tsx
      - PageContainer.tsx
    - ui/
      - Button.tsx
      - Modal.tsx
      - Table.tsx
      - FormField.tsx
      - Select.tsx
      - Datepicker.tsx (thin wrapper around flatpickr/react-date)
      - Toast.tsx
    - inventory/
      - InventoryTable.tsx
      - InventoryFilters.tsx
      - InventoryModals/
        - InventoryEditModal.tsx
        - InventoryBulkModal.tsx
      - patient/

        - PatientHeader.tsx
        - PatientTabs.tsx
        - PatientNotes.tsx
        - DeviceManagement.tsx
      - invoices/
        - DynamicInvoiceForm.tsx
        - InvoiceWidget.tsx
    - hooks/
      - useApi.ts
      - useDebouncedValue.ts
      - useModal.ts
    - services/

    > Otomatik ek: daha fazla kısa özet için bakınız: `legacy/reports/legacy-ui-elements-batch-5.md` (Rule B batch 5)
      - apiClient.ts    # Orval wrapper (single place)
      - inventoryService.ts
      - patientService.ts
    - stores/
      - uiStore.ts (simple zustand/pinia style) or context
    - utils/
      - formatters.ts
      - validators.ts
    - types/
      - index.ts
    - App.tsx
    - index.tsx
    - routes.tsx

  ---

## React önerisi (x-ear) — hızlı referans

Aşağıdaki minimal React+TypeScript dosya/klasör ağacı `x-ear/apps/web/src` içine uygulanmak üzere tasarlandı. Her bileşen 500 LOC kuralına uyar. Bu şablon migration sırasında adım adım implement edilebilir.

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
    - PageContainer.tsx
  - ui/
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
  - uiStore.ts
  - inventoryStore.ts

Notlar:
- `apiClient.ts` Orval üretimini adapter olarak kullanmalı, tipleri korumalı.
- Ağır iş (OCR/PDF/image-processing) web-worker veya backend servislerine taşınmalı; frontend sadece orkestrasyon + UI tutmalı.

### Hızlı bileşen sözleşmeleri (örnekler)

Bu bölüm, migrate sürecinde geliştiricilere doğrudan uygulanabilir kısa sözleşmeler sağlar (inputs/outputs, hata modları, edge-case'ler).

- Header.tsx
  - Inputs: {user: User, notificationsCount: number}
  - Outputs: onToggleSidebar(): void, onLogout(): void
  - Edge cases: offline state, extremely long usernames

- Sidebar.tsx
  - Inputs: {menuItems: MenuItem[], currentRoute: string}
  - Outputs: onNavigate(route): void
  - Edge cases: permission-based hidden items, mobile collapse

- Modal.tsx
  - Inputs: {open: boolean, title?: string, onClose: () => void}
  - Outputs: onSubmit(data): Promise<void>
  - Edge cases: nested modals and focus management

- InventoryTable.tsx
  - Inputs: {items: InventoryItem[], onEdit(item), onDelete(id), selectedIds: string[]}
  - Outputs: onSelect(ids: string[]), onBulkAction(action)
  - Edge cases: server pagination + optimistic updates

- DynamicInvoiceForm.tsx
  - Inputs: {schema: InvoiceSchema, initial?: Partial<InvoicePayload>}
  - Outputs: onPreview(payload) => Modal, onSubmit(payload) => Promise<void>
  - Edge cases: conditional fields, tax/pricing calculation fallbacks

- SgkUploader.tsx
  - Inputs: {onProcessed(documentMeta)}
  - Outputs: progress UI, per-file result callback
  - Notes: preprocessing in worker; prefer backend OCR for reliability



  ## Automated appendix — Kısa JS dosya özetleri (batch 4)

  Auto-generated one-line summaries from a batch read of legacy JS heads. These are concise pointers to help locate behavior when migrating.

  - `public/assets/api-config.js` — Runtime API configuration manager: sets `window.API_BASE_URL`, composes backend endpoints, and exposes connection test & makeRequest helpers.
  - `public/assets/api/api/index.js` — Main API adapter (strangler pattern): unified exports (getPatients, createPatient, etc.) that route to generated or legacy clients and optionally run shadow validation.
  - `public/assets/api/legacy.js` — Legacy fetch-based API client: `legacyFetch` wrapper and a wide set of `legacy*` functions (patients, appointments, admin, permissions) with response-format normalization.
  - `public/assets/js/advanced-automation.js` — AdvancedAutomationRules engine: rule definitions (triggers/conditions/actions), SMS/task scheduling, and execution/logging for automation flows.
  - `public/assets/js/api-client-wrapper.js` — Optimistic API client: optimistic POST/PUT, 409 conflict handlers, retry/outbox integration and online/offline processing events.
  - `public/assets/js/components/category-brand-autocomplete.js` — Category/Brand Autocomplete: fuzzy search, normalization (Turkish chars), create-new support and dropdown UI for category/brand inputs.
  - `public/assets/js/components/multi-select-search.js` — Multi-select searchable dropdown: search, fuzzy fallback, selection set, clear and multi-field search rendering.
  - `public/assets/js/components/quick-look-modal.js` — QuickLook document modal: robust DOM-ready checks, create/append modal, preview/edit flow and save/cancel hooks.
  - `public/assets/js/inventory/inventory-bulk.js` — Inventory bulk operations: CSV bulk upload, file parsing handlers, modal-based bulk actions and integrations with category autocomplete.
  - `public/assets/js/indexeddb-outbox.js` — IndexedDB outbox implementation: store pending operations, deduplication by idempotency keys, priority queue and periodic sync.
  - `public/assets/js/inventory/inventory-orval-adapter.js` — Thin Orval adapter for inventory: loads `window.orvalInventoryAPI` and proxies `getInventoryItems`, `createInventoryItem`, `deleteInventoryItem`.
  - `public/assets/js/invoice-conditional.js` — Invoice conditional UI: maps invoice scenarios/types to show/hide field groups (tevkifat/ozelMatrah/SGK paths) and syncs hidden flags.
  - `public/assets/js/invoices.js` — InvoicesManager: EFatura data service integration, filters/search, table rendering and per-row actions (preview/edit/send/delete).
  - `public/assets/js/new-invoice.js` — NewInvoiceManager: dynamic invoice form engine (line items, conditional arrays, tax/tevkifat lists), customer detection and form orchestration.
  - `public/assets/js/notifications/notification-client.js` — Notification client helpers: postNotification, fetch notification stats, request desktop permission and show native notifications.
  - `public/assets/js/patient-compat.js` — PatientManager compatibility shim: `defineIfMissing` helpers and fallback implementations for calculateStats, reminders and new-patient flow.
  - `public/assets/js/storage-keys.js` — Global STORAGE_KEYS registry: canonicalizes localStorage keys used across legacy modules (e.g., `xear_patients`).
  - `public/assets/js/image-processor.js` — Fallback ImageProcessor & OCR shims: lightweight implementations for edge detection, PDF conversion and OCR pipeline fallbacks used by SGK flow.

    - patient/

      - PatientHeader.tsx
      - PatientTabs.tsx
      - PatientNotes.tsx
      - DeviceManagement.tsx
    - invoices/
      - DynamicInvoiceForm.tsx
      - InvoiceWidget.tsx
  - hooks/
    - useApi.ts
    - useDebouncedValue.ts
    - useModal.ts
  - services/
    - apiClient.ts    # Orval wrapper (single place)
    - inventoryService.ts
    - patientService.ts
  - stores/
    - uiStore.ts (simple zustand/pinia style) or context
  - utils/
    - formatters.ts
    - validators.ts
  - types/
    - index.ts
  - App.tsx
  - index.tsx
  - routes.tsx

Kurallar & Notlar:
- Her dosya ~< 400-500 satır tutulacak. Büyük mantık (ör. inventory render) `InventoryTable` + alt bileşenlere bölünecek.
- `components/ui` altında küçük, test edilebilir primitives olacak (Button/Modal/Table). Bu sayede tüm UI uniform hale gelir.
- `services/apiClient.ts` Orval tarafından üretilen client'ı sarar ve header/idempotency gibi cross-cutting davranışları ekler.
- `hooks/useModal` ve `stores/uiStore` ile modal/toast/state yönetimini merkezi hale getirin.

---

## Kısa eylem önerileri — kısa vadede (önceliklendirme)
1. `assets/modules/patient-details/*` içindeki küçük bileşenleri okuyup React'e mapleyin (öncelik: Patient Details page).
2. `public/assets/modules/inventory/*` modüllerini component'lere bölün: Table/Filters/Modals.
3. `assets/modules/invoice/dynamic-form.js` içindeki şema-driven form mantığını `DynamicInvoiceForm.tsx` olarak taşıyın; validation ve conditional logic reuse edilebilir.
4. Global `widgets/header.js` ve `widgets/sidebar.js`'i ortak layout component'leri olarak yeniden yazın.

---

Dosya oluşturuldu: `legacy/reports/legacy-features-and-file-map.md`

---

Not: Bu rapor, büyük çoğunluğu manuel olarak taranmış önemli modülleri içerir. Ancak bazı derlenmiş/dist veya az kullanılan JS dosyaları raporlarda direkt olarak geçmemiş olabilir.
Tam liste kontrolü için bakınız: `legacy/reports/missing-js-mapping.md` — burada legacy `public` altındaki tüm `.js` dosyaları taranmış ve hangi HTML sayfalarının bunları referans ettiği listelenmiştir. Eksik veya üretim-artifaktı olarak değerlendirilen dosyalar burada işaretlenmiştir.

---

## Proje-özgü React dosya yapısı önerisi (x-ear mevcut yapısına göre)

Mevcut `x-ear/apps/web` ve `x-ear/packages/ui-web` yapısını göz önünde bulundurarak, React uygulamasını parçalara ayırma önerisi aşağıdadır. Amaç: her component 500 LOC altında kalsın, UI primitives `packages/ui-web` içinde tutulsun ve `apps/web` sayfa/route-level container'ları barındırsın.

Önerilen ağaç (kök: `x-ear/apps/web/src`)

- src/
  - pages/
    - Dashboard/
      - DashboardPage.tsx          # container, veriyi toplayıp küçük component'leri compose eder
      - DashboardKpi.tsx           # küçük presentational component
      - DashboardCashflow.tsx
    - Inventory/
      - InventoryPage.tsx
      - InventoryTable/
        - InventoryTable.tsx      # table wrapper, <Table> primitive kullanır
        - InventoryRow.tsx        # her satır küçük component
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
    - Invoices/
      - NewInvoicePage.tsx
      - DynamicInvoiceForm.tsx
      - InvoiceWidget.tsx
  - components/
    - layout/
      - Header.tsx
      - Sidebar.tsx
      - PageContainer.tsx
    - ui/ (küçük primitives, mümkünse `packages/ui-web`'ten import edilmelidir)
      - Button.tsx
      - Modal.tsx
      - Table.tsx
      - FormField.tsx
      - Datepicker.tsx
      - Toast.tsx
    - invoices/
      - DynamicInvoiceForm.tsx
      - InvoiceWidget.tsx
  - hooks/
    - useApi.ts
    - useModal.ts
  - services/
    - apiClient.ts    # orval çıktısını saran tekil adapter
    - inventoryService.ts
    - patientService.ts
  - stores/
    - uiStore.ts      # zustand veya context
    - inventoryStore.ts
  - routes/
    - index.tsx
  - App.tsx
  - main.tsx

Notlar:
- `packages/ui-web` içinde tekrar kullanılabilir primitives (Button, Modal, Table, FormField vs.) tutulmalı. `apps/web` bu kütüphaneyi peer dependency/ workspace dependency olarak kullanmalı.
- Her page container (`*Page.tsx`) sadece data fetching ve child component orchestration ile uğraşsın; render mantığı küçük presentational component'lere dağıtılsın.
- Modal/Toast/Datepicker gibi cross-cutting elementler `packages/ui-web`'de primitives/utility hooks ile sağlanmalı.

Örnek component sorumluluk sözleşmesi (kısa):
- InventoryTable.tsx
  - Girdi: items: InventoryItem[] | store hook
  - Çıktı: render edilmiş satırlar, seçili/filtre/ sıralama callbacks
  - Hatalar: boş liste, uzun liste performansı (virtualize önerilebilir)

Uygulama entegrasyon tavsiyesi:
- `apiClient.ts` içinde Orval tarafından üretilen client import edilip tek bir `Api` wrapper ile sarmalanmalı (idempotency/headers/timeouts). `apps/web/src/api/client.ts` bu rolü üstlenebilir.
- Mevcut `packages/ui-web` zaten Radix ve primitives kullanıyor; bunları projenin UI standardı olarak benimseyin.

Bu bölüm eklendi: proje-özgü yapı önerisi (uygulandı).

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

## Automated appendix — Rule B batch 3

Aşağıdaki satırlar Rule‑B kapsamında (HTML tarafından direkt referans verilen dosyalar / onların doğrudan etkileri) otomatik okunup çıkarılmış kısa özetlerdir (entries 26–50). Her satırda kısa göç-notu bulunmaktadır.

- `public/assets/js/components/multi-select-search.js` — Çoklu seçimli arama dropdown; seçim seti yönetimi, arama ve render. Göç notu: erişilebilir React MultiSelect bileşeni (≤500 LOC) olarak yeniden yazın, fuzzy-search util'ını dışa alın.
- `public/assets/js/components/supplier-autocomplete.js` — Tedarikçi autocomplete (API arama + lokal fallback, create-on-the-fly). Göç notu: useSupplierSearch hook + presentational component olarak taşıyın.
- `public/assets/js/core/app.js` — Uygulama bootstrap, AppState ve UIState; çok büyük ve global. Göç notu: AppState parçalanıp route-level container'lara ve store/context'e taşınmalı.
- `public/assets/js/core/utils.js` — Formatlama, tarih, toast ve validation yardımcıları (UtilsClass). Göç notu: saf util fonksiyonlarına ayırıp shared package içinde test edin.
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



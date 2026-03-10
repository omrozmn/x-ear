# Admin QA Checklist

Bu dokuman admin panelin `apps/web` ve `apps/landing` uzerindeki kapsamini kontrol etmek icin hazirlandi.

Status anahtari:
- `[Yonetiliyor]` Admin panelden dogrudan gorulebiliyor veya degistirilebiliyor
- `[Izleniyor]` Admin panelden en azindan okunabiliyor / raporlanabiliyor
- `[Bosluk]` Su an admin panelde net bir karsilik bulunmuyor

## QA Run - 2026-03-10

Canli dogrulanan servisler:
- `[Gecti]` Admin panel: `http://127.0.0.1:8082/`
- `[Gecti]` Web app: `http://127.0.0.1:8080/`
- `[Gecti]` Backend API: `http://127.0.0.1:5003/`
- `[Gecti]` Landing app: `http://127.0.0.1:3000/`

Canli dogrulanan ana akislar:
- `[Gecti]` Affiliate detay endpoint'i veri donuyor
  - `GET /api/affiliates/1/details`
- `[Gecti]` Tenant users endpoint'i veri donuyor
  - `GET /api/admin/tenants/95625589-a4ad-41ff-a99e-4955943bb421/users`
- `[Gecti]` Plans endpoint'i veri donuyor
  - `GET /api/admin/plans?page=1&limit=3`
- `[Gecti]` Tenants endpoint'i veri donuyor
  - `GET /api/admin/tenants?page=1&limit=3`
- `[Gecti]` Affiliates list endpoint'i veri donuyor
  - `GET /api/affiliates/list`
- `[Gecti]` Admin blog endpoint'i veri donuyor
  - `GET /api/admin/blog/`
- `[Gecti]` Landing public plans endpoint'i veri donuyor
  - `GET /api/plans`
- `[Gecti]` Landing public blog endpoint'i veri donuyor
  - `GET /api/blog/`
- `[Gecti]` Landing route cevaplari aliniyor
  - `/`, `/pricing`, `/blog`, `/affiliate`, `/register`, `/checkout`
  - Not: bir kismi `308` ile slash canonical redirect yapiyor; bu hata degil

Canli QA risk notlari:
- `[Kismi]` Tenant listesi genel olarak calisiyor; en az bir aktif tenant icin users detayi veri donuyor ve listede `currentUsers` artik dogru gorunuyor. Yine de tum tenantlar icin ozet sayaçlar tek tek browser seviyesinde gezilmedi.
- `[Kismi]` Landing sayfalari HTTP seviyesinde dogrulandi; admin degisikliginin public UI'a gorunur yansimasi icin tam browser tabanli E2E halen yapilmadi.

## Browser QA - 2026-03-10

Playwright ile dogrulananlar:
- `[Gecti]` Landing `pricing` sayfasi tarayici seviyesinde aciliyor
  - `tests/e2e/landing/pricing.spec.ts --project=landing`
  - 5 test gecti, 2 test `comparison table` ve `monthly/annual toggle` olmadigi icin bilerek skip oldu
- `[Kismi]` Landing `blog` spec'i sert bir garanti uretmiyor
  - `tests/e2e/landing/blog.spec.ts --project=landing`
  - 1 test gecti, 6 test veri/selector yoksa skip oluyor; bu nedenle yalnizca kismi dogrulama sayildi
- `[Kaldi]` Admin `roles` sayfasi masaustunde tablo render etmiyor
  - `tests/e2e/admin/roles.spec.ts --project=admin --no-deps`
  - Heading geliyor, ama `table` locator bulunamiyor
- `[Kaldi]` Admin `roles` create flow beklenen form alanlarini vermiyor
  - Ayni spec icinde `Role Name` label'i bulunamadi
- `[Gecti]` Admin `support` root render'i tarayici seviyesinde aciliyor
  - `tests/e2e/admin/support.spec.ts --project=admin --no-deps`
  - 2 test gecti
- `[Kaldi]` Admin auth setup Playwright testi kirik
  - `tests/e2e/auth/login.spec.ts` admin login akisini false expectation ile dusuruyor
  - Bu yuzden admin project'i normal dependency zinciriyle kosulamiyor; `--no-deps` ile kosuldu

Tarayici seviyesinde teyit edilen net sonuc:
- Landing pricing tarafi calisiyor
- Landing blog icin HTTP ve en az bir render kontrolu var, ama tam UI garantisi henuz yok
- Admin support sayfasi en azindan aciliyor ve root render veriyor
- Admin roles sayfasi halen tamam degil; tablo ve create modal/form beklentisi karsilanmiyor

## Web App

### Kimlik ve tenant
- `[Yonetiliyor]` Tenant listesi, tenant detayi, tenant durumu
  - Admin: `/tenants`
  - Web karsiligi: tenant tabanli tum moduller
- `[Yonetiliyor]` Tenant kullanicilari
  - Admin: tenant detay modal > `Kullanicilar`
  - Web: `/settings/team`
- `[Yonetiliyor]` Roller ve izinler
  - Admin: `/roles`
  - Web: `/settings/roles`
- `[Yonetiliyor]` Abonelik / plan / addon
  - Admin: `/plans`, `/addons`, tenant detay modal > `Abonelik`
  - Web: `/settings/subscription`

### Operasyon
- `[Yonetiliyor]` Hastalar
  - Admin: `/patients`
  - Web: `/parties`, `/parties/$partyId`
- `[Yonetiliyor]` Randevular
  - Admin: `/appointments`
  - Web: `/appointments`
- `[Yonetiliyor]` Cihaz ve stok
  - Admin: `/inventory`
  - Web: `/inventory`, `/inventory/$id`
- `[Yonetiliyor]` Tedarikciler
  - Admin: `/suppliers`
  - Web: `/suppliers`, `/suppliers/$supplierId`
- `[Yonetiliyor]` Uretim takibi
  - Admin: `/production`
  - Web: operasyon akislarina dolayli etkisi var
- `[Izleniyor]` OCR
  - Admin: `/ocr-queue`, `/files`
  - Web: belge / OCR tabanli akislar

### Finans
- `[Yonetiliyor]` Faturalar
  - Admin: `/billing`
  - Web: `/invoices`, `/invoices/incoming`, `/invoices/new`, `/invoices/purchases`, `/invoices/summary`
- `[Yonetiliyor]` Odemeler
  - Admin: `/payments`
  - Web: `/invoices/payments`, `/pos`, `/cashflow`, `/sales`, `/purchases`
- `[Izleniyor]` Nakit ve hareketler
  - Admin: `/payments`, `/activity-logs`
  - Web: `/cashflow`, `/cashflow/$id`

### Iletisim ve buyume
- `[Yonetiliyor]` Kampanyalar
  - Admin: `/campaigns`
  - Web: `/campaigns`, `/automation`
- `[Yonetiliyor]` Bildirimler
  - Admin: `/notifications`
  - Web: uygulama ici bildirim akislar
- `[Yonetiliyor]` SMS basliklari ve SMS paketleri
  - Admin: `/sms/headers`, `/sms/packages`
  - Web: tenant SMS kullanimi ve kampanya akislar
- `[Yonetiliyor]` Destek talepleri
  - Admin: `/support`
  - Web: destek / ticket akislar

### Ayarlar ve entegrasyonlar
- `[Yonetiliyor]` Tenant genel ayarlari
  - Admin: tenant detay modal > `Genel`
  - Web: `/settings/company`
- `[Yonetiliyor]` Entegrasyonlar
  - Admin: `/integrations`, `/integrations/vatan-sms`, `/integrations/email/config`, `/integrations/email/logs`
  - Web: `/settings/integration`
- `[Izleniyor]` SGK / UTS
  - Admin: tenant bazli ayarlar ve dosyalar uzerinden kismi takip var
  - Web: `/settings/sgk`, `/sgk`, `/sgk/downloads`, `/uts`
- `[Bosluk]` Profil
  - Web: `/profile`
  - Not: bunun net bir admin karsiligi yok
- `[Bosluk]` Web icindeki test veya yardimci route'lar
  - Web: `/test`

## Landing

### Donusum ve public sayfalar
- `[Yonetiliyor]` Fiyatlandirma verisi
  - Admin: `/plans`, `/addons`
  - Landing: `/pricing`, `/checkout`
- `[Yonetiliyor]` Blog icerigi
  - Admin: `/blog`
  - Landing: `/blog`, `/blog/[slug]`
- `[Yonetiliyor]` Affiliate kayit / panel verisi
  - Admin: `/affiliates`, `/affiliates/$affiliateId`
  - Landing: `/affiliate`, `/affiliate/register`, `/affiliate/login`, `/affiliate/panel`
- `[Bosluk]` Ana sayfa hero, feature block, FAQ, privacy, terms metinleri
  - Landing: `/`, `/faq`, `/privacy`, `/terms`
  - Not: Bunlar kod bazli statik sayfalar gibi gorunuyor; adminde net CMS karsiligi yok
- `[Bosluk]` Demo sayfasi
  - Landing: `/[locale]/demo`
  - Not: adminde karsiligi gorunmuyor

### Signup ve onboarding
- `[Izleniyor]` Kayit olan tenantlar
  - Admin: `/tenants`
  - Landing: `/register`, `/checkout/success`, `/setup-password`
- `[Izleniyor]` Checkout / abonelik sonucu
  - Admin: `/tenants`, `/payments`, `/billing`
  - Landing: `/checkout`, `/checkout/success`

## Admin Uzerinden QA Adimlari

### Web App QA
- `1.` Admin > `Tenants` ac. Aktif bir tenant sec.
- `2.` Tenant detayinda `Genel`, `Kullanicilar`, `Abonelik`, `Entegrasyonlar` tablarini kontrol et.
- `3.` `Kullanicilar` tabinda tenant admin ve kullanicilarin listelendigini dogrula.
- `4.` `Patients`, `Appointments`, `Inventory`, `Suppliers` sayfalarinda veri, arama, siralama, pagination ve checkbox secimi calisiyor mu kontrol et.
- `5.` `Billing` ve `Payments` sayfalarinda fatura ve odeme hareketleri geliyor mu kontrol et.
- `6.` `Campaigns`, `Notifications`, `Support`, `SMS Headers`, `SMS Packages` ekranlarini kontrol et.
- `7.` `Files` ve `OCR Queue` ekranlarinda belge akislarini kontrol et.
- `8.` `Activity Logs` uzerinden web app'teki aksiyonlarin izlenebilirligini kontrol et.

### Landing QA
- `1.` `Plans` ve `Addons` ekranlarindaki degisikliklerin landing pricing/checkout akisina yansidigini kontrol et.
- `2.` `Blog` ekraninda bir yazi yayinla/guncelle; landing blog listesi ve detayinda gorunuyor mu kontrol et.
- `3.` `Affiliates` ekraninda bir affiliate sec; detay, komisyon ve referral verisi geliyor mu kontrol et.
- `4.` Landing `register` ile acilan yeni tenant admin tarafinda `Tenants` icinde gorunuyor mu kontrol et.
- `5.` Checkout / subscribe sonrasi tenant plani admin `Tenants` ve `Billing/Payments` icinde dogru gorunuyor mu kontrol et.

## Bilinen Bosluklar

- Landing ana sayfa icerik bloklari icin net CMS/admin yonetimi gorunmuyor.
- FAQ / privacy / terms sayfalari kod bazli statik gorunuyor.
- Web `profile` sayfasinin admin karsiligi belirgin degil.
- SGK / UTS icin admin kapsami var ama web ayar ekranlariyla tam feature-parity ayri QA ister.

## Sonraki Adim

Bu checklist dokuman envanter tabanlidir. Tam QA icin bir sonraki turda:
- her maddeyi `Gecti / Kaldi / Kismi` olarak isaretleyelim
- gerekiyorsa eksik alanlar icin admin kapsami backlog'u cikaralim

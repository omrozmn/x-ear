# Playwright Test Inventory - 4 Fazlı Yaklaşım

**Proje**: X-Ear CRM  
**Tarih**: 2026-02-02  
**Strateji**: Exploratory → Pattern Analysis → Fix Common Issues → Harden

---

## 📋 Test Stratejisi Özeti

### 🎯 4 Fazlı Yaklaşım (Google/Stripe/Shopify Modeli)

**FAZ 1 - Exploratory Pass** (1 hafta)
- Amaç: Sistemi taramak, kırılma noktalarını bulmak
- Assertion: Minimal (sayfa açılıyor mu?)
- Çıktı: Fail pattern'leri + trace/video/log

**FAZ 2 - Pattern Analysis** (2-3 gün)
- Amaç: Ortak sorunları tespit etmek
- Çıktı: Kök neden listesi (selector, state, timing, etc.)

**FAZ 3 - Ortak Sorunları Çözme** (1 hafta) ⭐ EN KRİTİK
- Amaç: Tek seferde %60-70 fail'i çözmek
- Örnekler: TestID standardı, auth helper, toast handler, API wait helper

**FAZ 4 - Flow-by-Flow Hardening** (2-3 hafta)
- Amaç: Her flow'u production-ready yapmak
- Assertion: Detaylı (state, visual, backend)

---

## 📊 Test Dosyası Yapısı

```
x-ear/tests/e2e/
├── auth/
│   ├── login.spec.ts                    # AUTH-001 to AUTH-005
│   └── otp.spec.ts                      # AUTH-006 to AUTH-008
├── party/
│   ├── party-crud.spec.ts               # PARTY-001 to PARTY-010
│   ├── party-bulk.spec.ts               # PARTY-011 to PARTY-015
│   └── party-search.spec.ts             # PARTY-016 to PARTY-020
├── sale/
│   ├── sale-create.spec.ts              # SALE-001 to SALE-005
│   ├── sale-device-assignment.spec.ts   # SALE-006 to SALE-010
│   └── sale-payment.spec.ts             # SALE-011 to SALE-015
├── invoice/
│   ├── invoice-create.spec.ts           # INVOICE-001 to INVOICE-005
│   ├── invoice-sgk.spec.ts              # INVOICE-006 to INVOICE-010
│   └── invoice-pdf.spec.ts              # INVOICE-011 to INVOICE-015
├── inventory/
│   └── inventory-crud.spec.ts           # INVENTORY-001 to INVENTORY-010
├── admin/
│   ├── admin-auth.spec.ts               # ADMIN-001 to ADMIN-005
│   ├── admin-tenant.spec.ts             # ADMIN-006 to ADMIN-010
│   └── admin-impersonation.spec.ts      # ADMIN-011 to ADMIN-015
├── security/
│   ├── sec-auth.spec.ts                 # SEC-AUTH-001 to SEC-AUTH-010
│   ├── sec-rbac.spec.ts                 # SEC-RBAC-001 to SEC-RBAC-010
│   └── sec-tenant.spec.ts               # SEC-TENANT-001 to SEC-TENANT-010
└── performance/
    ├── perf-page-load.spec.ts           # PERF-LCP-001, PERF-FID-001, etc.
    ├── perf-api.spec.ts                 # PERF-API-001 to PERF-API-010
    └── perf-load.spec.ts                # PERF-LOAD-001 to PERF-LOAD-005
```

**Toplam Tahmini**: ~15-20 test dosyası, ~150-200 test case

---

## 🎯 FAZ 1: Exploratory Tests (Minimal Assertion)

### 📁 auth/login.spec.ts

#### AUTH-001: Email ile Login
**Faz**: 1 (Exploratory)  
**Öncelik**: P0 (CI Blocker)  
**Tahmini Süre**: 15 dakika

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

**Sorular (Onay Gerekli)**:
✅ Login sonrası direkt /dashboard'a gidiyor
✅ Email + password + telefon ile OTP login var
❓ "Beni hatırla" checkbox'ı var mı?

---

#### AUTH-002: Telefon ile Login + OTP
**Faz**: 1 (Exploratory)  
**Öncelik**: P0 (CI Blocker)  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. /login sayfasına git
2. Phone input'a "+905551234567" yaz
3. "Giriş Yap" butonuna tıkla
4. OTP modal'ının açıldığını kontrol et
5. OTP input'a "123456" yaz (test OTP)
6. "Doğrula" butonuna tıkla
7. /dashboard'a yönlendirildiğini kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="otp-modal"]')).toBeVisible();
await expect(page).toHaveURL('/dashboard');
```

**Gerekli TestID'ler**:
- `login-identifier-input` (phone için de aynı mı?)
- `login-submit-button`
- `otp-modal`
- `otp-input`
- `otp-submit-button`
- `otp-resend-button` (varsa)

**Sorular (Onay Gerekli)**:
✅ Test ortamında OTP mock olarak yapılabilir
✅ OTP 6 haneli
❓ OTP'nin expire süresi test'te simüle edilmeli mi?
✅ "OTP gönder" ve "Giriş yap" tek buton (identifier girince OTP gönderilir)
❓ OTP yanlış girildiğinde kaç deneme hakkı var?

---

### 📁 party/party-crud.spec.ts

#### PARTY-001: Party Oluşturma (Temel)
**Faz**: 1 (Exploratory)  
**Öncelik**: P0 (CI Blocker)  
**Tahmini Süre**: 20 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. "Yeni Party" butonuna tıkla
4. Form modal'ının açıldığını kontrol et
5. Ad: "Ahmet" yaz
6. Soyad: "Yılmaz" yaz
7. Telefon: "+905551234567" yaz
8. "Kaydet" butonuna tıkla
9. Success toast'ın göründüğünü kontrol et
10. Tabloda yeni party'nin göründüğünü kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="party-table-row"]').first()).toContainText('Ahmet');
```

**Gerekli TestID'ler**:
- `party-create-button`
- `party-form-modal`
- `party-first-name-input`
- `party-last-name-input`
- `party-phone-input`
- `party-email-input` (opsiyonel mi?)
- `party-submit-button`
- `success-toast`
- `party-table-row`

**Sorular (Onay Gerekli)**:
✅ ZORUNLU: Ad, Soyad, Telefon
✅ Telefon formatı validasyonu var (+90 ile başlamalı)
✅ Email validasyonu var
✅ TC Kimlik numarası validasyonu var (11 hane, algoritma kontrolü) - Zorunlu değil ama girilirse validate edilir
✅ Form modal
✅ "Kaydet" butonuna tıkladıktan sonra modal kapanıyor

---

#### PARTY-002: Party Güncelleme
**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. İlk party'nin "Düzenle" butonuna tıkla
4. Form modal'ının açıldığını kontrol et
5. Ad'ı "Mehmet" olarak değiştir
6. "Kaydet" butonuna tıkla
7. Success toast'ın göründüğünü kontrol et
8. Tabloda güncellenen party'nin göründüğünü kontrol et
```

**Sorular (Onay Gerekli)**:
✅ "Düzenle" butonu tablonun her satırında var
✅ Güncelleme formu oluşturma formu ile aynı
✅ Tüm alanlar güncellenebilir

---

#### PARTY-003: Party Silme
**Faz**: 1 (Exploratory)  
**Öncelik**: P1  
**Tahmini Süre**: 15 dakika

**Flow**:
```
1. Login ol
2. /parties sayfasına git
3. İlk party'nin "Sil" butonuna tıkla
4. Onay dialog'unun açıldığını kontrol et
5. "Evet, Sil" butonuna tıkla
6. Success toast'ın göründüğünü kontrol et
7. Party'nin tablodan kaybolduğunu kontrol et
```

**Sorular (Onay Gerekli)**:
❓ Silme işlemi için onay dialog'u var mı?
❓ Soft delete mi, hard delete mi? (Soft delete ise "Arşivle" mi denmeli?)
❓ Party'ye bağlı sale/invoice varsa silme engellenebilir mi?
❓ Silinen party geri getirilebilir mi?

---

### 📁 sale/sale-create.spec.ts

#### SALE-001: Satış Oluşturma (Cihaz + Ödeme)
**Faz**: 1 (Exploratory)  
**Öncelik**: P0 (CI Blocker - Revenue Critical)  
**Tahmini Süre**: 30 dakika

**Flow**:
```
1. Login ol
2. /sales sayfasına git
3. "Yeni Satış" butonuna tıkla
4. Form modal'ının açıldığını kontrol et
5. Party seç (dropdown/autocomplete?)
6. Cihaz seç (dropdown?)
7. Fiyat: "15000" yaz
8. Ödeme yöntemi: "Nakit" seç
9. "Kaydet" butonuna tıkla
10. Success toast'ın göründüğünü kontrol et
11. Satış listesinde yeni satışın göründüğünü kontrol et
```

**Minimal Assertion (Faz 1)**:
```typescript
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="sale-list-item"]').first()).toContainText('15000');
```

**Sorular (Onay Gerekli - ÇOK ÖNEMLİ)**:
❓ Satış oluştururken hangi alanlar ZORUNLU?
  - Party (müşteri) = party role profile'a migrate ettik single patients yapısından çünkü aynı projeyi başka sektörlerde de kullancağız. bu yüzden şu anda party aslında müşter.
  - Cihaz (hearing aid)= cihaz, işitme cihazı temelde bir envanter her envanter gibi crm'lerdeki. Ancak sektör özerlinde ve Türkyie pazarında bazı durumlar var kı buna özelleştirmeler yaptık. Örneğin hastalara cihaz ataması yapılıyor seri numara taması yapılıyor. Her chaz başına sgk ödemesi hesalaması yapılıyor satışta vs bir çok detayı var anlamadığın olursa sor yine.
  - Fiyat: fiyatta liste fiyatı var ve sonra yüzde veya miktar indirimi yapılıyor sonra sgk schema daki fiyatlar kulak başına düşülyür yani tekse bir tane bilateral satış ise iki tane sgk payı her bir ichaz için düşülüyor fiyattan sonra da o anda sipariş verilirken ön ödeme yapıldıysa bu da cihaz atamasında yazılabiliyor.
  - Ödeme yöntemi: nakit havale kredi kartı senetli ödeme yöntemleri kullanılabiliyor. Ödeme için pos entegrasyonu yapılacak ancak o sonraki aşamada. pos entegrasyonlu ödeme yapılınca çekilen tutar aten kredi kartı olarak default işlenecek. ödemeleri tahsilat modalı ile takip edebiliyoruz. ayrıca senet takibi için de bir modalımız var ve buradan senet oluşturma ve oluşturulan senetlere tahsil bildirimi yapılabiliyor. her satıştaki toplam alınan tutar sarış tutarını geçememeli. Ayrıca ön ödeme senet veya bir kısım kredi kartı bir kısım nakit bir kısım havale vs gibi parçalı ödemeler de ilgili satış için tahsilat modalıyla işlenip saklanabiliyor olmalı.
  - Tarih: tariht sipariş tarihi ve ödemeler için tarih yazılıyor.
  - SGK kapsamı: sgk shemadan yaş araşıklarına göre çekiliyor.
  - İndirim?: Yüzde veya miktar inidirmi yapılabiliyor.

❓ Party seçimi nasıl yapılıyor? (Dropdown, autocomplete, modal?) party seçimi derken ne kastediyorun anlamadım. şu anda tek party hasta çünkü yalnızca işitme cihazı crm'si şu anda ve zaten her müşteri segmenti kendine ait party'i görebiliyor kimse party seçemiyor.
❓ Cihaz seçimi nasıl yapılıyor? (Dropdown, autocomplete?) cihaz seçimini eğer cihaz ataması ve satış moalarında diyorsan autocomplete var search yaparken o şekilde seçiyor gelen sonuçlardan kullnıcı.
❓ Cihaz seçildiğinde fiyat otomatik dolduruluyor mu?: evet yalnızca fiyat değil tüm ilgili alanlar doğru şekilde doluyor barkod seri no vs sen bakarsın.
❓ Ödeme yöntemleri neler? (Nakit, Kredi Kartı, Havale, Taksit?): evet hepsi var ama taksit derken senet kastediliyor. ama kredi kartı seçeneği seçildiğinde de taksit sayısı diye bir seçenek koysak iyi olur böylelikle merkezler kendi komisyon oranlarını girerse raporlarda komisyon oranlarında arındırılmış satışları da göstermede fayfalı olur.
❓ Taksitli satış var mı? Varsa kaç taksit seçeneği? 0-9 taksit arası tkasit var. senetlide de merkez belirlediği sayıda senet ile taksit yapabiliyor. p
❓ SGK kapsamı seçeneği var mı? (Evet/Hayır, yüzde?): yüzde değil. cihaz başına sgk indirimi liste fiyatından indiriliyor bu da schema dan çekiliyor json. ayrıca pil satışlarında da raporlu diye işaretlenebiliyor olmalı ve sgknın ödediği pil tutarı ve satılan pil adedi düşebilsin. bunu yapbilmek için gerekenleri yapmışt mıydık hatırlamıyrum. örneğin envanterde birim olarak paket girilidğinde paket içeriği seçilip birim seçilip(pil için adet) paketteki adet girilebilimeli. böylece kaç tane ve kaç paket verildiği hesaplanabilir. sgk 104 adet pil için 698 tl ödeme yapıyor schemada yoksa ekleyebilrisin. pils atışı ccihaz atamsıyla yapılmıyor satış sekmesi altından yapılıyor
❓ İndirim uygulanabiliyor mu? (Yüzde mi, tutar mı?) her ikisi de seçilebiliyor  isteğe göre ve yazılan tutar düşülüyor fiyattan
❓ Satış sonrası otomatik fatura oluşturuluyor mu? kullanıcı isterse fatura oluştur düğmesine badabiliyor satışlar sekmesinde ilgili satış kaydınan tablodaki ve açılan modaldan fatura bilgilerini girip oluşturabiliyor.
❓ Satış sonrası cihaz otomatik party'ye atanıyor mu? cihaz atamasında atama nedeni satış olarak seçilirse satış nedeniyle atam olmuş oluyor. satışlar sekmesinde yeni satış modalı ile de satış yapılabiliyor ve buradan yapılan satışta cihaz ataması nedeni satış olarak kaydedielrek cihaz atamsı yapılıyor. yapılabilecek tek satış cihaz değil envanterdeki her ürün satılabilir ama yeni satış modalıyla atma yapılabilecek tek ürün işitme cihazı.

---

## 🔍 Kritik Sorular - Hemen Cevap Gerekli

### 🔴 Authentication Flow
1. Login sonrası varsayılan sayfa nedir? (/dashboard mı, /parties mi?) dashboard
2. OTP test ortamında nasıl alınıyor?
otp çalışıyor şu anda ama mock olarak yapbilirsin testlerde
3. Admin login ayrı bir sayfada mı? (/admin/login?) admin panel var komple ayrı bir yapı web app'ten. ancak aynı giriş ekranından super admin de giriş yapıp tenatn ve role impersonate ederek denetimler yapabiliyor çalışıyor mu role based izolasyonlar ve tnenat işlemleri diye. tenatn seçmeden crud işlemleri yapamz superadmin.

### 🔴 Party Management
4. Party oluştururken hangi alanlar ZORUNLU?
- Ad
- Soyad
- Telefon   
5. TC Kimlik numarası zorunlu mu? Validasyonu var mı? validasyon var algoritam zaten var codebasede ve doğru çalışıyor. kaydedilrken zorunlu değil ancak yanlış girilirse validasyon yapılıyor. girdikten sonra tamamen silinrse tc kaydedilmeden modalı kaydetmeye izin vermelyizi. yani başına bela olamamlı kullanıcın belki doğru tcye ulaaşmadı ama biğder bilgileri kaydetmek istiyor kaydediblsecek
6. Party silme soft delete mi, hard delete mi? soft delete. arşivlenmiş party'ler ayrı bir tabloda listeleniyor ve oradan geri yüklenebiliyor. super admin onayı olmadan yüklenemiyor

### 🔴 Sales Flow (EN KRİTİK)
7. Satış oluştururken hangi alanlar ZORUNLU? - Party (müşteri): zaten ilgili part seçilerek satış oluşturuluyor ancak bi konuya dikkat: kasa kaydı satış değil! günlük girdi çıktı takibi yapmak isteyenler içindir. yani lasa kaydında opsiyonel, kasa kaydı ekranından ve dahsboard'dan kasa kaydı oluşturulabiliyo, eğer hasta adı girilirse o zamn ilgili hastanın satış geçmişine düşmesi gerekiyor kaydın ve hasta adı girilen kayırlar satış olarak da kaydediliyor. yani her satış kasa kaydıdır ama her kasa kaydı satış değildir, hasta adı girilirse daış kaydı oluyor. dolayısıyla satışta evet party zorunlu. hasta seçilirse kasa kaydı modalından, toaster iligil hasta adı (party)'e satış oalrak kaydedildi toaster gösterir. öteki türlü kasa kaydı oluşturuldu toaster çıakrmalıyız. cihaz atama formunda ve yeni satış formunda zaten hastaların kendi detaylarından girip oradaki sekmelerden atama yapılıyor yani party zorunlu. 
- Cihaz: cihaz zorunlu değil ama ürün zorunlu. yani envanterden bir ürün seçmek zorunda ama bu cihaz olmayabilir. kasa kaydında ise ürün seçimi zorunlu değil kişi kendisi etiketler oluşturup seçip yapabiliyor kaydı. 
- Fiyat: zorunlu
- Ödeme yöntemi: zorunlu ama nakit oalrak deault yapalım bela olmasın kullancıya.
8. Cihaz seçildiğinde fiyat otomatik dolduruluyor mu? evet cihaz ya da ürün seçildiğinde votomatik dolduruyluyor. 
9. SGK kapsamı nasıl işliyor? (Yüzde mi, sabit tutar mı?) abit tutar schema'da var. 
10. Satış sonrası fatura otomatik oluşturuluyor mu? hayır kullanıcı satış tablosundan istediğinde oluşturabilir. ayrıca satışlar isminde bir sayfamız yok mu? yoksa oluşturalım mı tüm satışları göstermek için? raporlarda vardı sanırım oradan gördğü kayda isterse fatura kesse kullanıcı?  fatura sekmesi var onun altında satışlar var. tam tersi mi yapsak yani adı satışlar olsa faturalar mı alt item olsa? ya da alışlar-satışlar olarak mı yapsak? sanırım en mantılısı böyle yapmak. şu anda satışalr altında faturalar gösteriliyor bu mantık yanlış burada tüm satışları listelemelyiz ve kullanıcı her satışı hasta detaylından bağımsız lsiteleyip görebilir fatura kesebilir tahsilat yapabilir senet tahsili yapabilir. kesilen fatura faturalar sekmesine düşer yeni fatura zaten alt item orada kalır direkt fatura kesecekse oraya gider. faturalara bakacaksa oraya gider. gelen faturalar da alışlara düeşer.

11. Taksitli satış var mı? 
hayır tekrarlı satış yok ama işitme cihazında 5 sene sgk raporu işli satışlarda ise bir sene sonra kullanıcıya bilgilendirme yapmlayız ki takip edebilsin hastaları(bunu uyguladık mı hatırlamıyorum uygulamdıysak uygulamalıyzı.)

### 🔴 Invoice Flow
12. Fatura manuel mi oluşturuluyor, yoksa satıştan otomatik mi? manuel oluşturuluyor. kullanıcı isterse oluşturuyor. biz kolaylaştırmak için satış geçmişi tablolarına hem hasta detayında hem de satışlar sekmesinde fatura oluştur butonuyla kolayca ilgili satışın bilgilerinin otomatik olarak faturaya geldiği vek ullanıcnın bir iki tıklamayla fatura kesebilieceği bir sistem sunmalıyız.
13. E-fatura entegrasyonu test ortamında nasıl test ediliyor? (Mock mu?): test edildi efatura sistemi yayına hazır.
14. SGK faturası normal faturadan farklı mı?: sgk faturası hatalardan indirilen sgk tutarlarının sgk'dan tahsil edilemsi iin her ay kesilen bir fatura tipi. her ay kesiliyor. neaısl ne kadar kesiliği vs sgk entegrsayınu yaptığımızda detaylandırılacak şu anda bşaka bir eşy yapmamıza gerk yok. sgk faturaı kesebilmesi yeterli kullanıcının. test ettik zten kesilebiliyor.

### 🔴 UI/UX
15. Form'lar modal mı, yoksa ayrı sayfa mı? modal.
16. Toast notification'lar kaç saniye görünüyor?. best practice nedir? hepsi o kadar görünsün ve kayboslun
17. Loading spinner'lar var mı?  olmalı mı? öyleyse gerken yerlee ekleyelim

TestID'leri ne?

---

## 📝 Sonraki Adımlar

1. **ÖNCELİK 1**: Yukarıdaki kritik soruları cevapla
2. **ÖNCELİK 2**: Her flow için onay ver veya düzelt
3. **ÖNCELİK 3**: Eksik flow'ları ekle
4. **ÖNCELİK 4**: Test dosyası yapısını onayla

---

## ⏸️ DEVAM ETMEDEN ÖNCE

**Bu döküman taslaktır. Devam etmeden önce yukarıdaki soruları cevaplamalıyız.**

Şu anda sadece 5 test senaryosu yazdım (AUTH-001, AUTH-002, PARTY-001, PARTY-002, PARTY-003, SALE-001).

**Toplam hedef**: ~150-200 test case

**Soru**: Bu yaklaşım doğru mu? Her test için:
- Flow adımları
- Minimal assertion (Faz 1)
- Sertleştirilmiş assertion (Faz 4)
- Gerekli TestID'ler
- Olası fail nedenleri
- Onay gerektiren sorular

Bu formatta devam edelim mi?


Mükemmel cevaplar! Şimdi tüm bilgileri toparlayıp **son sorularımı** soracağım. Sonra Test Inventory'yi tamamlayacağım.

## 🎯 SON SORULAR (Kritik Detaylar)

### 1. **Cihaz Atama Modalı - Atama Nedenleri**
Cevabın: "Cihazlar sekmesinde cihaz atama modalına bak"

❓ **SORU 1**: Atama nedenleri tam liste nedir?
- Satış
- Test
- Loaner (Ödünç)
- Değişim
- Tamir
- İade
- Başka?

❓ **SORU 2**: "Test" veya "Loaner" atama yapıldığında:
- Fiyat bilgileri giriliyor mu?
- Satış kaydı oluşuyor mu?
- Geri alma işlemi nasıl yapılıyor?

---

### 2. **Pil Satışı - Rapor Durumu**
Cevabın: "Rapor alındı, rapor bekliyor, özel satış"

❓ **SORU 3**: Bu 3 seçenek arasındaki fark nedir?
- **Rapor alındı**: SGK ödemesi düşülür ✅
- **Rapor bekliyor**: SGK ödemesi düşülür mü? ❓
- **Özel satış**: SGK ödemesi düşülmez ✅

❓ **SORU 4**: "Rapor bekliyor" seçilirse:
- SGK tutarı düşülüyor mu?
- Sonradan "Rapor alındı" olarak güncellenebiliyor mu?
- Raporlar sayfasında "Bekleyen Raporlar" listesinde mi görünüyor?

---

### 3. **Satışlar-Alışlar Navigasyon Yapısı**
Cevabın: "Faturalar ismini Satışlar-Alışlar olarak değiştir"

❓ **SORU 5**: Yeni yapı şöyle mi olacak?
```
Sidebar:
├── Satışlar-Alışlar (eski: Faturalar)
│   ├── Satışlar (yeni sayfa - tüm satışları listeler)
│   ├── Alışlar (yeni sayfa - tedarikçiden alımlar)
│   ├── Giden Faturalar (eski: Faturalar)
│   ├── Gelen Faturalar (eski: Alış Faturaları?)
│   └── Yeni Fatura
```

❓ **SORU 6**: "Alışlar" sayfası şu anda var mı?
- Yoksa oluşturmamız mı gerekiyor?
- Tedarikçiden cihaz alımı nasıl kaydediliyor?

---

### 4. **Tahsilat Modalı - Erişim Noktaları**
Cevabın: "Hasta detayları → Satışlar sekmesi + Satışlar-Alışlar → Satışlar sayfası (3 nokta)"

❓ **SORU 7**: Tahsilat modalı 2 yerden mi açılıyor?
1. **Hasta Detayları → Satışlar Sekmesi**: Buton olarak
2. **Satışlar-Alışlar → Satışlar Sayfası**: 3 nokta menüsünden

❓ **SORU 8**: Tahsilat modalı açıldığında:
- Daha önce yapılan ödemeler gösteriliyor mu?
- Kalan tutar otomatik hesaplanıyor mu?
- Birden fazla ödeme eklenebiliyor mu? (Evet, biliyorum ama UI'da nasıl?)

---

### 5. **Senet Takip - Erişim Noktaları**
Cevabın: "Tahsilat modalı içinde + 3 nokta menüsünden"

❓ **SORU 9**: Senet Takip 2 şekilde mi açılıyor?
1. **Tahsilat Modalı İçinde**: Senet eklendiğinde otomatik mı görünüyor?
2. **3 Nokta Menüsü**: "Senet Görüntüle" butonu mu var?

❓ **SORU 10**: Senet Takip ekranı:
- Ayrı bir sayfa mı? (Sidebar'da "Senet Takip" item'ı var mı?)
- Yoksa sadece modal mı?
- Tüm senetleri mi gösteriyor, yoksa sadece o satışa ait senetleri mi?

---

### 6. **SGK Rapor Takibi - Yeni Özellik**
Cevabın: "Raporlar sayfasında SGK Rapor Takibi sekmesi oluştur"

❓ **SORU 11**: SGK Rapor Takibi şu anda var mı?
- Varsa: Nerede? (Raporlar sayfasında mı?)
- Yoksa: Oluşturmamız mı gerekiyor?

❓ **SORU 12**: SGK Rapor Takibi sayfasında:
- Hangi bilgiler gösteriliyor? (Hasta adı, cihaz, rapor tarihi, kalan süre?)
- Filtreleme var mı? (Süresi dolacaklar, süresi dolmuşlar?)
- Pil ve Cihaz ayrı sekmeler mi?

---

### 7. **Super Admin - Tenant Seçimi**
Cevabın: "Tenant seçmeden CRUD yapamamalı, toast notification göster"

❓ **SORU 13**: Super admin login yaptığında:
- Direkt dashboard'a mı gidiyor?
- Tenant seçim modalı otomatik mı açılıyor?
- Yoksa kullanıcı manuel mi seçiyor?

❓ **SORU 14**: Tenant seçilmeden CRUD yapılmaya çalışılırsa:
- Toast: "Lütfen tenant seçin" mi gösteriliyor?
- Yoksa butonlar disabled mı oluyor?
- Tenant seçim modalı otomatik mı açılıyor?

---

### 8. **Kasa Kaydı - Etiket Sistemi**
Cevabın: "Etiket dinamik olarak eklenebiliyor (kargo, damacana, etc.)"

❓ **SORU 15**: Etiket sistemi:
- Önceden tanımlı etiketler var mı? (Kargo, Damacana, Kira, etc.)
- Kullanıcı yeni etiket oluşturabiliyor mu?
- Etiketler gelir ve gider için ayrı mı?

❓ **SORU 16**: Kasa kaydı modalında:
- Etiket seçimi dropdown mu, autocomplete mi?
- "Yeni Etiket Oluştur" butonu var mı?
- Etiket seçimi zorunlu mu?

---

### 9. **Fatura Oluşturma - Erişim Noktaları**
Cevabın: "Satışlar sekmesi + Satışlar sayfası (modal)"

❓ **SORU 17**: Fatura oluşturma 2 yerden mi yapılıyor?
1. **Hasta Detayları → Satışlar Sekmesi**: "Fatura Oluştur" butonu
2. **Satışlar-Alışlar → Satışlar Sayfası**: 3 nokta menüsünden

❓ **SORU 18**: Fatura modalı açıldığında:
- Satış bilgileri otomatik dolduruluyor mu?
- Fatura tipi seçimi var mı? (Normal, SGK, İhracat?)
- E-fatura gönderimi senkron mu, asenkron mu?

---

### 10. **Envanter - Paket İçeriği**
Cevabın: "Paket içeriği seçilip birim seçilip adet girilebilmeli"

❓ **SORU 19**: Envanter ürün oluştururken:
- "Paket İçeriği" alanı var mı?
- Örnek: "Duracell 60'lı Paket" → Birim: "Adet" → Paket içi: 60
- Bu özellik şu anda uygulanmış mı?

❓ **SORU 20**: Pil satışında:
- Paket seçildiğinde adet otomatik hesaplanıyor mu?
- Örnek: 2 paket seçilirse → 120 adet otomatik hesaplansın
- SGK ödemesi otomatik hesaplanıyor mu?

---

## 📊 Özet

**Toplam 20 yeni soru** sordum. Bunları cevaplayınca:

1. ✅ Test Inventory'yi tamamlayacağım (~150-200 test)
2. ✅ Her test için flow + assertion + TestID yazacağım
3. ✅ Karmaşık flow'ları detaylandıracağım
4. ✅ Frontend'i başlatıp UI'ı inceleyeceğim (gerekirse)

**Şu anda bekliyorum**: Bu 20 sorunun cevaplarını (bildiğin kadarını yaz, bilmediklerini "Bilmiyorum" de, birlikte bakarız)
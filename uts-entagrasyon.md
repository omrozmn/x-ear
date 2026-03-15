# UTS Entegrasyon Analizi

## Amaç

Bu doküman, x-ear uygulamasına UTS (Ulusal Takip Sistemi / `uts.saglik.gov.tr`) entegrasyonu için mevcut kod durumunu, resmi kaynaklardan doğrulanabilen bilgileri, önerilen teknik mimariyi, alma-verme bildirim akışlarını ve implementasyon öncesi açık soruları toplar.

Bu çalışmada amaç, "hemen kod yazmak" değil, resmi ÜTS akışına ters düşmeyecek bir entegrasyon taslağı çıkarmaktır. Test kullanıcı bilgileri ve bazı operasyonel ayrıntılar kamuya açık olarak bulunamadığı için bu dokümanda o eksikler ayrıca belirtilmiştir.

## Sonuç Özeti

- Repo içinde şu an gerçek ÜTS entegrasyonu yok, sadece mock/scaffold var.
- Resmi UTS tarafında:
  - gerçek ortam portalı var: `https://utsuygulama.saglik.gov.tr/UTS/#/giris`
  - test ortamı portalı var: `https://utstest.saglik.gov.tr/UTS/`
  - resmi web servis tanımları PDF'i var
  - resmi kullanıcı kılavuzu PDF'i var
  - tekil ürün hareketlerinin web servis entegrasyonu ile yapılabildiği resmi duyuruda açıkça yazıyor
  - bazı sorgu servislerinde `SAN` parametresi kaldırılmış, `OFF` parametreli sürümlere geçilmiş
  - e-imzalı belge başvuruları için resmi masaüstü `Imzaplus` uygulaması kullanıldığı resmi duyuruda yazıyor
- Kamuya açık kaynaklardan test credentials, sistem token üretme ekranı adımları ve tüm web servis payload şemaları tam çıkarılamadı.
- Bu nedenle tam üretim implementasyonuna başlamak için resmi test erişimi ve kılavuz içeriğinin login gerektiren bölümlerine ihtiyaç var.

## Mevcut Kod Durumu

### Backend

Mevcut backend UTS router'ı sadece placeholder:

- [apps/api/routers/uts.py](/Users/ozmen/Desktop/x-ear%20web%20app/x-ear/apps/api/routers/uts.py)
- [apps/api/schemas/uts.py](/Users/ozmen/Desktop/x-ear%20web%20app/x-ear/apps/api/schemas/uts.py)

Var olan endpointler:

- `GET /api/uts/registrations`
- `POST /api/uts/registrations/bulk`
- `GET /api/uts/jobs/{job_id}`
- `POST /api/uts/jobs/{job_id}/cancel`

Bunlar şu an:

- tenant kontrolü yapıyor
- gerçek ÜTS çağrısı yapmıyor
- job durumunu mock dönüyor
- cihaz kaydı mantığını CSV / `device_ids` düzeyinde bırakıyor

### Frontend

Mevcut frontend de aynı şekilde gerçek entegrasyon değil:

- [apps/web/src/services/uts/uts.service.ts](/Users/ozmen/Desktop/x-ear%20web%20app/x-ear/apps/web/src/services/uts/uts.service.ts)
- [apps/web/src/hooks/uts/useUts.ts](/Users/ozmen/Desktop/x-ear%20web%20app/x-ear/apps/web/src/hooks/uts/useUts.ts)
- [apps/web/src/pages/uts/UTSPage.tsx](/Users/ozmen/Desktop/x-ear%20web%20app/x-ear/apps/web/src/pages/uts/UTSPage.tsx)
- [apps/web/src/components/uts/UTSRegisterModal.tsx](/Users/ozmen/Desktop/x-ear%20web%20app/x-ear/apps/web/src/components/uts/UTSRegisterModal.tsx)

Bugünkü durum:

- toplu kayıt ekranı CSV alıyor
- backend'e `BulkRegistration` adıyla veri gönderiyor
- gerçek ÜTS kimlik doğrulaması yok
- gerçek alma/verme hareket modeli yok
- SN/lot/DI/UDI eşleme mantığı yok
- hata kodu, retry, outbox, audit, durum eşleme yok

Sonuç: mevcut modül korunup "gerçek entegrasyon" katmanı olarak yeniden ele alınmalı.

## Resmi Kaynaklar

### Resmi portal ve ortamlar

- UTS ana portal: `https://uts.saglik.gov.tr/`
- Gerçek ortam giriş: `https://utsuygulama.saglik.gov.tr/UTS/#/giris`
- Test ortamı giriş: `https://utstest.saglik.gov.tr/UTS/`

Not: bu URL'ler UTS ana sayfasındaki menüden doğrulandı.

### Resmi PDF ve duyurular

- UTS kullanıcı kılavuzu PDF:
  - `https://uts.saglik.gov.tr/wp-content/uploads/2017/UTS-PRJ-KullaniciKilavuzu-Uygulama.pdf`
  - `curl -I` ile `200 OK` döndü
- UTS takip ve izleme web servis tanımları PDF:
  - `https://uts.saglik.gov.tr/wp-content/uploads/UTS-PRJ-TakipVeIzlemeWebServisTanimlariDokumani180709.pdf`
  - indirilebildi
- Resmi duyuru: "ÜTS Takip ve İzleme Web Servis Tanımları Dokümanı Güncellendi"
  - `https://uts.saglik.gov.tr/?p=3130`
- Resmi duyuru: "1 Temmuz 2022'de kapatılacak olan web servisler hakkında"
  - `https://uts.saglik.gov.tr/?p=3350`
- Resmi duyuru: "E-imzalı Belge Başvuru İşlemlerinde Güncelleme Hakkında Duyuru"
  - `https://uts.saglik.gov.tr/?p=3425`
- Resmi eğitim sayfaları:
  - Eğitim kılavuzları: `https://uts.saglik.gov.tr/?page_id=1019`
  - E-imza uygulaması kurulumu: `https://uts.saglik.gov.tr/?page_id=2164`

### Resmi kaynaklardan doğrulanan maddeler

#### 1. Tekil hareket işlemleri web servis entegrasyonu ile yapılabiliyor

`https://uts.saglik.gov.tr/?p=3350` sayfasında şu anlam açıkça yer alıyor:

- ÜTS'de tekil ürün hareket işlemleri web servis entegrasyonları ile yapılabilmektedir.

Bu bizim için kritik, çünkü x-ear tarafında yapacağımız entegrasyonun ana ekseni "takip ve izleme" hareketleri olmalı.

#### 2. Sorgu servislerinde eski parametreler değişmiş

Aynı duyuruda:

- `SAN` parametresi kullanan sorgu servislerinin 1 Temmuz 2022 itibarıyla devre dışı bırakıldığı
- entegrasyon yapan firmaların `OFF` parametresi kullanılan servisleri kullanması gerektiği

belirtiliyor.

Bu önemli, çünkü internette bulunan eski örneklerin bir kısmı artık güncel değil.

#### 3. E-imza masaüstü uygulaması ile belge başvurusu akışı var

`https://uts.saglik.gov.tr/?p=3425` sayfasında:

- imalatçıların EC sertifikası ve uygunluk beyanı belgelerini e-imza ile imzalayarak fiziksel evrak göndermeden başvuru yapabildiği
- bunun için Kurum'un ücretsiz masaüstü uygulaması olan `Imzaplus` üzerinden imzalanmış belgelerin önerildiği

belirtiliyor.

Bu çok önemli bir ayrım yaratıyor:

- e-imza, resmi kaynaklarda en azından "belge başvuru" akışında masaüstü imzalama olarak geçiyor
- yani browser içinden USB token / akıllı kart okuyup ham sertifika ile doğrudan REST çağrısı yapma modeli görünmüyor

#### 4. Test ortamı kamuya açık giriş URL'si var

UTS ana sayfası HTML içeriğinde test ortamı menüsü şu URL ile yayınlanıyor:

- `https://utstest.saglik.gov.tr/UTS/`

Bu, test ortamının varlığını doğruluyor. Ancak kamuya açık test kullanıcı adı/şifre bilgisi bulunamadı.

## Test Credentials ve API Bilgileri Hakkında Durum

### Bulabildiğim

- test ortamı URL'si var
- prod ortamı URL'si var
- resmi web servis tanımları dokümanı PDF'i var
- resmi kullanıcı kılavuzu PDF'i var
- resmi e-imza duyurusu var

### Bulamadığım

- kamuya açık test kullanıcı adı / şifre
- sistem kullanıcısı açma için örnek tenant / kurum hesabı
- resmi örnek bearer token veya token üretim ekranının kamuya açık dökümü
- tüm endpointlerin açık metin halinde listesi
- request / response örneklerinin tamamı
- resmi rate limit / timeout / IP whitelist politikası
- test data seed seti

### Neden eksik kaldı

- bazı resmi içerikler PDF içinde gömülü
- bazı WordPress JSON uçları WAF tarafından bloklanıyor
- login gerektiren veya login sonrası gösterilen entegrasyon ayrıntıları kamuya açık değil

Sonuç:

- "araştırma tamamlandı, güvenli şekilde implementasyona başlanabilir" demek için gerekli bilgi henüz tam değil
- özellikle test kullanıcıları ve gerçek payload şemaları olmadan doğrudan üretim kalitesinde entegrasyon yazmak riskli

## API Kimlik Doğrulama ve E-İmza Konusunda Çıkarım

Bu bölümdeki bazı maddeler doğrudan resmi HTML metninden değil, resmi kaynakların yapısından çıkarımdır. Bu yüzden doğrulanması gerekir.

### Güçlü çıkarım: API çağrıları ile e-imza farklı katmanlar

Resmi duyurularda görünen model şu ayrımı destekliyor:

- tekil hareket web servisleri: sistemden sisteme entegrasyon
- e-imzalı belge başvuruları: masaüstü uygulama ile belge imzalama

Buradan çıkan en makul mimari:

1. UTS web servis çağrıları için kullanıcı şifresi değil entegrasyon amaçlı sistem kullanıcısı / token kullanılır.
2. E-imza, her API çağrısında request body hash'ini imzalamak için değil, belge başvurusu veya belirli kurumsal onay akışları için kullanılır.
3. Web browser içinden kullanıcı USB e-imzasına doğrudan erişim beklenmemelidir.

### Ne yapmamalıyız

- kullanıcıdan `.pfx` dosyasını sisteme yüklemesini varsaymak
- browser'da JS ile doğrudan akıllı kart imzası üretmeye çalışmak
- "token yerine sertifika private key'ini backend'e verelim" yaklaşımına girmek

Bunlar hem güvenlik hem mevzuat hem operasyon açısından kötü yaklaşım olur.

### En sağlıklı yaklaşım

#### UTS API için

- backend tarafında kurum bazlı UTS entegrasyon ayarları tutulmalı
- erişim için resmi olarak verilen yöntem neyse o kullanılmalı
  - muhtemel senaryo: sistem kullanıcısı + entegrasyon token
  - muhtemel ek gereksinim: IP whitelist

#### E-imzalı belge süreçleri için

- e-imzalı belge gerekiyorsa bu ayrı bir modül olmalı
- browser sadece imzalanacak dosyayı hazırlar
- imzalama:
  - ya ÜTS'nin önerdiği `Imzaplus` masaüstü akışıyla
  - ya kurumun zaten kullandığı yerel e-imza yazılımıyla
  - ya sonradan yazılabilecek yerel companion app ile

#### Eğer gelecekte "çağrı başına imza" gerçekten gerekiyorsa

O durumda çözüm web uygulaması değil, yerel agent olur:

- macOS/Windows'ta çalışan küçük bir signer helper
- browser ile `localhost` üstünden haberleşme
- hash yerelde üretilir / imzalanır
- private key hiçbir zaman backend'e gitmez

Bugün itibarıyla elimizdeki resmi veriler, böyle bir zorunluluğu doğrulamıyor.

## x-ear İçin Önerilen Mimari

## 1. Domain modeli

Önce x-ear içinde gerçek UTS domain modeli açılmalı.

Önerilen tablolar:

- `uts_accounts`
  - `tenant_id`
  - `environment` (`test` / `prod`)
  - `institution_name`
  - `uts_username` veya resmi sistem kullanıcı kodu
  - `auth_mode`
  - `api_base_url`
  - `token_secret_ref`
  - `allowed_ip_note`
  - `status`
  - `last_verified_at`

- `uts_device_mappings`
  - local product / stock / serial ile UTS ürün kimlik eşlemesi
  - `gtin`
  - `udi_di`
  - `device_identifier_type`
  - `brand`
  - `model`
  - `catalog_no`
  - `serial_required`

- `uts_notifications`
  - `tenant_id`
  - `party_id`
  - `sale_id`
  - `delivery_id`
  - `movement_type`
  - `request_payload`
  - `request_hash`
  - `uts_reference_no`
  - `status`
  - `error_code`
  - `error_message`
  - `sent_at`
  - `completed_at`

- `uts_notification_items`
  - her seri / barkod / kalem

- `uts_sync_logs`
  - audit + teknik debug için

## 2. Entegrasyon katmanları

Backend içinde önerilen modüler yapı:

- `services/uts/client.py`
  - ham HTTP / SOAP istemcisi
- `services/uts/auth.py`
  - token alma / refresh / header yönetimi
- `services/uts/mappers.py`
  - x-ear -> UTS payload dönüşümü
- `services/uts/notifications.py`
  - alma / verme / iptal / sorgu use-case'leri
- `services/uts/reconciliation.py`
  - durum sorgusu ve mutabakat

## 3. UI akışı

UI doğrudan "ham web servis ekranı" olmamalı.

İhtiyaç duyulan ekranlar:

- UTS Ayarları
  - test/prod
  - sistem kullanıcı bilgisi
  - token durumu
  - son doğrulama zamanı
- UTS Eşleme Merkezi
  - ürün -> GTIN / UDI / katalog / seri gerekliliği eşlemesi
- UTS Bildirim Kuyruğu
  - bekliyor
  - gönderildi
  - hata aldı
  - tekrar dene
- UTS Hareket Detayı
  - gönderilen payload özeti
  - dönen referans / hata kodu

## Alma / Verme Bildirimleri Nasıl Handle Edilmeli

## Temel ilke

UTS hareketleri "ekrandan butona basınca anlık gitsin" mantığıyla değil, outbox/job mantığıyla yürümeli.

Sebep:

- UTS servisleri dış sistem
- timeout / geçici hata olabilir
- bir satış kaydı business olarak tamamlanmış olsa da UTS bildirimi başarısız olabilir
- kullanıcı aynı işlemi iki kez basabilir

## Önerilen akış

### Verme bildirimi

Örnek olay:

- hasta adına bir cihaz teslim edildi
- x-ear içinde satış / teslim / uygulama tamamlandı

Akış:

1. x-ear satış kaydı tamamlanır.
2. Sistem ilgili kalemlerden UTS kapsamına girenleri seçer.
3. Her kalem için gerekli UTS alanları kontrol edilir:
   - GTIN / ürün kodu
   - seri / lot / barkod
   - miktar
   - alıcı tipi
   - hareket tarihi
4. Geçen kayıtlar için `uts_notifications` outbox kaydı açılır.
5. Worker ilgili hareketi UTS'ye gönderir.
6. Sonuç:
   - başarılıysa `completed`
   - geçici hataysa `retryable_error`
   - veri hatasıysa `business_error`
7. UI kullanıcıya "satış tamamlandı, UTS bildirimi sırada" veya "UTS hatalı" bilgisini ayrı gösterir.

### Alma bildirimi

Örnek olay:

- tedarikçiden cihaz giriş yaptı
- depoya alındı

Akış benzer:

1. mal kabul / stok girişi oluşur
2. UTS kapsamına giren kalemler ayrıştırılır
3. gerekiyorsa seri bazında kayıt hazırlanır
4. outbox kaydı oluşturulur
5. worker bildirimi yapar

### İptal / düzeltme

Kesin gerekecek.

İhtiyaçlar:

- yanlış satış / yanlış seri bildirimi
- iade
- teslim iptali
- hareket geri alma

Bu yüzden her hareket için:

- local idempotency key
- UTS referans no
- varsa önceki harekete link

tutulmalı.

## Hareketleri senkron değil asenkron yönetme gerekçesi

- kullanıcı deneyimi bozulmaz
- dış sistem kesilse de iş kaybı olmaz
- retry politikası uygulanır
- audit izi tutulur

## Hata Yönetimi

Hatalar en az 3 sınıfta ayrılmalı:

### 1. Kullanıcı/veri hatası

Örnek:

- seri no eksik
- ürün eşlenmemiş
- GTIN yanlış
- hasta / kurum tipi eksik

Bunlar için:

- retry yapılmaz
- kullanıcıdan veri düzeltmesi istenir

### 2. Geçici sistem hatası

Örnek:

- timeout
- 5xx
- bağlantı kesintisi

Bunlar için:

- exponential backoff
- max retry
- sonrasında manual retry

### 3. Mutabakat hatası

Örnek:

- local başarılı görünüyor ama UTS durum sorgusunda kayıt bulunamıyor
- duplicate hareket döndü

Bunlar için:

- ayrı reconciliation job
- manuel inceleme ekranı

## Güvenlik

UTS entegrasyonunda en kritik güvenlik noktaları:

- token veya resmi entegrasyon secret'ı DB içinde plain text tutulmamalı
- secret manager veya en azından uygulama seviyesinde encryption kullanılmalı
- tüm hareket payload'ları audit için saklanmalı ama hassas kimlik verileri maskelenmeli
- imza private key veya kullanıcı sertifikası backend'e yükletilmemeli

## Implementasyon İçin Önerilen Fazlar

## Faz 1: Hazırlık

- local mock UTS modülünü "gerçek entegrasyon omurgası" haline getir
- DB tablolarını ekle
- UTS settings UI ekle
- ürün eşleme ekranı ekle
- outbox/job altyapısını kur

## Faz 2: Read-only entegrasyon

- resmi auth yöntemi ile bağlan
- basit doğrulama / ping / sorgu servisleri
- ürün veya hareket sorgulama
- hata kodu mapping

Bu faz, auth ve network modelini doğrulamak için kritik.

## Faz 3: Alma / verme bildirimi

- önce tek hareket tipi
- sonra seri bazlı çoklu kalem
- sonra iptal / düzeltme

## Faz 4: Operasyonel sertleştirme

- retry politikası
- manuel retry ekranı
- reconciliation
- raporlama

## Neden Hemen Implementasyona Başlamadım

Şu anda aşağıdaki kritik bilgiler eksik:

- resmi test kullanıcıları
- tenant bazında sistem kullanıcısı üretim adımı
- auth header formatı
- token yaşam süresi
- gerçek request / response örnekleri
- alma/verme payload alanlarının tam listesi
- seri / lot / paket hareket varyantları

Bu bilgiler olmadan kod yazmak:

- çok yüksek oranda yeniden yazım gerektirir
- yanlış auth modeli kurdurabilir
- e-imza ile token akışını karıştırabilir

Bu yüzden şu aşamada implementasyona başlamadım.

## Sorular / Netleştirilmesi Gerekenler

Bu maddeler çözülürse implementasyona güvenli şekilde geçilebilir:

1. ÜTS web servis auth modeli kesin olarak nedir?
   - bearer token mı
   - basic auth mı
   - header'da kurum kodu + token mı
   - SOAP header mı

2. Sistem kullanıcısı açma ve entegrasyon token üretme akışı nedir?
   - hangi rol gerekir
   - her tenant için ayrı mı
   - test/prod ayrı mı

3. IP whitelist zorunlu mu?
   - zorunluysa sabit outbound IP gerekecek

4. Alma ve verme bildiriminde x-ear'in kullandığı ürün türleri için hangi alanlar zorunlu?
   - GTIN
   - seri no
   - lot no
   - UDI-DI
   - alıcı tipi
   - doktor / kurum / hasta ayrımı

5. Hasta bazlı teslimlerde UTS tarafında alıcı modeli nasıl temsil ediliyor?
   - hasta TCKN mi
   - kurum + hasta ilişkisi mi
   - son kullanıcı / vatandaş hareketi ayrı mı

6. E-imza bizim hedef akışımızda gerçekten gerekli mi?
   - sadece belge başvurusu için mi
   - hareket API'leri için gerekmiyor mu

7. Eğer belge başvurusu da yapacaksak:
   - `Imzaplus` ile nasıl entegre olacağız
   - kullanıcı dosyayı manuel mi imzalayacak
   - local companion app gerekir mi

8. UTS resmi test kurumu ve test verisi sağlıyor mu?
   - örnek ürün
   - örnek seri
   - örnek alıcı

## x-ear Tarafında Başlanabilecek Hazırlıklar

Resmi credential beklerken bile boş durmak gerekmiyor. Şunlar başlanabilir:

- mock UTS modülünü gerçek domain modeline taşımak
- UTS settings tabloları ve ekranı
- ürün eşleme modeli
- outbox/job tabanlı bildirim altyapısı
- hareket statü state machine
- hata ekranı ve retry UX

Bu kısım, resmi endpointler geldiğinde yeniden atılmayacak iştir.

## Önerilen Sonraki Adım

En verimli sonraki adım:

1. ÜTS test hesabı ve resmi entegrasyon dokümanının login sonrası bölümleri temin edilsin.
2. Özellikle şu ekranlardan ekran görüntüsü veya erişim verilsin:
   - sistem kullanıcısı tanımlama
   - token üretimi
   - web servis erişim ayarları
   - IP tanımı varsa onun ekranı
3. Sonrasında ben şu işleri direkt başlatayım:
   - gerçek `uts_accounts` veri modeli
   - backend UTS adapter iskeleti
   - outbox + retry
   - ayarlar ekranı
   - ilk read-only bağlantı testi

## Kaynaklar

- UTS ana portal: https://uts.saglik.gov.tr/
- UTS gerçek ortam: https://utsuygulama.saglik.gov.tr/UTS/#/giris
- UTS test ortamı: https://utstest.saglik.gov.tr/UTS/
- UTS kullanıcı kılavuzu PDF: https://uts.saglik.gov.tr/wp-content/uploads/2017/UTS-PRJ-KullaniciKilavuzu-Uygulama.pdf
- UTS web servis tanımları PDF: https://uts.saglik.gov.tr/wp-content/uploads/UTS-PRJ-TakipVeIzlemeWebServisTanimlariDokumani180709.pdf
- Web servis dokümanı duyurusu: https://uts.saglik.gov.tr/?p=3130
- SAN/OFF geçiş duyurusu: https://uts.saglik.gov.tr/?p=3350
- E-imza belge başvuru duyurusu: https://uts.saglik.gov.tr/?p=3425
- Eğitim kılavuzları: https://uts.saglik.gov.tr/?page_id=1019
- E-imza uygulaması kurulumu: https://uts.saglik.gov.tr/?page_id=2164

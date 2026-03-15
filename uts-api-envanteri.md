# UTS API Envanteri

Bu dosya resmi UTS web servis dokümanı, resmi kullanıcı/firma kılavuzu, canlı `utsToken` probe testleri ve UTS frontend bundle'ında görülen servis adlarının birleştirilmiş çalışma notudur.

Amaç:
- x-ear içinde gerçekten hangi UTS servislerini kullanacağımızı netleştirmek
- her endpoint'in ne işe yaradığını yazmak
- "canlıda doğrulandı mı / sadece dokümanda-bundle'da mı görüldü" ayrımını açık bırakmak

Tarih: `14 Mart 2026`

## Kaynaklar

- Resmi web servis dokümanı:
  - `https://uts.saglik.gov.tr/wp-content/uploads/UTS-PRJ-TakipVeIzlemeWebServisTanimlariDokumani.pdf`
- Resmi kullanıcı/firma kılavuzu:
  - `https://uts.saglik.gov.tr/wp-content/uploads/2021/UTS-KullaniciVeFirmaIslemleriYardimKilavuzu19022021.pdf`
- Test ortamı:
  - `https://utstest.saglik.gov.tr/UTS/`
- Canlı ortam:
  - `https://utsuygulama.saglik.gov.tr/UTS/`

## Durum Etiketleri

- `CANLI DOGRULANDI`: gerçek token ile HTTP çağrısı yapıldı, auth ve endpoint davranışı görüldü
- `KISMEN DOGRULANDI`: endpoint davranışı görüldü ama business başarı için gerçek test data gerekir
- `BUNDLE'DA GORULDU`: UTS frontend bundle'ında servis adı var ama sistem token ile stabil HTTP yolu doğrulanamadı

## x-ear'da Kullanacağımız Ana Servisler

### 1. Verme bildirimi oluştur

- Endpoint:
  - `/uh/rest/bildirim/verme/ekle`
- Durum:
  - `CANLI DOGRULANDI`
- Amaç:
  - Kurumumuz üzerindeki bir tekil ürünü başka kuruma verme hareketi oluşturur.
- x-ear akışı:
  - `UTS > Ustemdeki Cihazlar`
  - seri no satırında `Verme Bildir`
  - seri bazlı sahiplik durumunu `owned -> not_owned` çevirir
- Gerekli temel alanlar:
  - `UNO` ürün numarası
  - `SNO` seri numarası veya `LNO + ADT`
  - `KUN` hedef kurum no
  - `BNO` belge no
- Not:
  - business success için gerçek kurum no ve ürün kaydı gerekir

### 2. Verme bildirimi iptal

- Endpoint:
  - `/uh/rest/bildirim/verme/iptal`
- Durum:
  - `CANLI DOGRULANDI`
- Amaç:
  - Yanlış yapılmış verme bildirimini geri alır.
- x-ear akışı:
  - hareket detayı / UTS durum modalı
  - yanlış verme geri alma
- Gerekli temel alan:
  - `BID` verme bildirim id'si

### 3. Alma bildirimi oluştur

- Endpoint:
  - `/uh/rest/bildirim/alma/ekle`
- Durum:
  - `KISMEN DOGRULANDI`
- Amaç:
  - Daha önce bize verilmiş veya bizim almamız gereken tekil ürün için alma hareketi oluşturur.
- x-ear akışı:
  - `UTS > Alma Bekleyenler`
  - seri no satırında `Al`
  - seri bazlı sahiplik durumunu `pending_receipt -> owned` çevirir
- Gerekli temel alanlar:
  - `UNO`
  - `SNO` veya `LNO + ADT`
  - bazı senaryolarda eşleşen önceki verme kaydı
- Not:
  - canlı testte auth geçti
  - ama önceki uygun hareket yoksa `UTS-H170` dönüyor

### 4. Üretim bildirimi

- Endpoint:
  - `/uh/rest/bildirim/uretim/ekle`
- Durum:
  - `KISMEN DOGRULANDI`
- Amaç:
  - Üretici tarafı ürün üretim bildirimi
- x-ear akışı:
  - ilk fazda kullanılmayacak
- Not:
  - bizim işitme cihazı uygulama merkezi akışımız için çekirdek servis değil
  - auth ve payload validation davranışı görüldü

### 5. Hizmet sunum bildirimi

- Endpoint:
  - `/uh/rest/bildirim/hizmetSunum/ekle`
- Durum:
  - `KISMEN DOGRULANDI`
- Amaç:
  - Ürünün hizmet sunum / kullanım ilişkisinin bildirilmesi
- x-ear akışı:
  - ikinci faz
  - SGK / hasta üstünde cihaz kullanım akışı netleşince bağlanabilir
- Gerekli temel alanlar:
  - doküman ve kurum temelli ek alanlar istiyor

### 6. Tekil ürün sorgulama

- Endpoint:
  - `/uh/rest/tekilUrun/hastaninVucudundanCikarma/tekilUrunBilgileri/sorgula`
- Durum:
  - `KISMEN DOGRULANDI`
- Amaç:
  - ürün numarası + seri/lot ile tekil ürün kaydını sorgular
- x-ear akışı:
  - seri no satırındaki UTS badge
  - UTS durum modalı
- Not:
  - aynı ürün bazı UI ekranlarında görünürken sistem token ile bu endpointte tutarsız davranış görüldü
  - bu yüzden tek başına "kesin sahiplik kaynağı" olarak güvenilmiyor

## x-ear için Nihai Operasyon Haritası

### Faz 1

- `verme/ekle`
- `verme/iptal`
- `alma/ekle`
- lokal seri bazlı UTS state tablosu

### Faz 2

- hizmet sunum
- geçmiş hareket ekranı
- otomatik alma iş akışı
- gelen verme taleplerini otomatik onaylama

### Faz 3

- gerçek sahiplik sorgusu için resmi ve stabil query servisi bulunursa bağlanacak
- kullanıcılar arası x-ear içi UTS bildirim merkezi

## Seri Bazlı Badge Anlamları

- `yesil / Bizde`
  - son başarılı UTS durumu bizim üzerimizde
- `gri / Alma Bekliyor`
  - bize doğru verme görülmüş, alma bekleniyor
- `kirmizi / Bizde Degil`
  - son başarılı verme sonrası sahiplik bizde değil

Bu badge ana ürün kartında değil, seri numarası satırında gösterilmelidir.

## Doküman ve Bundle'da Görülen Ama Henüz Stabil Baglanmayan Servisler

### 1. Authenticated kullanıcı hesabı getir

- Servis adı:
  - `kullaniciHesabi/authenticatedKullaniciHesabiGetir`
- Durum:
  - `BUNDLE'DA GORULDU`
- Amaç:
  - giriş yapan hesabın aktif kullanıcı/firma bağlamını getirme ihtimali yüksek
- Sonuç:
  - sistem token ile stabil HTTP yolu doğrulanamadı

### 2. Authenticated kuruma göre üretim yeri sorgula

- Servis adı:
  - `uretimYeri/sorgulaByAuthenticatedKurum`
- Durum:
  - `BUNDLE'DA GORULDU`
- Amaç:
  - authenticated kurum bağlamındaki üretim yerlerini döndürme ihtimali var
- Sonuç:
  - sistem token ile stabil HTTP yolu doğrulanamadı

### 3. Authenticated kurum no'ya göre aynı vergi no'ya ait kurumları sorgula

- Servis adı:
  - `uhAyniVergiNoyaAitKurumSorgulaByAuthenticatedKurumNo`
- Durum:
  - `BUNDLE'DA GORULDU`
- Amaç:
  - aynı VKN altındaki kurum/firma kayıtlarını getirme ihtimali var
- Sonuç:
  - bu, bizim otomatik kurum/firma discovery için en değerli adaydı
  - ama canlı token ile stabil HTTP yolu doğrulanamadı

## Bu yüzden x-ear'da ne yapıyoruz

- `firma no` ve `kurum no`yu tenant `company_info` içinden otomatik dolduruyoruz
- kullanıcıyı ilk kurulumda bunları elle girmeye zorlamıyoruz
- ama resmi token discovery doğrulanmadığı için alanları tamamen yok etmiyoruz
- gerektiğinde manuel override açık kalıyor

## Business Alanlar ve x-ear Mapping

### UTS alanı -> x-ear kaynağı

- `UNO`
  - ürün barkodu / ürün numarası / UDI-DI eşlemesi
- `SNO`
  - seri no satırı
- `LNO`
  - lot takipli ürünlerde lot no
- `ADT`
  - lot bazlı miktar
- `KUN`
  - tenant kurum no
- `BNO`
  - x-ear içinde üretilecek belge no / hareket no
- `BID`
  - başarılı UTS response'tan dönen hareket id

## Bugün itibarıyla kesin kararlar

- ilk fazda ana operasyon servisleri:
  - `verme/ekle`
  - `verme/iptal`
  - `alma/ekle`
- UTS sahiplik durumu seri bazlı tutulacak
- ürün seviyesinde genel UTS badge kullanılmayacak
- kurum/firma discovery resmi token endpoint ile doğrulanana kadar tenant metadata fallback kullanılacak

## Açık Sorular

- resmi dokümanda canlı kullanılabilir tam query servis listesi login sonrası ek dökümanda mı veriliyor?
- `tekilUrun` sorgu ailesinde sistem token için önerilen resmi endpoint hangisi?
- `alma bekleyenler` listesini doğrudan çeken bir servis var mı, yoksa hareket sorgu zinciriyle mi kurulacak?
- kurum/firma discovery için login oturumu gerektiren ayrı servis ailesi mi var?

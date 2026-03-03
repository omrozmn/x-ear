# Satış, Finans ve UI Düzeltme Planı

Bu dosya, kullanıcının `console-log.md` üzerinden ilettiği UI/UX ve mantıksal hataların (discrepancy) düzeltilmesi için oluşturulmuştur.

## 1. Satış Geçmişi & Tablo Tutarsızlıkları
- [x] **Bilateral SGK Ödemesi Sorunu:** Satış geçmişi tablosunda ve satış detay/düzenle modalında "bilateral" (çift kulak) satışı olsa bile SGK indirimi tek kulak (örn. 4239.20 TL) olarak görünüyor. `bilateral x2` bilgisi yazılarak ve hesaplamada 2 ile çarpılarak SGK indirimi toplam tutardan düşülmeli.
- [x] **İndirim Tutarı Hesaplaması:** İndirim tutarı (discount) her yerde (satış tablosu, modal) KDV dahil toplam miktardan en son adımda (net ödenecek) düşülecek şekilde düzeltilecek. (Cihaz atama modalındaki mantıkla aynı olacak).

## 2. Atanmış Cihaz (Assigned Device) Kartı & Modalı Entegrasyonu
- [x] **Yeni Satış Sonrası Atama Nedeni (Reason):** Yeni satış menüsünden cihaz satışı yapıldığında otomatik atanan cihazın "Atama Nedeni" (reason) varsayılan olarak "Satış" (Sale) olarak kaydedilmeli. Düzenle butonuna basınca boş/seçilmemiş gelmesi engellenecek.
- [x] **Satış Düzenle Modalından Atama Sebebini Kaldırma:** Satış düzenleme modalı içinde yer alan "Atama Sebebi" (Reason) alanı tamamen kaldırılacak.
- [x] **Rapor ve Teslim Durumu Senkronizasyonu:** Rapor ve Teslim durumları "Cihaz Atama Modalı"nda ve "Atanmış Cihaz Kartlarında" düzgün çalışırken "Satış Geçmişi Tablosundan" açılan "Satış Düzenleme Modalı"nda düzgün görünmüyor. Tüm buralardaki veriler senkronize ve tutarlı olmalı.
- [x] **Kategori İşitme Cihazı ise Seri No Zorunluluğu:** Yeni Satış Modalı ve Satış Düzenleme Modalında, satılan ürünün kategorisi "işitme cihazı" ise cihaz sayısı/kulak durumuna (sağ, sol, bilateral) uygun sayıda (1 veya 2 adet) **Seri No** alanı otomatik açılmalı.
- [x] **Cihaz Atama Modalında Ön Ödeme Alanı:** Cihaz atama kartlarına "Ön Ödeme (Down Payment)" alanı eklenecek.

## 3. Fiyat ve Ödeme Özeti UI / UX Düzenlemeleri
- [x] **KDV Oranı ve KDV Tutarı Konumu:** KDV Oranı ve KDV Tutarı hala notlarda görünüyor. Bunlar en uygun (best practice) şekilde "Fiyat ve Ödeme Özeti" kısmına taşınacak. (Toplam tutarın altına küçük ince yazıyla `KDV Tutarı (%oran)` formatında eklenebilir).
- [x] **Notlar Alanının Konumu:** "Notlar" alanı Satış Bilgileri kartından çıkarılıp "Fiyat ve Ödeme Özeti" altına (en alta) taşınacak.
- [x] **Reaktif Hesaplamalar:** Input (Fiyat, İndirim vb.) değişikliklerinde anında hesaplama (reaktif DOM güncellemesi) yapılmalı.
- [x] **KDV Oranı Değişim Hatası:** Ürün değiştiğinde/seçildiğinde KDV oranı dinamik (reaktif) olarak güncellenmelidir.
- [x] **İndirim Türü Göstergesi:** İndirimin tipi ("%" veya "₺") özet kısmında açıkça gösterilmeli.

## 4. Fatura, Proforma ve Satışlar Sayfası Menü Düzenlemeleri
- [x] **Proforma Eklemesi:** Sol Sidebar'da "Fatura" altına "Proforma" alt menüsü eklenecek.
- [x] **Yeni Proforma Butonu:** İlgili sayfada layout header ve app ile uyumlu "Yeni Proforma" butonu gösterilecek.
- [x] **Gereksiz Butonların Kaldırılması:** "Satışlar" sekmesinden "İade/Değişim" ve "Cihaz Değişimi" butonları tamamen kaldırılacak.
- [x] **Satış İşlemleri Butonu (3 Nokta):** İşlemler butonu belirgin bir "3 nokta (MoreVertical)" ikonuna dönüştürülecek.
- [x] **3 Nokta Menü İçeriği:** İçerisinde SADECE şu seçenekler olacak: `Fatura kes`, `Senetler`, `Satışı iptal et`.
- [x] **Senetler Sekmesine Direkt Geçiş:** 3 Nokta menüsünden "Senetler"e tıklanınca, "Satış Düzenle" modalı direkt olarak "Senetler (Promissory Notes)" sekmesi aktif (seçili) şekilde açılacak.

## 5. Raporlar, Activity Logs ve Kapsamlı Modüller
- [x] **Zaman Çizelgesi ve Activity Logs Eksiksiz Kayıt:** Hastayla ilgili (satış, randevu, fatura vb.) "tüm her türlü işlemlerin" eksiksiz şekilde hem hastanın Zaman Çizelgesine (Timeline) hem de sistemdeki `Activity Logs` ve raporlara ilgili kategorilerde düştüğünden kesinlikle emin olunacak.
- [x] **SGK Ayarları Sayfa Bulunamadı Hatası:** "SGK Ayarları" sayfasına gidince alınan 404/Sayfa Bulunamadı hatası giderilecek.
- [x] **Raporlar Modernizasyon Grafikleri:** Raporlar altındaki her sekmede modern (next gen), işlevsel, basit ve kullanışlı güncel grafikler entegre edilecek. (Çok titiz davranılmalı).

### AI Chat Dosya Yükleme & OCR
- [x] Backend'de OCR (NLP) endpointlerine bağlanacak şekilde `upload` handler yazılacak (Direct file passing with `UploadFile`).
- [x] AI Chat Widget'ında "Dosya Ekle" (Ataş) butonu eklenecek.
- [x] Yüklenen dosya OCR işleminden geçirilip sonucu "okunan içerik" olarak yapay zekaya yönlendirilecek.
- [ ] Gerekirse Backend'deki NLP servisi `process_document` endpointlerinde düzenlemeler yapılacak.(PDF, resim) veya Excel dosyaları OCR / Vision modelleriyle okunacak/tanınacak.
- [ ] **AI Akıllı Onay Sistemi:** AI dosyanın içeriğini işleyip ilgili (toplu veya tekil) işlemi hazırlarsa kullanıcıdan onay isteyecek; anlamazsa "Bu dosyayla ne yapmak istiyorsunuz?" diye soracak.

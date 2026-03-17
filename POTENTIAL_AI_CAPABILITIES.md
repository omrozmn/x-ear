# Tüm X-Ear İşlemlerinin AI Destekli Chatbot'a (Mobile-First CRM) Aktarımı

Kullanıcının sisteme sadece mobil cihazından (veya widget'tan) girerek, hiçbir arayüz ekranı (UI) kullanmadan **tüm CRM süreçlerini** tek bir mesajla yönetebilmesi amacıyla hazırlanmış **Kesin ve Kapsamlı AI Yetenek Listesi** aşağıdadır. 

Bu yapı, kullanıcının "Uygulamayı açmama gerek yok, x-ear bot’a yazmam yeterli" diyebileceği seviyedeki uçtan uca işlemleri kapsar.

---

## 👥 1. Müşteri / Hasta (Party) Tam Bağlam Yönetimi
Bir hastanın içeri girmesinden randevusuna kadar her şeyi sohbetten yapabilme.

*   **Hasta Detaylı Sorgusu & Özet (Timeline dahil)**
    *   *Sistem Karşılığı:* `GET /api/parties/{id}` + `GET /api/timeline/{id}`
    *   *Senaryo:* "Ahmet Yılmaz geldi. Bana adamın tüm geçmişini, aldığı cihazları ve son ödemesini tek cümlede özetle."
*   **Hızlı ve Esnek Kayıt Oluşturma**
    *   *Sistem Karşılığı:* `POST /api/parties`
    *   *Senaryo:* "Yeni hasta: Ayşe Kaya. Telefonu 0532 123 45 67. Kadıköy şubesine kaydet." (AI formu kendi doldurur).
*   **Toplu İşlem (Bulk Operation) Emri**
    *   *Sistem Karşılığı:* `POST /api/parties/bulk-update`
    *   *Senaryo:* "Bugün randevusu olan herkesin durumunu 'Geldi' olarak işaretle."

## 🗓️ 2. Akıllı Randevu Yönetimi (Appointments)
Sadece randevu oluşturmak değil, takvimi bir Asistan gibi okuyabilmek.

*   **Boşluk (Availability) Analizi**
    *   *Sistem Karşılığı:* `GET /api/appointments/availability`
    *   *Senaryo:* "Yarın öğleden sonra en erken boş saatimiz kaç? Oraya Mehmet Beye 30 dakikalık kontrol randevusu yaz."
*   **Günün Takvimi (Briefing)**
    *   *Sistem Karşılığı:* `GET /api/appointments` (Tarih filtreli)
    *   *Senaryo:* "Bugün kimler gelecek? Önemli bir hasta var mı?"
*   **Hızlı Randevu Kaydırma / İptal**
    *   *Sistem Karşılığı:* `POST /api/appointments/{id}/reschedule`
    *   *Senaryo:* "Saat 14:00'teki randevuyu iptal et ve hastaya SMS atarak durumu bildir."

## 🦻 3. Mobil Stok ve Envanter Yönetimi (Inventory & Devices)
Depoya (veya Excel'e) bakmadan stok sayımı ve ataması.

*   **Kritik Stok Uyarısı ve Sorgulama**
    *   *Sistem Karşılığı:* `GET /api/inventory/low-stock` + `GET /api/inventory/advanced-search`
    *   *Senaryo:* "Elimizde hiç Phonak Audeo L90 sağ kulaklık kaldı mı? Yoksa tedarikçiden sipariş geçmemi hatırlat."
*   **Anında Cihaz Ataması ve Satışa Çevirme**
    *   *Sistem Karşılığı:* `POST /api/devices/{id}/assign` + `POST /api/sales`
    *   *Senaryo:* "Az önce Ahmet Beye denettiğimiz o son Audeo L90 cihazını onun üzerine ata ve satış kaydını 50.000 TL olarak aç."
*   **Tedarikçi (Supplier) Hızlı Eşleme**
    *   *Sistem Karşılığı:* `POST /api/inventory/bulk-upload` mantığında seri numarası işleme
    *   *Senaryo:* "Yeni gelen 5 tane cihazın seri numaralarını [fotoğrafını çektim/okuttum], bunları doğrudan stoklara ekle."

## 💰 4. Finans, Kasa ve Faturalama (Invoices & Cash Records)
Muhasebe programı (veya BirFatura ekranı) açmadan tüm parasal işlemler.

*   **Günün / Ayın Z-Raporu (Bilanço)**
    *   *Sistem Karşılığı:* `GET /api/unified-cash/` + `GET /api/dashboard/kpis`
    *   *Senaryo:* "Bugünkü net ciromuz ne kadar? Nakit ve Kredi kartı dağılımını söyle."
*   **Hızlı e-Fatura (GİB) Kesimi**
    *   *Sistem Karşılığı:* `POST /api/invoices/generate` + `POST /api/invoices/{id}/send-to-gib`
    *   *Senaryo:* "Ahmet Beyin az önce aldığımız 50.000 TL'lik satışının e-faturasını kes ve doğrudan GİB'e yolla."
*   **Kasa Çıkışı (Masraf) İşleme**
    *   *Sistem Karşılığı:* `POST /api/cash-records`
    *   *Senaryo:* "Kasadan 2000 TL market masrafı çıktı yap."
*   **Açık Hesap (Borç/Alacak) Sorgulama**
    *   *Sistem Karşılığı:* `GET /api/parties/{id}/invoices` (Status=Unpaid)
    *   *Senaryo:* "Mehmet Beyin bize hala borcu var mı? Varsa ne kadar?"

## 🏛️ 5. Resmi İşlemler (SGK)
E-devlete veya SGK Medula sistemine girmeden iş çözme.

*   **e-Reçete Tespiti ve SGK Provizyon**
    *   *Sistem Karşılığı:* `POST /api/sgk/query-e-receipt` + `POST /api/sgk/query-patient-rights`
    *   *Senaryo:* "TC 12345678910 olan hastanın e-reçetesi sisteme düşmüş mü? Hakkı var mı SGK ödemesinden faydalandır."

## 🚀 6. Yönetim ve B2B (Admin, Dashboards, Commissions)
Patron / Şube Yöneticisi yetenekleri.

*   **Bayi/Hekim Hak Edişleri (Commissions)**
    *   *Sistem Karşılığı:* `GET /api/commissions`
    *   *Senaryo:* "Bu ay Dr. Ayşe Hanım'ın yazdırdığı cihazlardan elde ettiği komisyon toplamını hesapla."
*   **Mobil Şube Analizi**
    *   *Sistem Karşılığı:* `GET /api/dashboard/patient-distribution`
    *   *Senaryo:* "En çok ciro yapan şubemiz hangisi? Bu hafta hangi personel satış hedefini aştı?"
*   **Dahili Görev ve Ticket Atama**
    *   *Sistem Karşılığı:* `POST /api/admin/tickets` (veya Notifications)
    *   *Senaryo:* "Ahmete mesaj at: Öğleden sonraki randevulara o baksın."

---

### Mimarideki Avantaj (Neden Bunlar Hemen Yapılabilir?)
1.  **Endpoint'ler Hazır:** Bu listedeki tüm senaryoların arka plandaki API kodu (`routers/`) halihazırda sorunsuz çalışıyor.
2.  **Phase A-B-C Uyumluluğu:** Chatbotunuzda zaten Phase C (Otonom) veya Action-Approver mimarisi var. Fatura kesmek veya nakit girmek gibi riskli işlemleri AI önce size sorar *(örn: "50 bin TL'lik faturayı Ahmet Beye GİB üzerinden kesiyorum, onaylıyor musun?")*. Onayladığınız an mobilden işlem biter.

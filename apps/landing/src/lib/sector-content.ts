import type { SectorId } from "./sector-store";
import type { Locale } from "./i18n";

// ─── Types ───────────────────────────────────────────────
type L = Record<Locale, string>;

export interface SectorPainPoint {
  id: string;
  title: L;
  desc: L;
  iconKey: "receipt" | "frown" | "clock";
}

export interface SectorFeature {
  key: string;
  iconKey: "users" | "ear" | "shield" | "message" | "archive" | "chart";
  title: L;
  desc: L;
}

export interface SectorDemoScenario {
  id: string;
  title: L;
  messages: { role: "user" | "ai"; sublabel: L; content: L }[];
  thoughts: L[];
  slotFilling: { prompt: L; options: L[]; results: L[] };
}

export interface SectorHero {
  badge: L;
  h1_1: L;
  h1_2: L;
  desc: L;
}

export interface SectorContent {
  hero: SectorHero;
  painBadge: L;
  painH2_1: L;
  painH2_2: L;
  painPoints: SectorPainPoint[];
  features: SectorFeature[];
  demoScenarios: SectorDemoScenario[];
}

// ─── Hearing ─────────────────────────────────────────────
const hearing: SectorContent = {
  hero: {
    badge: { tr: "X-EAR v2.0 — İşitme Merkezleri", en: "X-EAR v2.0 — Hearing Centers" },
    h1_1: { tr: "İşitme Merkezinizi", en: "Grow Your Hearing" },
    h1_2: { tr: "Yapay Zeka ile Büyütün", en: "Center with AI" },
    desc: {
      tr: "NOAH, SGK Medula ve UTS entegrasyonlu, yapay zeka destekli tam donanımlı işitme merkezi yönetimi.",
      en: "Full-featured hearing center management with NOAH, SGK Medula, and UTS integration, powered by AI.",
    },
  },
  painBadge: { tr: "Sektörün Gerçekleri", en: "Industry Realities" },
  painH2_1: { tr: "Klasik Yazılımlar Sizi", en: "Traditional Software Is" },
  painH2_2: { tr: "Yavaşlatıyor", en: "Slowing You Down" },
  painPoints: [
    {
      id: "sgk",
      iconKey: "receipt",
      title: { tr: "SGK Kesintileri ve Redler", en: "Insurance Rejections & Deductions" },
      desc: {
        tr: "Eksik evrak veya hatalı kod yüzünden Medula'dan dönen faturalar. Her ay kaybedilen binlerce lira ve günlerce süren düzeltme trafiği.",
        en: "Rejected invoices from incomplete documents or incorrect codes. Thousands lost each month and days spent on corrections.",
      },
    },
    {
      id: "patient",
      iconKey: "frown",
      title: { tr: "Kaçan Hastalar", en: "Lost Patients" },
      desc: {
        tr: "Pil bitimi veya cihaz bakımı gelen hastayı unutmak. Rakiplerinize kaptırdığınız, aslında sadık olması gereken yüzlerce hasta kaydı.",
        en: "Forgetting patients due for battery replacement or device maintenance. Hundreds of loyal patients lost to competitors.",
      },
    },
    {
      id: "time",
      iconKey: "clock",
      title: { tr: "Manuel Veri Hamallığı", en: "Manual Data Entry" },
      desc: {
        tr: "Odyogramları elle girmek, WhatsApp'tan stok sormak, Excel'de cari tutmak. Uzmanlığınıza ayırmanız gereken vaktin evrak işlerine gitmesi.",
        en: "Manually entering audiograms, checking stock via WhatsApp, tracking accounts in Excel. Time that should go to your expertise wasted on paperwork.",
      },
    },
  ],
  features: [
    {
      key: "patient", iconKey: "users",
      title: { tr: "Kapsamlı Hasta Yönetimi", en: "Comprehensive Patient Management" },
      desc: { tr: "Tüm hasta bilgilerini, randevularınızı ve geçmiş işlemlerinizi tek bir yerden kolayca yönetin.", en: "Easily manage all patient records, appointments, and past transactions from one place." },
    },
    {
      key: "device", iconKey: "ear",
      title: { tr: "Cihaz Takibi ve Denemeler", en: "Device Tracking & Trials" },
      desc: { tr: "Stoktaki cihazları, hastaların deneme süreçlerini ve cihaz iadelerini kolayca takip edin.", en: "Track inventory devices, patient trial periods, and device returns with ease." },
    },
    {
      key: "crm", iconKey: "shield",
      title: { tr: "Otopilot CRM & Hatırlatıcı", en: "Autopilot CRM & Reminders" },
      desc: { tr: "Zamanı gelmiş bakımları, filtre değişimlerini ve kontrolleri yapay zeka ile otomatik takip edin.", en: "Automatically track due maintenance, filter changes, and check-ups with AI." },
    },
    {
      key: "sms", iconKey: "message",
      title: { tr: "Akıllı SMS Kampanyaları", en: "Smart SMS Campaigns" },
      desc: { tr: "Doğum günü kutlamaları, randevu hatırlatmaları ve özel kampanyalar için otomatik SMS gönderin.", en: "Send automated SMS for birthday greetings, appointment reminders, and special campaigns." },
    },
    {
      key: "inventory", iconKey: "archive",
      title: { tr: "Hassas Envanter Kontrolü", en: "Precise Inventory Control" },
      desc: { tr: "Stok seviyelerinizi anlık olarak izleyin, kritik stok uyarıları alın ve tedarik süreçlerinizi optimize edin.", en: "Monitor stock levels in real-time, receive critical stock alerts, and optimize your supply chain." },
    },
    {
      key: "ai", iconKey: "chart",
      title: { tr: "Yapay Zeka Destekli Analiz", en: "AI-Powered Analytics" },
      desc: { tr: "Satış ve hasta verileri üzerine kurulu derin analizlerle kliniğinizin geleceğini öngörün.", en: "Predict your clinic's future with deep analytics built on sales and patient data." },
    },
  ],
  demoScenarios: [
    {
      id: "mass_sms",
      title: { tr: "Toplu SMS Otopilotu", en: "Bulk SMS Autopilot" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Şu an cihaz denemesinde olan ve 7 gününü doldurmuş hastalara memnuniyet SMS'i gönderelim.", en: "Let's send a satisfaction SMS to patients who have been on device trial for 7 days." } }],
      thoughts: [
        { tr: "niyet analizi: toplu_sms_kampanyası", en: "analyzing intent: bulk_sms_campaign" },
        { tr: "db sorgusu: hastalar WHERE durum='deneme' AND gün >= 7", en: "querying db: patients WHERE status='trial' AND days >= 7" },
        { tr: "sonuçlar ayrıştırılıyor... 43 eşleşme bulundu", en: "parsing results... found 43 matches" },
        { tr: "yüksek dönüşümlü SMS şablonu oluşturuluyor", en: "generating high-conversion SMS template" },
        { tr: "derleme tamamlandı. işleme hazır.", en: "compilation finished. ready for action." },
      ],
      slotFilling: {
        prompt: { tr: "Kriterlere uyan 43 hasta bulundu. Örnek mesaj: 'X-EAR kliniğimizden denediğiniz cihazla ilgili deneyiminizi merak ediyoruz.' Gönderimi başlatayım mı?", en: "43 patients match the criteria. Sample message: 'We'd love to hear about your experience with the device from our X-EAR clinic.' Shall I start sending?" },
        options: [{ tr: "Evet, gönder", en: "Yes, send" }, { tr: "Taslak kaydet", en: "Save draft" }],
        results: [{ tr: "İşlem onaylandı. 43 hastaya SMS gönderimi başlatıldı.", en: "Confirmed. SMS delivery to 43 patients started." }, { tr: "Taslak kaydedildi. Dilediğiniz zaman gönderebilirsiniz.", en: "Draft saved. You can send anytime." }],
      },
    },
    {
      id: "sgk_invoice",
      title: { tr: "SGK Otopilot", en: "Insurance Autopilot" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Önerisi", en: "System Suggestion" }, content: { tr: "Bugün 12 adet kuruma fatura edilecek yeni satış tespit ettim. SGK Medula sistemine toplu bildirim yapıp icmal sürecini başlatayım mı?", en: "I've detected 12 new sales to invoice to institutions today. Shall I batch notify the insurance system and start the reconciliation process?" } }],
      thoughts: [
        { tr: "satışlar taranıyor: tür='SGK' AND durum='faturasız'", en: "scanning sales: type='SGK' AND status='uninvoiced'" },
        { tr: "evrak no ve icd10 kodları Medula API ile doğrulanıyor...", en: "validating document no & icd10 codes via Medula API..." },
        { tr: "12 kayıt doğrulandı. 0 hata tespit edildi.", en: "12 records validated. 0 errors detected." },
        { tr: "e-Arşiv entegrasyonu için XML hazırlanıyor", en: "preparing XML payloads for e-Archive integration" },
        { tr: "fatura taslakları oluşturuluyor...", en: "creating invoice drafts..." },
      ],
      slotFilling: {
        prompt: { tr: "Faturalar e-imza ile mühürlenmek üzere hazır. Nasıl devam edelim?", en: "Invoices are ready to be sealed with e-signature. How shall we proceed?" },
        options: [{ tr: "Onayla ve Gönder", en: "Approve & Send" }, { tr: "Taslaklara Kaydet", en: "Save as Drafts" }],
        results: [{ tr: "12 adet SGK faturası e-imza ile mühürlenip GİB sistemine başarıyla iletildi.", en: "12 insurance invoices sealed with e-signature and successfully submitted." }, { tr: "12 adet fatura taslak olarak kaydedildi.", en: "12 invoices saved as drafts." }],
      },
    },
    {
      id: "uninvoiced",
      title: { tr: "Finans & Kontrol", en: "Finance & Control" },
      messages: [{ role: "user", sublabel: { tr: "Sorgu", en: "Query" }, content: { tr: "Bu ay içinde cihazı teslim edilmiş ama henüz faturası kesilmemiş olan tüm satışları listele.", en: "List all sales this month where the device was delivered but not yet invoiced." } }],
      thoughts: [
        { tr: "niyet analizi: faturasız_satış_arama", en: "analyzing intent: search_uninvoiced_sales" },
        { tr: "db sorgusu: satışlar WHERE teslimat='tamam' AND fatura='yok'", en: "querying db: sales WHERE delivery='completed' AND invoice='none'" },
        { tr: "toplam hesaplanıyor... (215.000 TRY)", en: "calculating totals... (215,000 TRY)" },
        { tr: "müşteri VKN/TCKN verileri getiriliyor...", en: "fetching customer tax ID data..." },
        { tr: "sonuçlar tablo formatına dönüştürülüyor", en: "packaging results into table format" },
      ],
      slotFilling: {
        prompt: { tr: "8 adet faturasız işlem tespit ettim (215.000 ₺). Ne yapalım?", en: "Found 8 uninvoiced transactions (₺215,000). What shall we do?" },
        options: [{ tr: "Faturaları Kes", en: "Generate Invoices" }, { tr: "Excel İndir", en: "Download Excel" }],
        results: [{ tr: "8 adet faturasız işlem için e-Fatura oluşturma başlatıldı.", en: "e-Invoice generation started for 8 transactions." }, { tr: "Rapor Excel formatında indiriliyor.", en: "Report downloading in Excel format." }],
      },
    },
    {
      id: "ocr",
      title: { tr: "Akıllı Cüzdan (OCR)", en: "Smart Wallet (OCR)" },
      messages: [{ role: "user", sublabel: { tr: "Belge Yüklemesi", en: "Document Upload" }, content: { tr: "[ 📎 fatura_img_010.jpg ] Şu faturayı sisteme masraf olarak kaydet.", en: "[ 📎 invoice_img_010.jpg ] Save this invoice as an expense in the system." } }],
      thoughts: [
        { tr: "görüntü yüklemesi işleniyor...", en: "processing image upload..." },
        { tr: "Vision OCR algoritması çalıştırılıyor", en: "executing Vision OCR algorithm" },
        { tr: "varlıklar çıkarılıyor: VKN, Tutar, Tarih, Ünvan", en: "extracting entities: Tax ID, Amount, Date, Company" },
        { tr: "veri çıkarıldı: Widex A.Ş., 45.000 TRY", en: "data extracted: Widex Ltd., 45,000 TRY" },
        { tr: "tedarikçi sorgulanıyor -> BULUNAMADI", en: "querying suppliers -> NOT FOUND" },
        { tr: "yeni_tedarikçi_iş_akışı tetikleniyor", en: "triggering new_supplier_workflow" },
      ],
      slotFilling: {
        prompt: { tr: "Belge 'Widex A.Ş.' firmasına ait (45.000 ₺). Sistemde bu tedarikçi yok. Ekleyip faturayı işleyeyim mi?", en: "Document belongs to 'Widex Ltd.' (₺45,000). Supplier not registered. Shall I add and process?" },
        options: [{ tr: "Kaydet ve İşle", en: "Save & Process" }, { tr: "Sadece Oku", en: "Read Only" }],
        results: [{ tr: "Widex A.Ş. sisteme kaydedildi ve fatura masraf olarak işlendi.", en: "Widex Ltd. registered and invoice processed as expense." }, { tr: "Fatura verileri serbest masraf olarak kaydedildi.", en: "Invoice data saved as standalone expense." }],
      },
    },
  ],
};

// ─── Pharmacy ────────────────────────────────────────────
const pharmacy: SectorContent = {
  hero: {
    badge: { tr: "X-EAR v2.0 — Eczaneler", en: "X-EAR v2.0 — Pharmacies" },
    h1_1: { tr: "Eczanenizi", en: "Grow Your Pharmacy" },
    h1_2: { tr: "Yapay Zeka ile Büyütün", en: "with AI" },
    desc: {
      tr: "Stok yönetimi, reçete takibi ve müşteri ilişkilerini tek platformda akıllıca yönetin.",
      en: "Manage inventory, prescriptions, and customer relations smartly on one platform.",
    },
  },
  painBadge: { tr: "Eczane Gerçekleri", en: "Pharmacy Realities" },
  painH2_1: { tr: "Manuel Süreçler", en: "Manual Processes Are" },
  painH2_2: { tr: "Sizi Geri Tutuyor", en: "Holding You Back" },
  painPoints: [
    {
      id: "expiry", iconKey: "receipt",
      title: { tr: "Miad Takibi Kabusu", en: "Expiry Date Nightmare" },
      desc: { tr: "Miyadı yaklaşan ilaçları zamanında tespit edememek. Raflarda beklediğini fark etmeden son kullanma tarihi geçen ürünler ve kayıp ciro.", en: "Failing to catch expiring medications in time. Products sitting on shelves past their expiry date and lost revenue." },
    },
    {
      id: "stock", iconKey: "frown",
      title: { tr: "Stok Dengesizliği", en: "Stock Imbalance" },
      desc: { tr: "Talebi yüksek ürünlerin bitmesi, az satanların rafta kalması. Manuel sayım ve Excel'le stok takibi artık sürdürülemez.", en: "Running out of high-demand products while slow-movers sit on shelves. Manual counting and Excel tracking are no longer sustainable." },
    },
    {
      id: "retention", iconKey: "clock",
      title: { tr: "Müşteri Takibi Eksikliği", en: "Poor Customer Follow-Up" },
      desc: { tr: "Kronik ilaç kullanan müşterilere hatırlatma yapılamaması. Reçete yenileme zamanını kaçıran müşteriler rakibe gidiyor.", en: "Not reminding chronic medication customers. Those who miss prescription renewal go to competitors." },
    },
  ],
  features: [
    { key: "customer", iconKey: "users", title: { tr: "Müşteri Yönetimi", en: "Customer Management" }, desc: { tr: "Müşteri profilleri, ilaç geçmişi ve iletişim bilgilerini tek panelden yönetin.", en: "Manage customer profiles, medication history, and contacts from one panel." } },
    { key: "prescription", iconKey: "ear", title: { tr: "Reçete Takibi", en: "Prescription Tracking" }, desc: { tr: "Reçete yenileme tarihlerini takip edin, otomatik hatırlatmalar gönderin.", en: "Track prescription renewal dates, send automated reminders." } },
    { key: "crm", iconKey: "shield", title: { tr: "Otopilot CRM", en: "Autopilot CRM" }, desc: { tr: "Kronik müşterilere otomatik hatırlatma, kampanya ve sadakat programı yönetimi.", en: "Automatic reminders for chronic customers, campaign, and loyalty program management." } },
    { key: "sms", iconKey: "message", title: { tr: "SMS & WhatsApp", en: "SMS & WhatsApp" }, desc: { tr: "Stok geldi bildirimleri, kampanya duyuruları ve reçete hatırlatmaları.", en: "Stock arrival notifications, campaign announcements, and prescription reminders." } },
    { key: "inventory", iconKey: "archive", title: { tr: "Akıllı Stok Yönetimi", en: "Smart Inventory" }, desc: { tr: "Otomatik miad takibi, kritik stok uyarıları ve tedarikçi sipariş önerileri.", en: "Automated expiry tracking, critical stock alerts, and supplier order suggestions." } },
    { key: "ai", iconKey: "chart", title: { tr: "Satış Analitiği", en: "Sales Analytics" }, desc: { tr: "En çok satan ürünler, mevsimsel trendler ve karlılık analizleri.", en: "Best sellers, seasonal trends, and profitability analytics." } },
  ],
  demoScenarios: [
    {
      id: "expiry_alert", title: { tr: "Miad Otopilotu", en: "Expiry Autopilot" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Uyarısı", en: "System Alert" }, content: { tr: "Önümüzdeki 30 gün içinde miadı dolacak 28 ürün tespit ettim. Tedarikçiye iade veya promosyon kampanyası başlatayım mı?", en: "I've detected 28 products expiring within 30 days. Shall I initiate supplier return or promotion campaign?" } }],
      thoughts: [
        { tr: "stok taranıyor: miad < 30 gün", en: "scanning stock: expiry < 30 days" },
        { tr: "28 ürün tespit edildi, toplam değer: 12.500 TRY", en: "28 products found, total value: 12,500 TRY" },
        { tr: "tedarikçi iade politikaları kontrol ediliyor...", en: "checking supplier return policies..." },
        { tr: "promosyon kampanya şablonu hazırlanıyor", en: "preparing promotion campaign template" },
        { tr: "karar bekleniyor...", en: "awaiting decision..." },
      ],
      slotFilling: {
        prompt: { tr: "28 ürün (12.500 ₺) 30 gün içinde miadını dolduracak. Ne yapalım?", en: "28 products (₺12,500) expiring within 30 days. What shall we do?" },
        options: [{ tr: "Tedarikçiye İade", en: "Return to Supplier" }, { tr: "İndirimli Sat", en: "Sell at Discount" }],
        results: [{ tr: "Tedarikçi iade talebi oluşturuldu. Kargo takibi aktif.", en: "Supplier return request created. Shipping tracking active." }, { tr: "28 ürüne %30 indirim uygulandı ve kampanya SMS'i gönderildi.", en: "30% discount applied to 28 products and campaign SMS sent." }],
      },
    },
    {
      id: "restock", title: { tr: "Akıllı Sipariş", en: "Smart Reorder" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Son 1 ayda en çok satılan ama stoğu 10'un altına düşen ürünleri listele ve sipariş önerisi hazırla.", en: "List top-selling products with stock below 10 and prepare a reorder suggestion." } }],
      thoughts: [
        { tr: "satış verileri analiz ediliyor: son 30 gün", en: "analyzing sales data: last 30 days" },
        { tr: "stok seviyeleri kontrol ediliyor...", en: "checking stock levels..." },
        { tr: "15 kritik ürün tespit edildi", en: "15 critical products identified" },
        { tr: "tedarikçi fiyatları karşılaştırılıyor", en: "comparing supplier prices" },
        { tr: "sipariş önerisi hazır.", en: "reorder suggestion ready." },
      ],
      slotFilling: {
        prompt: { tr: "15 ürün için optimum sipariş önerisi hazır (toplam: 45.000 ₺). Onaylayın:", en: "Optimal reorder for 15 products ready (total: ₺45,000). Confirm:" },
        options: [{ tr: "Siparişi Gönder", en: "Send Order" }, { tr: "Listeyi Düzenle", en: "Edit List" }],
        results: [{ tr: "3 tedarikçiye toplam 15 ürün siparişi iletildi.", en: "Orders for 15 products sent to 3 suppliers." }, { tr: "Sipariş listesi düzenleme modunda açıldı.", en: "Order list opened in edit mode." }],
      },
    },
    {
      id: "chronic_reminder", title: { tr: "Kronik Hasta Takibi", en: "Chronic Patient Follow-Up" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Reçetesi bu hafta bitmesi gereken kronik müşterilere hatırlatma gönder.", en: "Send reminders to chronic customers whose prescriptions expire this week." } }],
      thoughts: [
        { tr: "reçete takvimi taranıyor...", en: "scanning prescription calendar..." },
        { tr: "67 müşteri tespit edildi", en: "67 customers identified" },
        { tr: "kişiselleştirilmiş mesaj oluşturuluyor", en: "generating personalized messages" },
        { tr: "iletişim kanalı seçiliyor: SMS", en: "selecting channel: SMS" },
        { tr: "gönderime hazır.", en: "ready to send." },
      ],
      slotFilling: {
        prompt: { tr: "67 müşteriye reçete yenileme hatırlatması gönderilecek. Onaylıyor musunuz?", en: "Prescription renewal reminder will be sent to 67 customers. Confirm?" },
        options: [{ tr: "Gönder", en: "Send" }, { tr: "Önizle", en: "Preview" }],
        results: [{ tr: "67 müşteriye SMS hatırlatması gönderildi.", en: "SMS reminders sent to 67 customers." }, { tr: "Önizleme açıldı. Mesajları inceleyip düzenleyebilirsiniz.", en: "Preview opened. Review and edit messages." }],
      },
    },
    {
      id: "ocr_invoice", title: { tr: "Fatura OCR", en: "Invoice OCR" },
      messages: [{ role: "user", sublabel: { tr: "Belge Yüklemesi", en: "Document Upload" }, content: { tr: "[ 📎 fatura_ecza.jpg ] Bu tedarikçi faturasını sisteme kaydet.", en: "[ 📎 invoice_pharma.jpg ] Save this supplier invoice in the system." } }],
      thoughts: [
        { tr: "görüntü işleniyor...", en: "processing image..." },
        { tr: "OCR ile metin çıkarılıyor", en: "extracting text with OCR" },
        { tr: "VKN: 1234567890, Tutar: 28.750 TRY", en: "Tax ID: 1234567890, Amount: 28,750 TRY" },
        { tr: "tedarikçi eşleştiriliyor: ABC İlaç A.Ş.", en: "matching supplier: ABC Pharma Ltd." },
        { tr: "stok girişi hazırlanıyor", en: "preparing stock entry" },
      ],
      slotFilling: {
        prompt: { tr: "ABC İlaç A.Ş. faturası (28.750 ₺, 42 kalem). Stok girişi otomatik yapılsın mı?", en: "ABC Pharma invoice (₺28,750, 42 items). Auto-create stock entry?" },
        options: [{ tr: "Onayla", en: "Approve" }, { tr: "Manuel Gir", en: "Manual Entry" }],
        results: [{ tr: "Fatura kaydedildi ve 42 kalem stok girişi otomatik oluşturuldu.", en: "Invoice saved and 42 stock entries auto-created." }, { tr: "Fatura kaydedildi. Stok girişi için manuel form açıldı.", en: "Invoice saved. Manual stock entry form opened." }],
      },
    },
  ],
};

// ─── Hospital ────────────────────────────────────────────
const hospital: SectorContent = {
  hero: {
    badge: { tr: "X-EAR v2.0 — Hastaneler", en: "X-EAR v2.0 — Hospitals" },
    h1_1: { tr: "Hastanenizi", en: "Grow Your Hospital" },
    h1_2: { tr: "Yapay Zeka ile Yönetin", en: "with AI Management" },
    desc: {
      tr: "Hasta kayıt, randevu yönetimi, tıbbi cihaz takibi ve sigorta süreçlerini tek platformda dijitalleştirin.",
      en: "Digitize patient registration, appointment management, medical device tracking, and insurance processes on one platform.",
    },
  },
  painBadge: { tr: "Hastane Gerçekleri", en: "Hospital Realities" },
  painH2_1: { tr: "Operasyonel Kaos", en: "Operational Chaos Is" },
  painH2_2: { tr: "Büyümenizi Engelliyor", en: "Blocking Your Growth" },
  painPoints: [
    {
      id: "appointments", iconKey: "receipt",
      title: { tr: "Randevu Kaosu", en: "Appointment Chaos" },
      desc: { tr: "Çakışan randevular, boş kalan slotlar ve uzun bekleme süreleri. Hasta memnuniyetsizliği ve gelir kaybı.", en: "Conflicting appointments, empty slots, and long wait times. Patient dissatisfaction and revenue loss." },
    },
    {
      id: "billing", iconKey: "frown",
      title: { tr: "Sigorta Faturalandırma", en: "Insurance Billing" },
      desc: { tr: "Eksik kodlama, yanlış tanı eşleştirme ve gecikmeli ödemeler. Sigorta şirketleriyle sürtüşme ve nakit akışı sorunları.", en: "Incomplete coding, wrong diagnosis matching, and delayed payments. Friction with insurers and cash flow issues." },
    },
    {
      id: "records", iconKey: "clock",
      title: { tr: "Dağınık Hasta Kayıtları", en: "Fragmented Patient Records" },
      desc: { tr: "Farklı departmanlarda tutulan kopuk kayıtlar. Hastanın geçmişine ulaşmak için harcanan dakikalar ve tekrarlanan tetkikler.", en: "Disconnected records across departments. Minutes wasted accessing patient history and repeated tests." },
    },
  ],
  features: [
    { key: "patient", iconKey: "users", title: { tr: "Hasta Yönetimi", en: "Patient Management" }, desc: { tr: "Tüm departmanlarda birleşik hasta dosyası, geçmiş ve randevu takibi.", en: "Unified patient records, history, and appointment tracking across all departments." } },
    { key: "medical", iconKey: "ear", title: { tr: "Tıbbi Cihaz Takibi", en: "Medical Device Tracking" }, desc: { tr: "Bakım tarihleri, kalibrasyon ve kullanım takibi ile tıbbi cihaz envanterinizi yönetin.", en: "Manage medical device inventory with maintenance schedules, calibration, and usage tracking." } },
    { key: "crm", iconKey: "shield", title: { tr: "Akıllı Randevu Sistemi", en: "Smart Appointment System" }, desc: { tr: "Çakışma önleme, otomatik hatırlatma ve bekleme listesi yönetimi.", en: "Conflict prevention, automated reminders, and waitlist management." } },
    { key: "sms", iconKey: "message", title: { tr: "Hasta İletişimi", en: "Patient Communication" }, desc: { tr: "Randevu hatırlatmaları, tetkik sonucu bildirimleri ve kontrol çağrıları.", en: "Appointment reminders, test result notifications, and follow-up calls." } },
    { key: "inventory", iconKey: "archive", title: { tr: "Medikal Envanter", en: "Medical Inventory" }, desc: { tr: "İlaç, sarf malzeme ve tıbbi cihaz stoklarını anlık takip edin.", en: "Track medication, consumable, and medical device stock in real-time." } },
    { key: "ai", iconKey: "chart", title: { tr: "Klinik Analitik", en: "Clinical Analytics" }, desc: { tr: "Departman performansı, hasta akışı ve gelir analizleri ile stratejik kararlar alın.", en: "Make strategic decisions with department performance, patient flow, and revenue analytics." } },
  ],
  demoScenarios: [
    {
      id: "appointment", title: { tr: "Randevu Optimizasyonu", en: "Appointment Optimization" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Önerisi", en: "System Suggestion" }, content: { tr: "Yarın 14:00-16:00 arası 3 çakışan randevu tespit ettim. Uygun slotlara yeniden dağıtım önerisi hazırladım.", en: "I've detected 3 conflicting appointments tomorrow 2-4 PM. I've prepared a redistribution suggestion." } }],
      thoughts: [
        { tr: "randevu takvimi taranıyor: yarın", en: "scanning appointment calendar: tomorrow" },
        { tr: "3 çakışma tespit edildi: Dr. Yılmaz", en: "3 conflicts found: Dr. Yilmaz" },
        { tr: "müsait slotlar hesaplanıyor...", en: "calculating available slots..." },
        { tr: "hasta tercihleri kontrol ediliyor", en: "checking patient preferences" },
        { tr: "optimum dağıtım planı hazır.", en: "optimal distribution plan ready." },
      ],
      slotFilling: {
        prompt: { tr: "3 hasta yeni slotlara atanmaya hazır. Hastalara bildirim gönderilsin mi?", en: "3 patients ready to be reassigned. Send notifications?" },
        options: [{ tr: "Onayla ve Bildir", en: "Approve & Notify" }, { tr: "Manuel Düzenle", en: "Edit Manually" }],
        results: [{ tr: "Randevular yeniden düzenlendi ve 3 hastaya SMS bilgisi gönderildi.", en: "Appointments rescheduled and SMS sent to 3 patients." }, { tr: "Randevu takvimi düzenleme modunda açıldı.", en: "Appointment calendar opened in edit mode." }],
      },
    },
    {
      id: "insurance", title: { tr: "Sigorta Otopilot", en: "Insurance Autopilot" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Bu haftaki tüm muayenelerin sigorta faturalandırmasını başlat.", en: "Start insurance billing for all examinations this week." } }],
      thoughts: [
        { tr: "muayene kayıtları taranıyor: bu hafta", en: "scanning examination records: this week" },
        { tr: "156 muayene bulundu, sigorta kodları eşleştiriliyor", en: "156 examinations found, matching insurance codes" },
        { tr: "ICD-10 kodları doğrulanıyor...", en: "validating ICD-10 codes..." },
        { tr: "3 eksik kod tespit edildi, tamamlanıyor", en: "3 missing codes detected, completing" },
        { tr: "faturalar hazırlanıyor...", en: "preparing invoices..." },
      ],
      slotFilling: {
        prompt: { tr: "156 muayene faturası hazır (Toplam: 485.000 ₺). 3'ü kod düzeltmesi yapıldı. Gönderilelim mi?", en: "156 examination invoices ready (₺485,000). 3 had code corrections. Shall we submit?" },
        options: [{ tr: "Toplu Gönder", en: "Batch Submit" }, { tr: "Kontrol Et", en: "Review" }],
        results: [{ tr: "156 fatura sigorta sistemine başarıyla iletildi.", en: "156 invoices successfully submitted to insurance system." }, { tr: "Fatura listesi kontrol ekranında açıldı.", en: "Invoice list opened in review screen." }],
      },
    },
    {
      id: "followup", title: { tr: "Hasta Takibi", en: "Patient Follow-Up" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Ameliyat sonrası 7. gününde olan hastaları listele ve kontrol randevusu oluştur.", en: "List patients on day 7 post-surgery and create follow-up appointments." } }],
      thoughts: [
        { tr: "ameliyat kayıtları sorgulanıyor...", en: "querying surgery records..." },
        { tr: "12 hasta 7. gün kontrolünde", en: "12 patients at day 7 follow-up" },
        { tr: "uygun randevu slotları belirleniyor", en: "finding available appointment slots" },
        { tr: "hasta bilgilendirme mesajları hazırlanıyor", en: "preparing patient notification messages" },
        { tr: "işlem hazır.", en: "ready to execute." },
      ],
      slotFilling: {
        prompt: { tr: "12 hasta için kontrol randevusu oluşturulacak. Onaylıyor musunuz?", en: "Follow-up appointments will be created for 12 patients. Confirm?" },
        options: [{ tr: "Oluştur ve Bildir", en: "Create & Notify" }, { tr: "Listeyi Gör", en: "View List" }],
        results: [{ tr: "12 kontrol randevusu oluşturuldu ve hastalara SMS gönderildi.", en: "12 follow-up appointments created and SMS sent to patients." }, { tr: "Hasta listesi açıldı.", en: "Patient list opened." }],
      },
    },
    {
      id: "analytics", title: { tr: "Departman Analizi", en: "Department Analytics" },
      messages: [{ role: "user", sublabel: { tr: "Sorgu", en: "Query" }, content: { tr: "Bu ayın departman bazlı hasta yoğunluğu ve gelir karşılaştırmasını göster.", en: "Show this month's department-wise patient volume and revenue comparison." } }],
      thoughts: [
        { tr: "departman verileri çekiliyor...", en: "fetching department data..." },
        { tr: "hasta yoğunlukları hesaplanıyor", en: "calculating patient volumes" },
        { tr: "gelir dağılımları analiz ediliyor", en: "analyzing revenue distribution" },
        { tr: "karşılaştırmalı tablo oluşturuluyor", en: "building comparison table" },
        { tr: "rapor hazır.", en: "report ready." },
      ],
      slotFilling: {
        prompt: { tr: "5 departmanın performans raporu hazır. Nasıl istersiniz?", en: "Performance report for 5 departments ready. How would you like it?" },
        options: [{ tr: "Dashboard'da Göster", en: "Show on Dashboard" }, { tr: "PDF İndir", en: "Download PDF" }],
        results: [{ tr: "Departman performans raporu dashboard'a yansıtıldı.", en: "Department performance report displayed on dashboard." }, { tr: "PDF rapor indiriliyor.", en: "PDF report downloading." }],
      },
    },
  ],
};

// ─── Hotel ───────────────────────────────────────────────
const hotel: SectorContent = {
  hero: {
    badge: { tr: "X-EAR v2.0 — Oteller", en: "X-EAR v2.0 — Hotels" },
    h1_1: { tr: "Otelinizi", en: "Grow Your Hotel" },
    h1_2: { tr: "Yapay Zeka ile Yönetin", en: "with AI Management" },
    desc: {
      tr: "Misafir yönetimi, rezervasyon, oda servisi ve housekeeping süreçlerini akıllıca yönetin.",
      en: "Manage guest relations, reservations, room service, and housekeeping processes smartly.",
    },
  },
  painBadge: { tr: "Otel Gerçekleri", en: "Hotel Realities" },
  painH2_1: { tr: "Misafir Deneyiminde", en: "Gaps in Guest" },
  painH2_2: { tr: "Boşluklar Var", en: "Experience" },
  painPoints: [
    {
      id: "overbooking", iconKey: "receipt",
      title: { tr: "Rezervasyon Karmaşası", en: "Booking Confusion" },
      desc: { tr: "Farklı kanallardan gelen rezervasyonların çakışması, overbooking ve mutsuz misafirler. Şikayet yönetimi yerine büyümeye vakit ayırabilirsiniz.", en: "Conflicting bookings from different channels, overbooking, and unhappy guests. Spend time on growth instead of complaint management." },
    },
    {
      id: "housekeeping", iconKey: "frown",
      title: { tr: "Housekeeping Koordinasyonu", en: "Housekeeping Coordination" },
      desc: { tr: "Hangi oda temiz, hangisi hazırlanıyor? Telefon trafiği, kağıt listeler ve gecikmeli check-in'ler yüzünden kaybedilen misafir memnuniyeti.", en: "Which room is clean, which is being prepared? Lost guest satisfaction due to phone traffic, paper lists, and delayed check-ins." },
    },
    {
      id: "feedback", iconKey: "clock",
      title: { tr: "Misafir Geri Bildirimi", en: "Guest Feedback" },
      desc: { tr: "Misafir şikayetlerini zamanında yakalayamamak. Olumsuz online yorumlar yayılmadan müdahale edememek ve itibar kaybı.", en: "Not catching guest complaints in time. Unable to intervene before negative reviews spread and reputation damage." },
    },
  ],
  features: [
    { key: "guest", iconKey: "users", title: { tr: "Misafir Yönetimi", en: "Guest Management" }, desc: { tr: "Misafir profilleri, tercihler, geçmiş konaklamalar ve özel notlar.", en: "Guest profiles, preferences, past stays, and special notes." } },
    { key: "room", iconKey: "ear", title: { tr: "Oda & Ekipman Takibi", en: "Room & Equipment Tracking" }, desc: { tr: "Oda durumları, bakım takvimleri ve ekipman envanteri anlık takip.", en: "Room status, maintenance schedules, and equipment inventory in real-time." } },
    { key: "crm", iconKey: "shield", title: { tr: "Akıllı Rezervasyon", en: "Smart Reservations" }, desc: { tr: "Çoklu kanal entegrasyonu, çakışma önleme ve otomatik fiyatlandırma.", en: "Multi-channel integration, conflict prevention, and automated pricing." } },
    { key: "sms", iconKey: "message", title: { tr: "Misafir İletişimi", en: "Guest Communication" }, desc: { tr: "Check-in hatırlatması, hoşgeldin mesajları ve memnuniyet anketleri.", en: "Check-in reminders, welcome messages, and satisfaction surveys." } },
    { key: "inventory", iconKey: "archive", title: { tr: "Operasyon Yönetimi", en: "Operations Management" }, desc: { tr: "Minibar, çamaşırhane ve housekeeping takibi tek panelden.", en: "Minibar, laundry, and housekeeping tracking from one panel." } },
    { key: "ai", iconKey: "chart", title: { tr: "Doluluk Analitiği", en: "Occupancy Analytics" }, desc: { tr: "Doluluk oranları, gelir optimizasyonu ve sezonsal trend analizleri.", en: "Occupancy rates, revenue optimization, and seasonal trend analysis." } },
  ],
  demoScenarios: [
    {
      id: "checkin", title: { tr: "Akıllı Check-in", en: "Smart Check-in" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Önerisi", en: "System Suggestion" }, content: { tr: "Bugün 14:00'te check-in yapacak 23 misafir var. 5 oda henüz hazır değil. Housekeeping'e öncelik listesi göndereyim mi?", en: "23 guests checking in at 2 PM today. 5 rooms not ready yet. Shall I send a priority list to housekeeping?" } }],
      thoughts: [
        { tr: "bugünkü check-in listesi yükleniyor", en: "loading today's check-in list" },
        { tr: "oda durumları kontrol ediliyor...", en: "checking room statuses..." },
        { tr: "5 oda 'temizleniyor' durumunda", en: "5 rooms in 'cleaning' status" },
        { tr: "öncelik sırası hesaplanıyor: VIP > erken varış > standart", en: "calculating priority: VIP > early arrival > standard" },
        { tr: "housekeeping görev listesi hazır.", en: "housekeeping task list ready." },
      ],
      slotFilling: {
        prompt: { tr: "5 oda için öncelikli temizlik listesi hazır. Housekeeping ekibine bildirelim mi?", en: "Priority cleaning list for 5 rooms ready. Notify housekeeping team?" },
        options: [{ tr: "Gönder", en: "Send" }, { tr: "Listeyi Düzenle", en: "Edit List" }],
        results: [{ tr: "Housekeeping ekibine öncelik listesi gönderildi. Tahmini tamamlanma: 13:30.", en: "Priority list sent to housekeeping. Estimated completion: 1:30 PM." }, { tr: "Öncelik listesi düzenleme modunda açıldı.", en: "Priority list opened in edit mode." }],
      },
    },
    {
      id: "guest_feedback", title: { tr: "Geri Bildirim Takibi", en: "Feedback Tracking" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Son 24 saatte olumsuz geri bildirim bırakan misafirleri bul ve telafi önerisi hazırla.", en: "Find guests who left negative feedback in the last 24 hours and prepare compensation suggestions." } }],
      thoughts: [
        { tr: "geri bildirimler taranıyor: son 24 saat", en: "scanning feedback: last 24 hours" },
        { tr: "4 olumsuz geri bildirim tespit edildi", en: "4 negative feedback items found" },
        { tr: "misafir profilleri ve konaklama detayları getiriliyor", en: "fetching guest profiles and stay details" },
        { tr: "telafi seçenekleri belirleniyor", en: "determining compensation options" },
        { tr: "öneriler hazır.", en: "suggestions ready." },
      ],
      slotFilling: {
        prompt: { tr: "4 misafir için kişiselleştirilmiş telafi önerisi hazır. Uygulayalım mı?", en: "Personalized compensation for 4 guests ready. Shall we apply?" },
        options: [{ tr: "Uygula", en: "Apply" }, { tr: "İncele", en: "Review" }],
        results: [{ tr: "4 misafire telafi mesajı gönderildi ve otel puanları hesaplarına eklendi.", en: "Compensation messages sent to 4 guests and hotel points added to their accounts." }, { tr: "Telafi detayları inceleme ekranında.", en: "Compensation details on review screen." }],
      },
    },
    {
      id: "revenue", title: { tr: "Gelir Optimizasyonu", en: "Revenue Optimization" },
      messages: [{ role: "user", sublabel: { tr: "Sorgu", en: "Query" }, content: { tr: "Önümüzdeki 2 hafta için doluluk tahmini yap ve fiyat optimizasyonu öner.", en: "Forecast occupancy for next 2 weeks and suggest price optimization." } }],
      thoughts: [
        { tr: "geçmiş doluluk verileri analiz ediliyor", en: "analyzing historical occupancy data" },
        { tr: "mevsimsel trendler hesaplanıyor", en: "calculating seasonal trends" },
        { tr: "tahmin: %68 doluluk (mevcut fiyatla)", en: "forecast: 68% occupancy (at current price)" },
        { tr: "dinamik fiyat önerileri oluşturuluyor", en: "generating dynamic pricing suggestions" },
        { tr: "potansiyel gelir artışı: +%15", en: "potential revenue increase: +15%" },
      ],
      slotFilling: {
        prompt: { tr: "Dinamik fiyatlandırma ile doluluk %68'den %82'ye çıkarılabilir (+%15 gelir). Uygulansın mı?", en: "Dynamic pricing can increase occupancy from 68% to 82% (+15% revenue). Apply?" },
        options: [{ tr: "Uygula", en: "Apply" }, { tr: "Detayları Gör", en: "View Details" }],
        results: [{ tr: "Dinamik fiyatlandırma aktif edildi. Oda fiyatları güncellendi.", en: "Dynamic pricing activated. Room prices updated." }, { tr: "Fiyat detayları tablosu açıldı.", en: "Price details table opened." }],
      },
    },
    {
      id: "maintenance", title: { tr: "Bakım Yönetimi", en: "Maintenance Management" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Uyarısı", en: "System Alert" }, content: { tr: "3 odada klima bakım süresi geçmiş, 2 odada minibar arızası raporlanmış. Bakım ekibi görevlendirilsin mi?", en: "AC maintenance overdue in 3 rooms, minibar malfunction reported in 2 rooms. Assign maintenance team?" } }],
      thoughts: [
        { tr: "bakım takvimi kontrol ediliyor", en: "checking maintenance schedule" },
        { tr: "arıza raporları taranıyor", en: "scanning malfunction reports" },
        { tr: "5 acil bakım görevi tespit edildi", en: "5 urgent maintenance tasks identified" },
        { tr: "müsait teknisyenler belirleniyor", en: "identifying available technicians" },
        { tr: "görev ataması hazır.", en: "task assignment ready." },
      ],
      slotFilling: {
        prompt: { tr: "5 bakım görevi için teknisyen ataması hazır. Onaylıyor musunuz?", en: "Technician assignments for 5 maintenance tasks ready. Approve?" },
        options: [{ tr: "Onayla", en: "Approve" }, { tr: "Düzenle", en: "Edit" }],
        results: [{ tr: "5 bakım görevi teknisyenlere atandı. Takip bildirimi aktif.", en: "5 maintenance tasks assigned. Follow-up notifications active." }, { tr: "Görev listesi düzenleme modunda.", en: "Task list in edit mode." }],
      },
    },
  ],
};

// ─── General ─────────────────────────────────────────────
const general: SectorContent = {
  hero: {
    badge: { tr: "X-EAR v2.0 — Her Sektör İçin", en: "X-EAR v2.0 — For Every Sector" },
    h1_1: { tr: "İşletmenizi", en: "Grow Your Business" },
    h1_2: { tr: "Yapay Zeka ile Büyütün", en: "with AI" },
    desc: {
      tr: "Her sektör için akıllı iş yönetimi. İşitme merkezi, eczane, hastane, otel veya genel CRM — platformunuzu sektörünüze göre özelleştirin.",
      en: "Smart business management for every sector. Hearing center, pharmacy, hospital, hotel, or general CRM — customize your platform for your industry.",
    },
  },
  painBadge: { tr: "İş Gerçekleri", en: "Business Realities" },
  painH2_1: { tr: "Dağınık Süreçler", en: "Scattered Processes" },
  painH2_2: { tr: "Büyümenizi Engelliyor", en: "Block Your Growth" },
  painPoints: [
    {
      id: "scattered", iconKey: "receipt",
      title: { tr: "Dağınık Veriler", en: "Scattered Data" },
      desc: { tr: "Müşteri bilgileri Excel'de, satışlar başka sistemde, faturalar kağıtta. Bilgi kaybı ve tutarsızlıklar kaçınılmaz.", en: "Customer data in Excel, sales in another system, invoices on paper. Information loss and inconsistencies are inevitable." },
    },
    {
      id: "followup", iconKey: "frown",
      title: { tr: "Kaçan Takipler", en: "Missed Follow-Ups" },
      desc: { tr: "Teklif verip dönüş yapmayan müşteriler, takibi unutulan servis talepleri. Her kaçan takip bir kaçan satış demek.", en: "Customers who got quotes but never heard back, forgotten service requests. Every missed follow-up is a missed sale." },
    },
    {
      id: "reporting", iconKey: "clock",
      title: { tr: "Raporlama Çilesi", en: "Reporting Struggles" },
      desc: { tr: "Aylık raporlar için günlerce Excel'le boğuşmak. Kararları veriye dayandırmak yerine içgüdüyle yönetmek.", en: "Struggling with Excel for days for monthly reports. Managing by gut feeling instead of data-driven decisions." },
    },
  ],
  features: [
    { key: "contact", iconKey: "users", title: { tr: "Müşteri Yönetimi", en: "Contact Management" }, desc: { tr: "Tüm müşteri bilgilerini, iletişim geçmişini ve notları tek bir yerden yönetin.", en: "Manage all customer info, communication history, and notes from one place." } },
    { key: "sales", iconKey: "ear", title: { tr: "Satış Takibi", en: "Sales Tracking" }, desc: { tr: "Tekliften tahsilata tüm satış sürecini izleyin. Fırsat kaçırmayın.", en: "Track the entire sales process from quote to collection. Never miss an opportunity." } },
    { key: "crm", iconKey: "shield", title: { tr: "Otopilot CRM", en: "Autopilot CRM" }, desc: { tr: "Otomatik takip hatırlatmaları, müşteri segmentasyonu ve sadakat yönetimi.", en: "Automated follow-up reminders, customer segmentation, and loyalty management." } },
    { key: "sms", iconKey: "message", title: { tr: "SMS & WhatsApp", en: "SMS & WhatsApp" }, desc: { tr: "Toplu kampanyalar, randevu hatırlatmaları ve müşteri bilgilendirmeleri.", en: "Bulk campaigns, appointment reminders, and customer notifications." } },
    { key: "inventory", iconKey: "archive", title: { tr: "Envanter & Stok", en: "Inventory & Stock" }, desc: { tr: "Ürün ve hizmet stoklarını yönetin, tedarik zincirini optimize edin.", en: "Manage product and service stock, optimize the supply chain." } },
    { key: "ai", iconKey: "chart", title: { tr: "AI Raporlama", en: "AI Reporting" }, desc: { tr: "Doğal dilde soru sorun, yapay zeka anında rapor ve analiz üretsin.", en: "Ask questions in natural language, AI generates instant reports and analysis." } },
  ],
  demoScenarios: [
    {
      id: "lead_followup", title: { tr: "Müşteri Takibi", en: "Lead Follow-Up" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Önerisi", en: "System Suggestion" }, content: { tr: "Son 7 günde teklif verilen ama dönüş alınmayan 18 müşteri var. Takip SMS'i göndermemi ister misiniz?", en: "18 customers received quotes in the last 7 days with no response. Shall I send follow-up SMS?" } }],
      thoughts: [
        { tr: "teklif kayıtları taranıyor: son 7 gün", en: "scanning quote records: last 7 days" },
        { tr: "dönüş alınmayan 18 müşteri tespit edildi", en: "18 unresponsive customers found" },
        { tr: "kişiselleştirilmiş takip mesajı oluşturuluyor", en: "creating personalized follow-up messages" },
        { tr: "gönderim planı hazırlanıyor", en: "preparing send schedule" },
        { tr: "hazır.", en: "ready." },
      ],
      slotFilling: {
        prompt: { tr: "18 müşteriye kişiselleştirilmiş takip mesajı gönderilecek. Onaylıyor musunuz?", en: "Personalized follow-up to 18 customers. Confirm?" },
        options: [{ tr: "Gönder", en: "Send" }, { tr: "Önizle", en: "Preview" }],
        results: [{ tr: "18 müşteriye takip SMS'i gönderildi.", en: "Follow-up SMS sent to 18 customers." }, { tr: "Mesaj önizlemesi açıldı.", en: "Message preview opened." }],
      },
    },
    {
      id: "invoice_gen", title: { tr: "Fatura Otomasyonu", en: "Invoice Automation" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Bu ayki teslim edilmiş ama faturalanmamış tüm siparişlerin faturalarını kes.", en: "Generate invoices for all delivered but uninvoiced orders this month." } }],
      thoughts: [
        { tr: "sipariş verileri taranıyor...", en: "scanning order data..." },
        { tr: "22 faturasız sipariş bulundu", en: "22 uninvoiced orders found" },
        { tr: "müşteri vergi bilgileri getiriliyor", en: "fetching customer tax information" },
        { tr: "e-Fatura taslakları oluşturuluyor", en: "creating e-Invoice drafts" },
        { tr: "hazır.", en: "ready." },
      ],
      slotFilling: {
        prompt: { tr: "22 sipariş için e-Fatura hazır (Toplam: 178.000 ₺). Nasıl devam edelim?", en: "e-Invoices for 22 orders ready (₺178,000). How to proceed?" },
        options: [{ tr: "Faturaları Kes", en: "Generate All" }, { tr: "Listeyi İncele", en: "Review List" }],
        results: [{ tr: "22 e-Fatura başarıyla oluşturuldu ve GİB'e iletildi.", en: "22 e-Invoices created and submitted." }, { tr: "Fatura listesi inceleme ekranında.", en: "Invoice list on review screen." }],
      },
    },
    {
      id: "campaign", title: { tr: "Akıllı Kampanya", en: "Smart Campaign" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Son 3 ayda alışveriş yapmayan ama daha önce en az 3 sipariş vermiş müşterilere geri kazanım kampanyası hazırla.", en: "Prepare a win-back campaign for customers who haven't purchased in 3 months but had at least 3 prior orders." } }],
      thoughts: [
        { tr: "müşteri segmentasyonu yapılıyor...", en: "segmenting customers..." },
        { tr: "kriterlere uyan 85 müşteri bulundu", en: "85 customers match criteria" },
        { tr: "kişiselleştirilmiş kampanya mesajı hazırlanıyor", en: "preparing personalized campaign message" },
        { tr: "indirim kuponu oluşturuluyor: %10", en: "creating discount coupon: 10%" },
        { tr: "kampanya hazır.", en: "campaign ready." },
      ],
      slotFilling: {
        prompt: { tr: "85 müşteriye %10 indirim kuponu ile geri kazanım kampanyası gönderilecek. Onaylayın:", en: "Win-back campaign with 10% coupon for 85 customers. Confirm:" },
        options: [{ tr: "Başlat", en: "Launch" }, { tr: "Mesajı Düzenle", en: "Edit Message" }],
        results: [{ tr: "Kampanya başlatıldı. 85 müşteriye SMS gönderimi başladı.", en: "Campaign launched. SMS sending to 85 customers started." }, { tr: "Kampanya mesajı düzenleme modunda.", en: "Campaign message in edit mode." }],
      },
    },
    {
      id: "report", title: { tr: "AI Rapor", en: "AI Report" },
      messages: [{ role: "user", sublabel: { tr: "Sorgu", en: "Query" }, content: { tr: "Bu ayın satış performansını geçen ayla karşılaştır ve trend analizi yap.", en: "Compare this month's sales performance with last month and do trend analysis." } }],
      thoughts: [
        { tr: "satış verileri çekiliyor: son 2 ay", en: "fetching sales data: last 2 months" },
        { tr: "karşılaştırmalı analiz yapılıyor", en: "performing comparative analysis" },
        { tr: "trendler hesaplanıyor: +%12 büyüme", en: "calculating trends: +12% growth" },
        { tr: "görselleştirme hazırlanıyor", en: "preparing visualization" },
        { tr: "rapor hazır.", en: "report ready." },
      ],
      slotFilling: {
        prompt: { tr: "Satış karşılaştırma raporu hazır: +%12 büyüme, en çok satan 5 ürün. Nasıl istersiniz?", en: "Sales comparison ready: +12% growth, top 5 products. How would you like it?" },
        options: [{ tr: "Dashboard", en: "Dashboard" }, { tr: "PDF İndir", en: "Download PDF" }],
        results: [{ tr: "Rapor dashboard'a yansıtıldı.", en: "Report displayed on dashboard." }, { tr: "PDF rapor indiriliyor.", en: "PDF report downloading." }],
      },
    },
  ],
};

// ─── Medical (Medikal Firma) ─────────────────────────────
const medical: SectorContent = {
  hero: {
    badge: { tr: "X-EAR v2.0 — Medikal Firmalar", en: "X-EAR v2.0 — Medical Companies" },
    h1_1: { tr: "Medikal Firmanızı", en: "Grow Your Medical" },
    h1_2: { tr: "Yapay Zeka ile Büyütün", en: "Company with AI" },
    desc: {
      tr: "Tıbbi cihaz satışı, UTS takibi, bayi yönetimi ve teknik servis süreçlerini tek platformda dijitalleştirin.",
      en: "Digitize medical device sales, UTS tracking, dealer management, and technical service processes on one platform.",
    },
  },
  painBadge: { tr: "Medikal Sektör Gerçekleri", en: "Medical Industry Realities" },
  painH2_1: { tr: "Karmaşık Süreçler", en: "Complex Processes Are" },
  painH2_2: { tr: "Büyümenizi Engelliyor", en: "Blocking Your Growth" },
  painPoints: [
    {
      id: "uts", iconKey: "receipt",
      title: { tr: "UTS Bildirim Yükü", en: "UTS Reporting Burden" },
      desc: { tr: "Her cihaz satışında UTS'ye bildirim zorunluluğu. Seri numarası takibi, lot bildirimleri ve geri çağırma süreçlerinin manuel yönetimi.", en: "Mandatory UTS notifications for every device sale. Manual management of serial tracking, lot reporting, and recall processes." },
    },
    {
      id: "dealer", iconKey: "frown",
      title: { tr: "Bayi & Kanal Yönetimi", en: "Dealer & Channel Management" },
      desc: { tr: "Onlarca bayiyle koordinasyon, farklı fiyat listeleri, kampanya bildirimleri ve stok görünürlüğü. Her bayi ayrı Excel tablosu.", en: "Coordinating with dozens of dealers, different price lists, campaign notifications, and stock visibility. Each dealer a separate Excel sheet." },
    },
    {
      id: "service", iconKey: "clock",
      title: { tr: "Teknik Servis Takibi", en: "Technical Service Tracking" },
      desc: { tr: "Garanti takibi, arıza kayıtları, yedek parça yönetimi ve saha teknisyen koordinasyonu hep farklı sistemlerde.", en: "Warranty tracking, fault records, spare parts, and field technician coordination all in different systems." },
    },
  ],
  features: [
    { key: "customer", iconKey: "users", title: { tr: "Müşteri & Bayi Yönetimi", en: "Customer & Dealer Management" }, desc: { tr: "Hastaneler, klinikler ve bayileri tek panelden yönetin. Fiyat listeleri, sözleşmeler ve iletişim geçmişi.", en: "Manage hospitals, clinics, and dealers from one panel. Price lists, contracts, and communication history." } },
    { key: "device", iconKey: "ear", title: { tr: "Cihaz & UTS Takibi", en: "Device & UTS Tracking" }, desc: { tr: "Seri numarası bazlı cihaz takibi, otomatik UTS bildirimi ve lot yönetimi.", en: "Serial number-based device tracking, automatic UTS notifications, and lot management." } },
    { key: "crm", iconKey: "shield", title: { tr: "Satış & Teklif Otomasyonu", en: "Sales & Quote Automation" }, desc: { tr: "Teklif hazırlama, ihale takibi, satış pipeline yönetimi ve otomatik hatırlatmalar.", en: "Quote preparation, tender tracking, sales pipeline management, and automatic reminders." } },
    { key: "sms", iconKey: "message", title: { tr: "Bayi İletişimi", en: "Dealer Communication" }, desc: { tr: "Kampanya duyuruları, fiyat güncelemeleri ve stok bildirimleri ile bayilerle sürekli iletişim.", en: "Campaign announcements, price updates, and stock notifications for continuous dealer communication." } },
    { key: "inventory", iconKey: "archive", title: { tr: "Depo & Lojistik", en: "Warehouse & Logistics" }, desc: { tr: "Çoklu depo yönetimi, sevkiyat takibi, minimum stok uyarıları ve tedarik planlaması.", en: "Multi-warehouse management, shipment tracking, minimum stock alerts, and supply planning." } },
    { key: "ai", iconKey: "chart", title: { tr: "Satış Analitiği & Tahmin", en: "Sales Analytics & Forecasting" }, desc: { tr: "Bölge bazlı satış performansı, ürün trend analizi ve talep tahmini.", en: "Regional sales performance, product trend analysis, and demand forecasting." } },
  ],
  demoScenarios: [
    {
      id: "uts_auto", title: { tr: "UTS Otopilot", en: "UTS Autopilot" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Önerisi", en: "System Suggestion" }, content: { tr: "Bugün sevk edilen 34 cihaz için UTS bildirimi hazır. Seri numaraları ve lot bilgileri doğrulandı. Toplu bildirim göndereyim mi?", en: "UTS notification ready for 34 devices shipped today. Serial numbers and lot info verified. Shall I submit batch notification?" } }],
      thoughts: [
        { tr: "sevkiyat kayıtları taranıyor: bugün", en: "scanning shipment records: today" },
        { tr: "34 cihaz tespit edildi, seri numaraları doğrulanıyor", en: "34 devices found, verifying serial numbers" },
        { tr: "UTS API bağlantısı kontrol ediliyor...", en: "checking UTS API connection..." },
        { tr: "lot bildirimleri hazırlanıyor", en: "preparing lot notifications" },
        { tr: "toplu bildirim paketi hazır.", en: "batch notification package ready." },
      ],
      slotFilling: {
        prompt: { tr: "34 cihaz için UTS bildirimi gönderilecek. Onaylıyor musunuz?", en: "UTS notification will be sent for 34 devices. Confirm?" },
        options: [{ tr: "Gönder", en: "Submit" }, { tr: "Detayları İncele", en: "Review Details" }],
        results: [{ tr: "34 cihaz için UTS bildirimi başarıyla gönderildi.", en: "UTS notification for 34 devices submitted successfully." }, { tr: "Bildirim detayları inceleme ekranında.", en: "Notification details on review screen." }],
      },
    },
    {
      id: "dealer_campaign", title: { tr: "Bayi Kampanyası", en: "Dealer Campaign" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Bu çeyrekte hedefinin %80'inden fazlasını tutturmuş bayilere özel indirim kampanyası hazırla.", en: "Prepare a special discount campaign for dealers who hit more than 80% of their quarterly target." } }],
      thoughts: [
        { tr: "bayi performans verileri analiz ediliyor...", en: "analyzing dealer performance data..." },
        { tr: "12 bayi hedefin %80+'ını tutturmuş", en: "12 dealers exceeded 80% of target" },
        { tr: "kademeli indirim oranları hesaplanıyor", en: "calculating tiered discount rates" },
        { tr: "kampanya duyuru mesajı hazırlanıyor", en: "preparing campaign announcement" },
        { tr: "kampanya hazır.", en: "campaign ready." },
      ],
      slotFilling: {
        prompt: { tr: "12 bayiye özel kampanya hazır (%5-%12 kademeli indirim). Duyuru yapılsın mı?", en: "Special campaign for 12 dealers ready (5-12% tiered discount). Announce?" },
        options: [{ tr: "Duyur", en: "Announce" }, { tr: "Oranları Düzenle", en: "Edit Rates" }],
        results: [{ tr: "12 bayiye kampanya duyurusu gönderildi.", en: "Campaign announcement sent to 12 dealers." }, { tr: "İndirim oranları düzenleme modunda.", en: "Discount rates in edit mode." }],
      },
    },
    {
      id: "service_mgmt", title: { tr: "Teknik Servis", en: "Technical Service" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Uyarısı", en: "System Alert" }, content: { tr: "7 adet garanti kapsamındaki cihaz için planlı bakım süresi yaklaşıyor. Müşterilere bildirim ve teknisyen ataması yapayım mı?", en: "Scheduled maintenance approaching for 7 warranty devices. Shall I notify customers and assign technicians?" } }],
      thoughts: [
        { tr: "garanti takvimi taranıyor...", en: "scanning warranty calendar..." },
        { tr: "7 cihaz planlı bakım tarihine yaklaşıyor", en: "7 devices approaching maintenance date" },
        { tr: "müsait teknisyenler belirleniyor", en: "identifying available technicians" },
        { tr: "bölge bazlı atama optimizasyonu yapılıyor", en: "optimizing region-based assignments" },
        { tr: "görev planı hazır.", en: "task plan ready." },
      ],
      slotFilling: {
        prompt: { tr: "7 müşteriye bakım bildirimi ve teknisyen ataması yapılacak. Onaylayın:", en: "Maintenance notification and technician assignment for 7 customers. Confirm:" },
        options: [{ tr: "Onayla", en: "Approve" }, { tr: "Takvimi Gör", en: "View Calendar" }],
        results: [{ tr: "7 bakım görevi oluşturuldu, müşterilere ve teknisyenlere bildirim gönderildi.", en: "7 maintenance tasks created, notifications sent to customers and technicians." }, { tr: "Bakım takvimi açıldı.", en: "Maintenance calendar opened." }],
      },
    },
    {
      id: "tender_track", title: { tr: "İhale Takibi", en: "Tender Tracking" },
      messages: [{ role: "user", sublabel: { tr: "Sorgu", en: "Query" }, content: { tr: "Önümüzdeki 2 hafta içinde kapanacak açık ihaleleri ve teklif durumlarımızı listele.", en: "List open tenders closing within 2 weeks and our bid status." } }],
      thoughts: [
        { tr: "ihale veritabanı taranıyor...", en: "scanning tender database..." },
        { tr: "5 açık ihale bulundu, kapanış tarihleri: 3-14 gün", en: "5 open tenders found, closing: 3-14 days" },
        { tr: "teklif durumları kontrol ediliyor", en: "checking bid statuses" },
        { tr: "rakip analizi yapılıyor", en: "performing competitor analysis" },
        { tr: "özet rapor hazır.", en: "summary report ready." },
      ],
      slotFilling: {
        prompt: { tr: "5 açık ihale: 2'sinde teklif verilmiş, 3'ü bekliyor. Ne yapalım?", en: "5 open tenders: 2 with bids submitted, 3 pending. What shall we do?" },
        options: [{ tr: "Teklif Hazırla", en: "Prepare Bids" }, { tr: "Rapor İndir", en: "Download Report" }],
        results: [{ tr: "3 bekleyen ihale için teklif taslağı oluşturuldu.", en: "Bid drafts created for 3 pending tenders." }, { tr: "İhale durum raporu indiriliyor.", en: "Tender status report downloading." }],
      },
    },
  ],
};

// ─── Optic (Optik Firmaları) ─────────────────────────────
const optic: SectorContent = {
  hero: {
    badge: { tr: "X-EAR v2.0 — Optik Mağazalar", en: "X-EAR v2.0 — Optical Stores" },
    h1_1: { tr: "Optik Mağazanızı", en: "Grow Your Optical" },
    h1_2: { tr: "Yapay Zeka ile Büyütün", en: "Store with AI" },
    desc: {
      tr: "Reçete takibi, lens & çerçeve envanteri, müşteri sadakati ve SGK entegrasyonu ile optik mağazanızı dijitalleştirin.",
      en: "Digitize your optical store with prescription tracking, lens & frame inventory, customer loyalty, and insurance integration.",
    },
  },
  painBadge: { tr: "Optik Sektör Gerçekleri", en: "Optical Industry Realities" },
  painH2_1: { tr: "Geleneksel Yöntemler", en: "Traditional Methods Are" },
  painH2_2: { tr: "Sizi Geride Bırakıyor", en: "Leaving You Behind" },
  painPoints: [
    {
      id: "prescription", iconKey: "receipt",
      title: { tr: "Reçete & Sipariş Karmaşası", en: "Prescription & Order Confusion" },
      desc: { tr: "Reçete bilgilerini kağıttan sisteme aktarmak, cam siparişlerini manuel takip etmek ve teslim tarihlerini kaçırmak. Her hata müşteri kaybı demek.", en: "Transcribing prescriptions from paper, manually tracking lens orders, and missing delivery dates. Every error means a lost customer." },
    },
    {
      id: "inventory", iconKey: "frown",
      title: { tr: "Stok Görünürlüğü", en: "Stock Visibility" },
      desc: { tr: "Binlerce çerçeve ve lens kombinasyonu. Hangi numarada hangi cam var, hangi çerçeve satıldı? Manuel sayım artık imkansız.", en: "Thousands of frame and lens combinations. Which lens in which power, which frame sold? Manual counting is impossible." },
    },
    {
      id: "loyalty", iconKey: "clock",
      title: { tr: "Müşteri Sadakati", en: "Customer Loyalty" },
      desc: { tr: "Göz muayene tarihi gelen müşterileri hatırlayamamak. 2 yılda bir gözlük yenileyen müşterilerin zamanı geldiğinde rakibe gitmesi.", en: "Not remembering customers due for eye exams. Customers who renew glasses every 2 years going to competitors when the time comes." },
    },
  ],
  features: [
    { key: "customer", iconKey: "users", title: { tr: "Müşteri & Reçete Yönetimi", en: "Customer & Prescription Management" }, desc: { tr: "Müşteri profilleri, reçete geçmişi, göz muayene takvimleri ve tercihler tek panelden.", en: "Customer profiles, prescription history, eye exam schedules, and preferences from one panel." } },
    { key: "lens", iconKey: "ear", title: { tr: "Lens & Çerçeve Takibi", en: "Lens & Frame Tracking" }, desc: { tr: "Cam siparişi durumu, çerçeve stoku, marka bazlı envanter ve barkod entegrasyonu.", en: "Lens order status, frame stock, brand-based inventory, and barcode integration." } },
    { key: "crm", iconKey: "shield", title: { tr: "Otopilot Hatırlatıcı", en: "Autopilot Reminders" }, desc: { tr: "Muayene tarihi hatırlatma, cam yenileme takibi ve kişiselleştirilmiş kampanyalar.", en: "Exam date reminders, lens renewal tracking, and personalized campaigns." } },
    { key: "sms", iconKey: "message", title: { tr: "SMS & WhatsApp", en: "SMS & WhatsApp" }, desc: { tr: "Sipariş hazır bildirimi, kampanya duyuruları ve muayene hatırlatmaları.", en: "Order ready notifications, campaign announcements, and exam reminders." } },
    { key: "inventory", iconKey: "archive", title: { tr: "Akıllı Envanter", en: "Smart Inventory" }, desc: { tr: "Marka, model, numara bazlı stok takibi. Cam siparişi ve tedarikçi entegrasyonu.", en: "Brand, model, power-based stock tracking. Lens ordering and supplier integration." } },
    { key: "ai", iconKey: "chart", title: { tr: "Satış & Trend Analizi", en: "Sales & Trend Analytics" }, desc: { tr: "En çok satan çerçeveler, mevsimsel trendler, müşteri segmentasyonu ve karlılık analizleri.", en: "Best-selling frames, seasonal trends, customer segmentation, and profitability analytics." } },
  ],
  demoScenarios: [
    {
      id: "exam_reminder", title: { tr: "Muayene Hatırlatıcı", en: "Exam Reminder" },
      messages: [{ role: "ai", sublabel: { tr: "Sistem Önerisi", en: "System Suggestion" }, content: { tr: "Bu ay göz muayene tarihi gelen 56 müşteri tespit ettim. Kişiselleştirilmiş hatırlatma mesajı göndereyim mi?", en: "I've detected 56 customers due for eye exams this month. Shall I send personalized reminder messages?" } }],
      thoughts: [
        { tr: "müşteri muayene takvimleri taranıyor...", en: "scanning customer exam calendars..." },
        { tr: "56 müşteri muayene tarihine ulaşmış", en: "56 customers reached exam date" },
        { tr: "son reçete bilgileri getiriliyor", en: "fetching last prescription data" },
        { tr: "kişiselleştirilmiş mesaj şablonu oluşturuluyor", en: "creating personalized message template" },
        { tr: "gönderime hazır.", en: "ready to send." },
      ],
      slotFilling: {
        prompt: { tr: "56 müşteriye muayene hatırlatması gönderilecek. Kanal seçin:", en: "Exam reminders will be sent to 56 customers. Select channel:" },
        options: [{ tr: "SMS Gönder", en: "Send SMS" }, { tr: "WhatsApp Gönder", en: "Send WhatsApp" }],
        results: [{ tr: "56 müşteriye SMS ile muayene hatırlatması gönderildi.", en: "Exam reminders sent to 56 customers via SMS." }, { tr: "56 müşteriye WhatsApp ile muayene hatırlatması gönderildi.", en: "Exam reminders sent to 56 customers via WhatsApp." }],
      },
    },
    {
      id: "lens_order", title: { tr: "Cam Sipariş Takibi", en: "Lens Order Tracking" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Bugün teslim tarihi olan ama henüz teslim edilmemiş cam siparişlerini listele.", en: "List lens orders due today that haven't been delivered yet." } }],
      thoughts: [
        { tr: "sipariş verileri taranıyor: teslim tarihi=bugün", en: "scanning orders: delivery_date=today" },
        { tr: "8 bekleyen sipariş tespit edildi", en: "8 pending orders found" },
        { tr: "tedarikçi kargo durumları kontrol ediliyor", en: "checking supplier shipping statuses" },
        { tr: "3 sipariş kargoda, 5'i gecikmiş", en: "3 in transit, 5 delayed" },
        { tr: "durum raporu hazır.", en: "status report ready." },
      ],
      slotFilling: {
        prompt: { tr: "8 sipariş bugün teslim olmalı: 3'ü kargoda, 5'i gecikmiş. Geciken siparişler için tedarikçiye bildirim gönderelim mi?", en: "8 orders due today: 3 in transit, 5 delayed. Send supplier notification for delayed orders?" },
        options: [{ tr: "Bildirim Gönder", en: "Send Notification" }, { tr: "Müşterileri Bilgilendir", en: "Notify Customers" }],
        results: [{ tr: "5 geciken sipariş için tedarikçiye acil bildirim gönderildi.", en: "Urgent notification sent to supplier for 5 delayed orders." }, { tr: "5 müşteriye gecikme bildirimi ve özür mesajı gönderildi.", en: "Delay notification and apology sent to 5 customers." }],
      },
    },
    {
      id: "frame_analytics", title: { tr: "Çerçeve Analizi", en: "Frame Analytics" },
      messages: [{ role: "user", sublabel: { tr: "Sorgu", en: "Query" }, content: { tr: "Son 3 ayın en çok satan 10 çerçeve modelini ve stok durumlarını göster.", en: "Show the top 10 best-selling frame models and their stock status for the last 3 months." } }],
      thoughts: [
        { tr: "satış verileri analiz ediliyor: son 3 ay", en: "analyzing sales data: last 3 months" },
        { tr: "marka ve model bazlı sıralama yapılıyor", en: "ranking by brand and model" },
        { tr: "stok seviyeleri kontrol ediliyor", en: "checking stock levels" },
        { tr: "yeniden sipariş önerileri hesaplanıyor", en: "calculating reorder suggestions" },
        { tr: "rapor hazır.", en: "report ready." },
      ],
      slotFilling: {
        prompt: { tr: "Top 10 çerçeve: 4'ünün stoğu kritik seviyede. Otomatik sipariş oluşturulsun mu?", en: "Top 10 frames: 4 at critical stock level. Create automatic reorder?" },
        options: [{ tr: "Sipariş Oluştur", en: "Create Order" }, { tr: "Raporu İndir", en: "Download Report" }],
        results: [{ tr: "4 çerçeve modeli için tedarikçiye otomatik sipariş oluşturuldu.", en: "Automatic orders created for 4 frame models to suppliers." }, { tr: "Çerçeve analiz raporu Excel olarak indiriliyor.", en: "Frame analysis report downloading as Excel." }],
      },
    },
    {
      id: "insurance_billing", title: { tr: "SGK Cam Faturası", en: "Insurance Lens Billing" },
      messages: [{ role: "user", sublabel: { tr: "Komutunuz", en: "Your Command" }, content: { tr: "Bu hafta SGK kapsamında verilen camların faturalarını toplu olarak hazırla.", en: "Batch prepare invoices for lenses provided under insurance this week." } }],
      thoughts: [
        { tr: "SGK kapsamlı satışlar taranıyor: bu hafta", en: "scanning insurance-covered sales: this week" },
        { tr: "23 cam satışı bulundu", en: "23 lens sales found" },
        { tr: "reçete ve provizyon numaraları doğrulanıyor", en: "validating prescriptions and authorization numbers" },
        { tr: "e-Fatura XML'leri hazırlanıyor", en: "preparing e-Invoice XMLs" },
        { tr: "faturalar hazır.", en: "invoices ready." },
      ],
      slotFilling: {
        prompt: { tr: "23 SGK cam faturası hazır (Toplam: 68.000 ₺). Nasıl devam edelim?", en: "23 insurance lens invoices ready (₺68,000). How to proceed?" },
        options: [{ tr: "Onayla ve Gönder", en: "Approve & Submit" }, { tr: "Kontrol Et", en: "Review" }],
        results: [{ tr: "23 fatura e-imza ile mühürlenip SGK sistemine iletildi.", en: "23 invoices sealed with e-signature and submitted to insurance." }, { tr: "Fatura listesi kontrol ekranında.", en: "Invoice list on review screen." }],
      },
    },
  ],
};

// ─── Beauty (uses general as base with customized hero) ──
const beauty: SectorContent = {
  ...general,
  hero: {
    badge: { tr: "X-EAR v2.0 — Güzellik Salonları", en: "X-EAR v2.0 — Beauty Salons" },
    h1_1: { tr: "Güzellik Salonunuzu", en: "Grow Your Beauty" },
    h1_2: { tr: "Yapay Zeka ile Büyütün", en: "Salon with AI" },
    desc: {
      tr: "Randevu, müşteri, personel ve stok yönetimini tek platformda sunan yapay zeka destekli güzellik salonu CRM'i.",
      en: "AI-powered beauty salon CRM with appointment, customer, staff and inventory management in one platform.",
    },
  },
  painBadge: { tr: "Sektörün Gerçekleri", en: "Industry Realities" },
  painH2_1: { tr: "Manuel Süreçler Sizi", en: "Manual Processes Are" },
  painH2_2: { tr: "Yavaşlatıyor", en: "Slowing You Down" },
};

// ─── Registry ────────────────────────────────────────────
const registry: Record<SectorId, SectorContent> = { hearing, pharmacy, hospital, hotel, medical, optic, beauty, general };

export function getSectorContent(sector: SectorId): SectorContent {
  return registry[sector];
}

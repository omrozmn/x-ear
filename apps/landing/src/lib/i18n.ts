"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type Locale = "tr" | "en";

// --------------- Translation Dictionary ---------------
const translations: Record<string, Record<Locale, string>> = {
    // ---- Hero ----
    "hero.badge": { tr: "X-EAR v2.0 - Sınırların Ötesinde", en: "X-EAR v2.0 - Beyond Limits" },
    "hero.h1_1": { tr: "İşitme Merkezinizi", en: "Grow Your Hearing" },
    "hero.h1_2": { tr: "Yapay Zeka ile Büyütün", en: "Center with AI" },
    "hero.desc": {
        tr: "Dünyanın en gelişmiş mekansal CRM deneyimi. İşitme merkezinizi salt veriden akışkan bir zekaya dönüştürün.",
        en: "The world's most advanced spatial CRM experience. Transform your hearing center from raw data into fluid intelligence."
    },
    "hero.cta1": { tr: "Tarihe Geçin", en: "Get Started" },
    "hero.cta2": { tr: "Sistemi Keşfet", en: "Explore the System" },

    // ---- Header ----
    "nav.features": { tr: "Özellikler", en: "Features" },
    "nav.pricing": { tr: "Fiyatlandırma", en: "Pricing" },
    "nav.ai": { tr: "Yapay Zeka", en: "AI Assistant" },
    "nav.partner": { tr: "Partner Programı", en: "Partner Program" },
    "nav.blog": { tr: "Blog", en: "Blog" },
    "nav.faq": { tr: "SSS", en: "FAQ" },
    "header.login": { tr: "Giriş Yap", en: "Log In" },
    "header.register": { tr: "Ücretsiz Başla", en: "Start Free" },
    "header.start": { tr: "Hemen Başla", en: "Get Started" },

    // ---- PainPoints ----
    "pain.badge": { tr: "Sektörün Gerçekleri", en: "Industry Realities" },
    "pain.h2_1": { tr: "Klasik Yazılımlar Sizi", en: "Traditional Software Is" },
    "pain.h2_2": { tr: "Yavaşlatıyor", en: "Slowing You Down" },
    "pain.sgk.title": { tr: "SGK Kesintileri ve Redler", en: "Insurance Rejections & Deductions" },
    "pain.sgk.desc": {
        tr: "Eksik evrak veya hatalı kod yüzünden Medula'dan dönen faturalar. Her ay kaybedilen binlerce lira ve günlerce süren düzeltme trafiği.",
        en: "Rejected invoices from incomplete documents or incorrect codes. Thousands lost each month and days spent on corrections."
    },
    "pain.patient.title": { tr: "Kaçan Hastalar", en: "Lost Patients" },
    "pain.patient.desc": {
        tr: "Pil bitimi veya cihaz bakımı gelen hastayı unutmak. Rakiplerinize kaptırdığınız, aslında sadık olması gereken yüzlerce hasta kaydı.",
        en: "Forgetting patients due for battery replacement or device maintenance. Hundreds of loyal patients lost to competitors."
    },
    "pain.time.title": { tr: "Manuel Veri Hamallığı", en: "Manual Data Entry" },
    "pain.time.desc": {
        tr: "Odyogramları elle girmek, WhatsApp'tan stok sormak, Excel'de cari tutmak. Uzmanlığınıza ayırmanız gereken vaktin evrak işlerine gitmesi.",
        en: "Manually entering audiograms, checking stock via WhatsApp, tracking accounts in Excel. Time that should go to your expertise wasted on paperwork."
    },

    // ---- FeatureCards ----
    "features.h2_1": { tr: "Ekosistemin", en: "Discover the Power" },
    "features.h2_2": { tr: "Gücünü Keşfedin", en: "of the Ecosystem" },
    "feat.patient.title": { tr: "Kapsamlı Hasta Yönetimi", en: "Comprehensive Patient Management" },
    "feat.patient.desc": {
        tr: "Tüm hasta bilgilerini, randevularınızı ve geçmiş işlemlerinizi tek bir yerden kolayca yönetin.",
        en: "Easily manage all patient records, appointments, and past transactions from one place."
    },
    "feat.device.title": { tr: "Cihaz Takibi ve Denemeler", en: "Device Tracking & Trials" },
    "feat.device.desc": {
        tr: "Stoktaki cihazları, hastaların deneme süreçlerini ve cihaz iadelerini kolayca takip edin.",
        en: "Track inventory devices, patient trial periods, and device returns with ease."
    },
    "feat.crm.title": { tr: "Otopilot CRM & Hatırlatıcı", en: "Autopilot CRM & Reminders" },
    "feat.crm.desc": {
        tr: "Zamanı gelmiş bakımları, filtre değişimlerini ve kontrolleri yapay zeka ile otomatik takip edin.",
        en: "Automatically track due maintenance, filter changes, and check-ups with AI."
    },
    "feat.sms.title": { tr: "Akıllı SMS Kampanyaları", en: "Smart SMS Campaigns" },
    "feat.sms.desc": {
        tr: "Doğum günü kutlamaları, randevu hatırlatmaları ve özel kampanyalar için otomatik SMS gönderin.",
        en: "Send automated SMS for birthday greetings, appointment reminders, and special campaigns."
    },
    "feat.inventory.title": { tr: "Hassas Envanter Kontrolü", en: "Precise Inventory Control" },
    "feat.inventory.desc": {
        tr: "Stok seviyelerinizi anlık olarak izleyin, kritik stok uyarıları alın ve tedarik süreçlerinizi optimize edin.",
        en: "Monitor stock levels in real-time, receive critical stock alerts, and optimize your supply chain."
    },
    "feat.ai.title": { tr: "Yapay Zeka Destekli Analiz", en: "AI-Powered Analytics" },
    "feat.ai.desc": {
        tr: "Satış ve hasta verileri üzerine kurulu derin analizlerle kliniğinizin geleceğini öngörün.",
        en: "Predict your clinic's future with deep analytics built on sales and patient data."
    },

    // ---- SentientDemo ----
    "demo.h2_1": { tr: "Sadece Bir Yazılım Değil,", en: "Not Just Software," },
    "demo.h2_2": { tr: "Zeki Bir Asistan", en: "An Intelligent Assistant" },
    "demo.desc": {
        tr: "X-EAR her işlemi anlar, düşünür ve sizin yerinize otopilotta yürütür. Doğal dilde komut verin, gerisini zeka halletsin.",
        en: "X-EAR understands every task, thinks, and executes on autopilot for you. Give commands in natural language, let intelligence handle the rest."
    },
    "demo.shell": { tr: "Ajan Hafıza Kabuğu", en: "Agent Memory Shell" },
    "demo.waiting": { tr: "girdi bekleniyor...", en: "waiting for input..." },
    "demo.complete": { tr: "görev değerlendirmesi tamamlandı. kullanıcı bekleniyor...", en: "task evaluation complete. waiting for user..." },
    "demo.approval": { tr: "Sistem Onayı Bekleniyor", en: "Awaiting System Approval" },
    "demo.done": { tr: "İşlem Tamamlandı", en: "Action Completed" },
    "demo.processing": { tr: "İşleniyor...", en: "Processing..." },
    "demo.you": { tr: "SİZ", en: "YOU" },

    // ---- SentientDemo Scenarios ----
    // Mass SMS
    "sms.title": { tr: "Toplu SMS Otopilotu", en: "Bulk SMS Autopilot" },
    "sms.user.sublabel": { tr: "Komutunuz", en: "Your Command" },
    "sms.user.content": {
        tr: "Şu an cihaz denemesinde olan ve 7 gününü doldurmuş hastalara memnuniyet SMS'i gönderelim.",
        en: "Let's send a satisfaction SMS to patients who have been on device trial for 7 days."
    },
    "sms.thought1": { tr: "niyet analizi: toplu_sms_kampanyası", en: "analyzing intent: bulk_sms_campaign" },
    "sms.thought2": { tr: "db sorgusu: hastalar WHERE durum='deneme' AND gün >= 7", en: "querying db: patients WHERE status='trial' AND days >= 7" },
    "sms.thought3": { tr: "sonuçlar ayrıştırılıyor... 43 eşleşme bulundu", en: "parsing results... found 43 matches" },
    "sms.thought4": { tr: "yüksek dönüşümlü SMS şablonu oluşturuluyor", en: "generating high-conversion SMS template" },
    "sms.thought5": { tr: "derleme tamamlandı. işleme hazır.", en: "compilation finished. ready for action." },
    "sms.prompt": {
        tr: "Kriterlere uyan 43 hasta bulundu. Örnek mesaj: 'X-EAR kliniğimizden denediğiniz cihazla ilgili deneyiminizi merak ediyoruz.' Gönderimi başlatayım mı? Mesaj sonuna klinik telefonunuz eklensin mi?",
        en: "43 patients match the criteria. Sample message: 'We'd love to hear about your experience with the device from our X-EAR clinic.' Shall I start sending? Should I add your clinic phone number at the end?"
    },
    "sms.opt1": { tr: "Evet, ekle", en: "Yes, add it" },
    "sms.opt2": { tr: "Hayır, gerek yok", en: "No, not needed" },
    "sms.result1": { tr: "İşlem onaylandı. Telefon numarası eklenerek 43 hastaya SMS gönderimi başlatıldı.", en: "Confirmed. SMS delivery to 43 patients started with phone number appended." },
    "sms.result2": { tr: "İşlem onaylandı. Mevcut taslak ile 43 hastaya SMS gönderimi başlatıldı.", en: "Confirmed. SMS delivery to 43 patients started with the current draft." },

    // SGK Invoice
    "sgk.title": { tr: "SGK Otopilot", en: "Insurance Autopilot" },
    "sgk.ai.sublabel": { tr: "Sistem Önerisi", en: "System Suggestion" },
    "sgk.ai.content": {
        tr: "Bugün 12 adet kuruma fatura edilecek yeni satış tespit ettim. SGK Medula sistemine toplu bildirim yapıp icmal sürecini başlatayım mı?",
        en: "I've detected 12 new sales to invoice to institutions today. Shall I batch notify the insurance system and start the reconciliation process?"
    },
    "sgk.thought1": { tr: "satışlar taranıyor: tür='SGK' AND durum='faturasız'", en: "scanning sales: type='SGK' AND status='uninvoiced'" },
    "sgk.thought2": { tr: "evrak no ve icd10 kodları Medula API ile doğrulanıyor...", en: "validating document no & icd10 codes via Medula API..." },
    "sgk.thought3": { tr: "12 kayıt doğrulandı. 0 hata tespit edildi.", en: "12 records validated. 0 errors detected." },
    "sgk.thought4": { tr: "e-Arşiv entegrasyonu için XML hazırlanıyor", en: "preparing XML payloads for e-Archive integration" },
    "sgk.thought5": { tr: "fatura taslakları oluşturuluyor...", en: "creating invoice drafts..." },
    "sgk.prompt": {
        tr: "Faturalar e-imza ile mühürlenmek üzere hazır. Nasıl devam edelim?",
        en: "Invoices are ready to be sealed with e-signature. How shall we proceed?"
    },
    "sgk.opt1": { tr: "Onayla ve Gönder", en: "Approve & Send" },
    "sgk.opt2": { tr: "Taslaklara Kaydet", en: "Save as Drafts" },
    "sgk.result1": { tr: "12 adet SGK faturası e-imza ile mühürlenip GİB sistemine başarıyla iletildi.", en: "12 insurance invoices sealed with e-signature and successfully submitted." },
    "sgk.result2": { tr: "12 adet fatura taslak olarak kaydedildi. İşlemi dilediğiniz zaman tamamlayabilirsiniz.", en: "12 invoices saved as drafts. You can complete the process anytime." },

    // Uninvoiced Sales
    "inv.title": { tr: "Finans & Kontrol", en: "Finance & Control" },
    "inv.user.sublabel": { tr: "Sorgu", en: "Query" },
    "inv.user.content": {
        tr: "Bu ay içinde cihazı teslim edilmiş ama henüz faturası kesilmemiş olan tüm satışları listele.",
        en: "List all sales this month where the device was delivered but not yet invoiced."
    },
    "inv.thought1": { tr: "niyet analizi: faturasız_satış_arama", en: "analyzing intent: search_uninvoiced_sales" },
    "inv.thought2": { tr: "db sorgusu: satışlar WHERE teslimat='tamam' AND fatura='yok'", en: "querying db: sales WHERE delivery='completed' AND invoice='none'" },
    "inv.thought3": { tr: "toplam hesaplanıyor... (215.000 TRY)", en: "calculating aggregated totals... (215,000 TRY)" },
    "inv.thought4": { tr: "müşteri VKN/TCKN ve vergi dairesi verileri getiriliyor...", en: "fetching customer tax ID and tax office data..." },
    "inv.thought5": { tr: "sonuçlar yapılandırılmış tablo formatına dönüştürülüyor", en: "packaging results into a structured table format" },
    "inv.prompt": {
        tr: "Toplam 8 adet faturasız işlem tespit ettim (Toplam: 215.000 ₺). Hazırlanan faturasız işlemler raporu için aksiyonunuz:",
        en: "Found 8 uninvoiced transactions (Total: ₺215,000). Action for the prepared uninvoiced transactions report:"
    },
    "inv.opt1": { tr: "Faturaları Kes", en: "Generate Invoices" },
    "inv.opt2": { tr: "Excel Olarak İndir", en: "Download as Excel" },
    "inv.result1": { tr: "8 adet faturasız işlem için e-Fatura oluşturma süreci başlatıldı.", en: "e-Invoice generation started for 8 uninvoiced transactions." },
    "inv.result2": { tr: "Rapor Excel formatında hazırlandı ve cihazınıza indiriliyor.", en: "Report prepared in Excel format and downloading to your device." },

    // OCR Supplier
    "ocr.title": { tr: "Akıllı Cüzdan (OCR)", en: "Smart Wallet (OCR)" },
    "ocr.user.sublabel": { tr: "Belge Yüklemesi", en: "Document Upload" },
    "ocr.user.content": {
        tr: "[ 📎 fatura_img_010.jpg ] Şu faturayı sisteme masraf olarak kaydet.",
        en: "[ 📎 invoice_img_010.jpg ] Save this invoice as an expense in the system."
    },
    "ocr.thought1": { tr: "görüntü yüklemesi işleniyor...", en: "processing image upload..." },
    "ocr.thought2": { tr: "metni okumak için Vision OCR algoritması çalıştırılıyor", en: "executing Vision OCR algorithm to read text" },
    "ocr.thought3": { tr: "varlıklar çıkarılıyor: VKN, Tutar, Tarih, Ünvan", en: "extracting entities: Tax ID, Amount, Date, Company" },
    "ocr.thought4": { tr: "veri çıkarıldı: Widex A.Ş., 45.000 TRY", en: "data extracted: Widex Ltd., 45,000 TRY" },
    "ocr.thought5": { tr: "tedarikçiler sorgulanıyor WHERE ad='Widex...' -> BULUNAMADI", en: "querying suppliers WHERE name='Widex...' -> NOT FOUND" },
    "ocr.thought6": { tr: "yeni_tedarikçi_iş_akışı tetikleniyor", en: "triggering new_supplier_workflow" },
    "ocr.prompt": {
        tr: "Belge 'Widex A.Ş.' firmasına ait (45.000 ₺). Sisteminizde bu tedarikçi kayıtlı değil. Yeni tedarikçi olarak ekleyip faturayı işleyeyim mi?",
        en: "Document belongs to 'Widex Ltd.' (₺45,000). This supplier is not registered in your system. Shall I add as a new supplier and process the invoice?"
    },
    "ocr.opt1": { tr: "Kaydet ve Faturayı İşle", en: "Save & Process Invoice" },
    "ocr.opt2": { tr: "Sadece Faturayı Oku", en: "Read Invoice Only" },
    "ocr.result1": { tr: "Widex A.Ş. sisteme kaydedildi ve 45.000 ₺ tutarındaki fatura masraf olarak işlendi.", en: "Widex Ltd. registered and the ₺45,000 invoice processed as an expense." },
    "ocr.result2": { tr: "Fatura verileri Widex A.Ş. carisi olmadan serbest masraf olarak kaydedildi.", en: "Invoice data saved as a standalone expense without a Widex Ltd. account." },

    // ---- InteractiveRoi ----
    "roi.h2_1": { tr: "Gürültüyü Kesin;", en: "Cut the Noise;" },
    "roi.h2_2": { tr: "Performansı Katlayın", en: "Multiply Performance" },
    "roi.desc": {
        tr: "İş yükünüzü yapay zekaya devredin. Ne kadar kazandığınızı kendi gözlerinizle hesaplayın.",
        en: "Delegate your workload to AI. Calculate your savings with your own eyes."
    },
    "roi.clinics": { tr: "Şube Sayısı", en: "Number of Branches" },
    "roi.staff": { tr: "Personel Sayısı", en: "Staff Count" },
    "roi.staff_note": { tr: "Şube başına düşen ortalama personel sayısı", en: "Average staff per branch" },
    "roi.hours_label": { tr: "Aylık Kazanılan Zaman", en: "Monthly Time Saved" },
    "roi.hours_unit": { tr: "Saat", en: "Hours" },
    "roi.revenue_label": { tr: "Potansiyel Ek Ciro (Yıllık)", en: "Potential Extra Revenue (Yearly)" },

    // ---- Footer ----
    "footer.desc": {
        tr: "Dünyanın en gelişmiş mekansal CRM deneyimi. Akıllı klinik yönetimi ile zaman kazanın, hata payını sıfırlayın.",
        en: "The world's most advanced spatial CRM experience. Save time and eliminate errors with smart clinic management."
    },
    "footer.product": { tr: "Ürün", en: "Product" },
    "footer.features": { tr: "Özellikler", en: "Features" },
    "footer.ai_assistant": { tr: "AI Asistan", en: "AI Assistant" },
    "footer.roi_calc": { tr: "Karlılık Hesaplayıcı", en: "ROI Calculator" },
    "footer.pricing": { tr: "Fiyatlandırma", en: "Pricing" },
    "footer.faq": { tr: "Sıkça Sorulan Sorular", en: "FAQ" },
    "footer.solutions": { tr: "Çözümler", en: "Solutions" },
    "footer.sgk": { tr: "SGK Medula Otomasyonu (Yakında)", en: "Insurance Automation (Coming Soon)" },
    "footer.appointment": { tr: "Akıllı Randevu", en: "Smart Appointments" },
    "footer.stock": { tr: "Stok ve Cihaz Takibi", en: "Stock & Device Tracking" },
    "footer.partner": { tr: "Partner Programı", en: "Partner Program" },
    "footer.contact": { tr: "İletişim", en: "Contact" },
    "footer.location": { tr: "İstanbul, Türkiye", en: "Istanbul, Turkey" },
    "footer.rights": { tr: "Tüm hakları saklıdır.", en: "All rights reserved." },
    "footer.privacy": { tr: "Gizlilik Sözleşmesi", en: "Privacy Policy" },
    "footer.terms": { tr: "Kullanım Koşulları", en: "Terms of Service" },

    // ---- AEO Extras ----
    "aeo.summary": { tr: "AI Özet", en: "AI Summary" },
    "aeo.key_insight": { tr: "Kritik İçgörü", en: "Key Insight" },
    "aeo.entity_definition": { tr: "Varlık Tanımı", en: "Entity Definition" },
    "aeo.faq_title": { tr: "Sıkça Sorulan Sorular (SSS)", en: "Frequently Asked Questions (FAQ)" },

    // Entity: X-Ear
    "entity.xear.title": { tr: "X-Ear Nedir?", en: "What is X-Ear?" },
    "entity.xear.desc": {
        tr: "X-Ear, işitme merkezleri için geliştirilmiş yapay zeka destekli bir CRM ekosistemidir.",
        en: "X-Ear is an AI-powered CRM ecosystem developed for hearing centers."
    },
    "entity.xear.type_label": { tr: "Tür", en: "Type" },
    "entity.xear.type_val": { tr: "SaaS / AI İşitme CRM", en: "SaaS / AI Hearing CRM" },
    "entity.xear.purpose_label": { tr: "Amaç", en: "Purpose" },
    "entity.xear.purpose_val": { tr: "Klinik Yönetimi ve Büyüme", en: "Clinic Management & Growth" },
    "entity.xear.feature_label": { tr: "Ana Özellik", en: "Key Feature" },
    "entity.xear.feature_val": { tr: "Otopilot İş Akışları", en: "Autopilot Workflows" },
};

// --------------- Locale Detection ---------------
export function detectLocale(): Locale {
    if (typeof navigator === "undefined") return "tr"; // SSR default
    const lang = navigator.language || (navigator as any).userLanguage || "tr";
    return lang.toLowerCase().startsWith("tr") ? "tr" : "en";
}

// --------------- Translation Function ---------------
export function t(key: string, locale: Locale): string {
    return translations[key]?.[locale] ?? translations[key]?.["en"] ?? key;
}

// --------------- React Context ---------------
import React from "react";

interface LocaleContextValue {
    locale: Locale;
    t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
    locale: "tr",
    t: (key) => key,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState<Locale>("tr");

    useEffect(() => {
        setLocale(detectLocale());
    }, []);

    const translate = (key: string) => t(key, locale);

    return React.createElement(
        LocaleContext.Provider,
        { value: { locale, t: translate } },
        children
    );
}

export function useLocale() {
    return useContext(LocaleContext);
}

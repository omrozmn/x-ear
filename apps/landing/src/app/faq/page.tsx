"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { TextReveal } from "@/components/ui/TextReveal";
import { motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { AISummary } from "@/components/ui/AISummary";
import { EntityDefinition } from "@/components/ui/EntityDefinition";
import { useSectorStore, type SectorId } from "@/lib/sector-store";

interface FAQ {
    question: string;
    answer: string;
}

const commonFaqs: FAQ[] = [
    {
        question: "Verilerim güvende mi?",
        answer: "Evet, verilerinizin güvenliği bizim için en önemli önceliktir. Tüm verileriniz, sektör standardı güvenlik protokolleri ile korunan bulut sunucularımızda şifrelenerek saklanır. Düzenli olarak yedeklemeler alınır ve sistemimiz sürekli olarak izlenir."
    },
    {
        question: "Hangi paket bana uygun?",
        answer: "Paketlerimiz, işletmenizin büyüklüğüne ve ihtiyaçlarına göre ölçeklendirilmiştir. 'Temel' paketimiz yeni başlayan küçük işletmeler için idealken, 'Profesyonel' ve 'Business' paketlerimiz büyüyen ve daha fazla otomasyon ihtiyacı duyan işletmelere yöneliktir."
    },
];

const sectorFaqs: Record<SectorId, FAQ[]> = {
    hearing: [
        {
            question: "X-Ear İşitme Merkezi CRM nedir?",
            answer: "X-Ear, işitme merkezleri için özel olarak tasarlanmış bulut tabanlı bir CRM yazılımıdır. Hasta takibi, randevu yönetimi, cihaz denemeleri, envanter kontrolü, SGK entegrasyonu ve SMS pazarlama gibi birçok süreci dijitalleştirerek kliniğinizin verimliliğini artırır."
        },
        {
            question: "SGK Medula entegrasyonu nasıl çalışıyor?",
            answer: "SGK Medula entegrasyonu sayesinde e-reçeteleri OCR teknolojisi ile otomatik olarak sisteme aktarabilirsiniz. Manuel veri girişini ortadan kaldırır, zamandan tasarruf eder ve hataları en aza indirirsiniz."
        },
        {
            question: "NOAH entegrasyonu var mı?",
            answer: "Evet, NOAH odyoloji yazılımı ile tam entegrasyon sağlanır. Odyogram sonuçları, cihaz ayarları ve hasta verileri otomatik senkronize edilir."
        },
    ],
    pharmacy: [
        {
            question: "X-Ear Eczane CRM nedir?",
            answer: "X-Ear Eczane, eczaneler için özel olarak tasarlanmış bir CRM yazılımıdır. Reçete takibi, stok yönetimi, müşteri sadakat programları, ilaç etkileşim uyarıları ve otomatik sipariş gibi süreçleri tek platformda yönetmenizi sağlar."
        },
        {
            question: "Stok yönetimi nasıl çalışıyor?",
            answer: "Otomatik stok takibi ile son kullanma tarihi yaklaşan ürünler, minimum stok uyarıları ve tedarikçi sipariş otomasyonu dahil eksiksiz envanter yönetimi sunar."
        },
        {
            question: "SGK e-reçete entegrasyonu var mı?",
            answer: "Evet, SGK Medula sistemi ile entegre çalışarak e-reçeteleri otomatik olarak işler ve eczane süreçlerinizi hızlandırır."
        },
    ],
    hospital: [
        {
            question: "X-Ear Hastane CRM nedir?",
            answer: "X-Ear Hastane, hastaneler ve poliklinikler için tasarlanmış kapsamlı bir CRM çözümüdür. Hasta kabul, randevu, yatış, taburculuk, faturalama ve raporlama süreçlerini dijitalleştirir."
        },
        {
            question: "Çoklu branş desteği var mı?",
            answer: "Evet, farklı bölümler ve branşlar için ayrı yapılandırmalar, doktor bazlı randevu yönetimi ve departmanlar arası hasta transferi desteklenir."
        },
        {
            question: "Entegrasyon seçenekleri neler?",
            answer: "HBYS, LIS, PACS ve Medula entegrasyonları ile mevcut hastane sistemlerinizle sorunsuz çalışır."
        },
    ],
    hotel: [
        {
            question: "X-Ear Otel CRM nedir?",
            answer: "X-Ear Otel, konaklama tesisleri için tasarlanmış bir CRM yazılımıdır. Misafir ilişkileri, rezervasyon takibi, housekeeping yönetimi, gelir analizi ve sadakat programlarını tek platformda yönetir."
        },
        {
            question: "Rezervasyon yönetimi nasıl çalışıyor?",
            answer: "Online ve offline rezervasyonları tek panelden yönetebilir, oda müsaitlik takibi yapabilir ve OTA kanalları ile entegre çalışabilirsiniz."
        },
        {
            question: "Misafir sadakat programı var mı?",
            answer: "Evet, tekrar gelen misafirleri tanıma, özel teklifler, puan sistemi ve VIP misafir yönetimi dahil kapsamlı sadakat araçları sunar."
        },
    ],
    medical: [
        {
            question: "X-Ear Medikal Firma CRM nedir?",
            answer: "X-Ear Medikal, medikal cihaz ve malzeme firmaları için tasarlanmış bir CRM yazılımıdır. Bayi yönetimi, cihaz takibi, UTS entegrasyonu, teknik servis ve saha satış yönetimi sunar."
        },
        {
            question: "UTS entegrasyonu var mı?",
            answer: "Evet, Ürün Takip Sistemi (UTS) ile tam entegrasyon sağlanır. Medikal cihaz ve malzemelerin seri numarası bazlı izlenebilirliği desteklenir."
        },
        {
            question: "Bayi ve distribütör yönetimi nasıl çalışıyor?",
            answer: "Bayi bazlı fiyatlandırma, bölgesel satış hedefleri, sipariş takibi ve performans raporlama ile distribüsyon ağınızı etkin yönetirsiniz."
        },
    ],
    optic: [
        {
            question: "X-Ear Optik CRM nedir?",
            answer: "X-Ear Optik, optik mağazalar için tasarlanmış bir CRM yazılımıdır. Reçete takibi, lens/çerçeve envanteri, müşteri ölçüleri, sipariş yönetimi ve laboratuvar entegrasyonu sunar."
        },
        {
            question: "Reçete ve ölçü takibi nasıl yapılıyor?",
            answer: "Müşterilerin göz reçeteleri, pupil mesafesi, lens tipi tercihleri ve geçmiş siparişleri dijital ortamda saklanır ve kolayca erişilir."
        },
        {
            question: "Laboratuvar entegrasyonu var mı?",
            answer: "Evet, lens laboratuvarları ile entegre sipariş gönderimi, üretim takibi ve teslimat bildirimleri desteklenir."
        },
    ],
    beauty: [
        {
            question: "X-Ear Güzellik Salonu CRM nedir?",
            answer: "X-Ear Güzellik, kuaför ve güzellik salonları için tasarlanmış bir CRM yazılımıdır. Randevu yönetimi, müşteri geçmişi, personel performansı, ürün satışı ve sadakat programları sunar."
        },
        {
            question: "Online randevu sistemi var mı?",
            answer: "Evet, müşterileriniz web veya mobil üzerinden 7/24 randevu alabilir. Otomatik hatırlatma SMS'leri ile no-show oranınızı düşürürsünüz."
        },
        {
            question: "Personel ve komisyon yönetimi nasıl çalışıyor?",
            answer: "Her personelin çalışma saatleri, uzmanlık alanları, randevu yoğunluğu ve komisyon oranları ayrı ayrı yönetilir."
        },
    ],
    general: [
        {
            question: "X-Ear CRM nedir?",
            answer: "X-Ear, her sektördeki işletmeler için uyarlanabilir bulut tabanlı bir CRM yazılımıdır. Müşteri ilişkileri, randevu yönetimi, faturalama, envanter ve raporlama süreçlerini dijitalleştirir."
        },
        {
            question: "Hangi sektörlere hizmet veriyorsunuz?",
            answer: "İşitme merkezleri, eczaneler, hastaneler, oteller, güzellik salonları, optik mağazalar ve medikal firmalar başta olmak üzere birçok sektöre özel çözümler sunuyoruz."
        },
        {
            question: "Ücretsiz deneme var mı?",
            answer: "Evet, 7 günlük ücretsiz deneme süreci ile tüm özellikleri keşfedebilirsiniz. Kredi kartı gerekmez."
        },
    ],
};

const sectorSummary: Record<SectorId, string> = {
    hearing: "X-Ear, işitme merkezleri için randevu, hasta, SGK ve stok yönetimini tek bir platformda toplayan yapay zeka destekli bir CRM ekosistemidir.",
    pharmacy: "X-Ear, eczaneler için reçete takibi, stok yönetimi ve müşteri ilişkilerini tek platformda yöneten akıllı bir CRM çözümüdür.",
    hospital: "X-Ear, hastaneler için hasta kabul, randevu, faturalama ve raporlama süreçlerini dijitalleştiren kapsamlı bir CRM platformudur.",
    hotel: "X-Ear, oteller için misafir ilişkileri, rezervasyon ve gelir yönetimini tek platformda sunan akıllı bir CRM çözümüdür.",
    medical: "X-Ear, medikal firmalar için bayi yönetimi, cihaz takibi ve UTS entegrasyonu sunan sektöre özel bir CRM platformudur.",
    optic: "X-Ear, optik mağazalar için reçete takibi, envanter ve laboratuvar entegrasyonu sunan dijital bir CRM çözümüdür.",
    beauty: "X-Ear, güzellik salonları için randevu, müşteri ve personel yönetimini tek platformda sunan akıllı bir CRM çözümüdür.",
    general: "X-Ear, her sektördeki işletmeler için müşteri ilişkileri, randevu ve faturalama süreçlerini dijitalleştiren yapay zeka destekli bir CRM ekosistemidir.",
};

export default function FAQPage() {
    const { t } = useLocale();
    const sector = useSectorStore((s) => s.sector);

    const faqs = [...(sectorFaqs[sector] || sectorFaqs.general), ...commonFaqs];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    const xearEntityItems = [
        { label: t("entity.xear.type_label"), value: t("entity.xear.type_val") },
        { label: t("entity.xear.purpose_label"), value: t("entity.xear.purpose_val") },
        { label: t("entity.xear.feature_label"), value: t("entity.xear.feature_val") },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-accent-blue/30 relative flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Header />
            <div className="fixed inset-0 z-0">
                <Scene />
            </div>

            <main className="flex-grow pt-32 pb-24 relative z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-glow mb-6">
                            <TextReveal>{t("aeo.faq_title").split(" ")[0]}</TextReveal>
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-purple font-display font-bold">
                                <TextReveal delay={0.4}>{t("aeo.faq_title").split(" ").slice(1).join(" ")}</TextReveal>
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-12">
                            {t("hero.desc")}
                        </p>

                        <AISummary content={sectorSummary[sector] || sectorSummary.general} />

                        <EntityDefinition
                            title={t("entity.xear.title")}
                            description={t("entity.xear.desc")}
                            items={xearEntityItems}
                        />
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <FAQItem key={idx} {...faq} index={idx} />
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <HyperGlassCard
                className={`overflow-hidden transition-all duration-300 ${isOpen ? 'ring-1 ring-accent-blue/30 shadow-lg shadow-accent-blue/10' : ''}`}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full text-left p-6 md:p-8 flex items-center justify-between group"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-accent-blue/10 text-accent-blue' : 'bg-foreground/5 text-foreground/40 group-hover:text-foreground/60'}`}>
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <h3 className={`text-lg md:text-xl font-display font-bold transition-colors ${isOpen ? 'text-foreground' : 'text-foreground/80'}`}>
                            {question}
                        </h3>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-foreground/20 transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent-blue' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 md:px-8 pb-8 pt-0 text-foreground/60 leading-relaxed text-base md:text-lg border-t border-foreground/5 mt-2 pt-6">
                        {answer}
                    </div>
                </div>
            </HyperGlassCard>
        </motion.div>
    );
}

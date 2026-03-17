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

const faqs = [
    {
        question: "X-Ear nedir ve ne işe yarar?",
        answer: "X-Ear, işitme merkezleri için özel olarak tasarlanmış bulut tabanlı bir CRM (Müşteri İlişkileri Yönetimi) yazılımıdır. Hasta takibi, randevu yönetimi, cihaz denemeleri, envanter kontrolü, SGK entegrasyonu ve SMS pazarlama gibi birçok süreci dijitalleştirerek kliniğinizin verimliliğini artırır."
    },
    {
        question: "Hangi paket bana uygun?",
        answer: "Paketlerimiz, kliniğinizin büyüklüğüne ve ihtiyaçlarına göre ölçeklendirilmiştir. 'Temel' paketimiz yeni başlayan küçük klinikler için idealken, 'Profesyonel' ve 'Business' paketlerimiz büyüyen ve daha fazla otomasyon ihtiyacı duyan işletmelere yöneliktir. 'Enterprise' paketimiz ise zincir klinikler için özel çözümler sunar."
    },
    {
        question: "SGK Medula entegrasyonu nasıl çalışıyor?",
        answer: "Business ve Enterprise paketlerimizde bulunan SGK Medula entegrasyonu, e-reçeteleri sistemimize OCR (Optik Karakter Tanıma) teknolojisi ile otomatik olarak aktarmanızı sağlar. Bu sayede manuel veri girişini ortadan kaldırır, zamandan tasarruf eder ve hataları en aza indirirsiniz."
    },
    {
        question: "Verilerim güvende mi?",
        answer: "Evet, verilerinizin güvenliği bizim için en önemli önceliktir. Tüm verileriniz, sektör standardı güvenlik protokolleri ile korunan bulut sunucularımızda şifrelenerek saklanır. Düzenli olarak yedeklemeler alınır ve sistemimiz sürekli olarak izlenir."
    }
];

export default function FAQPage() {
    const { t } = useLocale();

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

                        <AISummary
                            content="X-Ear, işitme merkezleri için randevu, hasta, SGK ve stok yönetimini tek bir platformda toplayan yapay zeka destekli bir CRM ekosistemidir."
                        />

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

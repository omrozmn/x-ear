"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Newspaper,
  HelpCircle,
  BarChart3,
  ArrowRight,
  Sparkles,
  BookOpen,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { HyperGlassCard } from "./HyperGlassCard";
import { TextReveal } from "./TextReveal";
import { useLocale, type Locale } from "@/lib/i18n";
import { useSectorStore, type SectorId } from "@/lib/sector-store";
import { apiClient } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────
type L = Record<Locale, string>;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  authorName: string;
  publishedAt?: string;
}

interface SectorInsight {
  icon: "trend" | "lightbulb" | "sparkle";
  title: L;
  desc: L;
}

interface SectorDiscoveryData {
  sectionTitle: L;
  sectionDesc: L;
  insights: SectorInsight[];
  faqTeaser: { question: L; answer: L };
  blogCta: L;
}

// ─── Sector Discovery Content ────────────────────────────
const discoveryData: Record<SectorId, SectorDiscoveryData> = {
  hearing: {
    sectionTitle: { tr: "İşitme Merkezi İçerikleri", en: "Hearing Center Resources" },
    sectionDesc: { tr: "Sektörünüze özel keşfedilmiş içerikler", en: "Curated content discovered for your sector" },
    insights: [
      { icon: "trend", title: { tr: "NOAH 4.x Geçiş Rehberi", en: "NOAH 4.x Migration Guide" }, desc: { tr: "Yeni NOAH sürümüne sorunsuz geçiş için adım adım kılavuz.", en: "Step-by-step guide for seamless migration to the new NOAH version." } },
      { icon: "lightbulb", title: { tr: "SGK Red Oranını %40 Azaltın", en: "Reduce Insurance Rejections by 40%" }, desc: { tr: "OCR + otomatik doğrulama ile fatura redlerini minimize edin.", en: "Minimize invoice rejections with OCR + automatic validation." } },
      { icon: "sparkle", title: { tr: "AI ile Odyogram Analizi", en: "Audiogram Analysis with AI" }, desc: { tr: "Yapay zeka destekli odyogram okuma ve cihaz önerisi.", en: "AI-powered audiogram reading and device recommendation." } },
    ],
    faqTeaser: { question: { tr: "SGK Medula entegrasyonu nasıl çalışıyor?", en: "How does SGK Medula integration work?" }, answer: { tr: "OCR teknolojisi ile e-reçeteleri otomatik aktarım, sıfır manuel veri girişi.", en: "Automatic e-prescription import with OCR technology, zero manual data entry." } },
    blogCta: { tr: "İşitme sektörü yazılarını keşfet", en: "Explore hearing sector articles" },
  },
  pharmacy: {
    sectionTitle: { tr: "Eczane İçerikleri", en: "Pharmacy Resources" },
    sectionDesc: { tr: "Eczane yönetimi için keşfedilmiş içerikler", en: "Curated content discovered for pharmacies" },
    insights: [
      { icon: "trend", title: { tr: "Stok Optimizasyon Rehberi", en: "Inventory Optimization Guide" }, desc: { tr: "SKT takibi ve akıllı sipariş ile fire oranını %60 düşürün.", en: "Reduce waste by 60% with expiry tracking and smart ordering." } },
      { icon: "lightbulb", title: { tr: "E-Reçete Hızlandırma", en: "E-Prescription Acceleration" }, desc: { tr: "Reçete işleme süresini 5 dakikadan 30 saniyeye indirin.", en: "Cut prescription processing from 5 minutes to 30 seconds." } },
      { icon: "sparkle", title: { tr: "Müşteri Sadakat Programı", en: "Customer Loyalty Program" }, desc: { tr: "Tekrar eden müşterileri %35 artıran otomatik kampanya sistemi.", en: "Automated campaign system that increases repeat customers by 35%." } },
    ],
    faqTeaser: { question: { tr: "Stok yönetimi nasıl çalışıyor?", en: "How does inventory management work?" }, answer: { tr: "SKT uyarıları, minimum stok bildirimleri ve otomatik tedarikçi siparişi.", en: "Expiry alerts, minimum stock notifications, and automated supplier ordering." } },
    blogCta: { tr: "Eczane sektörü yazılarını keşfet", en: "Explore pharmacy sector articles" },
  },
  hospital: {
    sectionTitle: { tr: "Hastane İçerikleri", en: "Hospital Resources" },
    sectionDesc: { tr: "Sağlık sektörü için keşfedilmiş içerikler", en: "Curated content discovered for healthcare" },
    insights: [
      { icon: "trend", title: { tr: "Dijital Dönüşüm Yol Haritası", en: "Digital Transformation Roadmap" }, desc: { tr: "Hastanede kağıtsız süreçlere geçiş için 90 günlük plan.", en: "90-day plan for transitioning to paperless hospital processes." } },
      { icon: "lightbulb", title: { tr: "Randevu No-Show'u %50 Azaltın", en: "Reduce No-Shows by 50%" }, desc: { tr: "Otomatik SMS hatırlatma ve akıllı randevu optimizasyonu.", en: "Automated SMS reminders and smart appointment optimization." } },
      { icon: "sparkle", title: { tr: "Departmanlar Arası Entegrasyon", en: "Cross-Department Integration" }, desc: { tr: "HBYS, LIS ve PACS sistemleriyle tek noktadan yönetim.", en: "Single-point management with HBYS, LIS, and PACS systems." } },
    ],
    faqTeaser: { question: { tr: "Çoklu branş desteği var mı?", en: "Is multi-department support available?" }, answer: { tr: "Farklı bölümler için ayrı yapılandırma ve departmanlar arası hasta transferi.", en: "Separate configurations per department and cross-department patient transfers." } },
    blogCta: { tr: "Sağlık sektörü yazılarını keşfet", en: "Explore healthcare articles" },
  },
  hotel: {
    sectionTitle: { tr: "Otel İçerikleri", en: "Hotel Resources" },
    sectionDesc: { tr: "Konaklama sektörü için keşfedilmiş içerikler", en: "Curated content discovered for hospitality" },
    insights: [
      { icon: "trend", title: { tr: "Doluluk Oranı Artırma", en: "Occupancy Rate Optimization" }, desc: { tr: "Dinamik fiyatlama ve kanal yönetimi ile doluluk oranını %25 artırın.", en: "Increase occupancy by 25% with dynamic pricing and channel management." } },
      { icon: "lightbulb", title: { tr: "Misafir Deneyimi Puanlama", en: "Guest Experience Scoring" }, desc: { tr: "Her misafirin tercihlerini öğrenen akıllı profil sistemi.", en: "Smart profile system that learns each guest's preferences." } },
      { icon: "sparkle", title: { tr: "OTA Entegrasyon Rehberi", en: "OTA Integration Guide" }, desc: { tr: "Booking.com, Airbnb ve diğer kanallarla otomatik senkronizasyon.", en: "Automatic sync with Booking.com, Airbnb, and other channels." } },
    ],
    faqTeaser: { question: { tr: "Rezervasyon yönetimi nasıl çalışıyor?", en: "How does reservation management work?" }, answer: { tr: "Online/offline rezervasyonları tek panelden yönetin, OTA kanallarıyla entegre.", en: "Manage online/offline reservations from one panel, integrated with OTA channels." } },
    blogCta: { tr: "Konaklama sektörü yazılarını keşfet", en: "Explore hospitality articles" },
  },
  medical: {
    sectionTitle: { tr: "Medikal Firma İçerikleri", en: "Medical Company Resources" },
    sectionDesc: { tr: "Medikal sektör için keşfedilmiş içerikler", en: "Curated content discovered for medical companies" },
    insights: [
      { icon: "trend", title: { tr: "UTS Uyumluluk Rehberi", en: "UTS Compliance Guide" }, desc: { tr: "Ürün Takip Sistemi zorunluluklarına tam uyum için adım adım kılavuz.", en: "Step-by-step guide for full compliance with product tracking requirements." } },
      { icon: "lightbulb", title: { tr: "Bayi Ağı Optimizasyonu", en: "Dealer Network Optimization" }, desc: { tr: "Bölgesel performans analizi ile bayi verimliliğini %30 artırın.", en: "Increase dealer efficiency by 30% with regional performance analysis." } },
      { icon: "sparkle", title: { tr: "Seri Numarası İzlenebilirlik", en: "Serial Number Traceability" }, desc: { tr: "Üretimden son kullanıcıya tam izlenebilirlik zinciri.", en: "Full traceability chain from production to end user." } },
    ],
    faqTeaser: { question: { tr: "UTS entegrasyonu var mı?", en: "Is UTS integration available?" }, answer: { tr: "Tam UTS entegrasyonu: seri numarası bazlı cihaz/malzeme izlenebilirliği.", en: "Full UTS integration: serial number-based device/material traceability." } },
    blogCta: { tr: "Medikal sektör yazılarını keşfet", en: "Explore medical sector articles" },
  },
  optic: {
    sectionTitle: { tr: "Optik Mağaza İçerikleri", en: "Optical Store Resources" },
    sectionDesc: { tr: "Optik sektörü için keşfedilmiş içerikler", en: "Curated content discovered for optical stores" },
    insights: [
      { icon: "trend", title: { tr: "Dijital Reçete Yönetimi", en: "Digital Prescription Management" }, desc: { tr: "Müşteri reçetelerini dijital ortamda saklayın, geçmiş siparişlerle eşleştirin.", en: "Store customer prescriptions digitally, match with past orders." } },
      { icon: "lightbulb", title: { tr: "Lens Envanter Optimizasyonu", en: "Lens Inventory Optimization" }, desc: { tr: "En çok satan lens/çerçeve analizi ile stok maliyetini %20 düşürün.", en: "Reduce stock costs by 20% with best-selling lens/frame analysis." } },
      { icon: "sparkle", title: { tr: "Lab Sipariş Otomasyonu", en: "Lab Order Automation" }, desc: { tr: "Lens laboratuvarlarına otomatik sipariş gönderimi ve üretim takibi.", en: "Automatic order submission to lens labs and production tracking." } },
    ],
    faqTeaser: { question: { tr: "Reçete ve ölçü takibi nasıl yapılıyor?", en: "How does prescription tracking work?" }, answer: { tr: "Göz reçeteleri, pupil mesafesi ve lens tercihleri dijital ortamda saklanır.", en: "Eye prescriptions, pupil distance, and lens preferences stored digitally." } },
    blogCta: { tr: "Optik sektörü yazılarını keşfet", en: "Explore optical sector articles" },
  },
  beauty: {
    sectionTitle: { tr: "Güzellik Salonu İçerikleri", en: "Beauty Salon Resources" },
    sectionDesc: { tr: "Güzellik sektörü için keşfedilmiş içerikler", en: "Curated content discovered for beauty salons" },
    insights: [
      { icon: "trend", title: { tr: "Online Randevu Dönüşümü", en: "Online Booking Conversion" }, desc: { tr: "7/24 online randevu ile müşteri kazanımını %40 artırın.", en: "Increase customer acquisition by 40% with 24/7 online booking." } },
      { icon: "lightbulb", title: { tr: "Personel Prim Sistemi", en: "Staff Commission System" }, desc: { tr: "Hizmet ve ürün satışına dayalı otomatik prim hesaplama.", en: "Automatic commission calculation based on service and product sales." } },
      { icon: "sparkle", title: { tr: "Müşteri Geçmişi Takibi", en: "Customer History Tracking" }, desc: { tr: "Her müşterinin işlem geçmişi, tercihleri ve sonraki randevusu.", en: "Each customer's treatment history, preferences, and next appointment." } },
    ],
    faqTeaser: { question: { tr: "Online randevu sistemi nasıl çalışıyor?", en: "How does online booking work?" }, answer: { tr: "Müşterileriniz 7/24 web üzerinden randevu alabilir, otomatik hatırlatma gider.", en: "Your customers can book 24/7 via web, with automatic reminders." } },
    blogCta: { tr: "Güzellik sektörü yazılarını keşfet", en: "Explore beauty sector articles" },
  },
  general: {
    sectionTitle: { tr: "İşletme İçerikleri", en: "Business Resources" },
    sectionDesc: { tr: "İşletmeniz için keşfedilmiş içerikler", en: "Curated content discovered for your business" },
    insights: [
      { icon: "trend", title: { tr: "CRM Başlangıç Rehberi", en: "CRM Getting Started Guide" }, desc: { tr: "İlk 30 günde CRM'den maksimum verim almak için adımlar.", en: "Steps to get maximum value from CRM in the first 30 days." } },
      { icon: "lightbulb", title: { tr: "Otomasyon ile %60 Zaman Tasarrufu", en: "Save 60% Time with Automation" }, desc: { tr: "Tekrarlayan görevleri otomatikleştirerek ekibinizi özgürleştirin.", en: "Free your team by automating repetitive tasks." } },
      { icon: "sparkle", title: { tr: "AI Asistan Kullanım İpuçları", en: "AI Assistant Usage Tips" }, desc: { tr: "Yapay zeka asistanını en etkili şekilde kullanmanın yolları.", en: "Ways to use the AI assistant most effectively." } },
    ],
    faqTeaser: { question: { tr: "X-Ear hangi sektörlere hizmet veriyor?", en: "Which sectors does X-Ear serve?" }, answer: { tr: "İşitme, eczane, hastane, otel, medikal, optik, güzellik ve genel CRM.", en: "Hearing, pharmacy, hospital, hotel, medical, optical, beauty, and general CRM." } },
    blogCta: { tr: "Tüm blog yazılarını keşfet", en: "Explore all blog articles" },
  },
};

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  trend: <TrendingUp className="w-5 h-5" />,
  lightbulb: <Lightbulb className="w-5 h-5" />,
  sparkle: <Sparkles className="w-5 h-5" />,
};

const INSIGHT_COLORS: Record<string, string> = {
  trend: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  lightbulb: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  sparkle: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
};

// ─── Component ────────────────────────────────────────────
export function ContentDiscovery() {
  const { locale } = useLocale();
  const sector = useSectorStore((s) => s.sector);
  const data = discoveryData[sector];

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"insights" | "blog" | "faq">("insights");

  // Fetch latest blog posts for this sector
  useEffect(() => {
    let cancelled = false;
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string> = { limit: "3" };
        if (sector !== "general") params.category = sector;
        const res = await apiClient.get("/api/blog/", { params });
        if (!cancelled) {
          const items = Array.isArray(res.data) ? res.data.slice(0, 3) : [];
          setPosts(items);
        }
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchPosts();
    return () => { cancelled = true; };
  }, [sector]);

  // Reset tab on sector change
  useEffect(() => { setActiveTab("insights"); }, [sector]);

  const tabs: { key: typeof activeTab; label: L; icon: React.ReactNode }[] = [
    { key: "insights", label: { tr: "Keşfet", en: "Discover" }, icon: <Sparkles className="w-4 h-4" /> },
    { key: "blog", label: { tr: "Blog", en: "Blog" }, icon: <Newspaper className="w-4 h-4" /> },
    { key: "faq", label: { tr: "SSS", en: "FAQ" }, icon: <HelpCircle className="w-4 h-4" /> },
  ];

  return (
    <section className="relative z-10 py-24 px-4 bg-background" id="content-discovery">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-sm font-semibold mb-6 uppercase tracking-wider"
          >
            <BookOpen className="w-4 h-4" />
            {locale === "tr" ? "İçerik Keşfi" : "Content Discovery"}
          </motion.div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium text-foreground mb-4">
            <TextReveal>{data.sectionTitle[locale]}</TextReveal>
          </h2>
          <p className="text-foreground/60 text-lg max-w-2xl mx-auto">
            {data.sectionDesc[locale]}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-10">
          {tabs.map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-foreground text-background shadow-lg"
                  : "bg-white/5 border border-white/10 text-foreground/60 hover:text-foreground hover:border-white/20"
              }`}
            >
              {tab.icon}
              {tab.label[locale]}
            </motion.button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "insights" && (
            <motion.div
              key={`insights-${sector}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
            >
              {data.insights.map((insight, i) => (
                <motion.div
                  key={`${sector}-insight-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <HyperGlassCard className="!p-6 !rounded-2xl h-full">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${INSIGHT_COLORS[insight.icon]} mb-4`}>
                      {INSIGHT_ICONS[insight.icon]}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {insight.title[locale]}
                    </h3>
                    <p className="text-foreground/60 text-sm leading-relaxed">
                      {insight.desc[locale]}
                    </p>
                  </HyperGlassCard>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "blog" && (
            <motion.div
              key={`blog-${sector}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 rounded-full border-4 border-accent-blue/20 border-t-accent-blue animate-spin" />
                </div>
              ) : posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {posts.map((post, i) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link href={`/blog/${post.slug}`}>
                        <HyperGlassCard className="!p-6 !rounded-2xl h-full cursor-pointer group">
                          <div className="flex items-center gap-2 mb-3">
                            <Newspaper className="w-4 h-4 text-accent-blue" />
                            {post.category && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-blue/80 bg-accent-blue/10 px-2 py-0.5 rounded-full">
                                {post.category}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent-blue transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-foreground/60 text-sm leading-relaxed line-clamp-3 mb-4">
                            {post.excerpt || post.title}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-foreground/40">
                            <span>{post.authorName}</span>
                            {post.publishedAt && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-foreground/20" />
                                <span>{new Date(post.publishedAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</span>
                              </>
                            )}
                          </div>
                        </HyperGlassCard>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <HyperGlassCard className="!py-16 text-center">
                  <Newspaper className="w-10 h-10 text-foreground/20 mx-auto mb-4" />
                  <p className="text-foreground/40 text-lg">
                    {locale === "tr" ? "Henüz bu sektör için blog yazısı yok." : "No blog posts for this sector yet."}
                  </p>
                </HyperGlassCard>
              )}

              {/* Blog CTA */}
              <div className="text-center mt-8">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-accent-blue hover:text-accent-purple transition-colors text-sm font-semibold group"
                >
                  {data.blogCta[locale]}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          )}

          {activeTab === "faq" && (
            <motion.div
              key={`faq-${sector}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="max-w-3xl mx-auto"
            >
              <HyperGlassCard className="!p-8 !rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-accent-purple" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {data.faqTeaser.question[locale]}
                    </h3>
                    <p className="text-foreground/70 leading-relaxed mb-6">
                      {data.faqTeaser.answer[locale]}
                    </p>
                    <Link
                      href="/faq"
                      className="inline-flex items-center gap-2 text-accent-purple hover:text-accent-blue transition-colors text-sm font-semibold group"
                    >
                      {locale === "tr" ? "Tüm SSS'leri gör" : "View all FAQs"}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </HyperGlassCard>

              {/* Quick link cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <Link href="/pricing">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm group-hover:text-emerald-400 transition-colors">
                          {locale === "tr" ? "Fiyatlandırma" : "Pricing"}
                        </h4>
                        <p className="text-foreground/50 text-xs">
                          {locale === "tr" ? "Sektörünüze özel paketleri inceleyin" : "Explore packages for your sector"}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground/30 ml-auto group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                </Link>

                <Link href="/register">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-accent-blue" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm group-hover:text-accent-blue transition-colors">
                          {locale === "tr" ? "Ücretsiz Dene" : "Try Free"}
                        </h4>
                        <p className="text-foreground/50 text-xs">
                          {locale === "tr" ? "14 gün ücretsiz deneme başlatın" : "Start your 14-day free trial"}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground/30 ml-auto group-hover:text-accent-blue group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

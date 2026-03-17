"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HyperGlassCard } from "./HyperGlassCard";
import { TextReveal } from "./TextReveal";
import { useLocale } from "@/lib/i18n";
import { useSectorStore, type SectorId } from "@/lib/sector-store";
import {
  Search, User, FileText, Calendar, Package, BarChart3,
  Pill, Receipt, Stethoscope, BedDouble, Scissors, ShoppingBag,
  ClipboardList, TrendingUp, AlertTriangle, Truck, Eye,
} from "lucide-react";

interface Result {
  icon: React.ReactNode;
  title: { tr: string; en: string };
  badge: { tr: string; en: string };
}

interface Query {
  text: { tr: string; en: string };
  results: Result[];
}

const iconClass = "w-4 h-4 shrink-0";

const sectorQueries: Record<SectorId, Query[]> = {
  hearing: [
    {
      text: { tr: "Ali Yilmaz", en: "Ali Yilmaz" },
      results: [
        { icon: <User className={iconClass} />, title: { tr: "Ali Yilmaz", en: "Ali Yilmaz" }, badge: { tr: "Hasta", en: "Patient" } },
        { icon: <FileText className={iconClass} />, title: { tr: "Ali Yilmaz - Odyogram", en: "Ali Yilmaz - Audiogram" }, badge: { tr: "Rapor", en: "Report" } },
        { icon: <Calendar className={iconClass} />, title: { tr: "Ali Yilmaz - 15 Mar", en: "Ali Yilmaz - Mar 15" }, badge: { tr: "Randevu", en: "Appointment" } },
        { icon: <Receipt className={iconClass} />, title: { tr: "#F-2024-0342", en: "#F-2024-0342" }, badge: { tr: "Fatura", en: "Invoice" } },
      ],
    },
    {
      text: { tr: "Phonak Audio", en: "Phonak Audio" },
      results: [
        { icon: <Package className={iconClass} />, title: { tr: "Phonak Audio P90", en: "Phonak Audio P90" }, badge: { tr: "Cihaz", en: "Device" } },
        { icon: <ShoppingBag className={iconClass} />, title: { tr: "Stok: 12 adet", en: "Stock: 12 units" }, badge: { tr: "Envanter", en: "Inventory" } },
        { icon: <User className={iconClass} />, title: { tr: "Mehmet K. - Deneme", en: "Mehmet K. - Trial" }, badge: { tr: "Atama", en: "Assignment" } },
      ],
    },
    {
      text: { tr: "SGK fatura", en: "SGK invoice" },
      results: [
        { icon: <ClipboardList className={iconClass} />, title: { tr: "Mart 2024 - SGK Icmal", en: "Mar 2024 - SGK Batch" }, badge: { tr: "Toplu", en: "Batch" } },
        { icon: <Receipt className={iconClass} />, title: { tr: "5 bekleyen fatura", en: "5 pending invoices" }, badge: { tr: "Fatura", en: "Invoice" } },
      ],
    },
  ],
  pharmacy: [
    {
      text: { tr: "Parol 500mg", en: "Parol 500mg" },
      results: [
        { icon: <Pill className={iconClass} />, title: { tr: "Parol 500mg Tablet", en: "Parol 500mg Tablet" }, badge: { tr: "Urun", en: "Product" } },
        { icon: <Package className={iconClass} />, title: { tr: "Stok: 240 kutu", en: "Stock: 240 boxes" }, badge: { tr: "Stok", en: "Stock" } },
        { icon: <Truck className={iconClass} />, title: { tr: "Selcuk Ecza Deposu", en: "Selcuk Pharma Dist." }, badge: { tr: "Tedarik", en: "Supplier" } },
      ],
    },
    {
      text: { tr: "Bugunku receteler", en: "Today prescriptions" },
      results: [
        { icon: <ClipboardList className={iconClass} />, title: { tr: "23 recete bekliyor", en: "23 prescriptions waiting" }, badge: { tr: "Recete", en: "Rx" } },
        { icon: <AlertTriangle className={iconClass} />, title: { tr: "3 etken madde uyarisi", en: "3 interaction alerts" }, badge: { tr: "Uyari", en: "Alert" } },
      ],
    },
    {
      text: { tr: "Stok kritik", en: "Low stock" },
      results: [
        { icon: <AlertTriangle className={iconClass} />, title: { tr: "8 urun kritik seviyede", en: "8 products critically low" }, badge: { tr: "Kritik", en: "Critical" } },
        { icon: <TrendingUp className={iconClass} />, title: { tr: "Otomatik siparis onerisi", en: "Auto-order suggestion" }, badge: { tr: "Oneri", en: "Suggest" } },
      ],
    },
  ],
  hospital: [
    {
      text: { tr: "Mehmet Demir", en: "Mehmet Demir" },
      results: [
        { icon: <User className={iconClass} />, title: { tr: "Mehmet Demir", en: "Mehmet Demir" }, badge: { tr: "Hasta", en: "Patient" } },
        { icon: <Stethoscope className={iconClass} />, title: { tr: "Lab Sonuclari - 14 Mar", en: "Lab Results - Mar 14" }, badge: { tr: "Lab", en: "Lab" } },
        { icon: <Calendar className={iconClass} />, title: { tr: "Kardiyoloji - 18 Mar", en: "Cardiology - Mar 18" }, badge: { tr: "Randevu", en: "Appt" } },
      ],
    },
    {
      text: { tr: "Bugun ameliyat", en: "Today surgeries" },
      results: [
        { icon: <ClipboardList className={iconClass} />, title: { tr: "4 ameliyat planli", en: "4 surgeries scheduled" }, badge: { tr: "Ameliyat", en: "Surgery" } },
        { icon: <User className={iconClass} />, title: { tr: "Dr. Aydin - Salon 3", en: "Dr. Aydin - Room 3" }, badge: { tr: "Doktor", en: "Doctor" } },
      ],
    },
  ],
  hotel: [
    {
      text: { tr: "Oda 214", en: "Room 214" },
      results: [
        { icon: <BedDouble className={iconClass} />, title: { tr: "Oda 214 - Dolu", en: "Room 214 - Occupied" }, badge: { tr: "Oda", en: "Room" } },
        { icon: <User className={iconClass} />, title: { tr: "Ayse Kara - 3 gece", en: "Ayse Kara - 3 nights" }, badge: { tr: "Misafir", en: "Guest" } },
        { icon: <Receipt className={iconClass} />, title: { tr: "Minibar + Spa", en: "Minibar + Spa" }, badge: { tr: "Hesap", en: "Tab" } },
      ],
    },
    {
      text: { tr: "Bugun check-out", en: "Today check-out" },
      results: [
        { icon: <ClipboardList className={iconClass} />, title: { tr: "12 check-out bekleniyor", en: "12 check-outs expected" }, badge: { tr: "Liste", en: "List" } },
        { icon: <BarChart3 className={iconClass} />, title: { tr: "Doluluk: %87", en: "Occupancy: 87%" }, badge: { tr: "Rapor", en: "Report" } },
      ],
    },
  ],
  medical: [
    {
      text: { tr: "Fatma Yildiz", en: "Fatma Yildiz" },
      results: [
        { icon: <User className={iconClass} />, title: { tr: "Fatma Yildiz", en: "Fatma Yildiz" }, badge: { tr: "Hasta", en: "Patient" } },
        { icon: <Stethoscope className={iconClass} />, title: { tr: "Muayene - Bugün", en: "Exam - Today" }, badge: { tr: "Muayene", en: "Exam" } },
        { icon: <FileText className={iconClass} />, title: { tr: "Recete #R-4521", en: "Prescription #R-4521" }, badge: { tr: "Recete", en: "Rx" } },
      ],
    },
    {
      text: { tr: "Bu hafta randevular", en: "This week appointments" },
      results: [
        { icon: <Calendar className={iconClass} />, title: { tr: "34 randevu planli", en: "34 appointments planned" }, badge: { tr: "Takvim", en: "Calendar" } },
        { icon: <AlertTriangle className={iconClass} />, title: { tr: "3 iptal, 2 bos slot", en: "3 cancelled, 2 open slots" }, badge: { tr: "Uyari", en: "Alert" } },
      ],
    },
  ],
  optic: [
    {
      text: { tr: "Ray-Ban Aviator", en: "Ray-Ban Aviator" },
      results: [
        { icon: <Eye className={iconClass} />, title: { tr: "Ray-Ban Aviator Classic", en: "Ray-Ban Aviator Classic" }, badge: { tr: "Urun", en: "Product" } },
        { icon: <Package className={iconClass} />, title: { tr: "Stok: 8 adet", en: "Stock: 8 units" }, badge: { tr: "Stok", en: "Stock" } },
        { icon: <TrendingUp className={iconClass} />, title: { tr: "En cok satan #2", en: "Best seller #2" }, badge: { tr: "Trend", en: "Trend" } },
      ],
    },
    {
      text: { tr: "Lens siparisleri", en: "Lens orders" },
      results: [
        { icon: <Scissors className={iconClass} />, title: { tr: "6 lens kesimde", en: "6 lenses in cutting" }, badge: { tr: "Uretim", en: "Production" } },
        { icon: <Truck className={iconClass} />, title: { tr: "3 kargo bekleniyor", en: "3 shipments expected" }, badge: { tr: "Kargo", en: "Shipping" } },
      ],
    },
  ],
  general: [
    {
      text: { tr: "Ayse Kaya", en: "Ayse Kaya" },
      results: [
        { icon: <User className={iconClass} />, title: { tr: "Ayse Kaya", en: "Ayse Kaya" }, badge: { tr: "Musteri", en: "Customer" } },
        { icon: <Receipt className={iconClass} />, title: { tr: "3 acik fatura", en: "3 open invoices" }, badge: { tr: "Fatura", en: "Invoice" } },
        { icon: <FileText className={iconClass} />, title: { tr: "Son not: 12 Mar", en: "Last note: Mar 12" }, badge: { tr: "Not", en: "Note" } },
      ],
    },
    {
      text: { tr: "Bu ay satislar", en: "This month sales" },
      results: [
        { icon: <BarChart3 className={iconClass} />, title: { tr: "Toplam: 342.500 TL", en: "Total: 342,500 TL" }, badge: { tr: "Rapor", en: "Report" } },
        { icon: <TrendingUp className={iconClass} />, title: { tr: "En cok satan urunler", en: "Top selling products" }, badge: { tr: "Analiz", en: "Analysis" } },
      ],
    },
    {
      text: { tr: "Vadesi gecen", en: "Overdue payments" },
      results: [
        { icon: <AlertTriangle className={iconClass} />, title: { tr: "7 vadesi gecmis fatura", en: "7 overdue invoices" }, badge: { tr: "Gecmis", en: "Overdue" } },
        { icon: <Receipt className={iconClass} />, title: { tr: "Toplam: 18.200 TL", en: "Total: 18,200 TL" }, badge: { tr: "Tutar", en: "Amount" } },
      ],
    },
  ],
};

const labels = {
  badge: { tr: "Spotlight Arama", en: "Spotlight Search" },
  h2_1: { tr: "Her Seye Aninda", en: "Instant Access" },
  h2_2: { tr: "Ulasim", en: "To Everything" },
  desc: {
    tr: "Tek bir kisayolla hastalar, stoklar, faturalar ve raporlara saniyeler icinde ulasin.",
    en: "Reach patients, inventory, invoices, and reports in seconds with a single shortcut.",
  },
  placeholder: { tr: "Ara...", en: "Search..." },
};

export function SpotlightDemo() {
  const { locale } = useLocale();
  const sector = useSectorStore((s) => s.sector);

  const queries = useMemo(() => sectorQueries[sector] ?? sectorQueries.general, [sector]);

  const [queryIndex, setQueryIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [visibleResults, setVisibleResults] = useState(0);

  const currentQuery = queries[queryIndex % queries.length];
  const fullText = currentQuery.text[locale];

  const cycle = useCallback(() => {
    setTyped("");
    setShowResults(false);
    setVisibleResults(0);
  }, []);

  // Master cycle timer
  useEffect(() => {
    cycle();
    const totalResults = currentQuery.results.length;
    const typingDuration = fullText.length * 50;
    const resultsStagger = totalResults * 100;
    const holdTime = 1500;
    const totalCycle = typingDuration + 200 + resultsStagger + holdTime;

    const timer = setTimeout(() => {
      setQueryIndex((i) => (i + 1) % queries.length);
    }, totalCycle);

    return () => clearTimeout(timer);
  }, [queryIndex, queries.length, fullText.length, currentQuery.results.length, cycle]);

  // Typewriter effect
  useEffect(() => {
    if (typed.length >= fullText.length) {
      const t = setTimeout(() => setShowResults(true), 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTyped(fullText.slice(0, typed.length + 1)), 50);
    return () => clearTimeout(t);
  }, [typed, fullText]);

  // Stagger results
  useEffect(() => {
    if (!showResults) return;
    if (visibleResults >= currentQuery.results.length) return;
    const t = setTimeout(() => setVisibleResults((v) => v + 1), 100);
    return () => clearTimeout(t);
  }, [showResults, visibleResults, currentQuery.results.length]);

  return (
    <section className="relative py-24 md:py-32 px-4 overflow-hidden" id="spotlight">
      {/* Background blur ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-accent-blue/5 blur-[120px]" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-3 py-1 rounded-full mb-6">
            {labels.badge[locale]}
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-medium text-foreground mb-4 flex flex-col items-center gap-1">
            <TextReveal>{labels.h2_1[locale]}</TextReveal>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple to-accent-blue">
              <TextReveal delay={0.4}>{labels.h2_2[locale]}</TextReveal>
            </span>
          </h2>
          <p className="text-foreground/60 text-sm md:text-lg max-w-xl mx-auto">
            {labels.desc[locale]}
          </p>
        </div>

        {/* Floating spotlight dialog */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <HyperGlassCard className="!rounded-2xl !px-0 !py-0 overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <Search className="w-5 h-5 text-foreground/40 shrink-0" />
              <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${sector}-${queryIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-foreground text-sm md:text-base font-medium"
                  >
                    {typed}
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      className="inline-block w-[2px] h-[18px] bg-accent-blue ml-[1px] align-middle"
                    />
                  </motion.span>
                </AnimatePresence>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-foreground/40 font-mono shrink-0">
                <span className="text-xs">&#8984;</span>K
              </kbd>
            </div>

            {/* Results */}
            <div className="min-h-[60px]">
              <AnimatePresence mode="wait">
                {showResults && (
                  <motion.div
                    key={`results-${sector}-${queryIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    className="py-2"
                  >
                    {currentQuery.results.map((result, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -12 }}
                        animate={idx < visibleResults ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/5 transition-colors cursor-default group"
                      >
                        <span className="text-accent-blue/70 group-hover:text-accent-blue transition-colors">
                          {result.icon}
                        </span>
                        <span className="flex-1 text-sm text-foreground/80 group-hover:text-foreground transition-colors truncate">
                          {result.title[locale]}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/30 bg-white/5 px-2 py-0.5 rounded-md shrink-0">
                          {result.badge[locale]}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </HyperGlassCard>
        </motion.div>

        {/* Keyboard hint */}
        <p className="text-center text-foreground/30 text-xs mt-6">
          {locale === "tr"
            ? "Uygulamada her yerden \u2318K ile erisebilirsiniz"
            : "Access from anywhere in the app with \u2318K"}
        </p>
      </div>
    </section>
  );
}

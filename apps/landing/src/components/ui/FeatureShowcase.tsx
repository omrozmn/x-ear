"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { HyperGlassCard } from "./HyperGlassCard";
import { TextReveal } from "./TextReveal";
import { useLocale } from "@/lib/i18n";
import { useSectorStore, type SectorId } from "@/lib/sector-store";

interface ShowcaseFeature {
    id: string;
    title: { tr: string; en: string };
    desc: { tr: string; en: string };
    mock: () => React.JSX.Element;
}

/* ---- Reusable animated arrow icon ---- */
const Arrow = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
);
const Check = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);

/* ---- Mock Animation Components ---- */
function MockOCR() {
    return (
        <div className="flex gap-4 p-6 h-full items-center relative">
            <motion.div className="w-1/2 bg-white/5 rounded-xl p-4 space-y-2 relative overflow-hidden"
                initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
                {[3/4, 1/2, 5/6, 2/3, 3/5].map((w, i) => <div key={i} className="h-2 bg-white/10 rounded" style={{ width: `${w * 100}%` }} />)}
                <motion.div className="absolute left-0 right-0 h-0.5 bg-cyan-400"
                    animate={{ top: ["10%", "90%", "10%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />
            </motion.div>
            <motion.div className="w-1/2 space-y-2">
                {[{ t: "Tedarikci: ABC Ltd.", c: "text-cyan-400 bg-cyan-400/10", d: 0.6 },
                  { t: "Tutar: 45.000 TL", c: "text-emerald-400 bg-emerald-500/10", d: 0.9 },
                  { t: "3 Urun tespit edildi", c: "text-amber-400 bg-amber-400/10", d: 1.2 }].map((item, i) => (
                    <motion.div key={i} className={`rounded-lg p-2 text-xs font-medium ${item.c}`}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: item.d }}>{item.t}</motion.div>
                ))}
            </motion.div>
        </div>
    );
}

function MockInvoice() {
    return (
        <div className="p-6 space-y-3 h-full flex flex-col justify-center">
            {[{ l: "Satis #1024 - Phonak P90", a: true }, { l: "Satis #1023 - Oticon More", a: false }].map((r, i) => (
                <motion.div key={i} className={`flex items-center justify-between rounded-lg p-3 text-xs border ${r.a ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-400" : "bg-white/5 border-white/10 text-white/40"}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}>
                    <span className="font-medium">{r.l}</span>
                    {r.a && <motion.button className="px-3 py-1 rounded-md bg-cyan-400/20 text-cyan-400 font-bold text-[10px]"
                        animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>Fatura Kes</motion.button>}
                </motion.div>
            ))}
            <motion.div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center gap-2"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
                <Check /> e-Fatura olusturuldu
            </motion.div>
        </div>
    );
}

function MockSpotlight() {
    const q = "Ahmet Yilmaz";
    return (
        <div className="p-6 h-full flex flex-col justify-center space-y-3">
            <motion.div className="rounded-xl border border-white/20 bg-white/5 p-3 flex items-center gap-2"
                initial={{ scaleX: 0.8, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}>
                <span className="text-white/30 text-sm">&#8984;K</span>
                <span className="text-sm text-white/80 font-mono">
                    {q.split("").map((ch, i) => <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.06 }}>{ch}</motion.span>)}
                </span>
            </motion.div>
            {[{ t: "Ahmet Yilmaz - Hasta #4021", ic: "H", d: 1.2, hi: true },
              { t: "Ahmet Yilmaz - Satis Gecmisi", ic: "S", d: 1.4, hi: false },
              { t: "Ahmet Yilmaz - Randevu", ic: "R", d: 1.6, hi: false }].map((r, i) => (
                <motion.div key={i} className={`rounded-lg p-2.5 text-xs flex items-center gap-2 ${r.hi ? "bg-cyan-400/10 border border-cyan-400/20 text-cyan-400" : "bg-white/5 text-white/50"}`}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: r.d }}>
                    <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold">{r.ic}</span>{r.t}
                </motion.div>
            ))}
        </div>
    );
}

function MockDeviceAssign() {
    return (
        <div className="p-6 h-full flex items-center gap-4 relative">
            <motion.div className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 space-y-1"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Hasta</div>
                <div className="text-xs text-white/80 font-medium">Mehmet Ozturk</div>
                <div className="text-[10px] text-white/40">ID: #4055</div>
            </motion.div>
            <motion.div className="text-cyan-400" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}><Arrow /></motion.div>
            <motion.div className="flex-1 rounded-xl bg-cyan-400/5 border border-cyan-400/20 p-3 space-y-1"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <div className="text-[10px] uppercase tracking-wider text-cyan-400/60 font-bold">Cihaz</div>
                <div className="text-xs text-cyan-400 font-medium">Phonak P90-R</div>
                <div className="text-[10px] text-cyan-400/50">SN: PH-90R-8821</div>
            </motion.div>
            <motion.div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] text-emerald-400 font-bold"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>Atama tamamlandi</motion.div>
        </div>
    );
}

function MockBarcode() {
    return (
        <div className="p-6 h-full flex flex-col items-center justify-center space-y-4">
            <motion.div className="w-32 h-24 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center relative overflow-hidden"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex gap-0.5">{[3,1,2,4,1,3,2,1,4,2,1,3].map((w, i) => <div key={i} className="bg-white/30 rounded-sm" style={{ width: w, height: 40 }} />)}</div>
                <motion.div className="absolute left-0 right-0 h-0.5 bg-red-500" animate={{ top: ["30%", "70%", "30%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
            </motion.div>
            <motion.div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />Barkod algilandi
            </motion.div>
            <motion.div className="rounded-xl bg-white/5 border border-white/10 p-3 w-full max-w-[200px] space-y-1"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
                <div className="text-xs text-white/80 font-medium">Phonak P90-R</div>
                <div className="text-[10px] text-white/40">Stok: 12 adet</div>
                <div className="text-[10px] text-cyan-400">Alis: 32.500 TL</div>
            </motion.div>
        </div>
    );
}

function MockStockParse() {
    return (
        <div className="p-6 h-full flex items-center gap-4">
            <motion.div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="text-2xl">&#128196;</span>
            </motion.div>
            <motion.div className="text-white/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}><Arrow /></motion.div>
            <div className="flex-1 grid grid-cols-3 gap-1.5">
                {["Phonak P90", "Oticon More", "Widex Moment", "Pil 312", "Filtre X", "Dome S"].map((item, i) => (
                    <motion.div key={i} className="rounded-lg bg-cyan-400/5 border border-cyan-400/10 p-1.5 text-[10px] text-cyan-400/80 text-center font-medium"
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.15 }}>{item}</motion.div>
                ))}
            </div>
        </div>
    );
}

function MockAutomation() {
    const nodes = [
        { label: "Tetikleyici", x: 10, y: 40, c: "bg-cyan-400/20 text-cyan-400 border-cyan-400/30" },
        { label: "Kosul", x: 38, y: 20, c: "bg-amber-400/20 text-amber-400 border-amber-400/30" },
        { label: "Aksiyon", x: 66, y: 40, c: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    ];
    return (
        <div className="p-6 h-full relative">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 80">
                <motion.path d="M 22 42 Q 36 20 44 24" stroke="rgba(6,182,212,0.3)" strokeWidth="0.5" fill="none"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.6 }} />
                <motion.path d="M 52 24 Q 60 20 72 42" stroke="rgba(6,182,212,0.3)" strokeWidth="0.5" fill="none"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.4, duration: 0.6 }} />
            </svg>
            {nodes.map((n, i) => (
                <motion.div key={i} className={`absolute rounded-lg border px-3 py-2 text-[10px] font-bold ${n.c}`}
                    style={{ left: `${n.x}%`, top: `${n.y}%` }} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.4, type: "spring" }}>{n.label}</motion.div>
            ))}
            <motion.div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-emerald-400 font-medium"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>Otomasyon aktif</motion.div>
        </div>
    );
}

function MockRBAC() {
    const levels = [{ role: "Admin", n: 5, c: "text-cyan-400 bg-cyan-400/10" }, { role: "Uzman", n: 3, c: "text-amber-400 bg-amber-400/10" }, { role: "Sekreter", n: 2, c: "text-emerald-400 bg-emerald-400/10" }];
    return (
        <div className="p-6 h-full flex flex-col justify-center space-y-2.5">
            {levels.map((l, i) => (
                <motion.div key={i} className="flex items-center gap-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }}>
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${l.c}`}>{l.role}</span>
                    <div className="flex gap-1">{Array.from({ length: 5 }).map((_, j) => (
                        <motion.div key={j} className={`w-4 h-4 rounded flex items-center justify-center text-[8px] ${j < l.n ? "bg-white/10 text-white/60" : "bg-white/5 text-white/15"}`}
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.3 + j * 0.08 }}>{j < l.n ? "\u2713" : "\u2717"}</motion.div>
                    ))}</div>
                </motion.div>
            ))}
        </div>
    );
}

function MockSupplierSuggest() {
    return (
        <div className="p-6 h-full flex flex-col justify-center space-y-3">
            <motion.div className="text-[10px] text-white/40 uppercase tracking-wider font-bold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Tedarikci Onerileri</motion.div>
            {[{ n: "MedSupply A.S.", s: "98%", d: 0.4 }, { n: "PharmaPlus Ltd.", s: "92%", d: 0.7 }, { n: "HealthDist Co.", s: "87%", d: 1.0 }].map((s, i) => (
                <motion.div key={i} className={`rounded-lg p-2.5 text-xs flex items-center justify-between border ${i === 0 ? "bg-cyan-400/10 border-cyan-400/20 text-cyan-400" : "bg-white/5 border-white/10 text-white/50"}`}
                    initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: s.d }}>
                    <span className="font-medium">{s.n}</span><span className="text-[10px] font-bold">{s.s}</span>
                </motion.div>
            ))}
        </div>
    );
}

function MockStockAlert() {
    return (
        <div className="p-6 h-full flex flex-col justify-center space-y-3">
            {[{ p: "Pil 312", s: 3, st: "Kritik", c: "border-red-500/30 bg-red-500/10 text-red-400" },
              { p: "Dome S", s: 8, st: "Uyari", c: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
              { p: "Filtre X", s: 25, st: "Normal", c: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" }].map((item, i) => (
                <motion.div key={i} className={`rounded-lg p-3 text-xs flex items-center justify-between border ${item.c}`}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.3 }}>
                    <div><div className="font-medium">{item.p}</div><div className="text-[10px] opacity-60">Stok: {item.s}</div></div>
                    <span className="text-[10px] font-bold">{item.st}</span>
                </motion.div>
            ))}
            <motion.div className="text-[10px] text-cyan-400 font-medium text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>Otomatik siparis onerisi hazirlandi</motion.div>
        </div>
    );
}

/* ---- Feature helper to reduce repetition ---- */
const f = (id: string, tr: string, en: string, dTr: string, dEn: string, mock: () => React.JSX.Element): ShowcaseFeature => ({
    id, title: { tr, en }, desc: { tr: dTr, en: dEn }, mock,
});

/* ---- Sector Feature Definitions ---- */
const HEARING: ShowcaseFeature[] = [
    f("ocr-parse", "OCR ile Recete/Fatura Parse", "OCR Prescription/Invoice Parse", "Fatura veya recete fotografini yukleyin, yapay zeka aninda ayristirsin.", "Upload a photo of an invoice or prescription, AI parses it instantly.", MockOCR),
    f("one-click-invoice", "Tek Tikla Satis Faturasi", "One-Click Sales Invoice", "Satisi secin, butona basin — e-Fatura saniyeler icinde hazir.", "Select a sale, press the button — e-Invoice ready in seconds.", MockInvoice),
    f("spotlight", "Spotlight (⌘K)", "Spotlight (⌘K)", "Her yerden aninda arama. Hasta, satis, stok — tek tusla ulasin.", "Instant search from anywhere. Patient, sale, stock — one keystroke away.", MockSpotlight),
    f("device-assign", "Cihaz Atama & Iade", "Device Assignment & Return", "Envanterden cihaz secin, hastaya atayin. Iade sureci tek adimda.", "Select a device from inventory, assign to patient. Returns in one step.", MockDeviceAssign),
    f("barcode-stock", "Barkod ile Stok Yonetimi", "Barcode Stock Management", "Barkod okutun, urun bilgisine aninda ulasin. Stok giris-cikis otomatik.", "Scan a barcode, instantly access product info. Stock in/out automated.", MockBarcode),
    f("automation", "Akilli Otomasyon", "Smart Automation", "Tetikleyici, kosul ve aksiyon tanimlayarak is akislarinizi otomatiklestirin.", "Automate workflows by defining triggers, conditions, and actions.", MockAutomation),
];

const PHARMACY: ShowcaseFeature[] = [
    f("stock-parse", "E-Faturadan Stok Parse", "Stock Parse from E-Invoice", "Tedarikci faturasini yukleyin, stok kartlari otomatik olusturulsun.", "Upload supplier invoice, stock cards are created automatically.", MockStockParse),
    f("supplier-suggest", "Tedarikci Oneri", "Supplier Suggestion", "Yapay zeka en uygun tedarikciyi fiyat ve teslimat suresine gore onerir.", "AI suggests the best supplier based on price and delivery time.", MockSupplierSuggest),
    f("spotlight", "Spotlight (⌘K)", "Spotlight (⌘K)", "Ilac, musteri veya siparis — her seyi tek tusla bulun.", "Drug, customer, or order — find everything with one keystroke.", MockSpotlight),
    f("barcode-scan", "Barkod Tarama", "Barcode Scanning", "Hizli barkod okuma ile urun bilgisi ve stok durumu aninda goruntulensin.", "Quick barcode scanning to instantly view product info and stock status.", MockBarcode),
    f("one-click-invoice", "Tek Tikla Fatura", "One-Click Invoice", "Satis islemini secin, tek tikla fatura olusturun.", "Select a sale, create an invoice in one click.", MockInvoice),
    f("stock-alert", "Stok Uyari Otomasyonu", "Stock Alert Automation", "Kritik stok seviyelerinde otomatik uyari ve siparis onerisi alin.", "Get automatic alerts and order suggestions at critical stock levels.", MockStockAlert),
];

const GENERIC: ShowcaseFeature[] = [
    f("spotlight", "Spotlight (⌘K)", "Spotlight (⌘K)", "Her yerden aninda arama. Kayit, musteri, stok — tek tusla.", "Instant search from anywhere. Records, customers, stock — one keystroke.", MockSpotlight),
    f("one-click-invoice", "Tek Tikla Fatura", "One-Click Invoice", "Satis isleminden faturayi tek tikla olusturun.", "Create an invoice from a sale in one click.", MockInvoice),
    f("ocr-parse", "OCR ile Belge Parse", "OCR Document Parse", "Belge fotografini yukleyin, veriler otomatik cikarilsin.", "Upload a document photo, data extracted automatically.", MockOCR),
    f("barcode-stock", "Barkod ile Stok", "Barcode Stock", "Barkod okutarak stok giris-cikis islemlerini hizlandirin.", "Speed up stock in/out by scanning barcodes.", MockBarcode),
    f("automation", "Akilli Otomasyon", "Smart Automation", "Tekrarlayan islemleri otomatiklestirin.", "Automate repetitive tasks.", MockAutomation),
    f("rbac", "Rol Bazli Erisim (RBAC)", "Role-Based Access (RBAC)", "Farkli roller icin farkli yetki seviyeleri tanimlayin.", "Define different permission levels for different roles.", MockRBAC),
];

const SECTOR_FEATURES: Record<SectorId, ShowcaseFeature[]> = {
    hearing: HEARING, pharmacy: PHARMACY,
    hospital: GENERIC, hotel: GENERIC, medical: GENERIC, optic: GENERIC, beauty: GENERIC, general: GENERIC,
};

/* ---- macOS Window Frame ---- */
function MacWindow({ children, title }: { children: React.ReactNode; title: string }) {
    return (
        <div className="rounded-2xl bg-[#1a1a24] border border-white/10 overflow-hidden h-full flex flex-col">
            <div className="h-8 flex items-center gap-1.5 px-3 border-b border-white/5 shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                <span className="ml-2 text-[10px] text-white/30 font-medium truncate">{title}</span>
            </div>
            <div className="flex-1 relative min-h-0 overflow-hidden">{children}</div>
        </div>
    );
}

/* ---- Main Component ---- */
export function FeatureShowcase() {
    const { locale } = useLocale();
    const sector = useSectorStore((s) => s.sector);
    const features = SECTOR_FEATURES[sector];
    const [activeIndex, setActiveIndex] = useState(0);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const el = sectionRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const progress = -rect.top / (el.offsetHeight - window.innerHeight);
            const clamped = Math.max(0, Math.min(1, progress));
            setActiveIndex(Math.min(features.length - 1, Math.floor(clamped * features.length)));
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [features.length]);

    useEffect(() => { setActiveIndex(0); }, [sector]);

    const active = features[activeIndex];
    const MockComponent = active.mock;
    const h2_1 = locale === "tr" ? "Ozellikleri" : "Experience the";
    const h2_2 = locale === "tr" ? "Deneyimleyin" : "Features";
    const desc = locale === "tr" ? "Her ozellik, isletmenizin ihtiyaclarina gore tasarlandi." : "Every feature is designed for your business needs.";

    return (
        <section ref={sectionRef} className="relative" id="showcase" style={{ height: `${features.length * 100}vh` }}>
            <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4 py-6 md:py-12 pointer-events-none overflow-hidden">
                <div className="w-full max-w-6xl pointer-events-auto flex flex-col h-full max-h-screen">
                    {/* Header */}
                    <div className="text-center shrink-0 mb-4 md:mb-8">
                        <h2 className="text-2xl md:text-5xl lg:text-7xl font-display font-medium text-foreground mb-2 md:mb-4 flex flex-col items-center justify-center gap-1">
                            <TextReveal>{h2_1}</TextReveal>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-purple">
                                <TextReveal delay={0.4}>{h2_2}</TextReveal>
                            </span>
                        </h2>
                        <p className="text-foreground/70 text-sm md:text-lg max-w-2xl mx-auto hidden md:block">{desc}</p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-0 relative">
                        <HyperGlassCard className="h-full overflow-hidden !py-6 !px-4 md:!px-8">
                            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
                                {/* Left: vertical feature tabs */}
                                <div className="w-full lg:w-[30%] flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden shrink-0 pb-2 lg:pb-0 lg:pr-2 scrollbar-hide">
                                    {features.map((feat, idx) => (
                                        <button key={`${sector}-${feat.id}`} onClick={() => setActiveIndex(idx)}
                                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-300 whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink border ${activeIndex === idx ? "bg-cyan-400/10 border-cyan-400/20 shadow-lg shadow-cyan-400/5" : "bg-transparent border-transparent hover:bg-white/5"}`}>
                                            <span className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${activeIndex === idx ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "bg-white/15"}`} />
                                            <div className="min-w-0">
                                                <div className={`text-xs md:text-sm font-semibold transition-colors duration-300 ${activeIndex === idx ? "text-cyan-400" : "text-white/50"}`}>{feat.title[locale]}</div>
                                                <div className={`text-[10px] leading-snug mt-0.5 transition-all duration-300 hidden lg:block ${activeIndex === idx ? "text-white/50 max-h-10 opacity-100" : "text-white/0 max-h-0 opacity-0 overflow-hidden"}`}>{feat.desc[locale]}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Right: macOS window */}
                                <div className="flex-1 min-h-0 min-w-0">
                                    <MacWindow title={active.title[locale]}>
                                        <AnimatePresence mode="wait">
                                            <motion.div key={`${sector}-${active.id}`} className="h-full"
                                                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                                                transition={{ duration: 0.35, ease: "easeInOut" }}>
                                                <MockComponent />
                                            </motion.div>
                                        </AnimatePresence>
                                    </MacWindow>
                                </div>
                            </div>
                        </HyperGlassCard>
                    </div>

                    {/* Scroll dots */}
                    <div className="flex justify-center gap-2 mt-3 md:mt-6 shrink-0">
                        {features.map((_: unknown, idx: number) => (
                            <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${activeIndex === idx ? "w-8 bg-cyan-400" : "w-2 bg-foreground/15"}`} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

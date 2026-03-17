"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  PackagePlus,
  RefreshCw,
  PackageCheck,
  ArrowLeftRight,
} from "lucide-react";
import { HyperGlassCard } from "./HyperGlassCard";
import { TextReveal } from "./TextReveal";
import { useLocale } from "@/lib/i18n";
import { useSectorStore } from "@/lib/sector-store";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Automation {
  id: string;
  icon: typeof Users;
  title: { tr: string; en: string };
  desc: { tr: string; en: string };
  utsOnly?: boolean;
  demo: () => React.JSX.Element;
}

const CYCLE_MS = 5000;

const automations: Automation[] = [
  {
    id: "supplier",
    icon: Users,
    title: { tr: "Otomatik Tedarikçi Ekleme", en: "Auto Supplier Addition" },
    desc: {
      tr: "GİB'den gelen e-faturadaki bilinmeyen tedarikçi otomatik eklenir.",
      en: "Unknown suppliers from government e-invoices are added automatically.",
    },
    demo: DemoSupplier,
  },
  {
    id: "inventory",
    icon: PackagePlus,
    title: { tr: "Fatura → Envanter", en: "Invoice → Inventory" },
    desc: {
      tr: "Fatura kalemleri ayrıştırılır ve envantere otomatik eklenir.",
      en: "Invoice line items are parsed and added to inventory automatically.",
    },
    demo: DemoInventory,
  },
  {
    id: "stock",
    icon: RefreshCw,
    title: { tr: "Otomatik Stok Güncelleme", en: "Auto Stock Update" },
    desc: {
      tr: "Mevcut ürün fatura ile gelirse stok miktarı otomatik artar.",
      en: "Existing product stock is automatically increased from invoices.",
    },
    demo: DemoStock,
  },
  {
    id: "uts-receive",
    icon: PackageCheck,
    title: { tr: "UTS Otomatik Alma", en: "Auto UTS Receive" },
    desc: {
      tr: "UTS'de bekleyen ürünler otomatik olarak alınır.",
      en: "Pending UTS items are automatically received.",
    },
    utsOnly: true,
    demo: DemoUtsReceive,
  },
  {
    id: "uts-transfer",
    icon: ArrowLeftRight,
    title: { tr: "UTS Otomatik Onay", en: "Auto UTS Approval" },
    desc: {
      tr: "Gelen verme talepleri otomatik onaylanır.",
      en: "Incoming transfer requests are auto-approved.",
    },
    utsOnly: true,
    demo: DemoUtsTransfer,
  },
];

/* ------------------------------------------------------------------ */
/*  Demo Components                                                    */
/* ------------------------------------------------------------------ */

function AnimStep({ step, at, children }: { step: number; at: number; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {step >= at && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", damping: 16, stiffness: 140 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useAnimCycle(steps: number, intervalMs = 1600) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    let s = 0;
    const id = setInterval(() => {
      s++;
      if (s > steps) { s = 0; }
      setStep(s);
    }, intervalMs);
    return () => clearInterval(id);
  }, [steps, intervalMs]);
  return step;
}

const Tag = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${color}`}>
    {children}
  </span>
);

const Check = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

function DemoSupplier() {
  const step = useAnimCycle(3);
  return (
    <div className="flex flex-col gap-3 p-4 min-h-[180px] justify-center">
      <AnimStep step={step} at={1}>
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
            <PackagePlus className="w-4 h-4" />
          </div>
          <span>e-Fatura alındı — <span className="text-amber-400 font-medium">ABC Medikal Ltd.</span></span>
        </div>
      </AnimStep>
      <AnimStep step={step} at={2}>
        <Tag color="text-cyan-400 bg-cyan-400/10">
          <RefreshCw className="w-3 h-3 animate-spin" /> Yeni tedarikçi tespit edildi...
        </Tag>
      </AnimStep>
      <AnimStep step={step} at={3}>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Check />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-400">ABC Medikal Ltd.</p>
            <p className="text-[10px] text-emerald-400/60">Tedarikçi listesine eklendi</p>
          </div>
        </div>
      </AnimStep>
    </div>
  );
}

function DemoInventory() {
  const step = useAnimCycle(3);
  const products = [
    { name: "Phonak Audéo P90", brand: "Phonak" },
    { name: "Oticon More 1", brand: "Oticon" },
    { name: "ReSound ONE 9", brand: "ReSound" },
  ];
  return (
    <div className="flex flex-col gap-3 p-4 min-h-[180px] justify-center">
      <AnimStep step={step} at={1}>
        <div className="rounded-lg bg-foreground/5 p-2.5 space-y-1.5">
          {products.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-foreground/50">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" /> {p.name}
            </div>
          ))}
          <p className="text-[10px] text-foreground/30 pt-1">Fatura kalemleri ayrıştırılıyor...</p>
        </div>
      </AnimStep>
      <AnimStep step={step} at={2}>
        <motion.div
          className="h-0.5 rounded bg-gradient-to-r from-cyan-400 to-purple-500"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 1 }} style={{ transformOrigin: "left" }}
        />
      </AnimStep>
      <AnimStep step={step} at={3}>
        <div className="grid grid-cols-3 gap-2">
          {products.map((p, i) => (
            <motion.div
              key={i}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.15, type: "spring", damping: 14 }}
            >
              <p className="text-[10px] font-semibold text-emerald-400">{p.brand}</p>
              <p className="text-[9px] text-foreground/40 truncate">{p.name}</p>
            </motion.div>
          ))}
        </div>
      </AnimStep>
    </div>
  );
}

function DemoStock() {
  const step = useAnimCycle(3);
  return (
    <div className="flex flex-col gap-3 p-4 min-h-[180px] justify-center">
      <AnimStep step={step} at={1}>
        <div className="flex items-center justify-between rounded-lg bg-foreground/5 p-3">
          <div className="text-xs text-foreground/60">Phonak Audéo P90</div>
          <div className="text-lg font-bold text-foreground/80 tabular-nums">12</div>
        </div>
      </AnimStep>
      <AnimStep step={step} at={2}>
        <motion.div
          className="flex items-center justify-center gap-2 text-amber-400"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <PackagePlus className="w-4 h-4" />
          <span className="text-sm font-bold">+5 adet faturadan geldi</span>
        </motion.div>
      </AnimStep>
      <AnimStep step={step} at={3}>
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Check /> Stok güncellendi
          </div>
          <motion.div
            className="text-lg font-bold text-emerald-400 tabular-nums"
            initial={{ scale: 1.4 }} animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10 }}
          >
            17
          </motion.div>
        </div>
      </AnimStep>
    </div>
  );
}

function DemoUtsReceive() {
  const step = useAnimCycle(3);
  const items = ["SN-4821A", "SN-4821B", "SN-4821C"];
  return (
    <div className="flex flex-col gap-3 p-4 min-h-[180px] justify-center">
      <AnimStep step={step} at={1}>
        <div className="space-y-1.5">
          {items.map((sn, i) => (
            <div key={i} className="flex items-center justify-between rounded-md bg-foreground/5 px-3 py-1.5 text-[11px] text-foreground/50">
              <span>{sn}</span>
              <Tag color="text-amber-400 bg-amber-400/10">Bekliyor</Tag>
            </div>
          ))}
        </div>
      </AnimStep>
      <AnimStep step={step} at={2}>
        <Tag color="text-cyan-400 bg-cyan-400/10">
          <RefreshCw className="w-3 h-3 animate-spin" /> UTS alma işlemi...
        </Tag>
      </AnimStep>
      <AnimStep step={step} at={3}>
        <div className="space-y-1.5">
          {items.map((sn, i) => (
            <motion.div
              key={i}
              className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.12 }}
            >
              <span className="text-foreground/60">{sn}</span>
              <Tag color="text-emerald-400 bg-emerald-500/15"><Check /> Alındı</Tag>
            </motion.div>
          ))}
        </div>
      </AnimStep>
    </div>
  );
}

function DemoUtsTransfer() {
  const step = useAnimCycle(3);
  return (
    <div className="flex flex-col gap-3 p-4 min-h-[180px] justify-center">
      <AnimStep step={step} at={1}>
        <div className="rounded-lg bg-foreground/5 p-3 space-y-1">
          <p className="text-xs font-medium text-foreground/70">Verme Talebi #2847</p>
          <p className="text-[10px] text-foreground/40">Kaynak: İstanbul Merkez → Hedef: Ankara Şube</p>
          <p className="text-[10px] text-foreground/40">3 ürün · Phonak Audéo P90</p>
        </div>
      </AnimStep>
      <AnimStep step={step} at={2}>
        <div className="flex items-center justify-center gap-3 py-1">
          <motion.div
            className="h-0.5 w-16 rounded bg-gradient-to-r from-cyan-400 to-purple-500"
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 0.8 }} style={{ transformOrigin: "left" }}
          />
          <Tag color="text-cyan-400 bg-cyan-400/10">Onaylanıyor...</Tag>
          <motion.div
            className="h-0.5 w-16 rounded bg-gradient-to-r from-purple-500 to-cyan-400"
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }} style={{ transformOrigin: "left" }}
          />
        </div>
      </AnimStep>
      <AnimStep step={step} at={3}>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2">
          <Check />
          <div>
            <p className="text-xs font-semibold text-emerald-400">Transfer Onaylandı</p>
            <p className="text-[10px] text-emerald-400/60">Talep #2847 otomatik olarak onaylandı</p>
          </div>
        </div>
      </AnimStep>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AutomationShowcase() {
  const { locale } = useLocale();
  const sector = useSectorStore((s) => s.sector);
  const l = locale as "tr" | "en";

  const showUts = ["hearing", "medical"].includes(sector);
  const items = automations.filter((a) => (a.utsOnly ? showUts : true));

  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Scroll-driven index (consistent with other sticky sections)
  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = -rect.top / (el.offsetHeight - window.innerHeight);
      const clamped = Math.max(0, Math.min(1, progress));
      setActive(Math.min(items.length - 1, Math.floor(clamped * items.length)));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [items.length]);

  const pick = useCallback(
    (i: number) => { setActive(i); },
    [],
  );

  const current = items[active];
  const Demo = current.demo;

  return (
    <section ref={sectionRef} className="relative" style={{ height: `${items.length * 100}vh` }}>
      <div className="sticky top-0 min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
        <div className="max-w-6xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <TextReveal className="text-3xl md:text-4xl font-bold tracking-tight text-foreground justify-center">
            {l === "tr" ? "Gerçek Otomasyon, Gerçek Sonuçlar" : "Real Automation, Real Results"}
          </TextReveal>
          <p className="text-sm text-foreground/40 max-w-lg mx-auto">
            {l === "tr"
              ? "X-EAR, tekrarlayan işlerinizi tamamen otomatikleştirir. İşte sisteminizin sizin yerinize yaptıkları:"
              : "X-EAR fully automates your repetitive tasks. Here is what the system does for you:"}
          </p>
        </div>

        {/* Timeline + Demo */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Timeline (left) */}
          <div className="relative flex flex-row lg:flex-col gap-0 lg:w-[280px] shrink-0 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {/* Connecting line */}
            <div className="hidden lg:block absolute left-5 top-5 bottom-5 w-px">
              <div className="h-full w-full bg-gradient-to-b from-cyan-500/40 via-purple-500/40 to-cyan-500/40" />
              <motion.div
                className="absolute top-0 left-0 w-full bg-gradient-to-b from-cyan-400 to-transparent"
                style={{ height: "40px" }}
                animate={{ top: ["0%", "90%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {items.map((item, i) => {
              const Icon = item.icon;
              const isActive = i === active;
              return (
                <button
                  key={item.id}
                  onClick={() => pick(i)}
                  className={`relative flex items-center gap-3 lg:gap-4 px-3 py-3 lg:py-4 rounded-xl transition-colors text-left shrink-0 ${
                    isActive ? "bg-foreground/5" : "hover:bg-foreground/[0.02]"
                  }`}
                >
                  {/* Node circle */}
                  <div className="relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive
                          ? "border-cyan-400 bg-cyan-400/15 text-cyan-400 shadow-[0_0_16px_rgba(34,211,238,.35)]"
                          : "border-foreground/15 bg-foreground/5 text-foreground/30"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
                        animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="min-w-[140px]">
                    <p
                      className={`text-xs font-semibold transition-colors ${
                        isActive ? "text-foreground" : "text-foreground/40"
                      }`}
                    >
                      {item.title[l]}
                    </p>
                    <p
                      className={`text-[10px] leading-snug mt-0.5 transition-colors hidden lg:block ${
                        isActive ? "text-foreground/50" : "text-foreground/20"
                      }`}
                    >
                      {item.desc[l]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Demo panel (right) */}
          <div className="flex-1 w-full min-w-0">
            <HyperGlassCard className="!p-0 min-h-[240px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                >
                  <div className="flex items-center gap-2 px-4 pt-4">
                    <current.icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-foreground/70">{current.title[l]}</span>
                  </div>
                  <Demo />
                </motion.div>
              </AnimatePresence>
            </HyperGlassCard>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { HyperGlassCard } from "./HyperGlassCard";
import { TextReveal } from "./TextReveal";
import { useLocale } from "@/lib/i18n";
import { useSectorStore, SectorId } from "@/lib/sector-store";
import { cn } from "@/lib/utils";
import {
  Hospital, Ear, Package, Receipt, MessageCircle,
  Smartphone, ShoppingCart, ScanBarcode, ScanEye, CreditCard,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Integration Data                                                   */
/* ------------------------------------------------------------------ */

const ALL_SECTORS: SectorId[] = ["hearing", "pharmacy", "hospital", "hotel", "medical", "optic", "beauty", "general"];

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  ring: "inner" | "outer";
  sectors: SectorId[];
  desc: { tr: string; en: string };
}

const IC = "w-5 h-5";
const integrations: Integration[] = [
  // Core (inner ring)
  { id: "sgk", name: "SGK Medula", icon: <Hospital className={IC} />, ring: "inner", sectors: ["hearing", "pharmacy", "hospital", "medical"], desc: { tr: "E-reçete, provizyon ve fatura entegrasyonu", en: "E-prescription, provision and invoice integration" } },
  { id: "noah", name: "NOAH", icon: <Ear className={IC} />, ring: "inner", sectors: ["hearing"], desc: { tr: "Odyoloji yazılımı entegrasyonu", en: "Audiology software integration" } },
  { id: "uts", name: "ÜTS", icon: <Package className={IC} />, ring: "inner", sectors: ["hearing", "medical"], desc: { tr: "Ürün Takip Sistemi entegrasyonu", en: "Product Tracking System integration" } },
  { id: "efatura", name: "E-Fatura", icon: <Receipt className={IC} />, ring: "inner", sectors: ALL_SECTORS, desc: { tr: "E-fatura gönderimi ve alımı", en: "E-invoice sending and receiving" } },
  // Secondary (outer ring)
  { id: "whatsapp", name: "WhatsApp", icon: <MessageCircle className={IC} />, ring: "outer", sectors: ALL_SECTORS, desc: { tr: "Mesaj gönderim ve takip", en: "Message sending and tracking" } },
  { id: "sms", name: "SMS", icon: <Smartphone className={IC} />, ring: "outer", sectors: ALL_SECTORS, desc: { tr: "Toplu ve otomatik SMS gönderimi", en: "Bulk and automated SMS" } },
  { id: "ecommerce", name: "E-Ticaret", icon: <ShoppingCart className={IC} />, ring: "outer", sectors: ALL_SECTORS, desc: { tr: "Online satış ve ürün senkronizasyonu", en: "Online sales and product sync" } },
  { id: "barcode", name: "Barkod", icon: <ScanBarcode className={IC} />, ring: "outer", sectors: ALL_SECTORS, desc: { tr: "Barkod okuma ve stok yönetimi", en: "Barcode scanning and stock management" } },
  { id: "ocr", name: "OCR", icon: <ScanEye className={IC} />, ring: "outer", sectors: ALL_SECTORS, desc: { tr: "Fatura, reçete ve kimlik tarama", en: "Invoice, prescription and ID scanning" } },
  { id: "pos", name: "POS", icon: <CreditCard className={IC} />, ring: "outer", sectors: ALL_SECTORS, desc: { tr: "Yazarkasa ve ödeme terminali", en: "POS terminal integration" } },
];

const innerItems = integrations.filter((i) => i.ring === "inner");
const outerItems = integrations.filter((i) => i.ring === "outer");

/* ------------------------------------------------------------------ */
/*  Orbit Item                                                         */
/* ------------------------------------------------------------------ */

interface OrbitItemProps {
  item: Integration;
  index: number;
  total: number;
  radius: number;
  duration: number;
  reverse?: boolean;
  isActive: boolean;
  isSectorMatch: boolean;
  isPaused: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

function OrbitItem({ item, index, total, radius, duration, reverse, isActive, isSectorMatch, isPaused, onHover, onClick }: OrbitItemProps) {
  const baseAngle = (360 / total) * index;

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ width: 0, height: 0 }}
      animate={isPaused ? { rotate: 0 } : { rotate: reverse ? -360 : 360 }}
      transition={isPaused ? { duration: 0 } : { duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
    >
      <motion.div
        className="absolute"
        style={{
          transform: `rotate(${baseAngle}deg) translateX(${radius}px) rotate(-${baseAngle}deg)`,
          marginLeft: -28,
          marginTop: -28,
        }}
        whileHover={{ scale: 1.2 }}
        onMouseEnter={() => onHover(item.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onClick(item.id)}
      >
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl cursor-pointer transition-all duration-300",
            "bg-foreground/5 border backdrop-blur-md",
            isSectorMatch
              ? "border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.25)] opacity-100"
              : "border-foreground/5 opacity-30",
            isActive && "ring-2 ring-cyan-400 scale-110 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
          )}
        >
          <span className="counter-rotate" style={{ display: "inline-block", transform: `rotate(${reverse ? 0 : 0}deg)` }}>
            {item.icon}
          </span>
        </div>
        <p className={cn(
          "text-[10px] text-center mt-1 font-medium whitespace-nowrap transition-opacity duration-300",
          isSectorMatch ? "text-foreground/80" : "text-foreground/20"
        )}>
          {item.name}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Grid                                                        */
/* ------------------------------------------------------------------ */

function MobileGrid({ activeId, sector, locale, onSelect }: {
  activeId: string;
  sector: SectorId;
  locale: "tr" | "en";
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {integrations.map((item) => {
        const match = item.sectors.includes(sector);
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-300",
              "bg-foreground/5 border backdrop-blur-md",
              match ? "border-cyan-400/30 opacity-100" : "border-foreground/5 opacity-40",
              active && "ring-2 ring-cyan-400 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            )}
          >
            <span className="shrink-0 text-cyan-400">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
              <p className="text-[11px] text-foreground/50 truncate">{item.desc[locale]}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function IntegrationOrbit() {
  const { locale } = useLocale();
  const sector = useSectorStore((s) => s.sector);

  const [activeId, setActiveId] = useState<string>(integrations[0].id);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const isPaused = hoveredId !== null;
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Auto-cycle every 3s when nothing is hovered
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setActiveId((prev) => {
        const idx = integrations.findIndex((i) => i.id === prev);
        return integrations[(idx + 1) % integrations.length].id;
      });
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused]);

  // When hovering, set that item as active
  useEffect(() => {
    if (hoveredId) setActiveId(hoveredId);
  }, [hoveredId]);

  const handleHover = useCallback((id: string | null) => setHoveredId(id), []);
  const handleClick = useCallback((id: string) => setActiveId(id), []);

  const activeItem = integrations.find((i) => i.id === activeId) ?? integrations[0];

  return (
    <section className="relative w-full py-24 md:py-32 px-4 overflow-hidden" id="integrations">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-blue/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-widest uppercase rounded-full border border-foreground/10 bg-foreground/5 text-accent-blue"
          >
            {locale === "tr" ? "Entegrasyonlar" : "Integrations"}
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-display font-medium text-foreground flex flex-col items-center gap-2">
            <TextReveal>{locale === "tr" ? "Ba\u011flant\u0131lar\u0131n" : "Where Connections"}</TextReveal>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-purple">
              <TextReveal delay={0.4}>{locale === "tr" ? "G\u00fcc\u00fc" : "Empower"}</TextReveal>
            </span>
          </h2>
        </div>

        {/* Desktop Orbit */}
        <div className="hidden md:flex flex-col items-center">
          <div className="relative w-[500px] h-[500px]">
            {/* Orbit ring guides */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[240px] h-[240px] rounded-full border border-foreground/[0.04]" />
              <div className="absolute w-[440px] h-[440px] rounded-full border border-foreground/[0.03]" />
            </div>

            {/* Center logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              {/* Pulsing rings */}
              <motion.div
                className="absolute -inset-4 rounded-full border border-cyan-400/20"
                animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute -inset-8 rounded-full border border-cyan-400/10"
                animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
              <motion.div
                className="absolute -inset-12 rounded-full border border-cyan-400/5"
                animate={{ scale: [1, 1.3], opacity: [0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
              />
              {/* Logo circle */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] p-3">
                <Image
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo/x.svg`}
                  alt="X-EAR"
                  width={48}
                  height={48}
                  className="brightness-0 invert select-none"
                />
              </div>
            </div>

            {/* Inner ring items */}
            <div className="absolute left-1/2 top-1/2" style={{ width: 0, height: 0 }}>
              {innerItems.map((item, i) => (
                <OrbitItem
                  key={item.id}
                  item={item}
                  index={i}
                  total={innerItems.length}
                  radius={120}
                  duration={60}
                  isActive={item.id === activeId}
                  isSectorMatch={item.sectors.includes(sector)}
                  isPaused={isPaused}
                  onHover={handleHover}
                  onClick={handleClick}
                />
              ))}
            </div>

            {/* Outer ring items */}
            <div className="absolute left-1/2 top-1/2" style={{ width: 0, height: 0 }}>
              {outerItems.map((item, i) => (
                <OrbitItem
                  key={item.id}
                  item={item}
                  index={i}
                  total={outerItems.length}
                  radius={220}
                  duration={45}
                  reverse
                  isActive={item.id === activeId}
                  isSectorMatch={item.sectors.includes(sector)}
                  isPaused={isPaused}
                  onHover={handleHover}
                  onClick={handleClick}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Grid */}
        <div className="md:hidden">
          <MobileGrid
            activeId={activeId}
            sector={sector}
            locale={locale}
            onSelect={handleClick}
          />
        </div>

        {/* Detail Card */}
        <div className="mt-10 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md"
            >
              <HyperGlassCard className="!py-6 !px-6 !rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
                    "bg-foreground/5 border",
                    activeItem.sectors.includes(sector) ? "border-cyan-400/30" : "border-foreground/10"
                  )}>
                    {activeItem.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-display font-semibold text-foreground">{activeItem.name}</h4>
                    <p className="text-sm text-foreground/60 leading-relaxed">{activeItem.desc[locale]}</p>
                  </div>
                </div>
              </HyperGlassCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

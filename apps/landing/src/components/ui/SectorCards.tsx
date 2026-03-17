"use client";

import { useLocale } from "@/lib/i18n";
import { useSectorStore, type SectorId } from "@/lib/sector-store";
import { motion } from "framer-motion";
import {
  Ear,
  Pill,
  Cross,
  Stethoscope,
  Glasses,
  Hotel,
  Briefcase,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SECTORS: Array<{
  id: SectorId;
  icon: LucideIcon;
  name: { tr: string; en: string };
  desc: { tr: string; en: string };
  color: string;
  border: string;
  activeBorder: string;
  ring: string;
  iconColor: string;
}> = [
  {
    id: "hearing",
    icon: Ear,
    name: { tr: "İşitme Merkezi", en: "Hearing Center" },
    desc: { tr: "NOAH, SGK, UTS entegrasyonu ile tam donanımlı işitme merkezi yönetimi", en: "Full-featured hearing center management with NOAH, SGK, UTS integration" },
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
    activeBorder: "border-blue-500",
    ring: "ring-blue-500/40",
    iconColor: "text-blue-400",
  },
  {
    id: "pharmacy",
    icon: Pill,
    name: { tr: "Eczane", en: "Pharmacy" },
    desc: { tr: "Stok takibi, reçete yönetimi ve müşteri ilişkileri", en: "Inventory tracking, prescription management, and customer relations" },
    color: "from-green-500/20 to-emerald-500/20",
    border: "border-green-500/30",
    activeBorder: "border-green-500",
    ring: "ring-green-500/40",
    iconColor: "text-green-400",
  },
  {
    id: "hospital",
    icon: Cross,
    name: { tr: "Hastane", en: "Hospital" },
    desc: { tr: "Hasta kayıt, randevu ve tıbbi cihaz yönetimi", en: "Patient registration, appointments, and medical device management" },
    color: "from-red-500/20 to-rose-500/20",
    border: "border-red-500/30",
    activeBorder: "border-red-500",
    ring: "ring-red-500/40",
    iconColor: "text-red-400",
  },
  {
    id: "medical",
    icon: Stethoscope,
    name: { tr: "Medikal Firma", en: "Medical Company" },
    desc: { tr: "Tıbbi cihaz satışı, UTS takibi, bayi yönetimi ve teknik servis", en: "Medical device sales, UTS tracking, dealer management, and technical service" },
    color: "from-teal-500/20 to-cyan-500/20",
    border: "border-teal-500/30",
    activeBorder: "border-teal-500",
    ring: "ring-teal-500/40",
    iconColor: "text-teal-400",
  },
  {
    id: "optic",
    icon: Glasses,
    name: { tr: "Optik Mağaza", en: "Optical Store" },
    desc: { tr: "Reçete takibi, lens & çerçeve envanteri ve müşteri sadakati", en: "Prescription tracking, lens & frame inventory, and customer loyalty" },
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
    activeBorder: "border-violet-500",
    ring: "ring-violet-500/40",
    iconColor: "text-violet-400",
  },
  {
    id: "hotel",
    icon: Hotel,
    name: { tr: "Otel", en: "Hotel" },
    desc: { tr: "Misafir yönetimi, rezervasyon ve hizmet takibi", en: "Guest management, reservations, and service tracking" },
    color: "from-orange-500/20 to-amber-500/20",
    border: "border-orange-500/30",
    activeBorder: "border-orange-500",
    ring: "ring-orange-500/40",
    iconColor: "text-orange-400",
  },
  {
    id: "general",
    icon: Briefcase,
    name: { tr: "Genel CRM", en: "General CRM" },
    desc: { tr: "Her sektöre uyarlanabilen esnek iş yönetim sistemi", en: "Flexible business management system adaptable to any sector" },
    color: "from-gray-500/20 to-slate-500/20",
    border: "border-gray-500/30",
    activeBorder: "border-gray-500",
    ring: "ring-gray-500/40",
    iconColor: "text-gray-400",
  },
];

export function SectorCards() {
  const { locale } = useLocale();
  const { sector: activeSector, setSector } = useSectorStore();

  return (
    <section id="sectors" className="relative z-10 py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl md:text-5xl font-bold mb-4">
          {locale === "tr" ? "Her Sektör İçin" : "For Every Sector"}
        </h2>
        <p className="text-center text-foreground/60 mb-6 max-w-2xl mx-auto">
          {locale === "tr"
            ? "Tek platform, farklı sektörler. Sektörünüzü seçin, içerikler size göre değişsin."
            : "One platform, different sectors. Select your sector, content adapts to you."}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {SECTORS.map((s) => {
            const isActive = activeSector === s.id;
            const Icon = s.icon;
            return (
              <motion.button
                key={s.id}
                onClick={() => setSector(s.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className={`relative rounded-2xl border-2 bg-gradient-to-br ${s.color} backdrop-blur-sm p-5 transition-all text-left cursor-pointer ${
                  isActive
                    ? `${s.activeBorder} ring-2 ${s.ring} shadow-lg`
                    : `${s.border} hover:shadow-md`
                }`}
              >
                <div className={`mb-3 ${s.iconColor}`}>
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold mb-1">{s.name[locale]}</h3>
                <p className="text-xs text-foreground/60 leading-snug hidden md:block">
                  {s.desc[locale]}
                </p>
                {isActive && (
                  <motion.div
                    layoutId="sector-indicator"
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

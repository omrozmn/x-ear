"use client";

import { useLocale } from "@/lib/i18n";

const SECTORS = [
  {
    id: "hearing",
    icon: "🦻",
    name: { tr: "İşitme Merkezi", en: "Hearing Center" },
    desc: { tr: "NOAH, SGK, UTS entegrasyonu ile tam donanımlı işitme merkezi yönetimi", en: "Full-featured hearing center management with NOAH, SGK, UTS integration" },
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
  },
  {
    id: "pharmacy",
    icon: "💊",
    name: { tr: "Eczane", en: "Pharmacy" },
    desc: { tr: "Stok takibi, reçete yönetimi ve müşteri ilişkileri", en: "Inventory tracking, prescription management, and customer relations" },
    color: "from-green-500/20 to-emerald-500/20",
    border: "border-green-500/30",
  },
  {
    id: "hospital",
    icon: "🏥",
    name: { tr: "Hastane", en: "Hospital" },
    desc: { tr: "Hasta kayıt, randevu ve tıbbi cihaz yönetimi", en: "Patient registration, appointments, and medical device management" },
    color: "from-red-500/20 to-rose-500/20",
    border: "border-red-500/30",
  },
  {
    id: "hotel",
    icon: "🏨",
    name: { tr: "Otel", en: "Hotel" },
    desc: { tr: "Misafir yönetimi, rezervasyon ve hizmet takibi", en: "Guest management, reservations, and service tracking" },
    color: "from-orange-500/20 to-amber-500/20",
    border: "border-orange-500/30",
  },
  {
    id: "general",
    icon: "💼",
    name: { tr: "Genel CRM", en: "General CRM" },
    desc: { tr: "Her sektöre uyarlanabilen esnek iş yönetim sistemi", en: "Flexible business management system adaptable to any sector" },
    color: "from-gray-500/20 to-slate-500/20",
    border: "border-gray-500/30",
  },
];

export function SectorCards() {
  const { locale } = useLocale();

  return (
    <section id="sectors" className="relative z-10 py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl md:text-5xl font-bold mb-4">
          {locale === "tr" ? "Her Sektör İçin" : "For Every Sector"}
        </h2>
        <p className="text-center text-foreground/60 mb-16 max-w-2xl mx-auto">
          {locale === "tr"
            ? "Tek platform, farklı sektörler. İşletmenize uygun modülleri seçin."
            : "One platform, different sectors. Choose the modules that fit your business."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECTORS.map((sector) => (
            <div
              key={sector.id}
              className={`group relative rounded-2xl border ${sector.border} bg-gradient-to-br ${sector.color} backdrop-blur-sm p-6 transition-all hover:scale-[1.02] hover:shadow-lg`}
            >
              <div className="text-4xl mb-4">{sector.icon}</div>
              <h3 className="text-xl font-semibold mb-2">
                {sector.name[locale]}
              </h3>
              <p className="text-sm text-foreground/70">
                {sector.desc[locale]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

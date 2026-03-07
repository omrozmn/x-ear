"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { TextReveal } from "@/components/ui/TextReveal";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { ChevronRight, Users, TrendingUp, ShieldCheck, HelpCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent-blue/30 relative flex flex-col">
      <Header />
      <div className="fixed inset-0 z-0">
        <Scene />
      </div>

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
                <TextReveal>Birlikte</TextReveal>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple via-accent-blue to-accent-purple">
                  <TextReveal delay={0.4}>Büyüyelim</TextReveal>
                </span>
              </h1>
              <p className="text-lg md:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
                X-Ear platformunda iş ortaklığı yaparak kliniğinizin ve sektörün geleceğine yön verin, yüksek komisyon oranlarıyla kazanç elde edin.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap justify-center gap-4 mt-10"
            >
              <Link
                href="/affiliate/register"
                className="px-8 py-4 rounded-2xl bg-foreground text-background font-display font-bold text-lg hover:opacity-90 transition-all active:scale-[0.98] shadow-xl shadow-foreground/10 flex items-center gap-2 group"
              >
                Hemen Başvur
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/affiliate/login"
                className="px-8 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground font-display font-bold text-lg hover:bg-foreground hover:text-background transition-all active:scale-[0.98]"
              >
                Ortak Girişi
              </Link>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <HyperGlassCard className="p-8 md:p-12 h-full">
                <h2 className="text-3xl font-display font-bold text-glow mb-8">Neden X-Ear Ortaklığı?</h2>
                <ul className="space-y-6">
                  {[
                    { title: "Yüksek Komisyon", desc: "Her başarılı yönlendirme için sektördeki en rekabetçi oranlar.", icon: TrendingUp, color: "text-accent-blue" },
                    { title: "Şeffaf Raporlama", desc: "Gerçek zamanlı takip ve detaylı kazanç raporları.", icon: Users, color: "text-accent-purple" },
                    { title: "Hızlı Onay", desc: "Kolay başvuru süreci ve 24 saat içinde hesap aktivasyonu.", icon: ShieldCheck, color: "text-emerald-500" },
                    { title: "Sürekli Destek", desc: "Özel kampanya materyalleri ve birebir danışmanlık.", icon: HelpCircle, color: "text-accent-blue" }
                  ].map((item, idx) => (
                    <li key={idx} className="flex gap-5 group">
                      <div className={`p-3 rounded-2xl bg-foreground/5 border border-foreground/10 ${item.color} group-hover:scale-110 transition-transform`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-foreground mb-1">{item.title}</h3>
                        <p className="text-foreground/50 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </HyperGlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col gap-6"
            >
              <HyperGlassCard className="p-8 md:p-12">
                <h3 className="text-2xl font-display font-bold text-glow mb-6">Nasıl Çalışır?</h3>
                <div className="space-y-8 relative">
                  <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-accent-blue via-accent-purple to-transparent opacity-20" />
                  {[
                    { step: "01", title: "Kayıt Olun", desc: "Affiliate formunu doldurarak başvurunuzu yapın." },
                    { step: "02", title: "Kodunuzu Paylaşın", desc: "Size özel referans kodunu kliniğinizle veya meslektaşlarınızla paylaşın." },
                    { step: "03", title: "Kazanç Sağlayın", desc: "Kodunuzla yapılan her abonelikten anında komisyon kazanın." }
                  ].map((s, idx) => (
                    <div key={idx} className="flex gap-6 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-display font-bold shrink-0 shadow-lg shadow-foreground/10">
                        {s.step}
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-lg text-foreground">{s.title}</h4>
                        <p className="text-foreground/50 text-sm mt-1">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </HyperGlassCard>

              <HyperGlassCard className="p-8 bg-accent-blue/5 border-accent-blue/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                  <span className="text-sm font-bold text-accent-blue uppercase tracking-widest">Sıkça Sorulanlar</span>
                </div>
                <p className="text-foreground/70 mb-6 font-medium">
                  Ödemeler ne zaman yapılıyor? Teknik destek sağlıyor musunuz?
                </p>
                <Link
                  href="/faq"
                  className="text-sm font-bold text-foreground flex items-center gap-2 hover:text-accent-blue transition-colors group"
                >
                  SSS Sayfasına Git
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </HyperGlassCard>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

"use client";

import { Scene } from "@/components/canvas/Scene";
import { TextReveal } from "@/components/ui/TextReveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { SentientDemo } from "@/components/ui/SentientDemo";
import { FeatureCards } from "@/components/ui/FeatureCards";
import { InteractiveRoi } from "@/components/ui/InteractiveRoi";
import { SectorCards } from "@/components/ui/SectorCards";
import { PainPoints } from "@/components/ui/PainPoints";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/lib/i18n";
import Link from "next/link";

function HomeContent() {
  const { t } = useLocale();

  return (
    <>
      <Header />
      <main className="relative w-full flex-grow">
        {/* 3D WebGL Background Scene */}
        <Scene />

        {/* Narrative DOM Layers - Hero */}
        <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pointer-events-none">
          <div className="space-y-6 text-center flex flex-col items-center pointer-events-auto mt-[-10vh]">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium backdrop-blur-md mb-4 glass-panel">
              <span className="flex h-2 w-2 rounded-full bg-accent-blue animate-pulse mr-2"></span>
              {t("hero.badge")}
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight flex flex-col items-center">
              <TextReveal delay={0.2}>{t("hero.h1_1")}</TextReveal>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-purple block mt-2">
                <TextReveal delay={0.8}>{t("hero.h1_2")}</TextReveal>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-foreground/70">
              {t("hero.desc")}
            </p>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <MagneticButton intensity={20}>
                <Link
                  href="/register"
                  className="rounded-full bg-foreground px-8 py-3.5 text-sm font-semibold text-background shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all hover:scale-105 active:scale-95 inline-block"
                >
                  {t("hero.cta1")}
                </Link>
              </MagneticButton>
              <MagneticButton intensity={10}>
                <a href="#features" className="text-sm font-semibold leading-6 text-foreground group flex flex-wrap items-center gap-2 transition-colors hover:text-accent-blue py-3 px-4">
                  {t("hero.cta2")} <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </MagneticButton>
            </div>
          </div>
        </section>

        {/* Sector showcase */}
        <SectorCards />

        <PainPoints />

        {/* Narrative DOM Layers - Sentient AI */}
        <SentientDemo />

        {/* Narrative DOM Layers - Ecosystem Cards */}
        <FeatureCards />

        {/* Narrative DOM Layers - Interactive ROI */}
        <InteractiveRoi />

      </main>
      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <HomeContent />
  );
}

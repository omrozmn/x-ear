"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HyperGlassCard } from "./HyperGlassCard";
import { TextReveal } from "./TextReveal";
import { Users, ShieldCheck, MessageSquare, Ear, BarChart3, Archive } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useSectorStore } from "@/lib/sector-store";
import { getSectorContent } from "@/lib/sector-content";

const ICON_MAP: Record<string, React.ReactNode> = {
    users: <Users className="w-8 h-8 text-accent-blue" />,
    ear: <Ear className="w-8 h-8 text-accent-purple" />,
    shield: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
    message: <MessageSquare className="w-8 h-8 text-cyan-400" />,
    archive: <Archive className="w-8 h-8 text-rose-400" />,
    chart: <BarChart3 className="w-8 h-8 text-amber-400" />,
};

export function FeatureCards() {
    const { locale } = useLocale();
    const sector = useSectorStore((s) => s.sector);
    const content = getSectorContent(sector);

    const features = content.features.map((f) => ({
        key: f.key,
        icon: ICON_MAP[f.iconKey],
        title: f.title[locale],
        desc: f.desc[locale],
    }));

    const [activeIndex, setActiveIndex] = useState(0);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const section = sectionRef.current;
            if (!section) return;

            const rect = section.getBoundingClientRect();
            const sectionHeight = section.offsetHeight;
            const viewportHeight = window.innerHeight;

            const scrollProgress = -rect.top / (sectionHeight - viewportHeight);
            const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

            const newIndex = Math.min(
                features.length - 1,
                Math.floor(clampedProgress * features.length)
            );
            setActiveIndex(newIndex);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [features.length]);

    const activeFeat = features[activeIndex];

    return (
        <section
            ref={sectionRef}
            className="relative pointer-events-none"
            id="features"
            style={{ height: `${features.length * 100}vh` }}
        >
            <div className="sticky top-0 min-h-screen flex items-center justify-center px-4 py-16 bg-background">
                <div className="max-w-4xl mx-auto w-full pointer-events-auto">
                    <div className="mb-16 text-center flex flex-col items-center focus-in">
                        <h2 className="text-4xl md:text-5xl lg:text-7xl font-display font-medium text-foreground mb-6 flex flex-col items-center gap-2">
                            <TextReveal>{locale === "tr" ? "Ekosistemin" : "Discover the Power"}</TextReveal>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-purple">
                                <TextReveal delay={0.4}>{locale === "tr" ? "Gücünü Keşfedin" : "of the Ecosystem"}</TextReveal>
                            </span>
                        </h2>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`feature-${sector}-${activeFeat.key}`}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full"
                        >
                            <HyperGlassCard className="py-16 px-8 md:px-16 flex flex-col items-center text-center">
                                <motion.div
                                    key={`feat-icon-${sector}-${activeFeat.key}`}
                                    initial={{ scale: 0, rotate: -15 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                                    className="h-20 w-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                                >
                                    {activeFeat.icon}
                                </motion.div>
                                <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                                    {activeFeat.title}
                                </h3>
                                <p className="text-foreground/70 leading-relaxed text-lg md:text-xl max-w-2xl">
                                    {activeFeat.desc}
                                </p>
                            </HyperGlassCard>
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-center gap-2 mt-10">
                        {features.map((_: unknown, idx: number) => (
                            <div
                                key={idx}
                                className={`h-1 rounded-full transition-all duration-500 ${activeIndex === idx
                                        ? "w-8 bg-accent-blue"
                                        : "w-2 bg-foreground/15"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

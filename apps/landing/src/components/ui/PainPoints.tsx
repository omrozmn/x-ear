"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TextReveal } from "./TextReveal";
import { AlertTriangle, Clock, Frown, Receipt } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useSectorStore } from "@/lib/sector-store";
import { getSectorContent, type SectorPainPoint } from "@/lib/sector-content";

const ICON_MAP = {
    receipt: <Receipt className="w-10 h-10 text-rose-400" />,
    frown: <Frown className="w-10 h-10 text-orange-400" />,
    clock: <Clock className="w-10 h-10 text-amber-400" />,
};

export function PainPoints() {
    const { locale } = useLocale();
    const sector = useSectorStore((s) => s.sector);
    const content = getSectorContent(sector);

    const points = content.painPoints.map((p: SectorPainPoint) => ({
        id: p.id,
        icon: ICON_MAP[p.iconKey],
        title: p.title[locale],
        desc: p.desc[locale],
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
                points.length - 1,
                Math.floor(clampedProgress * points.length)
            );
            setActiveIndex(newIndex);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [points.length]);

    const activePoint = points[activeIndex];

    return (
        <section
            ref={sectionRef}
            className="relative bg-background z-10 pointer-events-auto"
            id="sgk"
            style={{ height: `${points.length * 100}vh` }}
        >
            <div className="sticky top-0 min-h-screen flex items-center justify-center px-4 py-16">
                <div className="max-w-4xl mx-auto w-full">
                    <div className="mb-16 text-center flex flex-col items-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold mb-6 uppercase tracking-wider"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            {content.painBadge[locale]}
                        </motion.div>
                        <h2 className="text-4xl md:text-5xl lg:text-7xl font-display font-medium text-foreground mb-6">
                            <TextReveal>{content.painH2_1[locale]}</TextReveal>
                            <span className="block text-foreground/50 mt-2">
                                <TextReveal delay={0.4}>{content.painH2_2[locale]}</TextReveal>
                            </span>
                        </h2>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`pain-${sector}-${activePoint.id}`}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full"
                        >
                            <div className="relative p-12 md:p-16 rounded-[2.5rem] bg-surface/50 border border-border-glow shadow-2xl backdrop-blur-md flex flex-col items-center text-center group">
                                <motion.div
                                    key={`pain-icon-${sector}-${activePoint.id}`}
                                    initial={{ scale: 0, rotate: -15 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                                    className="h-24 w-24 rounded-3xl bg-background border border-border-glow flex items-center justify-center mb-8 shadow-inner"
                                >
                                    {activePoint.icon}
                                </motion.div>
                                <h3 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">{activePoint.title}</h3>
                                <p className="text-foreground/70 leading-relaxed text-lg md:text-2xl max-w-2xl">
                                    {activePoint.desc}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-center gap-2 mt-8">
                        {points.map((_: unknown, idx: number) => (
                            <div
                                key={idx}
                                className={`h-1 rounded-full transition-all duration-500 ${activeIndex === idx
                                        ? "w-8 bg-rose-500"
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

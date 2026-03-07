"use client";

import { useState } from "react";
import { HyperGlassCard } from "./HyperGlassCard";
import { TextReveal } from "./TextReveal";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n";

export function InteractiveRoi() {
    const { t, locale } = useLocale();
    const [clinics, setClinics] = useState(1);
    const [staff, setStaff] = useState(3);

    const calculateHoursSaved = () => (clinics * staff * 12).toFixed(0);
    const calculateRevenueBoost = () => (clinics * staff * 45000).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");

    return (
        <section className="relative min-h-screen py-32 px-4 flex items-center justify-center pointer-events-none" id="roi">
            <div className="max-w-5xl mx-auto w-full pointer-events-auto">
                <div className="mb-16 text-center flex flex-col items-center">
                    <h2 className="text-4xl md:text-5xl lg:text-7xl font-display font-medium text-foreground mb-6 flex flex-col items-center gap-2">
                        <TextReveal>{t("roi.h2_1")}</TextReveal>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            <TextReveal delay={0.4}>{t("roi.h2_2")}</TextReveal>
                        </span>
                    </h2>
                    <p className="text-foreground/70 text-lg md:text-xl max-w-2xl mx-auto">
                        {t("roi.desc")}
                    </p>
                </div>

                <HyperGlassCard className="py-12 px-8 md:px-16 flex flex-col md:flex-row gap-12">
                    <div className="flex-1 space-y-12">
                        <div className="space-y-6">
                            <div className="flex justify-between text-foreground font-medium">
                                <label className="text-xl">{t("roi.clinics")}</label>
                                <span className="text-accent-blue font-mono font-bold text-3xl">{clinics}</span>
                            </div>
                            <input
                                type="range"
                                min="1" max="10"
                                value={clinics}
                                onChange={(e) => setClinics(Number(e.target.value))}
                                className="w-full accent-accent-blue h-3 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between text-foreground font-medium">
                                <label className="text-xl">{t("roi.staff")}</label>
                                <span className="text-accent-purple font-mono font-bold text-3xl">{staff}</span>
                            </div>
                            <input
                                type="range"
                                min="1" max="25"
                                value={staff}
                                onChange={(e) => setStaff(Number(e.target.value))}
                                className="w-full accent-accent-purple h-3 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-foreground/40 text-sm">
                                {t("roi.staff_note")}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 bg-black/40 rounded-3xl border border-white/5 p-8 flex flex-col justify-center space-y-8 relative overflow-hidden backdrop-blur-2xl shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 pointer-events-none" />

                        <div>
                            <p className="text-foreground/70 text-sm font-semibold uppercase tracking-wider mb-2">{t("roi.hours_label")}</p>
                            <div className="flex items-baseline gap-2">
                                <motion.span
                                    key={`hours-${clinics}-${staff}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-5xl font-display font-bold text-foreground"
                                >
                                    +{calculateHoursSaved()}
                                </motion.span>
                                <span className="text-emerald-400 font-bold tracking-wide">{t("roi.hours_unit")}</span>
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/10" />

                        <div>
                            <p className="text-foreground/70 text-sm font-semibold uppercase tracking-wider mb-2">{t("roi.revenue_label")}</p>
                            <div className="flex items-baseline gap-2">
                                <motion.span
                                    key={`revenue-${clinics}-${staff}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-5xl font-display font-bold text-emerald-400"
                                >
                                    ₺{calculateRevenueBoost()}
                                </motion.span>
                            </div>
                        </div>
                    </div>
                </HyperGlassCard>
            </div>
        </section>
    );
}

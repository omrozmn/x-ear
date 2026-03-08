"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { HyperGlassCard } from "./HyperGlassCard";
import { TextReveal } from "./TextReveal";
import { useLocale } from "@/lib/i18n";

type DemoPhase = "messages" | "thinking" | "prompt" | "processing" | "result";
type DemoMessage = { role: "user" | "ai"; sublabel: string; content: string };
type DemoScenario = {
    id: string;
    title: string;
    messages: DemoMessage[];
    thoughts: string[];
    slotFilling: {
        prompt: string;
        options: string[];
        results: string[];
    };
};

export function SentientDemo() {
    const { t } = useLocale();

    const scenarios = useMemo<DemoScenario[]>(() => [
        {
            id: "mass_sms",
            title: t("sms.title"),
            messages: [{ role: "user" as const, sublabel: t("sms.user.sublabel"), content: t("sms.user.content") }],
            thoughts: [t("sms.thought1"), t("sms.thought2"), t("sms.thought3"), t("sms.thought4"), t("sms.thought5")],
            slotFilling: { prompt: t("sms.prompt"), options: [t("sms.opt1"), t("sms.opt2")], results: [t("sms.result1"), t("sms.result2")] },
        },
        {
            id: "sgk_invoice",
            title: t("sgk.title"),
            messages: [{ role: "ai" as const, sublabel: t("sgk.ai.sublabel"), content: t("sgk.ai.content") }],
            thoughts: [t("sgk.thought1"), t("sgk.thought2"), t("sgk.thought3"), t("sgk.thought4"), t("sgk.thought5")],
            slotFilling: { prompt: t("sgk.prompt"), options: [t("sgk.opt1"), t("sgk.opt2")], results: [t("sgk.result1"), t("sgk.result2")] },
        },
        {
            id: "uninvoiced_sales",
            title: t("inv.title"),
            messages: [{ role: "user" as const, sublabel: t("inv.user.sublabel"), content: t("inv.user.content") }],
            thoughts: [t("inv.thought1"), t("inv.thought2"), t("inv.thought3"), t("inv.thought4"), t("inv.thought5")],
            slotFilling: { prompt: t("inv.prompt"), options: [t("inv.opt1"), t("inv.opt2")], results: [t("inv.result1"), t("inv.result2")] },
        },
        {
            id: "ocr_supplier",
            title: t("ocr.title"),
            messages: [{ role: "user" as const, sublabel: t("ocr.user.sublabel"), content: t("ocr.user.content") }],
            thoughts: [t("ocr.thought1"), t("ocr.thought2"), t("ocr.thought3"), t("ocr.thought4"), t("ocr.thought5"), t("ocr.thought6")],
            slotFilling: { prompt: t("ocr.prompt"), options: [t("ocr.opt1"), t("ocr.opt2")], results: [t("ocr.result1"), t("ocr.result2")] },
        },
    ], [t]);

    const [activeScenario, setActiveScenario] = useState(0);
    const sectionRef = useRef<HTMLDivElement>(null);

    // Sticky scroll
    useEffect(() => {
        const handleScroll = () => {
            const section = sectionRef.current;
            if (!section) return;
            const rect = section.getBoundingClientRect();
            const progress = -rect.top / (section.offsetHeight - window.innerHeight);
            const clamped = Math.max(0, Math.min(1, progress));
            setActiveScenario(Math.min(scenarios.length - 1, Math.floor(clamped * scenarios.length)));
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [scenarios.length]);

    const [phase, setPhase] = useState<DemoPhase>("messages");
    const [activeThoughtIndex, setActiveThoughtIndex] = useState(-1);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const activeData = scenarios[activeScenario];

    // Timeline orchestration
    useEffect(() => {
        setPhase("messages");
        setActiveThoughtIndex(-1);
        setSelectedOptionIndex(null);
        let cancelled = false;
        const timers: NodeJS.Timeout[] = [];
        const schedule = (fn: () => void, delay: number) => {
            const id = setTimeout(() => { if (!cancelled) fn(); }, delay);
            timers.push(id);
        };
        schedule(() => {
            setPhase("thinking");
            let idx = 0;
            const next = () => {
                if (cancelled) return;
                setActiveThoughtIndex(idx);
                if (idx < activeData.thoughts.length - 1) { idx++; schedule(next, 800); }
                else { schedule(() => setPhase("prompt"), 600); }
            };
            schedule(next, 400);
        }, 800);
        return () => { cancelled = true; timers.forEach(clearTimeout); };
    }, [activeData.thoughts, activeScenario]);

    const handleActionClick = (optIndex: number) => {
        setSelectedOptionIndex(optIndex);
        setPhase("processing");
        setTimeout(() => setPhase("result"), 1500);
    };

    const thoughtText = activeThoughtIndex >= 0 && activeThoughtIndex < activeData.thoughts.length
        ? activeData.thoughts[activeThoughtIndex] : null;

    // Shared prompt bubble content
    const PromptContent = () => (
        <>
            <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br from-accent-purple to-accent-blue">
                <span className="text-white text-[10px] font-bold">AI</span>
            </div>
            <div className="flex-1 space-y-2 mt-0.5">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        {(phase === "prompt" || phase === "processing") ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-blue" />
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        )}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-bold opacity-90 text-accent-blue">
                        {phase === "result" ? t("demo.done") : t("demo.approval")}
                    </span>
                </div>
                <p className="text-foreground/90 text-[13px] md:text-[15px] leading-relaxed font-medium">
                    {activeData.slotFilling.prompt}
                </p>
                {(phase === "prompt" || phase === "processing") && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        {activeData.slotFilling.options.map((opt: string, oIdx: number) => (
                            <button
                                key={oIdx}
                                onClick={() => handleActionClick(oIdx)}
                                disabled={phase === "processing"}
                                className={`flex-1 text-xs md:text-sm font-semibold py-2 px-3 rounded-xl transition-all border text-center ${phase === "processing" && selectedOptionIndex === oIdx
                                        ? "bg-accent-blue/20 border-accent-blue/50 text-accent-blue"
                                        : phase === "processing"
                                            ? "bg-foreground/5 border-foreground/5 text-foreground/30 opacity-50 cursor-not-allowed"
                                            : "bg-foreground/10 hover:bg-foreground/20 text-foreground border-foreground/10 hover:border-foreground/30 hover:scale-[1.02] active:scale-95"
                                    }`}
                            >
                                {phase === "processing" && selectedOptionIndex === oIdx ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-3 h-3 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin" />
                                        <span>{t("demo.processing")}</span>
                                    </div>
                                ) : opt}
                            </button>
                        ))}
                    </div>
                )}
                {phase === "result" && selectedOptionIndex !== null && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-emerald-500 font-medium text-xs leading-snug">
                                {activeData.slotFilling.results[selectedOptionIndex]}
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </>
    );

    const showPrompt = phase === "prompt" || phase === "processing" || phase === "result";

    return (
        <section ref={sectionRef} className="relative" id="demo" style={{ height: `${scenarios.length * 100}vh` }}>
            <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4 py-6 md:py-12 pointer-events-none overflow-hidden">
                <div className="w-full max-w-6xl pointer-events-auto flex flex-col h-full max-h-screen">

                    {/* Header */}
                    <div className="text-center shrink-0 mb-3 md:mb-6">
                        <h2 className="text-2xl md:text-5xl lg:text-7xl font-display font-medium text-foreground mb-2 md:mb-4 flex flex-col items-center justify-center gap-1">
                            <TextReveal>{t("demo.h2_1")}</TextReveal>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple to-accent-blue">
                                <TextReveal delay={0.4}>{t("demo.h2_2")}</TextReveal>
                            </span>
                        </h2>
                        <p className="text-foreground/70 text-sm md:text-lg max-w-2xl mx-auto hidden md:block">
                            {t("demo.desc")}
                        </p>
                        <div className="flex justify-center mt-3 md:mt-5">
                            <AnimatePresence mode="wait">
                                <motion.span key={activeData.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                    className="text-xs md:text-sm font-semibold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-3 py-1 rounded-full">
                                    {activeData.title}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="flex-1 min-h-0 relative">
                        <HyperGlassCard className="h-full overflow-hidden">
                            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 w-full h-full overflow-y-auto">

                                {/* COL 1 (mobile: row 1): User/System Message */}
                                <div className="w-full lg:flex-1 flex flex-col space-y-3 order-1 lg:order-1 min-h-0 pb-1">
                                    <AnimatePresence mode="popLayout">
                                        {activeData.messages.map((msg: DemoMessage, idx: number) => (
                                            <motion.div key={`${activeData.id}-msg-${idx}`} layout
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                                                className={`rounded-2xl p-3 md:p-5 backdrop-blur-md border flex items-start gap-3 shadow-lg ${msg.role === "ai" ? "mr-2 md:mr-12 bg-foreground/5 border-foreground/5" : "ml-2 md:ml-12 bg-accent-purple/10 border-accent-purple/20"
                                                    }`}>
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === "ai" ? "bg-gradient-to-br from-accent-purple to-accent-blue" : "bg-foreground/10 border border-foreground/10"}`}>
                                                    {msg.role === "ai" ? <span className="text-white text-[10px] font-bold">AI</span> : <span className="text-foreground/80 text-[10px] font-bold">{t("demo.you")}</span>}
                                                </div>
                                                <div className="flex-1 space-y-1 mt-0.5">
                                                    <span className={`text-[9px] uppercase tracking-widest font-bold opacity-70 ${msg.role === "ai" ? "text-accent-blue" : "text-accent-purple"}`}>{msg.sublabel}</span>
                                                    <p className="text-foreground/90 text-[13px] md:text-[15px] leading-relaxed font-medium">{msg.content}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Desktop: prompt inline after messages */}
                                    <div className="hidden lg:block">
                                        <AnimatePresence mode="popLayout">
                                            {showPrompt && (
                                                <motion.div key={`prompt-lg-${activeData.id}`} layout
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    transition={{ type: "spring", stiffness: 120 }}
                                                    className="rounded-2xl p-3 md:p-5 backdrop-blur-xl border border-accent-blue/30 bg-accent-blue/5 flex items-start gap-3 shadow-xl mr-2 md:mr-12">
                                                    <PromptContent />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* COL 2 (mobile: row 2): Terminal */}
                                <div className="w-full lg:flex-1 bg-foreground/[0.03] dark:bg-black/40 rounded-2xl lg:rounded-[2rem] border border-foreground/5 p-4 md:p-6 flex flex-col relative overflow-hidden backdrop-blur-2xl shadow-inner shrink-0 min-h-[100px] md:min-h-[180px] lg:min-h-0 order-2">
                                    <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-accent-purple/5 pointer-events-none" />
                                    <div className="flex flex-col justify-center relative z-10 flex-1 transition-opacity duration-500" style={{ opacity: phase === "messages" ? 0.3 : 1 }}>
                                        <div className="flex items-center justify-between mb-3 border-b border-foreground/10 pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] md:text-xs uppercase font-extrabold tracking-widest text-accent-purple/80">{t("demo.shell")}</span>
                                                {phase === "thinking" && (
                                                    <div className="flex gap-1">
                                                        <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                        <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                        <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1.5 flex-row-reverse">
                                                <div className="w-2 h-2 rounded-full bg-rose-500/70" />
                                                <div className="w-2 h-2 rounded-full bg-amber-500/70" />
                                                <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
                                            </div>
                                        </div>
                                        <div className="font-mono text-xs md:text-sm text-accent-blue/90 flex flex-col items-start justify-center flex-1 min-h-[40px]">
                                            {phase === "messages" && <div className="text-foreground/30">{">>"} {t("demo.waiting")}</div>}
                                            <AnimatePresence mode="popLayout">
                                                {thoughtText && (
                                                    <motion.div key={`th-${activeData.id}-${activeThoughtIndex}`}
                                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                                        transition={{ duration: 0.2 }} className="flex items-start gap-2 w-full">
                                                        <span className="text-accent-purple font-bold shrink-0">{">>"}</span>
                                                        <span className="leading-snug">{thoughtText}</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            {(phase === "prompt" || phase === "processing" || phase === "result") && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} className="text-emerald-500 mt-2 font-bold text-xs">
                                                    {">>"} {t("demo.complete")}
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile only: row 3 – AI response after terminal */}
                                <div className="w-full order-3 lg:hidden">
                                    <AnimatePresence mode="popLayout">
                                        {showPrompt && (
                                            <motion.div key={`prompt-sm-${activeData.id}`} layout
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                                transition={{ type: "spring", stiffness: 120 }}
                                                className="rounded-2xl p-3 backdrop-blur-xl border border-accent-blue/30 bg-accent-blue/5 flex items-start gap-3 shadow-xl mr-2">
                                                <PromptContent />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                            </div>
                        </HyperGlassCard>
                    </div>

                    {/* Scroll indicator */}
                    <div className="flex justify-center gap-2 mt-3 md:mt-6 shrink-0">
                        {scenarios.map((_: DemoScenario, idx: number) => (
                            <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${activeScenario === idx ? "w-8 bg-accent-blue" : "w-2 bg-foreground/15"}`} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

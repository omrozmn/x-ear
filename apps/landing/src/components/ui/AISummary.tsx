"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AISummaryProps {
    content: string;
    className?: string;
    label?: string;
}

export function AISummary({ content, className, label = "AI Özet" }: AISummaryProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
                "relative overflow-hidden rounded-3xl border border-accent-blue/20 bg-accent-blue/5 p-6 md:p-8 backdrop-blur-sm mb-12",
                className
            )}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles className="w-24 h-24 text-accent-blue" />
            </div>

            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3 h-3" />
                    {label}
                </div>

                <p className="text-lg md:text-xl text-foreground/80 leading-relaxed italic font-display">
                    "{content}"
                </p>
            </div>

            {/* Subtle glow effect */}
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent-blue/20 blur-[80px] rounded-full pointer-events-none" />
        </motion.div>
    );
}

"use client";

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyInsightProps {
    content: string;
    className?: string;
    label?: string;
}

export function KeyInsight({ content, className, label = "Kritik İçgörü" }: KeyInsightProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={cn(
                "relative border-l-4 border-accent-purple bg-gradient-to-r from-accent-purple/10 to-transparent p-6 my-10 rounded-r-2xl",
                className
            )}
        >
            <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-lg bg-accent-purple/20 text-accent-purple shrink-0">
                    <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                    <span className="block text-xs font-bold uppercase tracking-widest text-accent-purple mb-2">
                        {label}
                    </span>
                    <p className="text-lg md:text-xl font-medium text-foreground/90 leading-relaxed">
                        {content}
                    </p>
                </div>
            </div>

            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-full opacity-[0.03] pointer-events-none overflow-hidden">
                <div className="grid grid-cols-4 gap-2 rotate-12">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="w-full aspect-square bg-accent-purple rounded-full" />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

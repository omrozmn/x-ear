"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { HyperGlassCard } from "./HyperGlassCard";

interface EntityItem {
    label: string;
    value: string;
}

interface EntityDefinitionProps {
    title: string;
    description: string;
    items: EntityItem[];
    className?: string;
}

export function EntityDefinition({ title, description, items, className }: EntityDefinitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={cn("mb-12", className)}
        >
            <HyperGlassCard className="p-0 overflow-hidden border-accent-purple/20">
                <div className="bg-accent-purple/10 border-b border-accent-purple/20 p-6 md:px-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-accent-purple/20 text-accent-purple">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-display font-bold text-foreground">
                            {title}
                        </h3>
                    </div>
                    <p className="text-foreground/60 text-sm md:text-base">
                        {description}
                    </p>
                </div>

                <div className="p-6 md:p-8">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {items.map((item, idx) => (
                            <div key={idx} className="border-l-2 border-accent-purple/30 pl-4 py-1">
                                <dt className="text-xs font-bold uppercase tracking-widest text-accent-purple/70 mb-1">
                                    {item.label}
                                </dt>
                                <dd className="text-foreground/80 font-medium">
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </HyperGlassCard>
        </motion.div>
    );
}

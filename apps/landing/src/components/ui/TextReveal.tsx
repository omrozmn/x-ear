"use client";

import { useRef } from "react";
import { motion, useInView, Variants, Transition } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextRevealProps {
    children: string;
    className?: string;
    delay?: number;
}

const springTransition: Transition = {
    type: "spring",
    damping: 12,
    stiffness: 100,
};

export function TextReveal({ children, className, delay = 0 }: TextRevealProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-10%" });

    const words = children.split(" ");

    const container: Variants = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: delay * i },
        }),
    };

    const child: Variants = {
        visible: {
            opacity: 1,
            y: 0,
            transition: springTransition,
        },
        hidden: {
            opacity: 0,
            y: 20,
            transition: springTransition,
        },
    };

    return (
        <motion.span
            ref={ref}
            className={cn("inline-flex flex-wrap", className)}
            variants={container}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
        >
            {words.map((word, index) => (
                <motion.span
                    variants={child}
                    className="inline-block"
                    key={index}
                >
                    {word}&nbsp;
                </motion.span>
            ))}
        </motion.span>
    );
}

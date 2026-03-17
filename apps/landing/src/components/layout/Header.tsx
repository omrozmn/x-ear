"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "../ui/ThemeToggle";
import { MagneticButton } from "../ui/MagneticButton";
import { useState, useEffect } from "react";
import { Menu, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/i18n";

export function Header() {
    const { t } = useLocale();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const navigation = [
        { name: t("nav.features"), href: "/#features" },
        { name: t("nav.pricing"), href: "/pricing" },
        { name: t("nav.ai"), href: "/#demo" },
        { name: t("nav.blog"), href: "/blog" },
        { name: t("nav.partner"), href: "/affiliate" },
        { name: t("nav.faq"), href: "/faq" },
    ];

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${isMobileMenuOpen
            ? "bg-transparent border-transparent py-3"
            : scrolled
                ? "bg-background/80 backdrop-blur-xl border-foreground/5 py-3 shadow-sm"
                : "bg-transparent border-transparent py-5"
            }`}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group z-[60]" onClick={closeMenu}>
                        <div className="relative h-9 w-9 flex items-center justify-center">
                            <Image
                                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo/x.svg`}
                                alt="X-EAR Logo"
                                width={36}
                                height={36}
                                className="object-contain dark:invert dark:brightness-200"
                                priority
                            />
                        </div>
                        <span className="font-display font-bold text-2xl tracking-tight text-foreground">
                            -EAR
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-10">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-sm font-medium text-foreground/70 hover:text-accent-blue transition-colors relative group"
                            >
                                {item.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-blue transition-all group-hover:w-full" />
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop Actions & Mobile Menu Toggle */}
                    <div className="flex items-center gap-3 md:gap-5 z-[60]">
                        <ThemeToggle />

                        <div className="hidden md:flex items-center gap-6">
                            <a
                                href={`${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8080'}/login`}
                                className="text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors"
                            >
                                {t("header.login")}
                            </a>
                            <Link
                                href="/register"
                                className="rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity shadow-sm"
                            >
                                {t("header.register")}
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-foreground/80 hover:text-foreground transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-40 bg-background md:hidden flex flex-col pt-24 px-6 overflow-y-auto"
                    >
                        <nav className="flex flex-col gap-4">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={closeMenu}
                                    className="flex items-center justify-between py-5 text-2xl font-display font-medium text-foreground border-b border-foreground/5"
                                >
                                    {item.name}
                                    <ChevronRight className="w-6 h-6 text-foreground/20" />
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-auto py-10 flex flex-col gap-4">
                            <a
                                href={`${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8080'}/login`}
                                onClick={closeMenu}
                                className="w-full py-4 text-center rounded-2xl bg-surface border border-border-glow text-foreground font-semibold text-lg"
                            >
                                {t("header.login")}
                            </a>
                            <Link
                                href="/register"
                                onClick={closeMenu}
                                className="w-full py-4 text-center rounded-2xl bg-foreground text-background font-semibold text-lg shadow-lg"
                            >
                                {t("header.start")}
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

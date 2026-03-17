"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useLocale } from "@/lib/i18n";

export function Footer() {
    const { t } = useLocale();

    return (
        <footer className="border-t border-white/5 bg-background relative z-10" id="affiliate">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">

                    <div className="space-y-6 md:col-span-1">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative h-9 w-9 flex items-center justify-center">
                                <Image
                                    src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo/x.svg`}
                                    alt="X-EAR Logo"
                                    width={36}
                                    height={36}
                                    className="object-contain"
                                />
                            </div>
                            <span className="font-display font-bold text-2xl tracking-tight text-foreground">
                                -EAR
                            </span>
                        </Link>
                        <p className="text-sm text-foreground/60 leading-relaxed">
                            {t("footer.desc")}
                        </p>
                        <div className="flex gap-4 pt-2">
                            <ThemeToggle />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">{t("footer.product")}</h3>
                        <ul className="space-y-3">
                            <li><Link href="#features" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.features")}</Link></li>
                            <li><Link href="#demo" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.ai_assistant")}</Link></li>
                            <li><Link href="#roi" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.roi_calc")}</Link></li>
                            <li><Link href="/pricing" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.pricing")}</Link></li>
                            <li><Link href="/faq" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.faq")}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-5">{t("footer.solutions")}</h3>
                        <ul className="space-y-3">
                            <li><Link href="/register" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.sgk")}</Link></li>
                            <li><Link href="/#demo" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.appointment")}</Link></li>
                            <li><Link href="/#features" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.stock")}</Link></li>
                            <li><Link href="/affiliate" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">{t("footer.partner")}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">{t("footer.contact")}</h3>
                        <ul className="space-y-3">
                            <li><a href="mailto:hello@x-ear.com" className="text-sm text-foreground/60 hover:text-accent-blue transition-colors">hello@x-ear.com</a></li>
                            <li><p className="text-sm text-foreground/60">{t("footer.location")}</p></li>
                        </ul>
                    </div>

                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-foreground/40">
                        &copy; {new Date().getFullYear()} X-EAR Technologies. {t("footer.rights")}
                    </p>
                    <div className="flex gap-4">
                        <Link href="/privacy" className="text-xs text-foreground/40 hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
                        <Link href="/terms" className="text-xs text-foreground/40 hover:text-foreground transition-colors">{t("footer.terms")}</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

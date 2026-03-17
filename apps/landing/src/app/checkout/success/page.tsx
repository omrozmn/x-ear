"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, Shield, CreditCard, Receipt } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";

function SuccessContent() {
    const searchParams = useSearchParams();
    const paymentId = searchParams.get("payment_id");
    const provision = searchParams.get("provision");
    const orderId = searchParams.get("order");

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:8080";

    return (
        <div className="min-h-screen bg-background text-foreground relative flex flex-col">
            <Header />
            <div className="fixed inset-0 z-0">
                <Scene />
            </div>

            <main className="relative z-10 flex-grow flex items-center justify-center px-4 pt-24 pb-20">
                <div className="max-w-lg w-full">
                    <HyperGlassCard className="flex-col items-center px-8 py-12 space-y-6 text-center">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>

                        <h1 className="text-3xl font-display font-bold text-foreground">
                            Odeme Basarili!
                        </h1>
                        <p className="text-foreground/60">
                            Aboneliginiz basariyla olusturuldu. Artik sisteme giris yapabilirsiniz.
                        </p>

                        {/* Payment Details */}
                        <div className="w-full space-y-3 pt-4">
                            {paymentId && (
                                <div className="flex items-center justify-between px-4 py-3 bg-foreground/5 rounded-xl text-sm">
                                    <span className="text-foreground/50 flex items-center gap-2">
                                        <Receipt className="w-4 h-4" /> Islem No
                                    </span>
                                    <span className="text-foreground font-mono font-medium">{paymentId}</span>
                                </div>
                            )}
                            {provision && (
                                <div className="flex items-center justify-between px-4 py-3 bg-foreground/5 rounded-xl text-sm">
                                    <span className="text-foreground/50 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Provizyon No
                                    </span>
                                    <span className="text-foreground font-mono font-medium">{provision}</span>
                                </div>
                            )}
                            {orderId && (
                                <div className="flex items-center justify-between px-4 py-3 bg-foreground/5 rounded-xl text-sm">
                                    <span className="text-foreground/50 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" /> Siparis No
                                    </span>
                                    <span className="text-foreground font-mono font-medium text-xs">{orderId}</span>
                                </div>
                            )}
                        </div>

                        <a
                            href={`${webUrl}/login?subscribed=true`}
                            className="w-full flex justify-center items-center py-4 px-6 bg-foreground text-background font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                        >
                            Panele Giris Yap
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </a>

                        <p className="text-xs text-foreground/40 pt-2">
                            Abonelik bilgileriniz e-posta adresinize gonderilmistir.
                        </p>
                    </HyperGlassCard>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function CheckoutSuccess() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
                    Yukleniyor...
                </div>
            }
        >
            <SuccessContent />
        </Suspense>
    );
}

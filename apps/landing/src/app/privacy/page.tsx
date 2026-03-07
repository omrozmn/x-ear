"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { TextReveal } from "@/components/ui/TextReveal";
import { motion } from "framer-motion";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground relative flex flex-col">
            <Header />
            <div className="fixed inset-0 z-0">
                <Scene />
            </div>

            <main className="flex-grow pt-32 pb-24 relative z-10 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <TextReveal className="text-4xl md:text-6xl font-display font-bold text-glow">
                            Gizlilik Sözleşmesi
                        </TextReveal>
                        <p className="text-foreground/50 mt-4 font-medium tracking-wide">
                            Verilerinizin güvenliği ve gizliliği bizim için en öncelikli konudur.
                        </p>
                    </div>

                    <HyperGlassCard className="p-8 md:p-12 prose prose-invert max-w-none">
                        <div className="space-y-8 text-foreground/70 leading-relaxed">
                            <section>
                                <h2 className="text-2xl font-display font-bold text-foreground mb-4">1. Veri Toplama</h2>
                                <p>
                                    X-EAR olarak, hizmetlerimizi sunabilmek ve kullanıcı deneyimini iyileştirmek amacıyla belirli bilgileri topluyoruz. Bu bilgiler; isim, e-posta, iletişim bilgileri ve sistem kullanım istatistiklerini içerir.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-display font-bold text-foreground mb-4">2. Veri Güvenliği</h2>
                                <p>
                                    Toplanan tüm veriler, endüstri standardı şifreleme yöntemleri ile korunmaktadır. Tıbbi ve operasyonel verileriniz, yetkisiz erişime karşı en üst düzey güvenlik protokolleri ile muhafaza edilir.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-display font-bold text-foreground mb-4">3. Üçüncü Taraflar</h2>
                                <p>
                                    Verileriniz, yasal zorunluluklar dışında veya açık rızanız olmaksızın asla üçüncü şahıs veya kurumlarla paylaşılmaz. Partner ve affiliate programları kapsamında paylaşılan veriler, sadece operasyonel gereklilikler ile sınırlıdır.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-display font-bold text-foreground mb-4">4. Haklarınız</h2>
                                <p>
                                    Kullanıcılar, sistemde kayıtlı verilerine erişme, düzeltme veya silme hakkına sahiptir. KVKK kapsamında tüm haklarınız X-EAR güvencesi altındadır.
                                </p>
                            </section>

                            <div className="pt-8 border-t border-white/5 text-sm italic">
                                Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
                            </div>
                        </div>
                    </HyperGlassCard>
                </div>
            </main>
            <Footer />
        </div>
    );
}

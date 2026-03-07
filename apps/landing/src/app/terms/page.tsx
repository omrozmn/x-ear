"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { TextReveal } from "@/components/ui/TextReveal";
import { motion } from "framer-motion";

export default function TermsPage() {
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
                            Kullanım Koşulları
                        </TextReveal>
                        <p className="text-foreground/50 mt-4 font-medium tracking-wide">
                            X-EAR platformunu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.
                        </p>
                    </div>

                    <HyperGlassCard className="p-8 md:p-12 prose prose-invert max-w-none">
                        <div className="space-y-8 text-foreground/70 leading-relaxed">
                            <section>
                                <h2 className="text-2xl font-display font-bold text-foreground mb-4">1. Hizmet Tanımı</h2>
                                <p>
                                    X-EAR, klinikler için geliştirilmiş mekansal bir CRM ve yönetim platformudur. Sunulan hizmetler; randevu yönetimi, hasta takibi, finansal raporlama ve AI destekli asistanlık hizmetlerini kapsar.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-display font-bold text-foreground mb-4">2. Kullanıcı Sorumlulukları</h2>
                                <p>
                                    Kullanıcılar, sisteme girdikleri verilerin doğruluğundan ve hesap güvenliğinden sorumludur. Şifrelerin gizli tutulması ve yetkisiz kullanımın bildirilmesi kullanıcının yükümlülüğündedir.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-display font-bold text-foreground mb-4">3. Fikri Mülkiyet</h2>
                                <p>
                                    X-EAR platformundaki tüm yazılım, tasarım, marka ve içerikler X-EAR Technologies'e aittir. Yazılı izin olmaksızın kopyalanamaz veya ticari amaçla kullanılamaz.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-display font-bold text-foreground mb-4">4. Hizmet Kesintileri</h2>
                                <p>
                                    Bakım veya teknik güncellemeler nedeniyle hizmette kısa süreli kesintiler yaşanabilir. X-EAR, bu tür durumları önceden bildirmek için makul çabayı gösterir ancak hizmet sürekliliği konusunda mutlak garanti vermez.
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

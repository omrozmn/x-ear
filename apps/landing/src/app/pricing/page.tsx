"use client";

import Link from "next/link";
import { CheckCircle2, Menu, Star, Zap, Crown, MessageSquare, Plus, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { TextReveal } from "@/components/ui/TextReveal";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";

export default function Pricing() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch plans on mount
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await apiClient.get('/api/plans');
                const data = res.data;
                if (data.success) {
                    setPlans(data.data);
                }
            } catch (error: any) {
                console.error('Failed to fetch plans:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-accent-blue/30 relative flex flex-col">
            <Header />
            <div className="fixed inset-0 z-0">
                <Scene />
            </div>

            <main className="flex-grow pt-32 pb-24 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-glow mb-6">
                                <TextReveal>Geleceğin Kliniği</TextReveal>
                                <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue via-accent-purple to-accent-blue">
                                    <TextReveal delay={0.4}>İçin Tasarlandı</TextReveal>
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-foreground/60 max-w-3xl mx-auto">
                                X-Ear CRM ile kliniğinizin potansiyelini ortaya çıkarın. Verimliliği artırın, hasta memnuniyetini en üst düzeye taşıyın.
                            </p>
                        </motion.div>
                    </div>

                    <div className="flex justify-center items-center space-x-4 mb-16">
                        <div className="px-6 py-2 rounded-full bg-foreground/5 border border-foreground/10 text-foreground/70 font-display font-semibold flex items-center gap-2">
                            <Zap className="w-4 h-4 text-accent-blue" />
                            Yıllık Faturalandırma
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-12 h-12 border-4 border-foreground/10 border-t-foreground rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                            {plans.map((plan, idx) => {
                                const monthlyPrice = plan.price / 12;
                                let featuresList: string[] = [];
                                if (Array.isArray(plan.features)) {
                                    featuresList = plan.features
                                        .filter((f: any) => typeof f === 'string' || f.is_visible)
                                        .map((f: any) => typeof f === 'string' ? f : f.name);
                                } else if (plan.features && typeof plan.features === 'object') {
                                    featuresList = Object.entries(plan.features)
                                        .map(([key, value]: [string, any]) => {
                                            if (typeof value === 'object' && value.name) return value.name;
                                            return key;
                                        });
                                }

                                return (
                                    <motion.div
                                        key={plan.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    >
                                        <PricingCard
                                            planId={plan.id}
                                            billingCycle="yearly"
                                            title={plan.name}
                                            description={plan.description || ''}
                                            price={`₺${Math.floor(monthlyPrice)}`}
                                            yearlyPrice={`₺${plan.price}`}
                                            features={featuresList}
                                            buttonText="Hemen Başla"
                                            isPopular={plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('business')}
                                        />
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add-ons Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mt-32"
                    >
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-display font-bold text-glow mb-4">
                                Ek Özellikler
                            </h2>
                            <p className="text-foreground/60 max-w-2xl mx-auto text-lg leading-relaxed">
                                İhtiyacınıza göre paketinizi özelleştirin ve kliniğinizi güçlendirin.
                            </p>
                        </div>
                        <AddOnsList />
                    </motion.div>

                    {/* SMS Packages Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mt-32"
                    >
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-display font-bold text-glow mb-4">
                                SMS Paketleri
                            </h2>
                            <p className="text-foreground/60 max-w-2xl mx-auto text-lg leading-relaxed">
                                Güçlü iletişim için ihtiyacınıza uygun SMS paketini seçin.
                            </p>
                        </div>
                        <SmsPackagesList />
                    </motion.div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function PricingCard({
    planId,
    billingCycle,
    title,
    description,
    price,
    yearlyPrice,
    features,
    buttonText,
    isPopular,
}: {
    planId: string;
    billingCycle: string;
    title: string;
    description: string;
    price: string;
    yearlyPrice?: string;
    features: string[];
    buttonText: string;
    isPopular: boolean;
}) {
    return (
        <HyperGlassCard
            className={`h-full flex flex-col relative group transition-all duration-300 ${isPopular ? "border-accent-blue/50 ring-1 ring-accent-blue/20" : ""
                }`}
        >
            {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-lg shadow-accent-blue/20 z-10 whitespace-nowrap">
                    En Çok Tercih Edilen
                </div>
            )}

            <div className="p-8 pb-4">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-2xl font-display font-bold text-foreground">{title}</h3>
                    {isPopular && <Crown className="w-5 h-5 text-accent-blue" />}
                </div>
                <p className="text-foreground/50 text-sm mb-8 leading-relaxed line-clamp-2 h-10">{description}</p>
                <div className="mb-0">
                    <div className="flex items-baseline">
                        <span className="text-5xl font-display font-bold text-foreground text-glow">{price}</span>
                        <span className="text-foreground/40 ml-1.5 font-medium text-lg">/ay</span>
                    </div>
                    {yearlyPrice && <div className="text-[11px] font-bold text-accent-blue uppercase tracking-widest mt-2">Yıllık {yearlyPrice} • %20 TASARRUF</div>}
                </div>
            </div>

            <div className="px-8 flex-grow">
                <div className="h-px bg-foreground/5 mb-8" />
                <ul className="space-y-4 text-foreground/70 mb-10">
                    {features.map((feature, index) => (
                        <FeatureItem key={index} text={feature} />
                    ))}
                </ul>
            </div>

            <div className="p-8 pt-0">
                <Link
                    href={`/checkout?plan=${planId}&billing=${billingCycle}`}
                    className={`w-full group flex items-center justify-center gap-2 font-display font-bold py-4 px-6 rounded-2xl text-base transition-all active:scale-[0.98] ${isPopular
                        ? "bg-foreground text-background shadow-xl shadow-foreground/10 hover:opacity-90"
                        : "bg-foreground/5 border border-foreground/10 text-foreground hover:bg-foreground hover:text-background"
                        }`}
                >
                    {buttonText}
                    <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-0.5 ${isPopular ? "text-accent-blue" : ""}`} />
                </Link>
            </div>
        </HyperGlassCard>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent-blue shrink-0 mt-0.5" />
            <span className="text-sm leading-tight" dangerouslySetInnerHTML={{ __html: text.replace(/(\d+)/g, "<span class='font-bold text-foreground'>$1</span>") }}></span>
        </li>
    );
}

function AddOnsList() {
    const [addons, setAddons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const res = await apiClient.get('/api/addons');
                const data = res.data;
                if (data.success) {
                    setAddons(data.data.filter((a: any) => a.is_active));
                }
            } catch (error) {
                console.error('Failed to fetch addons:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAddons();
    }, []);

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-foreground/5 rounded-3xl animate-pulse" />)}
        </div>
    );
    if (addons.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon) => (
                <HyperGlassCard key={addon.id} className="p-8 flex flex-col group overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 rounded-2xl bg-accent-purple/10 text-accent-purple group-hover:bg-accent-purple group-hover:text-white transition-colors">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                            {addon.addon_type === 'FLAT_FEE' ? 'Aylık' :
                                addon.addon_type === 'PER_USER' ? 'Kullanıcı Başı' : 'Kullanım'}
                        </div>
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">{addon.name}</h3>
                    <div className="text-3xl font-display font-bold text-glow mb-6">
                        ₺{addon.price} <span className="text-sm text-foreground/40 font-medium">
                            {addon.addon_type === 'FLAT_FEE' ? '/ay' :
                                addon.addon_type === 'PER_USER' ? '/kullanıcı' : ''}
                        </span>
                    </div>
                    <p className="mt-auto text-sm text-foreground/40">
                        Paketinize ek olarak dilediğiniz zaman aktive edebilirsiniz.
                    </p>
                </HyperGlassCard>
            ))}
        </div>
    );
}

function SmsPackagesList() {
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const res = await apiClient.get('/api/sms-packages');
                const data = res.data;
                if (data.success) {
                    setPackages(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch SMS packages:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-56 bg-foreground/5 rounded-3xl animate-pulse" />)}
        </div>
    );
    if (packages.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => (
                <HyperGlassCard key={pkg.id} className="p-8 flex flex-col relative overflow-hidden group hover:border-accent-blue/50 transition-all">
                    <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <MessageSquare className="w-24 h-24 text-accent-blue" />
                    </div>
                    <div className="mb-6 relative z-10">
                        <h3 className="text-2xl font-display font-bold text-foreground">{pkg.name}</h3>
                        <div className="text-accent-blue font-bold text-xs uppercase tracking-widest mt-2">{(pkg.sms_count || pkg.smsCount || 0).toLocaleString()} ADET</div>
                    </div>
                    <div className="text-3xl font-display font-bold text-glow mb-8 relative z-10">
                        {(pkg.price || 0).toLocaleString('tr-TR', { style: 'currency', currency: pkg.currency || 'TRY' })}
                    </div>
                    <Link
                        href={`/register?package=${pkg.id}`}
                        className="mt-auto w-full group flex items-center justify-center gap-2 bg-foreground/5 border border-foreground/10 text-foreground font-bold py-4 rounded-2xl hover:bg-foreground hover:text-background transition-all active:scale-[0.98]"
                    >
                        Hemen Al
                        <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </HyperGlassCard>
            ))}
        </div>
    );
}

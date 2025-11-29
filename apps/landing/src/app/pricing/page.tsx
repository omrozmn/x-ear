"use client";

import Link from "next/link";
import { CheckCircle2, Menu } from "lucide-react";
import { useState, useEffect } from "react";

export default function Pricing() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch plans on mount
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api'}/plans`);
                const data = await res.json();
                if (data.success) {
                    setPlans(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch plans:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_27%_37%,hsla(215,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_21%,hsla(125,98%,72%,0.1)_0px,transparent_50%),radial-gradient(at_52%_99%,hsla(355,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_10%_29%,hsla(256,96%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_96%,hsla(38,60%,74%,0.1)_0px,transparent_50%),radial-gradient(at_33%_50%,hsla(222,67%,73%,0.1)_0px,transparent_50%),radial-gradient(at_79%_53%,hsla(343,68%,79%,0.1)_0px,transparent_50%)]"></div>
            </div>

            <header className="absolute top-0 left-0 right-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                            X-Ear
                        </Link>
                        <nav className="hidden md:flex items-center space-x-8">
                            <Link href="/pricing" className="text-white font-semibold">
                                Paketler
                            </Link>
                            <Link href="/faq" className="text-gray-400 hover:text-white transition">
                                SSS
                            </Link>
                        </nav>
                        <div className="hidden md:flex items-center space-x-4">
                            <a href={`${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8080'}/login`} className="text-gray-400 hover:text-white transition">
                                Giriş Yap
                            </a>
                            <Link
                                href="/pricing"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition"
                            >
                                Kayıt Ol
                            </Link>
                        </div>
                        <div className="md:hidden">
                            <button className="text-white">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="min-h-screen flex items-center justify-center pt-20 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center mb-16 pt-20">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-white">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                Geleceğin Kliniği
                            </span>{" "}
                            İçin Tasarlandı
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
                            X-Ear CRM ile kliniğinizin potansiyelini ortaya çıkarın. Verimliliği artırın, hasta memnuniyetini en üst
                            düzeye taşıyın.
                        </p>
                    </div>

                    <div className="flex justify-center items-center space-x-4 mb-12">
                        <span className="text-slate-300 font-medium bg-white/10 px-4 py-2 rounded-full">Yıllık Faturalandırma</span>
                    </div>

                    {loading ? (
                        <div className="text-center text-white">Yükleniyor...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {plans.map((plan) => {
                                // Calculate monthly price for display
                                const monthlyPrice = plan.price / 12;

                                // Handle features whether it's an array or object
                                let featuresList: string[] = [];
                                if (Array.isArray(plan.features)) {
                                    featuresList = plan.features
                                        .filter((f: any) => typeof f === 'string' || f.is_visible)
                                        .map((f: any) => typeof f === 'string' ? f : f.name);
                                } else if (plan.features && typeof plan.features === 'object') {
                                    // If it's an object (dictionary), convert to array
                                    featuresList = Object.entries(plan.features)
                                        .map(([key, value]: [string, any]) => {
                                            if (typeof value === 'object' && value.name) return value.name;
                                            return key; // Fallback to key if no name property
                                        });
                                }

                                return (
                                    <PricingCard
                                        key={plan.id}
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
                                );
                            })}
                        </div>
                    )}

                    {/* Add-ons Section */}
                    <div className="mt-24">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Ek Özellikler (Add-ons)
                            </h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">
                                İhtiyacınıza göre paketinizi özelleştirin.
                            </p>
                        </div>
                        <AddOnsList />
                    </div>
                </div>
            </main>
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
        <div
            className={`bg-white/5 backdrop-blur-xl rounded-2xl p-8 flex flex-col relative ${isPopular ? "border-2 border-blue-400" : "border border-white/10"
                }`}
        >
            {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                    En Popüler
                </div>
            )}
            <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm mb-6 min-h-[40px]">{description}</p>
            <div className="mb-6">
                <div className="flex items-baseline">
                    <span className="text-5xl font-black text-white">{price}</span>
                    <span className="text-slate-400 ml-1">/ay</span>
                </div>
                {yearlyPrice && <div className="text-sm text-slate-500 mt-1">Yıllık {yearlyPrice} olarak faturalanır</div>}
            </div>
            <ul className="space-y-4 text-slate-300 mb-8 flex-grow">
                {features.map((feature, index) => (
                    <FeatureItem key={index} text={feature} />
                ))}
            </ul>
            <Link
                href={`/checkout?plan=${planId}&billing=${billingCycle}`}
                className={`w-full block text-center font-semibold py-3 px-4 rounded-lg text-sm transition-all duration-300 ${isPopular
                    ? "bg-gradient-to-r from-[#38BDF8] to-[#818CF8] text-white shadow-[0_4px_15px_-5px_rgba(56,189,248,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(56,189,248,0.6)]"
                    : "bg-transparent border border-[#38BDF8] text-[#38BDF8] hover:bg-[#38BDF8]/10"
                    }`}
            >
                {buttonText}
            </Link>
        </div>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <li className="flex items-start">
            <div className="bg-[#38BDF8]/10 text-[#38BDF8] rounded-full p-0.5 mr-3 mt-0.5 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
            </div>
            <span dangerouslySetInnerHTML={{ __html: text.replace(/(\d+)/g, "<strong>$1</strong>") }}></span>
        </li>
    );
}

function AddOnsList() {
    const [addons, setAddons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api'}/addons`);
                const data = await res.json();
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

    if (loading) return <div className="text-center text-gray-500">Eklentiler yükleniyor...</div>;
    if (addons.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon) => (
                <div key={addon.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white">{addon.name}</h3>
                        <div className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2 py-1 rounded uppercase">
                            {addon.addon_type === 'FLAT_FEE' ? 'Tek Seferlik' :
                                addon.addon_type === 'PER_USER' ? 'Kullanıcı Başına' : 'Kullanım Bazlı'}
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-4">
                        ₺{addon.price} <span className="text-sm text-gray-400 font-normal">
                            {addon.addon_type === 'FLAT_FEE' ? '/ay' :
                                addon.addon_type === 'PER_USER' ? '/kullanıcı/ay' : ''}
                        </span>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/10 text-sm text-gray-400">
                        Paketinize ek olarak satın alabilirsiniz.
                    </div>
                </div>
            ))}
        </div>
    );
}

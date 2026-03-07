"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone, CreditCard, CheckCircle2, AlertCircle, Lock, Plus, User as UserIcon, Loader2, Tag, Smartphone, MessageSquare, X } from "lucide-react";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";

// Card Icons  
const VisaIcon = () => (
    <svg viewBox="0 0 48 32" className="w-10 h-7" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#1A1F71" />
        <path d="M20.5 11.8l-2.2 8.4h-2.2l2.2-8.4h2.2zm8.6 5.4l1.2-3.2.6 3.2h-1.8zm2.5 3h2l-1.8-8.4h-1.8c-.4 0-.8.2-.9.6l-3.2 7.8h2.3l.5-1.2h2.9v1.2zm-6.3-2.8c0-2.2-3.1-2.3-3.1-3.3 0-.3.3-.6.9-.7.3 0 1.1-.1 2 .4l.4-1.7c-.5-.2-1.2-.3-2-.3-2.1 0-3.6 1.1-3.6 2.7 0 1.2 1.1 1.8 1.9 2.2.8.4 1.1.7 1.1 1 0 .6-.7.8-1.3.8-.9 0-1.4-.1-2.1-.4l-.4 1.8c.5.2 1.4.4 2.4.4 2.3-.1 3.8-1.2 3.8-3zm-10.8-5.6l-3.5 8.4h-2.3l-1.7-6.6c-.1-.4-.2-.5-.6-.7-.6-.3-1.6-.5-2.4-.7l.1-.4h4.1c.5 0 1 .4 1.1.9l1 5.3 2.4-6.2h2.3-.5z" fill="white" />
    </svg>
);

const MastercardIcon = () => (
    <svg viewBox="0 0 48 32" className="w-10 h-7" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#252525" />
        <circle cx="18" cy="16" r="8" fill="#EB001B" />
        <circle cx="30" cy="16" r="8" fill="#F79E1B" />
        <path d="M24 9.6c-1.6 1.3-2.6 3.3-2.6 5.4 0 2.1 1 4.1 2.6 5.4 1.6-1.3 2.6-3.3 2.6-5.4 0-2.1-1-4.1-2.6-5.4z" fill="#FF5F00" />
    </svg>
);

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const paramPlanId = searchParams.get("plan");
    const billingCycle = searchParams.get("billing") || "monthly";

    // Payment State
    const [cardData, setCardData] = useState({
        number: "",
        name: "",
        expiry: "",
        cvc: ""
    });
    const [cardType, setCardType] = useState<"visa" | "mastercard" | "unknown">("unknown");

    // Loading States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Plan State
    const [planId, setPlanId] = useState<string | null>(paramPlanId);
    const [plan, setPlan] = useState<any>(null);
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [fetchingPlans, setFetchingPlans] = useState(true);

    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Addons & SMS Packages State
    const [addons, setAddons] = useState<any[]>([]);
    const [smsPackages, setSmsPackages] = useState<any[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [selectedSmsPackageId, setSelectedSmsPackageId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                router.push('/register?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
            } else {
                setIsLoggedIn(true);
            }
        }
    }, [router]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await apiClient.get('/api/plans');
                if (res.data.success) {
                    setAllPlans(res.data.data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setFetchingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [addonsRes, smsRes] = await Promise.all([
                    apiClient.get('/api/addons'),
                    apiClient.get('/api/sms-packages')
                ]);

                if (addonsRes.data.success) {
                    setAddons(addonsRes.data.data.filter((a: any) => a.is_active));
                }
                if (smsRes.data.success) {
                    setSmsPackages(smsRes.data.data);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (planId && allPlans.length > 0) {
            const found = allPlans.find((p: any) => p.id === planId);
            setPlan(found);
        }
    }, [planId, allPlans]);

    // Card Detect
    const detectCardType = (number: string) => {
        if (number.startsWith('4')) return 'visa';
        if (number.match(/^5[1-5]/)) return 'mastercard';
        return 'unknown';
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        setCardType(detectCardType(value));

        value = value.substring(0, 16);
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        setCardData({ ...cardData, number: value });
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 2) {
            val = val.substring(0, 2) + '/' + val.substring(2, 4);
        }
        setCardData({ ...cardData, expiry: val });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoggedIn) {
            router.push('/register?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await apiClient.post('/api/subscriptions/subscribe', {
                plan_id: planId,
                billing_interval: billingCycle.toUpperCase(),
                addon_ids: selectedAddons,
                sms_package_id: selectedSmsPackageId,
                card_number: cardData.number || "4242424242424242" // mock fallback
            });

            const data = res.data;

            if (data.success || data.data) {
                const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:8080';
                window.location.href = `${webUrl}/login?subscribed=true`;
            } else {
                setError(data.error?.message || data.message || "Bir hata oluştu.");
            }
        } catch (err: any) {
            const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.detail || err.message || "Bağlantı hatası.";
            setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
        } finally {
            setLoading(false);
        }
    };

    if (fetchingPlans) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Yükleniyor...</div>;

    const planPrice = plan ? plan.price : 0;
    const addonsPrice = selectedAddons.reduce((total, addonId) => {
        const addon = addons.find(a => a.id === addonId);
        return total + (addon ? addon.price : 0);
    }, 0);
    const smsPrice = selectedSmsPackageId
        ? (smsPackages.find(p => p.id === selectedSmsPackageId)?.price || 0)
        : 0;

    const totalPrice = planPrice + addonsPrice + smsPrice;

    const fmt = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

    return (
        <div className="min-h-screen bg-background text-foreground relative flex flex-col">
            <Header />
            <div className="fixed inset-0 z-0">
                <Scene />
            </div>

            <main className="relative z-10 flex-grow pt-24 pb-20">

                <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28" style={{ paddingBottom: 'max(3rem, calc(3rem + var(--safe-area-bottom)))' }}>
                    <Link href="/pricing" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition group">
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Listeye Dön
                    </Link>

                    <h1 className="text-4xl md:text-5xl font-display font-medium text-foreground mb-4">Hesap ve Abonelik</h1>
                    <p className="text-foreground/60 text-lg mb-12">Ödemenizi tamamlayın ve hemen kullanmaya başlayın.</p>

                    {/* MAIN FORM WRAPPER - Flex on Mobile, Grid on Desktop */}
                    <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-2 gap-8 items-start">

                        {/* ORDER 1: PLANS (Full Width on Desktop via col-span-2) */}
                        <div className="order-1 md:col-span-2 mb-8 w-full">
                            <h2 className="text-2xl font-display font-medium text-foreground mb-6">Planınızı Seçin</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {allPlans.map(p => (
                                    <HyperGlassCard
                                        key={p.id}
                                        onClick={() => setPlanId(p.id)}
                                        className={`cursor-pointer transition-all duration-300 ${planId === p.id ? 'ring-2 ring-accent-blue bg-accent-blue/5' : 'hover:bg-white/5'}`}
                                    >
                                        <div className="w-full">
                                            <h3 className={`text-xl font-bold mb-2 ${planId === p.id ? 'text-accent-blue' : 'text-foreground'}`}>{p.name}</h3>
                                            <div className="text-2xl font-bold text-foreground mb-2">₺{p.price}<span className="text-sm text-foreground/50 font-normal">/yıl</span></div>
                                            <p className="text-sm text-foreground/60 mb-4 h-12 line-clamp-2">{p.description}</p>
                                            <div className={`w-full py-2.5 rounded-xl font-semibold transition-all text-center ${planId === p.id ? 'bg-accent-blue text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-foreground/5 text-foreground/60 group-hover:bg-foreground/10'}`}>
                                                {planId === p.id ? '✓ Seçili Plan' : 'Seç'}
                                            </div>
                                        </div>
                                    </HyperGlassCard>
                                ))}
                            </div>
                        </div>

                        {/* NEW ORDER 2: Addons & SMS (Full Width Below Plans) */}
                        <div className="order-2 md:col-span-2 w-full space-y-8 max-w-[calc(100vw-2rem)] md:max-w-none">
                            {/* Add-ons Section */}
                            {addons.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-display font-medium text-foreground mb-4">Ekstra Özellikler</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {addons.map(addon => (
                                            <HyperGlassCard
                                                key={addon.id}
                                                onClick={() => {
                                                    if (selectedAddons.includes(addon.id)) {
                                                        setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                                                    } else {
                                                        setSelectedAddons([...selectedAddons, addon.id]);
                                                    }
                                                }}
                                                className={`cursor-pointer min-h-0 py-6 px-6 transition-all duration-300 ${selectedAddons.includes(addon.id) ? 'ring-1 ring-accent-blue bg-accent-blue/5' : ''}`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedAddons.includes(addon.id) ? 'bg-accent-blue border-accent-blue' : 'border-foreground/20'}`}>
                                                            {selectedAddons.includes(addon.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-foreground">{addon.name}</div>
                                                            <div className="text-xs text-foreground/50 line-clamp-1">{addon.description}</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-accent-blue ml-4 whitespace-nowrap">+₺{addon.price}</div>
                                                </div>
                                            </HyperGlassCard>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SMS Packages Section */}
                            {smsPackages.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-display font-medium text-emerald-400 mb-4">SMS Paketleri</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {smsPackages.map(pkg => (
                                            <HyperGlassCard
                                                key={pkg.id}
                                                onClick={() => setSelectedSmsPackageId(selectedSmsPackageId === pkg.id ? null : pkg.id)}
                                                className={`cursor-pointer min-h-0 py-6 px-6 transition-all duration-300 ${selectedSmsPackageId === pkg.id ? 'ring-1 ring-emerald-500 bg-emerald-500/5' : ''}`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selectedSmsPackageId === pkg.id ? 'bg-emerald-500 text-white' : 'bg-foreground/5 text-foreground/40'}`}>
                                                            <MessageSquare className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-foreground">{pkg.name}</div>
                                                            <div className="text-xs text-foreground/50">{pkg.sms_count} SMS</div>
                                                        </div>
                                                    </div>
                                                    <div className={`font-bold ml-4 whitespace-nowrap ${selectedSmsPackageId === pkg.id ? 'text-emerald-400' : 'text-foreground'}`}>+₺{pkg.price}</div>
                                                </div>
                                            </HyperGlassCard>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ORDER 3: Payment & Summary (Centered) */}
                        <div className="order-3 md:col-span-2 space-y-6 w-full max-w-3xl mx-auto mt-8">
                            {/* 1. Credit Card Form */}
                            <HyperGlassCard className="flex-col items-start px-8 py-8 space-y-8 bg-gradient-to-br from-white/5 to-white/[0.02]">
                                <div className="flex justify-between items-center w-full">
                                    <h3 className="text-xl font-display font-medium text-foreground flex items-center gap-3">
                                        <CreditCard className="w-5 h-5 text-accent-blue" />
                                        Ödeme Yöntemi
                                    </h3>
                                    <div className="flex gap-3">
                                        <div className={`transition-all duration-300 ${cardType === 'visa' ? 'opacity-100 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'opacity-20 grayscale scale-90'}`}>
                                            <VisaIcon />
                                        </div>
                                        <div className={`transition-all duration-300 ${cardType === 'mastercard' ? 'opacity-100 scale-110 shadow-[0_0_15px_rgba(235,0,27,0.3)]' : 'opacity-20 grayscale scale-90'}`}>
                                            <MastercardIcon />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5 w-full">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest ml-1">Kart Numarası</label>
                                        <div className="relative group/input">
                                            <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} value={cardData.number} onChange={handleCardNumberChange} className="w-full bg-foreground/5 border border-white/10 rounded-xl px-4 py-4 text-xl font-mono text-foreground placeholder-foreground/10 focus:outline-none focus:ring-1 focus:ring-accent-blue/50 transition-all tracking-wider" />
                                            <Smartphone className="w-5 h-5 text-foreground/20 absolute right-4 top-4 group-focus-within/input:text-accent-blue transition-colors" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest ml-1">SKT</label>
                                            <input type="text" placeholder="MM/YY" maxLength={5} value={cardData.expiry} onChange={handleExpiryChange} className="w-full bg-foreground/5 border border-white/10 rounded-xl px-4 py-4 text-lg font-mono text-foreground placeholder-foreground/10 focus:outline-none focus:ring-1 focus:ring-accent-blue/50 transition-all text-center" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest ml-1">CVC</label>
                                            <div className="relative">
                                                <input type="text" placeholder="123" maxLength={3} value={cardData.cvc} onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '') })} className="w-full bg-foreground/5 border border-white/10 rounded-xl px-4 py-4 text-lg font-mono text-foreground placeholder-foreground/10 focus:outline-none focus:ring-1 focus:ring-accent-blue/50 transition-all text-center" />
                                                <Lock className="w-4 h-4 text-foreground/20 absolute right-4 top-5" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest ml-1">Kart Üzerindeki İsim</label>
                                        <input type="text" placeholder="AD SOYAD" value={cardData.name} onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })} className="w-full bg-foreground/5 border border-white/10 rounded-xl px-4 py-4 text-foreground placeholder-foreground/10 focus:outline-none focus:ring-1 focus:ring-accent-blue/50 transition-all font-medium uppercase" />
                                    </div>
                                </div>
                            </HyperGlassCard>

                            {/* 2. Order Summary */}
                            <HyperGlassCard className="flex-col items-start px-8 py-8 space-y-6">
                                <h3 className="text-xl font-display font-medium text-foreground">Sipariş Özeti</h3>

                                <div className="w-full space-y-4">
                                    <div className="flex justify-between items-start pb-4 border-b border-white/5">
                                        <div><h4 className="text-foreground font-semibold">{plan?.name}</h4><p className="text-xs text-foreground/40 font-medium">{billingCycle === 'yearly' ? 'Yıllık Fatura' : 'Aylık Fatura'}</p></div>
                                        <span className="text-foreground font-bold text-lg">₺{plan?.price}</span>
                                    </div>

                                    {/* Selected Addons */}
                                    {selectedAddons.length > 0 && (
                                        <div className="space-y-3 pb-4 border-b border-white/5">
                                            {selectedAddons.map(id => {
                                                const addon = addons.find(a => a.id === id);
                                                return addon ? (
                                                    <div key={id} className="flex justify-between items-center text-sm group">
                                                        <span className="text-foreground/50 font-medium">+ {addon.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-accent-blue font-bold">₺{addon.price}</span>
                                                            <button type="button" onClick={() => setSelectedAddons(selectedAddons.filter(aid => aid !== id))} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                                <X className="w-4 h-4 text-red-400" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    )}

                                    {/* Selected SMS Package */}
                                    {selectedSmsPackageId && (
                                        <div className="pb-4 border-b border-white/5">
                                            {(() => {
                                                const pkg = smsPackages.find(p => p.id === selectedSmsPackageId);
                                                return pkg ? (
                                                    <div className="flex justify-between items-center text-sm group">
                                                        <span className="text-emerald-400 font-medium">+ {pkg.name} ({pkg.sms_count} SMS)</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-emerald-400 font-bold">₺{pkg.price}</span>
                                                            <button type="button" onClick={() => setSelectedSmsPackageId(null)} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                                <X className="w-4 h-4 text-red-400" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-lg text-foreground font-display font-medium">Toplam</span>
                                        <span className="text-3xl text-accent-blue font-display font-bold decoration-accent-blue/30 underline-offset-8 underline">{fmt(totalPrice)}</span>
                                    </div>

                                    <button type="submit" disabled={loading || !isLoggedIn} className="w-full group relative flex items-center justify-center px-8 py-4 bg-foreground text-background rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:scale-100">
                                        <div className="absolute inset-0 bg-gradient-to-r from-accent-blue to-accent-purple opacity-0 group-hover:opacity-10 transition-opacity" />
                                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-3 transition-transform group-hover:rotate-12" />{fmt(totalPrice)} Öde</>}
                                    </button>

                                    {/* SSL BADGES */}
                                    <div className="grid grid-cols-1 gap-3 pt-6">
                                        <div className="flex items-center text-xs text-foreground/40 font-medium">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400/60 mr-2 flex-shrink-0" />
                                            <span>7 gün ücretsiz deneme</span>
                                        </div>
                                        <div className="flex items-center text-xs text-foreground/40 font-medium">
                                            <Lock className="w-4 h-4 text-emerald-400/60 mr-2 flex-shrink-0" />
                                            <span>256-bit SSL güvenli ödeme</span>
                                        </div>
                                    </div>

                                    {!isLoggedIn && (
                                        <p className="p-3 text-center text-xs font-bold text-accent-purple bg-accent-purple/10 rounded-xl border border-accent-purple/20 animate-pulse">
                                            Devam etmek için önce telefon numaranızı doğrulayın.
                                        </p>
                                    )}

                                    {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><p className="font-medium">{error}</p></div>}
                                </div>
                            </HyperGlassCard>
                        </div>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}

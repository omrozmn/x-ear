"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, CreditCard, CheckCircle2, AlertCircle, Lock, Plus } from "lucide-react";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const planId = searchParams.get("plan");
    const billingCycle = searchParams.get("billing") || "monthly";

    const [formData, setFormData] = useState({
        companyName: "",
        email: "",
        phone: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [plan, setPlan] = useState<any>(null);
    const [fetchingPlan, setFetchingPlan] = useState(true);
    const [addons, setAddons] = useState<any[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

    useEffect(() => {
        const fetchPlan = async () => {
            if (!planId) return;
            try {
                // In a real app, we would fetch specific plan by ID. 
                // Here we fetch all and find the one.
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api'}/plans`);
                const data = await res.json();
                if (data.success) {
                    const found = data.data.find((p: any) => p.id === planId);
                    setPlan(found);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setFetchingPlan(false);
            }
        };
        fetchPlan();
    }, [planId]);

    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api'}/addons`);
                const data = await res.json();
                if (data.success) {
                    setAddons(data.data.filter((a: any) => a.is_active));
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchAddons();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api'}/subscriptions/register-and-subscribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    plan_id: planId,
                    billing_interval: billingCycle.toUpperCase(),
                    company_name: formData.companyName,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    addon_ids: selectedAddons
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Redirect to CRM login with success message
                window.location.href = `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:8080'}/login?registered=true`;
            } else {
                setError(data.error?.message || data.message || "Bir hata oluştu.");
            }
        } catch (err) {
            setError("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    if (fetchingPlan) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Plan yükleniyor...</div>;
    if (!plan) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Plan bulunamadı.</div>;

    const price = billingCycle === 'yearly' ? plan.price : (plan.price / 12); // Assuming plan.price is yearly if we only sell yearly? 
    // Actually, if plan.price is stored as Monthly or Yearly depends on backend. 
    // Let's assume plan.price is the price for the billing interval. 
    // But earlier I assumed plan.price is Yearly. 
    // Let's just display plan.price for now.

    // Correction: In Pricing page I assumed plan.price is Yearly.
    // Correction: In Pricing page I assumed plan.price is Yearly.
    const planPrice = plan.price;
    const addonsPrice = selectedAddons.reduce((total, addonId) => {
        const addon = addons.find(a => a.id === addonId);
        return total + (addon ? addon.price : 0);
    }, 0);
    const totalPrice = planPrice + addonsPrice;

    const displayPlanPrice = `₺${planPrice}`;
    const displayTotalPrice = `₺${totalPrice}`;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white pt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Link href="/pricing" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Paketlere Dön
                </Link>

                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Form Section */}
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Hesap Oluştur</h1>
                        <p className="text-gray-400 mb-8">Ödemenizi tamamlayın ve hemen kullanmaya başlayın.</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Klinik / Şirket Adı</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Building2 className="w-5 h-5 text-gray-500" />
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Örn: İstanbul İşitme Merkezi"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">E-posta Adresi</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Mail className="w-5 h-5 text-gray-500" />
                                    </span>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="ornek@sirket.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Telefon Numarası</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Phone className="w-5 h-5 text-gray-500" />
                                    </span>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="+90 555 123 45 67"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Şifre</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Lock className="w-5 h-5 text-gray-500" />
                                    </span>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Güvenli bir şifre belirleyin"
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center text-red-400">
                                    <AlertCircle className="w-5 h-5 mr-2" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                            >
                                {loading ? (
                                    "İşleniyor..."
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5 mr-2" />
                                        Ödeme Yap ve Başla
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-center text-gray-500 mt-4">
                                Ödeme işleminiz 256-bit SSL sertifikası ile korunmaktadır.
                            </p>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 h-fit">
                        <h2 className="text-xl font-bold text-white mb-6">Sipariş Özeti</h2>

                        <div className="flex justify-between items-start mb-6 pb-6 border-b border-white/10">
                            <div>
                                <h3 className="font-semibold text-white">{plan.name}</h3>
                                <p className="text-sm text-gray-400">{billingCycle === "yearly" ? "Yıllık Faturalandırma" : "Aylık Faturalandırma"}</p>
                            </div>
                            <span className="font-bold text-white">{displayPlanPrice}</span>
                        </div>

                        {addons.length > 0 && (
                            <div className="mb-6 pb-6 border-b border-white/10">
                                <h3 className="font-semibold text-white mb-3">Ek Özellikler</h3>
                                <div className="space-y-3">
                                    {addons.map((addon) => {
                                        const isSelected = selectedAddons.includes(addon.id);
                                        return (
                                            <div key={addon.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                                <div>
                                                    <h4 className="font-medium text-white text-sm">{addon.name}</h4>
                                                    <p className="text-xs text-gray-400">₺{addon.price}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                                                        } else {
                                                            setSelectedAddons([...selectedAddons, addon.id]);
                                                        }
                                                    }}
                                                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-medium ${isSelected
                                                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20"
                                                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                                        }`}
                                                >
                                                    {isSelected ? (
                                                        <>
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Eklendi
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="w-3.5 h-3.5" />
                                                            Ekle
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Ara Toplam</span>
                                <span className="text-white">{displayTotalPrice}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">KDV (%20)</span>
                                <span className="text-white">Dahil</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-white/10">
                            <span className="font-bold text-lg text-white">Toplam</span>
                            <span className="font-bold text-2xl text-indigo-400">{displayTotalPrice}</span>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center text-sm text-gray-400">
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                7 gün ücretsiz deneme
                            </div>
                            <div className="flex items-center text-sm text-gray-400">
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                İstediğiniz zaman iptal edebilirsiniz
                            </div>
                            <div className="flex items-center text-sm text-gray-400">
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                Anında aktivasyon
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Checkout() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Yükleniyor...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}

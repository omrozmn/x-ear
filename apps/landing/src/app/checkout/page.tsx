"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone, CreditCard, CheckCircle2, AlertCircle, Lock, Plus, User as UserIcon, Loader2, Tag, Smartphone, MessageSquare, X } from "lucide-react";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import Image from "next/image";

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

    // Form State
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        referralCode: "",
    });

    // Payment State
    const [cardData, setCardData] = useState({
        number: "",
        name: "",
        expiry: "",
        cvc: ""
    });
    const [cardType, setCardType] = useState<"visa" | "mastercard" | "unknown">("unknown");

    // OTP State
    const [otp, setOtp] = useState("");
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);

    // Affiliate State
    const [affiliateName, setAffiliateName] = useState<string | null>(null);
    const [checkingAffiliate, setCheckingAffiliate] = useState(false);

    // Loading States
    const [loading, setLoading] = useState(false);
    const [verifyingPhone, setVerifyingPhone] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [error, setError] = useState("");
    const [otpError, setOtpError] = useState("");

    // Plan State
    const [planId, setPlanId] = useState<string | null>(paramPlanId);
    const [plan, setPlan] = useState<any>(null);
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [fetchingPlans, setFetchingPlans] = useState(true);

    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isGuestFlow, setIsGuestFlow] = useState(true);

    // Addons & SMS Packages State
    const [addons, setAddons] = useState<any[]>([]);
    const [smsPackages, setSmsPackages] = useState<any[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [selectedSmsPackageId, setSelectedSmsPackageId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            if (token) {
                setIsLoggedIn(true);
                setIsGuestFlow(false);
            } else {
                setIsGuestFlow(true);
            }
        }
    }, []);

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
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        setCardData({ ...cardData, expiry: value });
    };

    // Affiliate Check - FIXED TO USE CORRECT ENDPOINT
    const handleAffiliateCheck = async () => {
        if (!formData.referralCode || formData.referralCode.length < 3) return;

        setCheckingAffiliate(true);
        setAffiliateName(null);
        try {
            const code = formData.referralCode.trim();
            const res = await apiClient.get(`/api/affiliate/lookup?code=${code}`);
            if (res.data.success) {
                setAffiliateName(res.data.name);
            }
        } catch (e) {
            console.error("Affiliate check failed", e);
        } finally {
            setCheckingAffiliate(false);
        }
    }

    // Timer
    useEffect(() => {
        let interval: any;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    const handleSendOtp = async () => {
        if (!formData.phone) {
            setOtpError("Lütfen telefon numarasını girin");
            return;
        }
        setOtpError("");
        setVerifyingPhone(true);
        try {
            const cleanPhone = formData.phone.replace(/[\s()-]/g, '');
            const res = await apiClient.post('/api/register-phone', { phone: cleanPhone });
            if (res.data.success) {
                setShowOtpInput(true);
                setOtpTimer(180);
            } else {
                setOtpError(res.data.message || "SMS gönderilemedi");
            }
        } catch (err: any) {
            setOtpError(err.response?.data?.error?.message || "SMS gönderilemedi");
        } finally {
            setVerifyingPhone(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) {
            setOtpError("Lütfen kodu girin");
            return;
        }
        setOtpError("");
        setVerifyingOtp(true);
        try {
            const cleanPhone = formData.phone.replace(/[\s()-]/g, '');
            const res = await apiClient.post('/api/verify-registration-otp', {
                phone: cleanPhone,
                otp_code: otp,
                affiliate_code: formData.referralCode
            });

            if (res.data.success) {
                const token = res.data.access_token;
                localStorage.setItem('auth_token', token);
                setIsLoggedIn(true);
                setIsPhoneVerified(true);
                setShowOtpInput(false);
            } else {
                setOtpError(res.data.message || "Kod doğrulanamadı");
            }
        } catch (err: any) {
            setOtpError(err.response?.data?.error?.message || "Kod hatalı");
        } finally {
            setVerifyingOtp(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoggedIn) {
            setError("Lütfen önce telefon numaranızı doğrulayın.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Şifreler eşleşmiyor");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const generatedCompanyName = `${formData.firstName} ${formData.lastName} Klinik`;

            const res = await apiClient.post('/api/subscriptions/complete-signup', {
                plan_id: planId,
                billing_interval: billingCycle.toUpperCase(),
                company_name: generatedCompanyName,
                email: formData.email,
                password: formData.password,
                first_name: formData.firstName,
                last_name: formData.lastName,
                addon_ids: selectedAddons,
                sms_package_id: selectedSmsPackageId,
                referral_code: formData.referralCode
            });

            const data = res.data;

            if (data.success) {
                const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:8080';
                window.location.href = `${webUrl}/login?subscribed=true`;
            } else {
                setError(data.error?.message || data.message || "Bir hata oluştu.");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Bağlantı hatası.");
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
        <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
            {/* Header - Logo Only */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-800" style={{ paddingTop: 'var(--safe-area-top)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-2">
                        <Image src="/logo/x.svg" alt="X-Ear Logo" width={32} height={32} className="w-8 h-8" />
                        <span className="text-white font-bold text-xl">x-ear</span>
                    </Link>
                </div>
            </header>

            <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28" style={{ paddingBottom: 'max(3rem, calc(3rem + var(--safe-area-bottom)))' }}>
                <Link href="/pricing" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition group">
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Listeye Dön
                </Link>

                <h1 className="text-3xl font-bold text-white mb-2">Hesap ve Abonelik</h1>
                <p className="text-gray-400 mb-12">Ödemenizi tamamlayın ve hemen kullanmaya başlayın.</p>

                {/* MAIN FORM WRAPPER - Flex on Mobile, Grid on Desktop */}
                <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-2 gap-8 items-start">

                    {/* ORDER 1: PLANS (Full Width on Desktop via col-span-2) */}
                    <div className="order-1 md:col-span-2 mb-8 w-full max-w-[calc(100vw-2rem)] md:max-w-none">
                        <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Planınızı Seçin</h2>
                        <div className="overflow-x-auto pb-4 -mx-4 px-4 md:overflow-visible md:px-0 md:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] snap-x snap-mandatory md:snap-none">
                            <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 min-w-max md:min-w-0">
                                {allPlans.map(p => (
                                    <div key={p.id} onClick={() => setPlanId(p.id)} className={`w-80 md:w-auto flex-shrink-0 p-6 border rounded-2xl cursor-pointer transition hover:-translate-y-1 active:scale-98 group snap-start ${planId === p.id ? 'bg-indigo-900/20 border-indigo-500 shadow-xl shadow-indigo-500/10' : 'bg-[#151515] border-gray-800 hover:border-gray-700'}`}>
                                        <h3 className={`text-xl font-bold mb-2 ${planId === p.id ? 'text-white' : 'text-gray-300'}`}>{p.name}</h3>
                                        <div className="text-2xl font-bold text-white mb-2">₺{p.price}<span className="text-sm text-gray-500 font-normal">/yıl</span></div>
                                        <p className="text-sm text-gray-500 mb-4">{p.description}</p>
                                        <div className={`w-full py-2 rounded-lg font-medium transition text-center ${planId === p.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
                                            {planId === p.id ? '✓ Seçili Plan' : 'Seç'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* NEW ORDER 2: Addons & SMS (Full Width Below Plans) */}
                    <div className="order-2 md:col-span-2 w-full space-y-8 max-w-[calc(100vw-2rem)] md:max-w-none">
                        {/* Add-ons Section */}
                        {addons.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4">Ekstra Özellikler</h2>
                                <div className="overflow-x-auto pb-4 -mx-4 px-4 md:px-0 md:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] snap-x snap-mandatory md:snap-none">
                                    <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-max md:min-w-0">
                                        {addons.map(addon => (
                                            <div key={addon.id} onClick={() => {
                                                if (selectedAddons.includes(addon.id)) {
                                                    setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                                                } else {
                                                    setSelectedAddons([...selectedAddons, addon.id]);
                                                }
                                            }} className={`w-[85vw] md:w-auto flex-shrink-0 flex items-center justify-between p-5 md:p-4 border rounded-xl cursor-pointer transition active:scale-98 snap-start min-h-[72px]
                                                ${selectedAddons.includes(addon.id) ? 'bg-indigo-900/20 border-indigo-500' : 'bg-[#151515] border-gray-800 hover:border-gray-700'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 md:w-5 md:h-5 rounded flex items-center justify-center border transition ${selectedAddons.includes(addon.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600'}`}>
                                                        {selectedAddons.includes(addon.id) && <CheckCircle2 className="w-4 h-4 md:w-3.5 md:h-3.5 text-white" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-white text-base md:text-sm">{addon.name}</div>
                                                        <div className="text-sm md:text-xs text-gray-500 line-clamp-1">{addon.description}</div>
                                                    </div>
                                                </div>
                                                <div className="font-bold text-white text-base md:text-sm ml-4 whitespace-nowrap">+₺{addon.price}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SMS Packages Section */}
                        {smsPackages.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-emerald-400 mb-4">SMS Paketleri</h2>
                                <div className="overflow-x-auto pb-4 -mx-4 px-4 md:px-0 md:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] snap-x snap-mandatory md:snap-none">
                                    <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-max md:min-w-0">
                                        {smsPackages.map(pkg => (
                                            <div
                                                key={pkg.id}
                                                onClick={() => setSelectedSmsPackageId(selectedSmsPackageId === pkg.id ? null : pkg.id)}
                                                className={`w-[85vw] md:w-auto flex-shrink-0 p-5 md:p-4 border rounded-xl cursor-pointer transition relative overflow-hidden group active:scale-98 snap-start min-h-[88px]
                                                    ${selectedSmsPackageId === pkg.id
                                                        ? 'bg-emerald-900/10 border-emerald-500'
                                                        : 'bg-[#151515] border-gray-800 hover:border-gray-700'}`}
                                            >
                                                <div className="flex items-center justify-between relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors
                                                            ${selectedSmsPackageId === pkg.id ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                                            <MessageSquare className="w-5 h-5 md:w-4 md:h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white text-base md:text-sm">{pkg.name}</div>
                                                            <div className="text-sm md:text-xs text-gray-400">{pkg.sms_count} SMS</div>
                                                        </div>
                                                    </div>
                                                    <div className={`font-bold text-base md:text-sm ml-4 whitespace-nowrap ${selectedSmsPackageId === pkg.id ? 'text-emerald-400' : 'text-white'}`}>+₺{pkg.price}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ORDER 3: Identity Form (Desktop: Top Left) */}
                    <div className="order-3 md:col-start-1 md:row-start-3 space-y-6 w-full">
                        {/* Authenticated Status */}
                        {isLoggedIn && (
                            <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg flex items-center gap-3">
                                <UserIcon className="w-5 h-5 text-indigo-400" />
                                <div>
                                    <div className="text-sm text-gray-400">Giriş Yapıldı</div>
                                    <div className="text-white font-medium">
                                        {isPhoneVerified ? 'Bilgiler doğrulandı.' : 'Doğrulama gerekli.'}
                                    </div>
                                </div>
                                {isPhoneVerified && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />}
                            </div>
                        )}

                        <div className="bg-[#151515] border border-gray-800 rounded-2xl p-4 md:p-6 space-y-5">
                            <h3 className="text-lg md:text-xl font-bold text-white mb-2">Kimlik Bilgileri</h3>

                            {/* Guest Flow Inputs */}
                            {isGuestFlow && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">Ad</label>
                                        <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-4 py-4 text-base md:text-sm text-white focus:outline-none focus:border-indigo-500 transition min-h-[48px]" placeholder="Adınız" required={isGuestFlow} />
                                    </div>
                                    <div>
                                        <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">Soyad</label>
                                        <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-4 py-4 text-base md:text-sm text-white focus:outline-none focus:border-indigo-500 transition min-h-[48px]" placeholder="Soyadınız" required={isGuestFlow} />
                                    </div>
                                </div>
                            )}

                            {/* Phone & OTP */}
                            {(!isLoggedIn || (isGuestFlow && !isPhoneVerified)) && (
                                <div className="space-y-3">
                                    <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">Telefon Numarası</label>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-gray-500" />
                                            </div>
                                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} onKeyDown={() => setOtpError("")} className={`w-full bg-[#0A0A0A] border rounded-xl pl-12 pr-4 py-4 text-base md:text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition min-h-[48px] ${otpError ? 'border-red-500/50' : 'border-gray-700'}`} placeholder="XX XXX XX XX" disabled={isPhoneVerified} />
                                        </div>
                                        {!isPhoneVerified && !showOtpInput && (
                                            <button type="button" onClick={handleSendOtp} disabled={verifyingPhone || !formData.phone} className="w-full md:w-auto px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-white font-semibold transition whitespace-nowrap min-h-[48px] text-base md:text-sm">
                                                {verifyingPhone ? <Loader2 className="w-5 h-5 animate-spin" /> : "Doğrula"}
                                            </button>
                                        )}
                                    </div>
                                    {showOtpInput && !isPhoneVerified && (
                                        <div className="flex flex-col md:flex-row gap-3 animate-in fade-in slide-in-from-top-2">
                                            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className={`flex-1 bg-[#0A0A0A] border rounded-xl px-4 py-4 text-base md:text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[48px] ${otpError ? 'border-red-500/50' : 'border-indigo-500/50'}`} placeholder="Doğrulama Kodu" />
                                            <button type="button" onClick={handleVerifyOtp} disabled={verifyingOtp || !otp} className="w-full md:w-auto px-6 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl text-white font-semibold transition min-h-[48px] text-base md:text-sm">
                                                {verifyingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : "Onayla"}
                                            </button>
                                        </div>
                                    )}
                                    {otpError && <div className="text-sm md:text-base text-red-400 mt-2 flex items-center"><AlertCircle className="w-5 h-5 mr-2" />{otpError}</div>}
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">E-posta Adresi</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-500" /></div>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-base md:text-sm text-white focus:outline-none focus:border-indigo-500 transition min-h-[48px]" placeholder="ornek@sirket.com" required />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">Şifre</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-500" /></div>
                                        <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-base md:text-sm text-white focus:outline-none focus:border-indigo-500 transition min-h-[48px]" placeholder="Şifre" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">Tekrar</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-500" /></div>
                                        <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-base md:text-sm text-white focus:outline-none focus:border-indigo-500 transition min-h-[48px]" placeholder="Onay" required />
                                    </div>
                                </div>
                            </div>

                            {/* Referral Code */}
                            {isGuestFlow && (
                                <div className="pt-4 border-t border-gray-800">
                                    <label className="block text-sm md:text-base font-medium text-gray-400 mb-2">Referans Kodu (İsteğe bağlı)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Tag className="h-5 w-5 text-gray-500" /></div>
                                        <input type="text" value={formData.referralCode} onChange={(e) => { setFormData({ ...formData, referralCode: e.target.value }); setAffiliateName(null); }} onBlur={handleAffiliateCheck} className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-base md:text-sm text-white focus:outline-none focus:border-indigo-500 transition min-h-[48px]" placeholder="Varsa referans kodunuz" />
                                        {checkingAffiliate && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>}
                                    </div>
                                    {affiliateName && (
                                        <div className="mt-2 flex items-center gap-2 text-sm text-green-400 bg-green-500/10 p-2 rounded">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>{affiliateName} ile kayıt oluyorsunuz</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ORDER 4 Mobile / ORDER 5 Desktop (Right Col) */}
                    <div className="order-4 md:col-start-2 md:row-start-3 md:row-span-2 space-y-6 w-full">
                        {/* 1. Credit Card Form */}
                        <div className="bg-gradient-to-br from-[#1A1A1A] to-zinc-900 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group min-h-[420px] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 p-32 bg-indigo-600/10 blur-[100px] rounded-full group-hover:bg-indigo-600/20 transition duration-1000"></div>

                            <div className="relative z-10 space-y-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-indigo-400" />
                                        Kart Bilgileri
                                    </h2>
                                    <div className="flex gap-2">
                                        <div className={`transition-all duration-300 ${cardType === 'visa' ? 'opacity-100 scale-110' : 'opacity-30 scale-90'}`}>
                                            <VisaIcon />
                                        </div>
                                        <div className={`transition-all duration-300 ${cardType === 'mastercard' ? 'opacity-100 scale-110' : 'opacity-30 scale-90'}`}>
                                            <MastercardIcon />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kart Numarası</label>
                                        <div className="relative group/input">
                                            <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} value={cardData.number} onChange={handleCardNumberChange} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3.5 text-lg font-mono text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner" />
                                            <Smartphone className="w-5 h-5 text-gray-600 absolute right-4 top-4 group-focus-within/input:text-indigo-500 transition" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Son Kullanma Tarihi</label>
                                            <input type="text" placeholder="MM/YY" maxLength={5} value={cardData.expiry} onChange={handleExpiryChange} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3.5 text-lg font-mono text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CVC / CVV</label>
                                            <div className="relative">
                                                <input type="text" placeholder="123" maxLength={3} value={cardData.cvc} onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '') })} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3.5 text-lg font-mono text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner" />
                                                <Lock className="w-4 h-4 text-gray-600 absolute right-4 top-4" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kart Üzerindeki İsim</label>
                                        <input type="text" placeholder="AD SOYAD" value={cardData.name} onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Order Summary */}
                        <div className="bg-[#151515] border border-gray-800 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-6">Sipariş Özeti</h2>

                            <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-800">
                                <div><h3 className="text-white font-medium">{plan?.name}</h3><p className="text-sm text-gray-400">{billingCycle === 'yearly' ? 'Yıllık Fatura' : 'Aylık Fatura'}</p></div>
                                <span className="text-white font-bold">₺{plan?.price}</span>
                            </div>

                            {/* Selected Addons */}
                            {selectedAddons.length > 0 && (
                                <div className="mb-4 pb-4 border-b border-gray-800 space-y-2">
                                    {selectedAddons.map(id => {
                                        const addon = addons.find(a => a.id === id);
                                        return addon ? (
                                            <div key={id} className="flex justify-between items-center text-sm group">
                                                <span className="text-gray-400 flex-1">+ {addon.name}</span>
                                                <span className="text-gray-300 mx-3">₺{addon.price}</span>
                                                <button type="button" onClick={() => setSelectedAddons(selectedAddons.filter(aid => aid !== id))} className="p-1 hover:bg-red-500/20 rounded transition opacity-0 group-hover:opacity-100">
                                                    <X className="w-4 h-4 text-red-400" />
                                                </button>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            {/* Selected SMS Package */}
                            {selectedSmsPackageId && (
                                <div className="mb-4 pb-4 border-b border-gray-800">
                                    {(() => {
                                        const pkg = smsPackages.find(p => p.id === selectedSmsPackageId);
                                        return pkg ? (
                                            <div className="flex justify-between items-center text-sm group">
                                                <span className="text-emerald-400 flex-1">+ {pkg.name} ({pkg.sms_count} SMS)</span>
                                                <span className="text-gray-300 mx-3">₺{pkg.price}</span>
                                                <button type="button" onClick={() => setSelectedSmsPackageId(null)} className="p-1 hover:bg-red-500/20 rounded transition opacity-0 group-hover:opacity-100">
                                                    <X className="w-4 h-4 text-red-400" />
                                                </button>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-6"><span className="text-lg text-white font-bold">Toplam</span><span className="text-2xl text-indigo-400 font-bold">{fmt(totalPrice)}</span></div>

                            <button type="submit" disabled={loading || !isLoggedIn} className="w-full flex items-center justify-center px-8 py-5 md:py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl text-white font-bold text-lg md:text-lg transition shadow-lg shadow-indigo-600/20 group min-h-[56px]">
                                {loading ? <><Loader2 className="w-6 h-6 mr-3 animate-spin" />İşleniyor...</> : <><CheckCircle2 className="w-6 h-6 mr-3 group-hover:scale-110 transition" />{fmt(totalPrice)} Öde</>}
                            </button>

                            {/* SSL BADGES */}
                            <div className="space-y-3 mt-6">
                                <div className="flex items-center text-sm text-gray-400">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                    <span>7 gün ücretsiz deneme</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-400">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                    <span>İstediğiniz zaman iptal edebilirsiniz</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-400">
                                    <Lock className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                    <span>256-bit SSL güvenli ödeme</span>
                                </div>
                            </div>

                            {!isLoggedIn && (
                                <p className="mt-4 text-center text-sm text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                                    Devam etmek için önce telefon numaranızı doğrulayın.
                                </p>
                            )}

                            {error && <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 flex items-center gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0" /><p>{error}</p></div>}
                        </div>
                    </div>
                </form>
            </div>
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

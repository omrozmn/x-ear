"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "../AppHeader";
import { Phone, AlertCircle, CheckCircle, ArrowLeft, User, Menu, Tag, Check, X } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
// Use relative path or alias if configured
import { apiClient } from "../../lib/api/api-client";

function RegisterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [phone, setPhone] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [referralCode, setReferralCode] = useState("");
    const [referralName, setReferralName] = useState<string | null>(null);
    const [referralStatus, setReferralStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial check for 'ref' param
    useEffect(() => {
        const refParam = searchParams.get('ref') || searchParams.get('referralCode');
        if (refParam) {
            setReferralCode(refParam);
            validateReferralCode(refParam);
        }
    }, [searchParams]);

    const validateReferralCode = async (code: string) => {
        if (!code) {
            setReferralStatus("idle");
            setReferralName(null);
            return;
        }
        setReferralStatus("loading");
        try {
            const res = await apiClient.get(`/api/affiliate/lookup?code=${code}`);
            if (res.data.success) {
                setReferralName(res.data.name);
                setReferralStatus("valid");
            } else {
                setReferralName(null);
                setReferralStatus("invalid");
            }
        } catch (e) {
            setReferralName(null);
            setReferralStatus("invalid"); // Treat 404/500 as invalid for UI
        }
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await apiClient.post('/api/register-phone', { phone });
            setStep("otp");
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const otpString = otp.join("");
        try {
            const response = await apiClient.post('/api/verify-registration-otp', {
                phone,
                otp: otpString,
                first_name: firstName,
                last_name: lastName,
                referral_code: referralStatus === "valid" ? referralCode : undefined
            });

            // Success
            const { access_token } = response.data;
            if (access_token) {
                // Store token in localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('auth_token', access_token);
                }

                // Redirect to Checkout
                router.push('/checkout');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Doğrulama başarısız.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
            <div className="fixed inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_50%_50%,hsla(250,90%,15%,0.3)_0px,transparent_50%)]"></div>
                <div className="absolute top-[-20%] right-[-20%] w-[800px] h-[800px] rounded-full bg-indigo-600/10 blur-3xl"></div>
                <div className="absolute bottom-[-20%] left-[-20%] w-[800px] h-[800px] rounded-full bg-purple-600/10 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid.svg')] opacity-10"></div>
            </div>

            <AppHeader />

            <main className="min-h-screen flex items-center justify-center relative z-10 p-4 pt-20">
                <div className="w-full max-w-md">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {step === "phone" ? (
                            <div id="phone-step">
                                <div className="text-center mb-8">
                                    <h1 className="text-3xl font-bold text-white mb-2">Hesap Oluştur</h1>
                                    <p className="text-gray-400">Devam etmek için bilgilerinizi girin.</p>
                                </div>

                                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Ad</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <User className="w-5 h-5 text-gray-500" />
                                                </span>
                                                <input
                                                    type="text"
                                                    required
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                                    placeholder="Adınız"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Soyad</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <User className="w-5 h-5 text-gray-500" />
                                                </span>
                                                <input
                                                    type="text"
                                                    required
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                                    placeholder="Soyadınız"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Telefon Numarası</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Phone className="w-5 h-5 text-gray-500" />
                                            </span>
                                            <input
                                                type="tel"
                                                required
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium tracking-wide"
                                                placeholder="5XX XXX XX XX"
                                            />
                                        </div>
                                    </div>

                                    {/* Referral Code */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">
                                            Referans Kodu <span className="text-gray-600 text-xs font-normal">(İsteğe bağlı)</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Tag className="w-5 h-5 text-gray-500" />
                                            </span>
                                            <input
                                                type="text"
                                                value={referralCode}
                                                onChange={(e) => {
                                                    setReferralCode(e.target.value);
                                                    if (e.target.value.length === 0) {
                                                        setReferralStatus("idle");
                                                        setReferralName(null);
                                                    }
                                                }}
                                                onBlur={(e) => validateReferralCode(e.target.value)}
                                                className={`w-full pl-10 pr-10 py-3 bg-[#101010] border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-all font-medium ${referralStatus === "valid"
                                                        ? "border-green-500/50 focus:ring-green-500/20"
                                                        : referralStatus === "invalid"
                                                            ? "border-red-500/50 focus:ring-red-500/20"
                                                            : "border-gray-700 focus:ring-indigo-500"
                                                    }`}
                                                placeholder="Varsa referans kodunuz"
                                            />
                                            {referralStatus === "loading" && (
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                    <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                            {referralStatus === "valid" && (
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-green-500">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                            )}
                                            {referralStatus === "invalid" && (
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-red-500">
                                                    <X className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                        {referralStatus === "valid" && referralName && (
                                            <p className="mt-1 text-sm text-green-400 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                {referralName} ile kayıt oluyorsunuz
                                            </p>
                                        )}
                                        {referralStatus === "invalid" && referralCode.length > 0 && (
                                            <p className="mt-1 text-sm text-red-400">
                                                Geçersiz referans kodu.
                                            </p>
                                        )}
                                    </div>

                                    {/* Turnstile Placeholder */}
                                    <div className="flex justify-center pt-2">
                                        <div className="w-full h-12 bg-gray-800/30 rounded flex items-center justify-center text-gray-600 text-xs border border-gray-800 border-dashed">
                                            Turnstile CAPTCHA (Auto)
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-indigo-500/20"
                                        >
                                            {loading ? "Gönderiliyor..." : "Hesap Oluştur"}
                                        </button>
                                    </div>
                                </form>
                                <p className="mt-6 text-center text-sm text-gray-400">
                                    Zaten bir hesabın var mı?{" "}
                                    <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:8080'}/login`} className="font-medium text-indigo-400 hover:text-indigo-300">
                                        Giriş Yap
                                    </a>
                                </p>
                            </div>
                        ) : (
                            <div id="otp-step">
                                <div className="text-center mb-8 relative">
                                    <button
                                        onClick={() => setStep("phone")}
                                        className="absolute top-0 left-0 text-gray-400 hover:text-white"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <h1 className="text-3xl font-bold text-white mb-2">Kodu Doğrula</h1>
                                    <p className="text-gray-400">
                                        <span className="font-medium text-white">{phone}</span> numarasına gönderilen 6 haneli kodu girin.
                                    </p>
                                </div>

                                <form onSubmit={handleOtpSubmit} className="space-y-6">
                                    <div className="flex justify-between gap-2">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-${index}`}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                className="w-12 h-14 bg-[#101010] border border-gray-700 rounded-lg text-center text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                                    >
                                        {loading ? "Doğrulanıyor..." : "Doğrula ve Kaydol"}
                                    </button>
                                </form>
                                <div className="mt-6 text-center">
                                    <button
                                        onClick={() => {
                                            apiClient.post('/api/register-phone', { phone });
                                        }}
                                        className="text-sm text-indigo-400 hover:text-indigo-300"
                                    >
                                        Kodu almadın mı? Tekrar gönder
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function Register() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Yükleniyor...</div>}>
            <RegisterContent />
        </Suspense>
    );
}

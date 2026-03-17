"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { TextReveal } from "@/components/ui/TextReveal";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { Phone, AlertCircle, CheckCircle, ArrowLeft, User, Menu, Tag, Check, X, ChevronRight } from "lucide-react";
import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// Use relative path or alias if configured
import { apiClient } from "../../lib/api-client";
import { motion, AnimatePresence } from "framer-motion";

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

    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Initial check for 'ref' param
    useEffect(() => {
        const refParam = searchParams.get('ref') || searchParams.get('referralCode');
        if (refParam) {
            setReferralCode(refParam);
            validateReferralCode(refParam);
        }
    }, [searchParams]);

    const normalizePhone = (p: string) => p.replace(/[^\d+]/g, "");

    const validateReferralCode = async (code: string) => {
        if (!code) {
            setReferralStatus("idle");
            setReferralName(null);
            return;
        }
        setReferralStatus("loading");
        try {
            const res = await apiClient.get(`/api/affiliates/lookup?code=${code}`);
            const resData = res.data?.data || res.data;
            if (resData?.email || resData?.code || resData?.id) {
                setReferralName(resData.email || resData.name || code);
                setReferralStatus("valid");
            } else {
                setReferralName(null);
                setReferralStatus("invalid");
            }
        } catch (e) {
            setReferralName(null);
            setReferralStatus("invalid");
        }
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await apiClient.post('/api/register-phone', { phone: normalizePhone(phone) });
            setStep("otp");
            // Scroll to top so OTP input is visible on mobile
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            console.error(err);
            const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.detail || "Bir hata oluştu.";
            setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        const otpString = otp.join("");
        try {
            const response = await apiClient.post('/api/verify-registration-otp', {
                phone: normalizePhone(phone),
                otp: otpString,
                first_name: firstName,
                last_name: lastName,
                referral_code: referralStatus === "valid" ? referralCode : undefined
            });

            // ResponseEnvelope format: { success, data: { accessToken, ... }, error, ... }
            const resBody = response.data;
            if (resBody.success) {
                const token = resBody?.data?.accessToken || resBody?.data?.access_token || resBody?.accessToken || resBody?.access_token;
                if (token) {
                    localStorage.setItem('auth_token', token);
                }
                const redirectPath = searchParams.get('redirect');
                if (redirectPath) {
                    router.push(redirectPath);
                } else {
                    router.push('/checkout');
                }
            } else {
                setError(resBody?.error?.message || resBody.message || "Kod doğrulanamadı");
            }
        } catch (err: any) {
            console.error(err);
            const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.detail || "Doğrulama başarısız.";
            setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        // Handle paste
        if (value.length > 1) {
            const pastedData = value.substring(0, 6).split("");
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                if (index + i < 6) newOtp[index + i] = char;
            });
            setOtp(newOtp);
            const nextIdx = Math.min(index + pastedData.length, 5);
            otpRefs.current[nextIdx]?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-accent-blue/30 relative flex flex-col">
            <Header />
            <div className="fixed inset-0 z-0">
                <Scene />
            </div>

            <main className="flex-grow flex items-center justify-center relative z-10 p-4 pt-32 pb-24">
                <div className="w-full max-w-xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                        >
                            <HyperGlassCard className="p-8 md:p-12">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm"
                                    >
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {error}
                                    </motion.div>
                                )}

                                {step === "phone" ? (
                                    <div id="phone-step">
                                        <div className="mb-10">
                                            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-glow mb-4">
                                                <TextReveal>Serüvene Katılın</TextReveal>
                                            </h1>
                                            <p className="text-foreground/60 text-lg">
                                                İşitme merkezinizin geleceğini bugün inşa etmeye başlayın.
                                            </p>
                                        </div>

                                        <form onSubmit={handlePhoneSubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Adınız</label>
                                                    <div className="relative group">
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-foreground/30 group-focus-within:text-accent-blue transition-colors">
                                                            <User className="w-5 h-5" />
                                                        </span>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={firstName}
                                                            onChange={(e) => setFirstName(e.target.value)}
                                                            autoComplete="given-name"
                                                            className="w-full pl-12 pr-4 py-4 bg-foreground/[0.03] border border-foreground/10 rounded-2xl text-foreground placeholder-foreground/20 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all font-medium"
                                                            placeholder="Can"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Soyadınız</label>
                                                    <div className="relative group">
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-foreground/30 group-focus-within:text-accent-purple transition-colors">
                                                            <User className="w-5 h-5" />
                                                        </span>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={lastName}
                                                            onChange={(e) => setLastName(e.target.value)}
                                                            autoComplete="family-name"
                                                            className="w-full pl-12 pr-4 py-4 bg-foreground/[0.03] border border-foreground/10 rounded-2xl text-foreground placeholder-foreground/20 focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple transition-all font-medium"
                                                            placeholder="Yılmaz"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">İletişim Numarası</label>
                                                <div className="relative group">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-foreground/30 group-focus-within:text-accent-blue transition-colors">
                                                        <Phone className="w-5 h-5" />
                                                    </span>
                                                    <input
                                                        type="tel"
                                                        required
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        autoComplete="tel"
                                                        className="w-full pl-12 pr-4 py-4 bg-foreground/[0.03] border border-foreground/10 rounded-2xl text-foreground placeholder-foreground/20 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all font-medium tracking-wide text-lg"
                                                        placeholder="5XX XXX XX XX"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Referans <span className="text-[10px] opacity-40">(İsteğe bağlı)</span></label>
                                                <div className="relative group">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-foreground/30 group-focus-within:text-accent-purple transition-colors">
                                                        <Tag className="w-5 h-5" />
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
                                                        className={`w-full pl-12 pr-12 py-4 bg-foreground/[0.03] border rounded-2xl text-foreground placeholder-foreground/20 focus:outline-none focus:ring-2 transition-all font-medium ${referralStatus === "valid" ? "border-emerald-500/50 focus:ring-emerald-500/20" :
                                                            referralStatus === "invalid" ? "border-red-500/50 focus:ring-red-500/20" :
                                                                "border-foreground/10 focus:ring-accent-purple/50 focus:border-accent-purple"
                                                            }`}
                                                        placeholder="Hediye çeki veya referans kodu"
                                                    />
                                                    {referralStatus === "loading" && (
                                                        <div className="absolute inset-y-0 right-4 flex items-center">
                                                            <div className="w-5 h-5 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                    {referralStatus === "valid" && (
                                                        <div className="absolute inset-y-0 right-4 flex items-center text-emerald-500">
                                                            <Check className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                {referralStatus === "valid" && referralName && (
                                                    <p className="mt-2 text-sm text-emerald-500/80 font-medium flex items-center gap-1 px-1">
                                                        <CheckCircle className="w-4 h-4" />
                                                        {referralName} ile özel avantaj kazandınız
                                                    </p>
                                                )}
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full flex justify-center items-center gap-2 py-4 px-6 rounded-2xl bg-foreground text-background font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-foreground/10 group mt-4"
                                            >
                                                {loading ? "Hazırlanıyor..." : "Ücretsiz Başlat"}
                                                {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                            </button>
                                        </form>

                                        <p className="mt-8 text-center text-foreground/40 text-sm">
                                            Zaten hesabınız var mı?{" "}
                                            <a href={`${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:8080'}/login`} className="font-bold text-foreground hover:text-accent-blue transition-colors">
                                                Hemen Giriş Yapın
                                            </a>
                                        </p>
                                    </div>
                                ) : (
                                    <div id="otp-step">
                                        <div className="mb-10 relative">
                                            <button
                                                onClick={() => setStep("phone")}
                                                className="absolute -top-1 -left-1 p-2 text-foreground/40 hover:text-foreground transition-colors hover:bg-foreground/5 rounded-full"
                                            >
                                                <ArrowLeft className="w-6 h-6" />
                                            </button>
                                            <div className="pl-10">
                                                <h1 className="text-4xl font-display font-bold tracking-tight text-glow mb-2">
                                                    Doğrulama
                                                </h1>
                                                <p className="text-foreground/60">
                                                    <span className="font-bold text-foreground">{phone}</span> hattınıza gelen kodu girin.
                                                </p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleOtpSubmit} className="space-y-8">
                                            <div className="flex justify-between gap-3">
                                                {otp.map((digit, index) => (
                                                    <input
                                                        key={index}
                                                        ref={(el) => { otpRefs.current[index] = el; }}
                                                        id={`otp-${index}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        autoComplete="one-time-code"
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                                        className="w-12 h-14 md:w-14 md:h-16 bg-foreground/5 border border-white/10 rounded-2xl text-center text-2xl font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all font-bold placeholder-foreground/20"
                                                        placeholder="0"
                                                        disabled={loading}
                                                    />
                                                ))}
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading || otp.join("").length < 6}
                                                className="w-full py-5 bg-foreground text-background font-bold rounded-2xl text-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-20 shadow-2xl"
                                            >
                                                {loading ? "Doğrulanıyor..." : "Doğrula ve Bitir"}
                                            </button>
                                        </form>
                                        <div className="mt-8 text-center">
                                            <button
                                                onClick={() => apiClient.post('/api/register-phone', { phone: normalizePhone(phone) })}
                                                className="text-sm font-bold text-foreground/40 hover:text-accent-blue transition-colors"
                                            >
                                                Kodu Almadınız mı? Yeniden Gönder
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </HyperGlassCard>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function Register() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-foreground/10 border-t-foreground rounded-full animate-spin" />
        </div>}>
            <RegisterContent />
        </Suspense>
    );
}

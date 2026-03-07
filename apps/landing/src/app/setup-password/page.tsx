"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { motion } from "framer-motion";

export default function SetupPassword() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor.");
            return;
        }

        if (password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            return;
        }

        setLoading(true);

        try {
            const res = await apiClient.post('/api/auth/set-password', { password });
            if (res.data.success) {
                const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:8080';
                const token = localStorage.getItem('auth_token');
                window.location.href = `${webUrl}/login?token=${token}&action=setup_complete`;
            } else {
                setError(res.data.error || "Bir hata oluştu.");
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Bağlantı hatası.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-accent-blue/30 relative flex flex-col">
            <Header />
            <div className="fixed inset-0 z-0">
                <Scene />
            </div>

            <main className="flex-grow flex items-center justify-center pt-32 pb-24 relative z-10 p-4">
                <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <HyperGlassCard className="p-8 md:p-12">
                            <div className="text-center mb-10">
                                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 mb-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h1 className="text-3xl font-display font-bold text-glow">Hesabınız Hazır!</h1>
                                <p className="text-foreground/50 mt-2">Güvenliğiniz için lütfen bir şifre belirleyin.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Yeni Şifre</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 group-focus-within:text-accent-blue transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/20 focus:outline-none focus:border-accent-blue' focus:ring-1 focus:ring-accent-blue/20 transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-accent-blue transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Şifre Tekrar</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 group-focus-within:text-accent-blue transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/20 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-500 font-medium text-center">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full group flex items-center justify-center gap-2 bg-foreground text-background font-display font-bold py-4 rounded-2xl shadow-xl shadow-foreground/5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Kaydet ve Giriş Yap
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </HyperGlassCard>
                    </motion.div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

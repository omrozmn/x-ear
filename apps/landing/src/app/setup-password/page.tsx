"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/api/api-client";
import AppHeader from "../AppHeader";

export default function SetupPassword() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Ensure user is verified (has token)
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
                // Success! Redirect to Web App Dashboard/Login
                const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:8080';
                const token = localStorage.getItem('auth_token');

                // Redirect with token to auto-login
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
        <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_50%_0%,hsla(250,90%,15%,0.3)_0px,transparent_50%)]"></div>
            </div>

            <AppHeader />

            <main className="min-h-screen flex items-center justify-center relative z-10 p-4 pt-20">
                <div className="w-full max-w-md">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-400">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Abonelik Başlatıldı!</h1>
                            <p className="text-gray-400">Hesabınızın güvenliği için lütfen bir şifre belirleyin.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Yeni Şifre</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Lock className="w-5 h-5 text-gray-500" />
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Şifreniz"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Şifre Tekrar</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Lock className="w-5 h-5 text-gray-500" />
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Şifrenizi tekrar girin"
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                            >
                                {loading ? (
                                    "Kaydediliyor..."
                                ) : (
                                    <>
                                        Kaydet ve Giriş Yap
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}

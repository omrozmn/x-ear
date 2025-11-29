"use client";

import Link from "next/link";
import { Phone, AlertCircle, CheckCircle, ArrowLeft, User, Lock, Eye, EyeOff, Menu } from "lucide-react";
import { useState } from "react";

export default function Register() {
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);

    const handlePhoneSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setStep("otp");
        }, 1500);
    };

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            alert("Kayıt başarılı! (Simülasyon)");
        }, 1500);
    };

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
                            <Link href="/pricing" className="text-gray-400 hover:text-white transition">
                                Paketler
                            </Link>
                            <Link href="/faq" className="text-gray-400 hover:text-white transition">
                                SSS
                            </Link>
                        </nav>
                        <div className="flex items-center space-x-4">
                            <a href="http://localhost:8080/login" className="text-gray-400 hover:text-white transition">
                                Giriş Yap
                            </a>
                            <Link
                                href="/register"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition"
                            >
                                Kayıt Ol
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="min-h-screen flex items-center justify-center pt-20 relative z-10">
                <div className="w-full max-w-md mx-auto px-4">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg p-8">
                        {step === "phone" ? (
                            <div id="phone-step">
                                <div className="text-center mb-8">
                                    <h1 className="text-3xl font-bold text-white">Hesap Oluştur</h1>
                                    <p className="text-gray-400 mt-2">Devam etmek için telefon numaranızı girin.</p>
                                </div>

                                <form onSubmit={handlePhoneSubmit} className="space-y-6">
                                    <div>
                                        <label htmlFor="phone-number" className="block text-sm font-medium text-gray-400 mb-2">
                                            Telefon Numarası
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Phone className="w-5 h-5 text-gray-500" />
                                            </span>
                                            <input
                                                id="phone-number"
                                                type="tel"
                                                required
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-[#101010] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="+90 555 123 45 67"
                                            />
                                        </div>
                                    </div>

                                    {/* Turnstile Placeholder */}
                                    <div className="flex justify-center">
                                        <div className="w-full h-16 bg-gray-800/50 rounded flex items-center justify-center text-gray-500 text-sm border border-gray-700">
                                            Turnstile CAPTCHA Placeholder
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                                        >
                                            {loading ? "Gönderiliyor..." : "Doğrulama Kodu Gönder"}
                                        </button>
                                    </div>
                                </form>
                                <p className="mt-6 text-center text-sm text-gray-400">
                                    Zaten bir hesabın var mı?{" "}
                                    <a href="http://localhost:8080/login" className="font-medium text-indigo-400 hover:text-indigo-300">
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
                                    <h1 className="text-3xl font-bold text-white">Kodu Doğrula</h1>
                                    <p className="text-gray-400 mt-2">
                                        <span className="font-medium text-white">{phone}</span> numarasına gönderilen 6 haneli kodu girin.
                                    </p>
                                </div>

                                <form onSubmit={handleOtpSubmit} className="space-y-6">
                                    <div className="flex justify-center space-x-2">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => {
                                                    const newOtp = [...otp];
                                                    newOtp[index] = e.target.value;
                                                    setOtp(newOtp);
                                                    if (e.target.value && index < 5) {
                                                        const nextInput = document.getElementById(`otp-${index + 1}`);
                                                        nextInput?.focus();
                                                    }
                                                }}
                                                id={`otp-${index}`}
                                                className="w-12 h-12 text-center text-2xl bg-[#101010] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                            />
                                        ))}
                                    </div>

                                    <div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                                        >
                                            {loading ? "Doğrulanıyor..." : "Doğrula ve Kaydol"}
                                        </button>
                                    </div>
                                </form>
                                <p className="mt-6 text-center text-sm text-gray-400">
                                    Kodu almadın mı?{" "}
                                    <button className="font-medium text-indigo-400 hover:text-indigo-300">Tekrar gönder</button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
    const searchParams = useSearchParams();
    const paymentId = searchParams.get("payment_id");

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
            <div className="max-w-md w-full px-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-4">Ödeme Başarılı!</h1>
                    <p className="text-gray-400 mb-8">
                        Aboneliğiniz başarıyla oluşturuldu. Giriş bilgileriniz e-posta adresinize gönderildi.
                    </p>

                    {paymentId && (
                        <div className="bg-white/5 rounded-lg p-4 mb-8 text-sm text-gray-400">
                            <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Referans Kodu</span>
                            {paymentId}
                        </div>
                    )}

                    <a
                        href="http://localhost:8080/login"
                        className="w-full flex justify-center items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                    >
                        Panele Giriş Yap
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutSuccess() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Yükleniyor...</div>}>
            <SuccessContent />
        </Suspense>
    );
}

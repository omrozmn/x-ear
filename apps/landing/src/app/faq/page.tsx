"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

export default function FAQ() {
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
                            <Link href="/pricing" className="text-gray-300 hover:text-white transition">
                                Paketler
                            </Link>
                            <Link href="/faq" className="text-white font-semibold">
                                SSS
                            </Link>
                        </nav>
                        <div className="hidden md:flex items-center space-x-4">
                            <a href="http://localhost:8082/login" className="text-gray-300 hover:text-white transition">
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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center mb-12 pt-20">
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                            Sıkça Sorulan Sorular
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
                            Aklınıza takılan soruların cevaplarını burada bulabilirsiniz.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <FAQCard
                            question="X-Ear nedir ve ne işe yarar?"
                            answer="X-Ear, işitme merkezleri için özel olarak tasarlanmış bulut tabanlı bir CRM (Müşteri İlişkileri Yönetimi) yazılımıdır. Hasta takibi, randevu yönetimi, cihaz denemeleri, envanter kontrolü, SGK entegrasyonu ve SMS pazarlama gibi birçok süreci dijitalleştirerek kliniğinizin verimliliğini artırır."
                        />
                        <FAQCard
                            question="Hangi paket bana uygun?"
                            answer={
                                <>
                                    Paketlerimiz, kliniğinizin büyüklüğüne ve ihtiyaçlarına göre ölçeklendirilmiştir. "Temel" paketimiz yeni
                                    başlayan küçük klinikler için idealken, "Profesyonel" ve "Business" paketlerimiz büyüyen ve daha fazla
                                    otomasyon ihtiyacı duyan işletmelere yöneliktir. "Enterprise" paketimiz ise zincir klinikler için özel
                                    çözümler sunar. Detaylı bilgi için{" "}
                                    <Link href="/pricing" className="text-indigo-400 hover:underline">
                                        paketler sayfamızı
                                    </Link>{" "}
                                    inceleyebilirsiniz.
                                </>
                            }
                        />
                        <FAQCard
                            question="SGK Medula entegrasyonu nasıl çalışıyor?"
                            answer="Business ve Enterprise paketlerimizde bulunan SGK Medula entegrasyonu, e-reçeteleri sistemimize OCR (Optik Karakter Tanıma) teknolojisi ile otomatik olarak aktarmanızı sağlar. Bu sayede manuel veri girişini ortadan kaldırır, zamandan tasarruf eder ve hataları en aza indirirsiniz."
                        />
                        <FAQCard
                            question="Verilerim güvende mi?"
                            answer="Evet, verilerinizin güvenliği bizim için en önemli önceliktir. Tüm verileriniz, sektör standardı güvenlik protokolleri ile korunan bulut sunucularımızda şifrelenerek saklanır. Düzenli olarak yedeklemeler alınır ve sistemimiz sürekli olarak izlenir."
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

function FAQCard({ question, answer }: { question: string; answer: React.ReactNode }) {
    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">{question}</h3>
            <p className="text-slate-300">{answer}</p>
        </div>
    );
}

"use client";

"use client";

import Link from "next/link";
import AppHeader from "../AppHeader";
import { Menu } from "lucide-react";

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_27%_37%,hsla(215,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_21%,hsla(125,98%,72%,0.1)_0px,transparent_50%),radial-gradient(at_52%_99%,hsla(355,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_10%_29%,hsla(256,96%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_96%,hsla(38,60%,74%,0.1)_0px,transparent_50%),radial-gradient(at_33%_50%,hsla(222,67%,73%,0.1)_0px,transparent_50%),radial-gradient(at_79%_53%,hsla(343,68%,79%,0.1)_0px,transparent_50%)]"></div>
      </div>

      <AppHeader />

      <main className="min-h-screen flex items-center justify-center pt-20 relative z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12 pt-20">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              Affiliate Programı
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              X-Ear platformunda iş ortaklığı yaparak gelir elde edin. Başvuru ve avantajlar hakkında detaylı bilgi aşağıda.
            </p>
            <div className="flex justify-center gap-4 mt-8">
              <Link href="/affiliate/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition text-lg">
                Kayıt Ol
              </Link>
              <Link href="/affiliate/login" className="border border-slate-600 hover:bg-slate-800 text-white font-medium py-3 px-8 rounded-lg transition text-lg">
                Giriş Yap
              </Link>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-left text-slate-300">
            <h2 className="text-2xl font-bold mb-4 text-white">Neden X-Ear Affiliate?</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Her başarılı yönlendirme için yüksek komisyon oranları</li>
              <li>Gerçek zamanlı takip ve şeffaf raporlama</li>
              <li>Kolay başvuru ve hızlı onay süreci</li>
              <li>Destek ve eğitim materyalleri</li>
            </ul>
            <div className="mt-6 text-sm text-slate-400">
              Daha fazla bilgi için <Link href="/faq" className="text-indigo-400 hover:underline">SSS</Link> sayfamıza göz atabilirsiniz.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu, Users, Ear, FileText, MessageSquare, Archive, BarChart3, Plus, Check } from "lucide-react";
import AppHeader from "./AppHeader";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_27%_37%,hsla(215,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_21%,hsla(125,98%,72%,0.1)_0px,transparent_50%),radial-gradient(at_52%_99%,hsla(355,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_10%_29%,hsla(256,96%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_96%,hsla(38,60%,74%,0.1)_0px,transparent_50%),radial-gradient(at_33%_50%,hsla(222,67%,73%,0.1)_0px,transparent_50%),radial-gradient(at_79%_53%,hsla(343,68%,79%,0.1)_0px,transparent_50%)]"></div>
      </div>

      <AppHeader />

      <main className="relative z-10">
        {/* Hero Section */}
        <section id="hero" className="min-h-screen flex items-center justify-center text-center pt-24 sm:pt-20 px-4">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
          >
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black tracking-tighter mb-6 text-white">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                İşitme Merkeziniz
              </span>{" "}
              için Hepsi Bir Arada Çözüm
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10">
              X-Ear, hasta yönetiminden SGK entegrasyonuna kadar tüm süreçlerinizi tek bir platformda birleştirerek
              kliniğinizin verimliliğini ve hasta memnuniyetini en üst düzeye çıkarır.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full max-w-md mx-auto sm:max-w-none">
              <Link
                href="/pricing"
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-4 px-10 rounded-xl transition text-lg shadow-lg hover:shadow-xl active:scale-95 w-full sm:w-auto text-center min-h-[56px] flex items-center justify-center"
              >
                Hemen Başla
              </Link>
              <a
                href="#features"
                className="border-2 border-slate-600 hover:bg-slate-800 active:bg-slate-700 text-white font-bold py-4 px-10 rounded-xl transition text-lg w-full sm:w-auto text-center min-h-[56px] flex items-center justify-center active:scale-95"
              >
                Özellikleri Keşfet
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-20 scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                Neden X-Ear?
              </h2>
              <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
                Kliniğinizi geleceğe taşıyacak güçlü ve kullanıcı dostu özellikler.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <FeatureCard
                delay={0}
                icon={<Users className="w-7 h-7" />}
                title="Kapsamlı Hasta Yönetimi"
                description="Tüm hasta bilgilerinizi, randevularınızı, ve geçmiş işlemlerinizi tek bir yerden kolayca yönetin."
                color="indigo"
              />
              <FeatureCard
                delay={0.1}
                icon={<Ear className="w-7 h-7" />}
                title="Cihaz Takibi ve Denemeler"
                description="Stoktaki cihazları, hastaların deneme süreçlerini ve cihaz iadelerini kolayca takip edin."
                color="purple"
              />
              <FeatureCard
                delay={0.2}
                icon={<FileText className="w-7 h-7" />}
                title="SGK Medula Entegrasyonu"
                description="E-reçeteleri OCR ile otomatik okuyun, Medula işlemlerini hızlandırın ve hataları en aza indirin."
                color="pink"
              />
              <FeatureCard
                delay={0.3}
                icon={<MessageSquare className="w-7 h-7" />}
                title="Akıllı SMS Kampanyaları"
                description="Doğum günü kutlamaları, randevu hatırlatmaları ve özel kampanyalar için otomatik SMS gönderin."
                color="blue"
              />
              <FeatureCard
                delay={0.4}
                icon={<Archive className="w-7 h-7" />}
                title="Envanter Yönetimi"
                description="Stok seviyelerinizi anlık olarak izleyin, kritik stok uyarıları alın ve tedarik süreçlerinizi optimize edin."
                color="green"
              />
              <FeatureCard
                delay={0.5}
                icon={<BarChart3 className="w-7 h-7" />}
                title="Detaylı Raporlama"
                description="Satış, randevu ve hasta verileri üzerine kurulu detaylı raporlarla kliniğinizin performansını analiz edin."
                color="yellow"
              />
            </div>
          </div>
        </section>



        {/* Call to Action Section */}
        <section className="py-16 sm:py-20 pb-24">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Hazır mısınız?</h2>
            <p className="text-base sm:text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              X-Ear'ın sunduğu yenilikçi çözümlerle işinizi bir üst seviyeye taşıyın.
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-blue-600 text-white font-bold rounded-full py-4 px-10 hover:bg-blue-700 active:bg-blue-800 transition duration-300 shadow-lg hover:shadow-xl active:scale-95 min-h-[56px] flex items-center justify-center mx-auto max-w-xs sm:max-w-none"
            >
              Hemen Başla
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, color, delay = 0 }: { icon: React.ReactNode; title: string; description: string; color: string; delay?: number }) {
  const colorClasses: Record<string, string> = {
    indigo: "bg-indigo-600/20 text-indigo-400",
    purple: "bg-purple-600/20 text-purple-400",
    pink: "bg-pink-600/20 text-pink-400",
    blue: "bg-blue-600/20 text-blue-400",
    green: "bg-green-600/20 text-green-400",
    yellow: "bg-yellow-600/20 text-yellow-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 transform hover:-translate-y-2 active:scale-98 transition-all duration-300 active:shadow-lg"
    >
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center mb-4 sm:mb-6 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{title}</h3>
      <p className="text-sm sm:text-base text-slate-400">{description}</p>
    </motion.div>
  );
}

function AddonCard({ title, price, description, features }: { title: string; price: string; description: string; features: string[] }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-indigo-500/50 transition-colors duration-300 flex flex-col">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="mt-2 text-3xl font-bold text-indigo-400">{price}</div>
      </div>
      <p className="text-slate-400 mb-6 flex-grow">{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-slate-300">
            <Check className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className="block w-full text-center bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition"
      >
        Satın Al
      </Link>
    </div>
  );
}

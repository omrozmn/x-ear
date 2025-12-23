import Link from "next/link";
import Image from "next/image";
import { Menu, Users, Ear, FileText, MessageSquare, Archive, BarChart3, Plus, Check } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_27%_37%,hsla(215,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_21%,hsla(125,98%,72%,0.1)_0px,transparent_50%),radial-gradient(at_52%_99%,hsla(355,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_10%_29%,hsla(256,96%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_96%,hsla(38,60%,74%,0.1)_0px,transparent_50%),radial-gradient(at_33%_50%,hsla(222,67%,73%,0.1)_0px,transparent_50%),radial-gradient(at_79%_53%,hsla(343,68%,79%,0.1)_0px,transparent_50%)]"></div>
      </div>

      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              <Image src="/logo/x.svg" alt="X-Ear Logo" width={32} height={32} className="w-8 h-8" />
              X-Ear
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/pricing" className="text-gray-300 hover:text-white transition">
                Paketler
              </Link>
              <Link href="/faq" className="text-gray-300 hover:text-white transition">
                SSS
              </Link>
            </nav>
            <div className="hidden md:flex items-center space-x-4">
              <a href={`${process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8082'}/login`} className="text-gray-300 hover:text-white transition">
                Giriş Yap
              </a>
              <Link
                href="/register"
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

      <main className="relative z-10">
        {/* Hero Section */}
        <section id="hero" className="min-h-screen flex items-center justify-center text-center pt-20">
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 text-white">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                İşitme Merkeziniz
              </span>{" "}
              için Hepsi Bir Arada Çözüm
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10">
              X-Ear, hasta yönetiminden SGK entegrasyonuna kadar tüm süreçlerinizi tek bir platformda birleştirerek
              kliniğinizin verimliliğini ve hasta memnuniyetini en üst düzeye çıkarır.
            </p>
            <div className="flex justify-center items-center gap-4">
              <Link
                href="/pricing"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition text-lg"
              >
                Hemen Başla
              </Link>
              <a
                href="#features"
                className="border border-slate-600 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-lg transition text-lg"
              >
                Özellikleri Keşfet
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                Neden X-Ear?
              </h2>
              <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
                Kliniğinizi geleceğe taşıyacak güçlü ve kullanıcı dostu özellikler.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Users className="w-7 h-7" />}
                title="Kapsamlı Hasta Yönetimi"
                description="Tüm hasta bilgilerinizi, randevularınızı, ve geçmiş işlemlerinizi tek bir yerden kolayca yönetin."
                color="indigo"
              />
              <FeatureCard
                icon={<Ear className="w-7 h-7" />}
                title="Cihaz Takibi ve Denemeler"
                description="Stoktaki cihazları, hastaların deneme süreçlerini ve cihaz iadelerini kolayca takip edin."
                color="purple"
              />
              <FeatureCard
                icon={<FileText className="w-7 h-7" />}
                title="SGK Medula Entegrasyonu"
                description="E-reçeteleri OCR ile otomatik okuyun, Medula işlemlerini hızlandırın ve hataları en aza indirin."
                color="pink"
              />
              <FeatureCard
                icon={<MessageSquare className="w-7 h-7" />}
                title="Akıllı SMS Kampanyaları"
                description="Doğum günü kutlamaları, randevu hatırlatmaları ve özel kampanyalar için otomatik SMS gönderin."
                color="blue"
              />
              <FeatureCard
                icon={<Archive className="w-7 h-7" />}
                title="Envanter Yönetimi"
                description="Stok seviyelerinizi anlık olarak izleyin, kritik stok uyarıları alın ve tedarik süreçlerinizi optimize edin."
                color="green"
              />
              <FeatureCard
                icon={<BarChart3 className="w-7 h-7" />}
                title="Detaylı Raporlama"
                description="Satış, randevu ve hasta verileri üzerine kurulu detaylı raporlarla kliniğinizin performansını analiz edin."
                color="yellow"
              />
            </div>
          </div>
        </section>



        {/* Call to Action Section */}
        <section className="py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-4 text-white">Hazır mısınız?</h2>
            <p className="text-lg text-gray-300 mb-8">
              X-Ear'ın sunduğu yenilikçi çözümlerle işinizi bir üst seviyeye taşıyın.
            </p>
            <Link
              href="/pricing"
              className="bg-blue-600 text-white font-bold rounded-full py-4 px-8 hover:bg-blue-700 transition duration-300"
            >
              Hemen Başla
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  const colorClasses: Record<string, string> = {
    indigo: "bg-indigo-600/20 text-indigo-400",
    purple: "bg-purple-600/20 text-purple-400",
    pink: "bg-pink-600/20 text-pink-400",
    blue: "bg-blue-600/20 text-blue-400",
    green: "bg-green-600/20 text-green-400",
    yellow: "bg-yellow-600/20 text-yellow-400",
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 transform hover:-translate-y-2 transition-transform duration-300">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
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

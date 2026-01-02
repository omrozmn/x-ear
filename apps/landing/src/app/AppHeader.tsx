"use client";

import Link from "next/link";
import Image from "next/image";
import HeaderNav from "./HeaderNav";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Use hook for pathname to ensure hydration safe or simpler check if allowed
  // Note: AppRouter usually uses usePathname. 'window' check implies Client Component.
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isAffiliatePanel = pathname?.includes('/affiliate/panel');

  useEffect(() => { }, []);

  const adminBase = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8080';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5" style={{ paddingTop: 'var(--safe-area-top)', pointerEvents: "auto" }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20 justify-between w-full">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            <Image src="/logo/x.svg" alt="X-Ear Logo" width={32} height={32} className="w-8 h-8" />
            X-Ear
          </Link>

          {!isAffiliatePanel && (
            <>
              <div className="flex-1 flex justify-center">
                <HeaderNav />
              </div>
              <div className="hidden md:flex items-center space-x-6">
                <a href={`${adminBase}/login`} className="text-gray-300 hover:text-white font-medium transition px-4 py-2 hover:bg-white/5 rounded-full">
                  Giriş Yap
                </a>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 px-6 rounded-full transition shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5"
                >
                  Kayıt Ol
                </Link>
              </div>
              <div className="md:hidden">
                <button
                  className="text-white p-3 hover:bg-white/10 rounded-lg active:bg-white/20 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && !isAffiliatePanel && (
        <div 
          className="md:hidden fixed top-20 left-0 w-full bg-[#0A0A0A]/98 backdrop-blur-2xl border-b border-white/10 shadow-2xl flex flex-col space-y-1 animate-in slide-in-from-top duration-200"
          style={{ 
            paddingTop: 'var(--safe-area-top)',
            paddingBottom: 'max(1.5rem, var(--safe-area-bottom))',
            paddingLeft: 'max(1.5rem, var(--safe-area-left))',
            paddingRight: 'max(1.5rem, var(--safe-area-right))',
          }}
        >
          <Link 
            href="/pricing" 
            onClick={() => setMobileMenuOpen(false)} 
            className="text-gray-300 hover:text-white active:bg-white/10 transition py-4 px-4 rounded-lg border-b border-white/5 text-base font-medium min-h-[56px] flex items-center"
          >
            Paketler
          </Link>
          <Link 
            href="/faq" 
            onClick={() => setMobileMenuOpen(false)} 
            className="text-gray-300 hover:text-white active:bg-white/10 transition py-4 px-4 rounded-lg border-b border-white/5 text-base font-medium min-h-[56px] flex items-center"
          >
            SSS
          </Link>
          <Link 
            href="/affiliate" 
            onClick={() => setMobileMenuOpen(false)} 
            className="text-indigo-400 hover:text-indigo-300 active:bg-indigo-500/10 font-semibold transition py-4 px-4 rounded-lg border-b border-white/5 text-base min-h-[56px] flex items-center"
          >
            Affiliate Programı
          </Link>
          <a 
            href={`${adminBase}/login`} 
            className="text-gray-300 hover:text-white active:bg-white/10 transition py-4 px-4 rounded-lg text-base font-medium min-h-[56px] flex items-center"
          >
            Giriş Yap
          </a>
          <Link 
            href="/register" 
            onClick={() => setMobileMenuOpen(false)} 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-4 rounded-xl text-center transition shadow-lg text-base active:scale-98 min-h-[56px] flex items-center justify-center mt-2"
          >
            Kayıt Ol
          </Link>
        </div>
      )}
    </header>
  );
}

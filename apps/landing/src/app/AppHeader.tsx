"use client";

import Link from "next/link";
import Image from "next/image";
import HeaderNav from "./HeaderNav";
import { Menu } from "lucide-react";
import { useEffect } from "react";

export default function AppHeader() {
  useEffect(() => {}, []);

  return (
    <header className="absolute top-0 left-0 right-0 z-50" style={{ pointerEvents: "auto" }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20 justify-between w-full">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            <Image src="/logo/x.svg" alt="X-Ear Logo" width={32} height={32} className="w-8 h-8" />
            X-Ear
          </Link>
          <div className="flex-1 flex justify-center">
            <HeaderNav />
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {(() => {
              const adminBase = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8080';
              return (
                <a href={`${adminBase}/login`} className="text-gray-300 hover:text-white transition">
                  Giriş Yap
                </a>
              );
            })()}
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
  );
}

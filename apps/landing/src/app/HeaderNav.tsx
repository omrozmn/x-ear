"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function HeaderNav() {
  useEffect(() => {}, []);

  return (
    <nav className="hidden md:flex items-center space-x-8" style={{ pointerEvents: "auto" }}>
      <Link href="/pricing" className="text-gray-300 hover:text-white transition">
        Paketler
      </Link>
      <Link href="/faq" className="text-gray-300 hover:text-white transition">
        SSS
      </Link>
      <Link href="/affiliate" className="text-indigo-400 hover:text-white font-semibold transition">
        Affiliate Programı
      </Link>
    </nav>
  );
}

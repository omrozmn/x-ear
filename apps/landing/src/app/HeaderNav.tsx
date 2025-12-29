"use client";

import Link from "next/link";

export default function HeaderNav() {
  return (
    <nav className="hidden md:flex items-center space-x-8">
      <Link href="/pricing" className="text-gray-300 hover:text-white transition" onClick={() => {console.log('Paketler link clicked')}}>
        Paketler
      </Link>
      <Link href="/faq" className="text-gray-300 hover:text-white transition" onClick={() => {console.log('SSS link clicked')}}>
        SSS
      </Link>
      <Link href="/affiliate" className="text-indigo-400 hover:text-white font-semibold transition" onClick={() => {console.log('Affiliate Programı link clicked')}}>
        Affiliate Programı
      </Link>
    </nav>
  );
}

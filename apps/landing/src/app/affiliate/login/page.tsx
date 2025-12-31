"use client";

import React, { useState } from 'react';
import AppHeader from '../../AppHeader';
import { loginAffiliate } from '../../../lib/api/affiliate';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginAffiliate({ email, password });
      setResult('Giriş başarılı!');
    } catch (err: any) {
      setResult('Hata: ' + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_27%_37%,hsla(215,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_21%,hsla(125,98%,72%,0.1)_0px,transparent_50%),radial-gradient(at_52%_99%,hsla(355,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_10%_29%,hsla(256,96%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_96%,hsla(38,60%,74%,0.1)_0px,transparent_50%),radial-gradient(at_33%_50%,hsla(222,67%,73%,0.1)_0px,transparent_50%),radial-gradient(at_79%_53%,hsla(343,68%,79%,0.1)_0px,transparent_50%)]"></div>
      </div>

      <AppHeader />

      <main className="min-h-screen flex items-center justify-center pt-20 relative z-10">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold mb-4 text-white">Affiliate Giriş</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input className="w-full p-3 rounded bg-white/3 border border-white/10 text-white placeholder-slate-400" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input className="w-full p-3 rounded bg-white/3 border border-white/10 text-white placeholder-slate-400" type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required />
              <div className="flex justify-between items-center">
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition">Giriş Yap</button>
                <a href="/affiliate/register" className="text-indigo-400 hover:underline">Hesap yok mu? Kayıt Ol</a>
              </div>
            </form>
            {result && <p className="mt-4 text-sm text-green-400">{result}</p>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;

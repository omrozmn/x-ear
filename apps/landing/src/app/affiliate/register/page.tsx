"use client";

import React, { useState } from 'react';
import AppHeader from '../../AppHeader';
import { registerAffiliate } from '../../../lib/api/affiliate';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';

const RegisterPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password confirmation
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor!');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır!');
      return;
    }

    setIsLoading(true);

    try {
      await registerAffiliate({ email, password });
      setIsSuccess(true);

      // Auto redirect after 2 seconds
      setTimeout(() => {
        router.push('/affiliate/login');
      }, 2000);

    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || err.message;
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        setError('Bu e-posta adresi zaten kayıtlı!');
      } else if (errorMsg.includes('Network') || errorMsg.includes('offline')) {
        setError('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        setError('Kayıt başarısız: ' + errorMsg);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_27%_37%,hsla(215,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_21%,hsla(125,98%,72%,0.1)_0px,transparent_50%),radial-gradient(at_52%_99%,hsla(355,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_10%_29%,hsla(256,96%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_96%,hsla(38,60%,74%,0.1)_0px,transparent_50%),radial-gradient(at_33%_50%,hsla(222,67%,73%,0.1)_0px,transparent_50%),radial-gradient(at_79%_53%,hsla(343,68%,79%,0.1)_0px,transparent_50%)]"></div>
      </div>

      <AppHeader />

      {/* Success Modal Overlay */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#151515] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl transform scale-100 transition-all">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Kayıt Başarılı!</h3>
            <p className="text-gray-400 mb-6">Hesabınız oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz...</p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen flex items-center justify-center pt-20 relative z-10">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold mb-4 text-white">Affiliate Kayıt</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="w-full p-3 rounded bg-white/3 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading || isSuccess}
              />
              <input
                className="w-full p-3 rounded bg-white/3 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                type="password"
                placeholder="Şifre (en az 6 karakter)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading || isSuccess}
              />
              <input
                className="w-full p-3 rounded bg-white/3 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                type="password"
                placeholder="Şifre Tekrar"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                required
                disabled={isLoading || isSuccess}
              />
              <div className="flex justify-between items-center pt-2">
                <button
                  type="submit"
                  disabled={isLoading || isSuccess}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-lg transition-all flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Yükleniyor...
                    </>
                  ) : 'Kayıt Ol'}
                </button>
                <a href="/affiliate/login" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors text-sm">
                  Zaten hesabınız var mı? Giriş Yap
                </a>
              </div>
            </form>
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;

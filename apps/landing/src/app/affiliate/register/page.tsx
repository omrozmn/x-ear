"use client";

import React, { useState } from 'react';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { registerAffiliate } from '../../../lib/affiliate';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, Mail, Lock, UserPlus, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

const RegisterPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const affiliateData = await registerAffiliate({ email, password });
      // Save affiliate data so panel page can load it
      localStorage.setItem('affiliate_user', JSON.stringify(affiliateData));
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/affiliate/panel');
      }, 2000);
    } catch (err: any) {
      const rawMsg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Bilinmeyen hata';
      const errorMsg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate') || errorMsg.includes('UNIQUE constraint')) {
        setError('Bu e-posta adresi zaten kayıtlı!');
      } else {
        setError('Kayıt başarısız: ' + errorMsg);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <Header />
      <div className="fixed inset-0 z-0">
        <Scene />
      </div>

      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-foreground/5 border border-foreground/10 rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-accent-blue animate-shimmer" />
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-accent-blue/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-accent-blue" />
                </div>
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground mb-3">Kayıt Başarılı!</h3>
              <p className="text-foreground/60 mb-8 leading-relaxed">Hesabınız başarıyla oluşturuldu. Partner panelinize yönlendiriliyorsunuz...</p>
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow flex items-center justify-center pt-32 pb-24 relative z-10">
        <div className="w-full max-w-lg mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <HyperGlassCard className="p-8 md:p-12">
              <div className="mb-10 text-center">
                <div className="inline-flex p-3 rounded-2xl bg-accent-blue/10 mb-4">
                  <UserPlus className="w-8 h-8 text-accent-blue" />
                </div>
                <h1 className="text-3xl font-display font-bold text-glow">Affiliate Kayıt</h1>
                <p className="text-foreground/50 mt-2">X-Ear iş ortağı olmak için formu doldurun.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">E-Posta Adresi</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 group-focus-within:text-accent-blue transition-colors" />
                    <input
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/20 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-all font-medium"
                      type="email"
                      placeholder="ad@sirket.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={isLoading || isSuccess}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Şifre</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 group-focus-within:text-accent-blue transition-colors" />
                    <input
                      className="w-full pl-12 pr-12 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/20 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-all font-medium"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={isLoading || isSuccess}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-accent-blue transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Şifre Tekrar</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 group-focus-within:text-accent-blue transition-colors" />
                    <input
                      className="w-full pl-12 pr-12 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/20 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-all font-medium"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordConfirm}
                      onChange={e => setPasswordConfirm(e.target.value)}
                      required
                      disabled={isLoading || isSuccess}
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess}
                    className="w-full group flex items-center justify-center gap-2 bg-foreground text-background font-display font-bold py-4 rounded-2xl shadow-xl shadow-foreground/10 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Kayıt Ol
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <a href="/affiliate/login" className="text-sm font-semibold text-foreground/40 hover:text-accent-blue transition-colors">
                      Zaten hesabınız var mı? <span className="text-foreground">Giriş Yap</span>
                    </a>
                  </div>
                </div>
              </form>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-500 font-medium flex gap-3 items-center"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  {error}
                </motion.div>
              )}
            </HyperGlassCard>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RegisterPage;

"use client";

import React, { useState } from 'react';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { loginAffiliate } from '../../../lib/affiliate';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, LogIn, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await loginAffiliate({ email, password });
      localStorage.setItem('affiliate_user', JSON.stringify(user));
      setIsSuccess(true);
      router.push('/affiliate/panel');
    } catch (err: any) {
      setError('Giriş başarısız: ' + (err?.response?.data?.detail || err.message));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <Header />
      <div className="fixed inset-0 z-0">
        <Scene />
      </div>

      <main className="flex-grow flex items-center justify-center pt-32 pb-24 relative z-10">
        <div className="w-full max-w-lg mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <HyperGlassCard className="p-8 md:p-12">
              <div className="mb-10 text-center">
                <div className="inline-flex p-3 rounded-2xl bg-accent-purple/10 mb-4">
                  <LogIn className="w-8 h-8 text-accent-purple" />
                </div>
                <h1 className="text-3xl font-display font-bold text-glow">Affiliate Giriş</h1>
                <p className="text-foreground/50 mt-2">Ortaklık panelinize erişmek için giriş yapın.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">E-Posta Adresi</label>
                  <div className="relative group">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${error ? 'text-red-500/50' : 'text-foreground/30 group-focus-within:text-accent-purple'}`} />
                    <input
                      className={`w-full pl-12 pr-4 py-4 rounded-2xl bg-foreground/5 text-foreground placeholder-foreground/20 focus:outline-none transition-all font-medium ${error ? 'border border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border border-foreground/10 focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/20'}`}
                      type="email"
                      placeholder="ad@sirket.com"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      disabled={isLoading || isSuccess}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Şifre</label>
                  <div className="relative group">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${error ? 'text-red-500/50' : 'text-foreground/30 group-focus-within:text-accent-purple'}`} />
                    <input
                      className={`w-full pl-12 pr-12 py-4 rounded-2xl bg-foreground/5 text-foreground placeholder-foreground/20 focus:outline-none transition-all font-medium ${error ? 'border border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border border-foreground/10 focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/20'}`}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      disabled={isLoading || isSuccess}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors p-1 ${error ? 'text-red-500/30 hover:text-red-500' : 'text-foreground/30 hover:text-accent-purple'}`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess}
                    className="w-full group flex items-center justify-center gap-2 bg-foreground text-background font-display font-bold py-4 rounded-2xl shadow-xl shadow-foreground/10 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading || isSuccess ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Giriş Yap
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <a href="/affiliate/register" className="text-sm font-semibold text-foreground/40 hover:text-accent-purple transition-colors">
                      Hesabınız yok mu? <span className="text-foreground">Kayıt Ol</span>
                    </a>
                  </div>
                </div>
              </form>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-500 font-medium flex gap-3 items-center overflow-hidden"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="flex-1">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </HyperGlassCard>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LoginPage;

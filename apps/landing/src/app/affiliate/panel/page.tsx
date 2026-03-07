"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { HyperGlassCard } from "@/components/ui/HyperGlassCard";
import { getAffiliate, updateAffiliatePaymentInfo, getAffiliateCommissions, Commission } from '../../../lib/affiliate';
import { Loader2, LogOut, Wallet, User as UserIcon, Building2, CheckCircle, AlertCircle, Copy, Check, Link as LinkIcon, Phone, History, Banknote, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

const PanelPage = () => {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  const [formName, setFormName] = useState('');
  const [formIban, setFormIban] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('affiliate_user');
    if (!storedUser) {
      router.push('/affiliate/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      // user might be wrapped in {success: true, data: {id: 1, ...}} or it might be just {id: 1, ...}
      const userData = user.data && user.id === undefined ? user.data : user;

      if (!userData || !userData.id) {
        localStorage.removeItem('affiliate_user');
        router.push('/affiliate/login');
        return;
      }

      setAffiliate(userData);

      if (userData.id) {
        fetchData(userData.id);
        fetchCommissionsData(userData.id);
      }
    } catch (e) {
      localStorage.removeItem('affiliate_user');
      router.push('/affiliate/login');
    }
  }, [router]);

  useEffect(() => {
    if (affiliate) {
      setFormName(affiliate.accountHolderName || affiliate.account_holder_name || '');
      setFormIban(affiliate.iban || '');
      setFormPhone(affiliate.phoneNumber || affiliate.phone_number || '');
    }
  }, [affiliate]);

  const fetchData = async (id: string | number) => {
    try {
      if (!id) return;
      if (!affiliate) setLoading(true);

      const data = await getAffiliate(Number(id));
      setAffiliate(data);
      localStorage.setItem('affiliate_user', JSON.stringify(data));
    } catch (err: any) {
      setError('Veriler güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionsData = async (id: number) => {
    try {
      setLoadingCommissions(true);
      const data = await getAffiliateCommissions(id);
      setCommissions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCommissions(false);
    }
  }

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate?.id) return;
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      const updatedData = await updateAffiliatePaymentInfo(affiliate.id, formIban, formName, formPhone);
      const newAffiliate = { ...affiliate, ...updatedData };
      setAffiliate(newAffiliate);
      localStorage.setItem('affiliate_user', JSON.stringify(newAffiliate));
      setPaymentSuccess("Bilgiler güncellendi.");
      setTimeout(() => setPaymentSuccess(null), 3000);
    } catch (err: any) {
      setPaymentError(err?.response?.data?.detail || "Güncelleme başarısız.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('affiliate_user');
    router.push('/affiliate/login');
  };

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const affiliateCode = affiliate?.referralCode || affiliate?.code || '';
  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${affiliateCode}`
    : `https://x-ear.com/register?ref=${affiliateCode}`;

  const totalEarnings = commissions
    .filter(c => c.status !== 'cancelled')
    .reduce((sum, c) => sum + c.amount, 0);

  if (!affiliate && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <Header />
      <div className="fixed inset-0 z-0">
        <Scene />
      </div>

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <HyperGlassCard className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-3xl font-display font-bold text-glow">Partner Paneli</h1>
                  <p className="text-foreground/50 mt-1">Hoş geldiniz, <span className="text-accent-blue font-semibold">{affiliate.email}</span></p>
                </div>
                <div className="flex gap-4 items-center w-full md:w-auto">
                  <div className="flex flex-col items-end px-6 border-r border-foreground/10">
                    <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest">Toplam Kazanç</span>
                    <span className="text-2xl font-mono text-emerald-400 font-bold">₺{totalEarnings.toLocaleString('tr-TR')}</span>
                  </div>
                  <button onClick={handleLogout} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </HyperGlassCard>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats & Referral Section */}
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HyperGlassCard className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-2xl bg-accent-blue/10 text-accent-blue">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground/40 font-bold uppercase tracking-wider">Komisyon Oranı</p>
                      <p className="text-2xl font-display font-bold">%20</p>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/30">Yapılan her başarılı satıştan %20 komisyon kazanırsınız.</p>
                </HyperGlassCard>

                <HyperGlassCard className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-2xl bg-accent-purple/10 text-accent-purple">
                      <LinkIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-foreground/40 font-bold uppercase tracking-wider">Referans Kodu</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-mono font-bold tracking-widest">{affiliateCode}</p>
                        <button
                          onClick={() => copyToClipboard(affiliateCode, 'code')}
                          className={`p-1.5 rounded-lg transition-all ${copiedCode ? 'bg-emerald-500/20 text-emerald-400 scale-110' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground/40 hover:text-foreground'}`}
                          title="Kodu Kopyala"
                        >
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={copiedCode ? 'check' : 'copy'}
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              transition={{ duration: 0.15 }}
                            >
                              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </motion.div>
                          </AnimatePresence>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(referralLink, 'link')}
                    className={`w-full py-2 rounded-xl transition-all text-xs font-bold flex items-center justify-center gap-2 ${copiedLink ? 'bg-emerald-500/20 text-emerald-400' : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10'}`}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={copiedLink ? 'check-link' : 'copy-link'}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 5 }}
                        className="flex items-center gap-2"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Link Kopyalandı
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Linki Kopyala
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </button>
                </HyperGlassCard>
              </div>

              {/* Commission History */}
              <HyperGlassCard className="overflow-hidden">
                <div className="p-6 border-b border-foreground/5 flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold flex items-center gap-3">
                    <History className="w-5 h-5 text-accent-blue" /> Kazanç Geçmişi
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-foreground/5 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                      <tr>
                        <th className="px-6 py-4">Tarih</th>
                        <th className="px-6 py-4">İşlem</th>
                        <th className="px-6 py-4">Durum</th>
                        <th className="px-6 py-4 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5 text-sm">
                      {loadingCommissions ? (
                        <tr><td colSpan={4} className="p-12 text-center text-foreground/20 animate-pulse font-display font-bold italic">Yükleniyor...</td></tr>
                      ) : commissions.length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-foreground/20 font-display font-bold italic">Henüz bir kazanç bulunmuyor.</td></tr>
                      ) : commissions.map((c, i) => (
                        <tr key={i} className="hover:bg-foreground/5 transition-colors group">
                          <td className="px-6 py-4 text-foreground/40">{new Date(c.created_at).toLocaleDateString('tr-TR')}</td>
                          <td className="px-6 py-4 font-bold">{c.event === 'payment' ? 'Satış Komisyonu' : c.event}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${c.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {c.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">₺{c.amount.toLocaleString('tr-TR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </HyperGlassCard>
            </div>

            {/* Payment Settings */}
            <div className="space-y-8">
              <HyperGlassCard className="p-8">
                <h2 className="text-xl font-display font-bold flex items-center gap-3 mb-8">
                  <Wallet className="w-5 h-5 text-accent-purple" /> Ödeme Bilgileri
                </h2>
                <form onSubmit={handleUpdatePayment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Alıcı Adı Soyadı</label>
                    <input
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/20 focus:outline-none focus:border-accent-purple transition-all text-sm font-medium"
                      placeholder="İsim Soyisim"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">IBAN</label>
                    <input
                      value={formIban}
                      onChange={e => setFormIban(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/20 focus:outline-none focus:border-accent-purple transition-all text-sm font-medium"
                      placeholder="TR..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Telefon</label>
                    <input
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/20 focus:outline-none focus:border-accent-purple transition-all text-sm font-medium"
                      placeholder="05..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-foreground text-background font-display font-bold py-4 rounded-2xl shadow-xl shadow-foreground/5 hover:opacity-90 active:scale-95 transition-all text-sm"
                  >
                    Bilgileri Güncelle
                  </button>

                  {paymentSuccess && <p className="text-emerald-400 text-xs font-bold text-center animate-pulse">{paymentSuccess}</p>}
                  {paymentError && <p className="text-red-400 text-xs font-bold text-center">{paymentError}</p>}
                </form>
              </HyperGlassCard>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PanelPage;

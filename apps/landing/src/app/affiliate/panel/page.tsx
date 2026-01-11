"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import AppHeader from '../../AppHeader';
import { getAffiliate, updateAffiliatePaymentInfo, getAffiliateCommissions, Commission } from '../../../lib/affiliate';
import { Loader2, LogOut, Wallet, User as UserIcon, Building2, CheckCircle, AlertCircle, Copy, Link as LinkIcon, Phone, History, Banknote } from 'lucide-react';

const PanelPage = () => {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Commission Data
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  // Form States
  const [formName, setFormName] = useState('');
  const [formIban, setFormIban] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check session
    const storedUser = localStorage.getItem('affiliate_user');
    if (!storedUser) {
      router.push('/affiliate/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const userData = user.data && user.success ? user.data : user;

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
      console.error("Session parse error:", e);
      localStorage.removeItem('affiliate_user');
      router.push('/affiliate/login');
    }
  }, []);

  // Sync form state
  useEffect(() => {
    if (affiliate) {
      setFormName(affiliate.account_holder_name || '');
      setFormIban(affiliate.iban || '');
      setFormPhone(affiliate.phone_number || '');
    }
  }, [affiliate]);

  const fetchData = async (id: string | number) => {
    try {
      if (!id) return;
      // Don't set main loading to true for background refresh if data exists
      if (!affiliate) setLoading(true);

      const data = await getAffiliate(Number(id));
      setAffiliate(data);
      localStorage.setItem('affiliate_user', JSON.stringify(data));
      setError(null);
    } catch (err: any) {
      console.error("Fetch Data Error:", err);
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err.message;
      setError('Veriler güncellenemedi: ' + msg);
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
      console.error("Fetch Commissions Error:", err);
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

      const newAffiliate = {
        ...affiliate,
        iban: updatedData.iban,
        account_holder_name: updatedData.account_holder_name,
        phone_number: updatedData.phone_number
      };
      setAffiliate(newAffiliate);
      localStorage.setItem('affiliate_user', JSON.stringify(newAffiliate));

      setPaymentSuccess("Bilgiler başarıyla güncellendi.");
      setTimeout(() => setPaymentSuccess(null), 3000);

    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err.message;
      if (msg && msg.toLowerCase().includes('iban')) {
        setPaymentError("Geçersiz IBAN formatı. Lütfen kontrol ediniz.");
      } else {
        setPaymentError(msg);
      }
    }
  };

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${affiliate?.code}`
    : `https://xear.com.tr/register?ref=${affiliate?.code}`;

  // Calculate Total Earnings
  const totalEarnings = commissions
    .filter(c => c.status !== 'cancelled')
    .reduce((sum, c) => sum + c.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">ÖDENDİ</span>;
      case 'pending': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400">BEKLEMEDE</span>;
      case 'cancelled': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">İPTAL</span>;
      default: return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-500/20 text-gray-400">{status.toUpperCase()}</span>;
    }
  }

  const getEventLabel = (event: string) => {
    const map: any = { 'signup': 'Yeni Üyelik', 'payment': 'Ödeme', 'refund': 'İade' };
    return map[event] || event;
  }


  if (!affiliate && loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!affiliate) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_50%_0%,hsla(250,90%,60%,0.15)_0px,transparent_50%)]"></div>
      </div>

      <AppHeader />

      <main className="min-h-screen pt-24 px-4 pb-12 relative z-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Affiliate Paneli</h1>
              <p className="text-gray-400">Hoş geldin, <span className="text-indigo-400">{affiliate.email}</span></p>
            </div>
            <div className="flex gap-4 items-center">
              {/* Commission Rate Badge */}
              <div className="hidden md:flex flex-col items-end px-4 border-r border-white/10">
                <span className="text-xs text-gray-400 uppercase font-bold">Abone Başı Kazanç</span>
                <span className="text-xl font-mono text-indigo-400">%20</span>
              </div>
              {/* Total Earnings Badge */}
              <div className="hidden md:flex flex-col items-end px-4 border-r border-white/10">
                <span className="text-xs text-gray-400 uppercase font-bold">Toplam Kazanç</span>
                <span className="text-xl font-mono text-green-400">{formatCurrency(totalEarnings)}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium">
                <LogOut className="w-4 h-4" /> Çıkış Yap
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Column: Stats & Links */}
            <div className="space-y-6">
              {/* ID & Status */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-indigo-400" /> Hesap Durumu
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Affiliate ID</div>
                    <div className="text-white font-mono text-lg">{affiliate.display_id || affiliate.id}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Durum</div>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${affiliate.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {affiliate.is_active ? 'AKTİF' : 'PASİF'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral Link & Code */}
              <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-indigo-500/30 p-6 rounded-2xl space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-indigo-400" /> Referans Bağlantıları
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-indigo-300 uppercase font-bold mb-1 block">Referans Kodu</label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-black/40 border border-indigo-500/30 rounded-lg p-3 text-white font-mono text-lg tracking-wider">
                        {affiliate.code || '...'}
                      </code>
                      <button onClick={() => copyToClipboard(affiliate.code, 'code')} className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 text-indigo-300 px-4 rounded-lg transition-colors flex items-center justify-center min-w-[50px]">
                        {copiedCode ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-indigo-300 uppercase font-bold mb-1 block">Kayıt Linki</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-black/40 border border-indigo-500/30 rounded-lg p-3 text-gray-300 text-sm truncate font-mono">
                        {referralLink}
                      </div>
                      <button onClick={() => copyToClipboard(referralLink, 'link')} className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 text-indigo-300 px-4 rounded-lg transition-colors flex items-center justify-center min-w-[50px]">
                        {copiedLink ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Setup Form */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-indigo-400" /> Profil ve Ödeme Bilgileri
              </h2>

              <form onSubmit={handleUpdatePayment} className="space-y-5">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Hesap Sahibi Adı Soyadı</label>
                  <input className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all text-sm"
                    value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ad Soyad" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Telefon Numarası</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input className="w-full pl-10 p-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all text-sm"
                      value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="05XX XXX XX XX" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">IBAN</label>
                  <input className={`w-full p-3 rounded-xl bg-black/20 border ${paymentError ? 'border-red-500/50' : 'border-white/10'} text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all text-sm`}
                    value={formIban} onChange={(e) => setFormIban(e.target.value)} placeholder="TR..." />
                  {paymentError && (
                    <div className="flex items-center gap-1.5 mt-2 text-red-400 text-sm animate-in slide-in-from-top-1">
                      <AlertCircle className="w-4 h-4" />
                      {paymentError}
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex justify-center items-center gap-2">
                    <Wallet className="w-4 h-4" /> Bilgileri Güncelle
                  </button>
                  {paymentSuccess && (
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-green-400 text-sm animate-in slide-in-from-top-1">
                      <CheckCircle className="w-4 h-4" /> {paymentSuccess}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Commission History Table (Full Width) */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" /> Komisyon Geçmişi
              </h2>
              <div className="md:hidden text-green-400 font-mono text-sm border px-2 py-1 border-green-500/20 bg-green-500/10 rounded">
                {formatCurrency(totalEarnings)}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-black/20 uppercase tracking-wider text-xs font-semibold text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Olay/Tip</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingCommissions ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Yükleniyor...
                      </td>
                    </tr>
                  ) : commissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        <Banknote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Henüz kayıtlı bir kazanç bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 font-medium text-white">
                          {getEventLabel(c.event)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(c.status)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-white text-base">
                          {formatCurrency(c.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PanelPage;

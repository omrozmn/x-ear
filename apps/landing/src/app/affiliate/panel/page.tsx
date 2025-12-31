"use client";

import React, { useState } from 'react';
import AppHeader from '../../AppHeader';
import { getAffiliate } from '../../../lib/api/affiliate';

const PanelPage = () => {
  const [affiliateId, setAffiliateId] = useState('');
  const [affiliate, setAffiliate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    try {
      const data = await getAffiliate(Number(affiliateId));
      setAffiliate(data);
      setError(null);
    } catch (err: any) {
      setAffiliate(null);
      setError('Hata: ' + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_27%_37%,hsla(215,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_21%,hsla(125,98%,72%,0.1)_0px,transparent_50%),radial-gradient(at_52%_99%,hsla(355,98%,61%,0.1)_0px,transparent_50%),radial-gradient(at_10%_29%,hsla(256,96%,61%,0.1)_0px,transparent_50%),radial-gradient(at_97%_96%,hsla(38,60%,74%,0.1)_0px,transparent_50%),radial-gradient(at_33%_50%,hsla(222,67%,73%,0.1)_0px,transparent_50%),radial-gradient(at_79%_53%,hsla(343,68%,79%,0.1)_0px,transparent_50%)]"></div>
      </div>

      <AppHeader />

      <main className="min-h-screen flex items-center justify-center pt-20 relative z-10">
        <div className="w-full max-w-2xl mx-auto px-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg p-8">
            <h1 className="text-2xl font-bold mb-4 text-white">Affiliate Panel</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <input className="col-span-2 p-3 rounded bg-white/3 border border-white/10 text-white placeholder-slate-400" type="number" placeholder="Affiliate ID" value={affiliateId} onChange={e => setAffiliateId(e.target.value)} />
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition" onClick={handleFetch}>Bilgilerimi Getir</button>
            </div>

            {affiliate && (
              <div className="mt-6 text-slate-300">
                <div><b>ID:</b> {affiliate.id}</div>
                <div><b>Email:</b> {affiliate.email}</div>
                  <div><b>IBAN:</b> {affiliate.iban || 'Henüz eklenmedi'}</div>
                <div><b>Aktif:</b> {affiliate.is_active ? 'Evet' : 'Hayır'}</div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-2">IBAN Güncelle</h3>
                <form className="flex gap-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const value = (document.getElementById('iban-input') as HTMLInputElement).value;
                  try {
                    const res = await fetch(`/api/affiliate/${affiliate.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ iban: value }) });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    (document.getElementById('iban-input') as HTMLInputElement).value = data.iban;
                    alert('IBAN güncellendi');
                  } catch (err: any) {
                    alert('Hata: ' + (err?.message || err));
                  }
                }}>
                  <input id="iban-input" className="flex-1 p-2 rounded bg-white/3 border border-white/10 text-white placeholder-slate-400" defaultValue={affiliate.iban || ''} placeholder="TR..." />
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition">Kaydet</button>
                </form>
              </div>
            )}
            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PanelPage;

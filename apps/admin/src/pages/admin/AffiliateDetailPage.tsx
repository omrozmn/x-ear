import React from 'react';
import { useGetAffiliate, useGetAffiliateCommissions, Commission } from '@/lib/api-client';
import { Link } from '@tanstack/react-router';

interface AffiliateDetailPageProps {
  affiliateId: number;
}

const AffiliateDetailPage: React.FC<AffiliateDetailPageProps> = ({ affiliateId }) => {
  const { data: affiliate, isLoading: loadingAffiliate } = useGetAffiliate(affiliateId);
  const { data: commissions, isLoading: loadingCommissions } = useGetAffiliateCommissions(affiliateId);

  if (loadingAffiliate) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;
  if (!affiliate) return <div className="p-8 text-center text-red-500">Affiliate bulunamadı.</div>;

  const totalEarnings = commissions?.filter((c: Commission) => c.status !== 'cancelled').reduce((sum: number, c: Commission) => sum + c.amount, 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Note: In a real app, use history.back() or a parent link if strictly typed */}
          <Link to="/affiliates" className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">← Geri</Link>
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Detayı: {affiliate.display_id || affiliate.id}</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Profil ve Ödeme Bilgileri</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Referans Kodu</label>
            <div className="mt-1 font-mono text-lg text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">{affiliate.code}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Durum</label>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${affiliate.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {affiliate.is_active ? 'AKTİF' : 'PASİF'}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Ad Soyad (Hesap Sahibi)</label>
            <div className="mt-1 text-gray-900">{affiliate.account_holder_name || '-'}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Email</label>
            <div className="mt-1 text-gray-900">{affiliate.email}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Telefon</label>
            <div className="mt-1 text-gray-900">{affiliate.phone_number || '-'}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">IBAN</label>
            <div className="mt-1 font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded inline-block">{affiliate.iban || '-'}</div>
          </div>
        </div>
      </div>

      {/* Commissions Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Komisyon Geçmişi</h2>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase font-bold">Toplam Kazanç</div>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalEarnings)}
            </div>
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Olay / Tip</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {commissions?.map((c) => (
              <tr key={c.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleDateString('tr-TR') : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.event}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${c.status === 'paid' ? 'bg-green-100 text-green-800' :
                      c.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(c.amount)}
                </td>
              </tr>
            ))}
            {(!commissions || commissions.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Henüz komisyon kaydı bulunmuyor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AffiliateDetailPage;

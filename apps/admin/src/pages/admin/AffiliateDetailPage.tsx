import React from 'react';
import { useListAffiliateDetails, useListAffiliateCommissions, CommissionRead } from '@/lib/api-client';
import { Link } from '@tanstack/react-router';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

interface AffiliateDetailPageProps {
  affiliateId: string;
}

const AffiliateDetailPage: React.FC<AffiliateDetailPageProps> = ({ affiliateId }) => {
  const { isMobile } = useAdminResponsive();
  const idAsNumber = parseInt(affiliateId, 10);
  const { data: affiliateData, isLoading: loadingAffiliate } = useListAffiliateDetails(idAsNumber);
  const { data: commissionsData, isLoading: loadingCommissions } = useListAffiliateCommissions(idAsNumber);

  const affiliate = (affiliateData as any)?.data;
  const commissions = (commissionsData as any)?.data;

  if (loadingAffiliate) return <div className={`text-center text-gray-500 dark:text-gray-400 ${isMobile ? 'p-4' : 'p-8'}`}>Yükleniyor...</div>;
  if (!affiliate) return <div className={`text-center text-red-500 dark:text-red-400 ${isMobile ? 'p-4' : 'p-8'}`}>Affiliate bulunamadı.</div>;

  const totalEarnings = commissions?.filter((c: CommissionRead) => c.status !== 'cancelled').reduce((sum: number, c: CommissionRead) => sum + c.amount, 0) || 0;

  const columns = [
    {
      key: 'createdAt',
      header: 'Tarih',
      label: 'Tarih',
      render: (c: any) => c.createdAt ? new Date(c.createdAt).toLocaleDateString('tr-TR') : '-',
    },
    {
      key: 'event',
      header: 'Olay / Tip',
      label: 'Olay / Tip',
      render: (c: any) => c.event,
    },
    {
      key: 'status',
      header: 'Durum',
      label: 'Durum',
      render: (c: any) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
          ${c.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
            c.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : 
            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'}`}>
          {c.status}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Tutar',
      label: 'Tutar',
      render: (c: any) => (
        <span className="font-mono">
          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(c.amount)}
        </span>
      ),
      align: 'right' as const,
    },
  ];

  return (
    <div className={`max-w-7xl mx-auto space-y-8 ${isMobile ? 'p-4 pb-safe' : 'p-6'}`}>
      {/* Header */}
      <div className={`flex items-center ${isMobile ? 'flex-col gap-4' : 'justify-between'}`}>
        <div className={`flex items-center gap-4 ${isMobile ? 'w-full' : ''}`}>
          <Link to="/affiliates" className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white touch-feedback">← Geri</Link>
          <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Affiliate Detayı: {affiliate.id}</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-100 dark:border-gray-700">
        <h2 className={`font-semibold text-gray-800 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>Profil ve Ödeme Bilgileri</h2>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Referans Kodu</label>
            <div className="mt-1 font-mono text-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded inline-block">{affiliate.referralCode}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Durum</label>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${affiliate.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                {affiliate.isActive ? 'AKTİF' : 'PASİF'}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Ad Soyad (Hesap Sahibi)</label>
            <div className="mt-1 text-gray-900 dark:text-white">{affiliate.name}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Email</label>
            <div className="mt-1 text-gray-900 dark:text-white">{affiliate.email}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Telefon</label>
            <div className="mt-1 text-gray-900 dark:text-white">{affiliate.phone ? String(affiliate.phone) : '-'}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">IBAN</label>
            <div className="mt-1 font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded inline-block">{affiliate.iban || '-'}</div>
          </div>
        </div>
      </div>

      {/* Commissions Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className={`border-b border-gray-100 dark:border-gray-700 flex items-center ${isMobile ? 'flex-col gap-4 p-4' : 'justify-between p-6'}`}>
          <h2 className={`font-semibold text-gray-800 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Komisyon Geçmişi</h2>
          <div className={isMobile ? 'text-center' : 'text-right'}>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Toplam Kazanç</div>
            <div className={`font-bold text-green-600 dark:text-green-400 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalEarnings)}
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="p-4">
            <ResponsiveTable
              data={commissions || []}
              columns={columns}
              keyExtractor={(c: any) => c.id}
              emptyMessage="Henüz komisyon kaydı bulunmuyor."
            />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Olay / Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tutar</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {commissions?.map((c: any) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{c.event}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${c.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                        c.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : 
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right font-mono">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(c.amount)}
                  </td>
                </tr>
              ))}
              {(!commissions || commissions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Henüz komisyon kaydı bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AffiliateDetailPage;

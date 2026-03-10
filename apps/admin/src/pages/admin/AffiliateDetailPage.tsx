import React from 'react';
import {
  useListAffiliateDetails,
  useListAffiliateCommissions,
  type AffiliateRead,
  type CommissionRead,
  type ResponseEnvelopeAffiliateRead,
  type ResponseEnvelopeListCommissionRead,
} from '@/lib/api-client';
import { unwrapArray, unwrapData } from '@/lib/orval-response';
import { Link } from '@tanstack/react-router';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

interface AffiliateDetailPageProps {
  affiliateId: string;
}

interface AffiliateDetail extends AffiliateRead {
  referralCode?: string;
}

interface AffiliateCommission extends CommissionRead {
  event?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getAffiliate(data: ResponseEnvelopeAffiliateRead | undefined): AffiliateDetail | null {
  const affiliate = unwrapData<AffiliateRead>(data);
  if (!affiliate) {
    return null;
  }

  const record = isRecord(affiliate) ? affiliate : null;
  const referralCode = typeof record?.referralCode === 'string' ? record.referralCode : undefined;

  return {
    ...affiliate,
    referralCode,
  };
}

function getCommissions(data: ResponseEnvelopeListCommissionRead | undefined): AffiliateCommission[] {
  return unwrapArray<CommissionRead>(data).map((commission) => {
    const record = isRecord(commission) ? commission : null;
    const event = typeof record?.event === 'string' ? record.event : undefined;

    return {
      ...commission,
      event,
    };
  });
}

const AffiliateDetailPage: React.FC<AffiliateDetailPageProps> = ({ affiliateId }) => {
  const { isMobile } = useAdminResponsive();
  const idAsNumber = parseInt(affiliateId, 10);
  const { data: affiliateData, isLoading: loadingAffiliate } = useListAffiliateDetails(idAsNumber);
  const { data: commissionsData } = useListAffiliateCommissions(idAsNumber);

  const affiliate = getAffiliate(affiliateData);
  const commissions = getCommissions(commissionsData);

  if (loadingAffiliate) return <div className={`text-center text-gray-500 dark:text-gray-400 ${isMobile ? 'p-4' : 'p-8'}`}>Yükleniyor...</div>;
  if (!affiliate) return <div className={`text-center text-red-500 dark:text-red-400 ${isMobile ? 'p-4' : 'p-8'}`}>Affiliate bulunamadı.</div>;

  const totalEarnings = commissions
    .filter((commission) => commission.status !== 'cancelled')
    .reduce((sum, commission) => sum + commission.amount, 0);

  const columns = [
    {
      key: 'createdAt',
      header: 'Tarih',
      render: (commission: AffiliateCommission) => commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('tr-TR') : '-',
    },
    {
      key: 'event',
      header: 'Olay / Tip',
      render: (commission: AffiliateCommission) => commission.event ?? '-',
    },
    {
      key: 'status',
      header: 'Durum',
      render: (commission: AffiliateCommission) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
          ${commission.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
            commission.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'}`}>
          {commission.status ?? '-'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Tutar',
      render: (commission: AffiliateCommission) => (
        <span className="font-mono">
          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(commission.amount)}
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
          <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Affiliate Detayı: {String(affiliate.id)}</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
        <h2 className={`font-semibold text-gray-800 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>Profil ve Ödeme Bilgileri</h2>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Referans Kodu</label>
            <div className="mt-1 font-mono text-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded inline-block">{affiliate.referralCode ?? affiliate.code}</div>
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
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
              data={commissions}
              columns={columns}
              keyExtractor={(commission) => String(commission.id)}
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
              {commissions.map((commission) => (
                <tr key={String(commission.id)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{commission.event ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${commission.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                        commission.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'}`}>
                      {commission.status ?? '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right font-mono">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(commission.amount)}
                  </td>
                </tr>
              ))}
              {commissions.length === 0 && (
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

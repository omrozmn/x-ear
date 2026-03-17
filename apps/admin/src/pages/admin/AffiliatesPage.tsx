import React, { useState } from 'react';
import {
  useListAffiliateList,
  type AffiliateRead,
  type ResponseEnvelopeListAffiliateRead,
} from '@/lib/api-client';
import { unwrapArray } from '@/lib/orval-response';
import AffiliateDetailModal from '../../components/admin/AffiliateDetailModal';
import CreateAffiliateModal from '../../components/admin/CreateAffiliateModal';
import { PlusIcon, Search } from 'lucide-react';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';

function getAffiliates(
  data: ResponseEnvelopeListAffiliateRead | AffiliateRead[] | undefined
): AffiliateRead[] {
  return unwrapArray<AffiliateRead>(data);
}

const AffiliatesPage: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const { data: affiliatesData, isLoading, error, refetch } = useListAffiliateList();
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const affiliates = getAffiliates(affiliatesData).filter((affiliate) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [affiliate.name, affiliate.email, affiliate.phone ? String(affiliate.phone) : '', affiliate.iban || '', String(affiliate.id)]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });

  if (isLoading) return <div className="p-4">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-red-600">Hata oluştu: {(error as Error).message}</div>;

  const columns = [
    {
      key: 'id',
      header: 'ID',
      mobileHidden: true,
      render: (a: AffiliateRead) => (
        <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400">{String(a.id)}</span>
      )
    },
    {
      key: 'name',
      header: 'Ad Soyad',
      sortable: true,
      sortKey: 'name',
      sortValue: (a: AffiliateRead) => a.name,
      render: (a: AffiliateRead) => (
        <span className="text-sm text-gray-900 dark:text-white">{a.name}</span>
      )
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortKey: 'email',
      sortValue: (a: AffiliateRead) => a.email,
      render: (a: AffiliateRead) => (
        <span className="text-sm text-gray-900 dark:text-white">{a.email}</span>
      )
    },
    {
      key: 'phone',
      header: 'Telefon',
      mobileHidden: true,
      sortable: true,
      sortKey: 'phone',
      sortValue: (a: AffiliateRead) => a.phone ? String(a.phone) : '',
      render: (a: AffiliateRead) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{a.phone ? String(a.phone) : '-'}</span>
      )
    },
    {
      key: 'iban',
      header: 'IBAN',
      mobileHidden: true,
      sortable: true,
      sortKey: 'iban',
      sortValue: (a: AffiliateRead) => a.iban || '',
      render: (a: AffiliateRead) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{a.iban || '-'}</span>
      )
    },
    {
      key: 'active',
      header: 'Aktif',
      sortable: true,
      sortKey: 'isActive',
      sortValue: (a: AffiliateRead) => a.isActive ? 1 : 0,
      render: (a: AffiliateRead) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${a.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          {a.isActive ? 'Evet' : 'Hayır'}
        </span>
      )
    },
    {
      key: 'created',
      header: 'Oluşturulma',
      mobileHidden: true,
      sortable: true,
      sortKey: 'createdAt',
      sortValue: (a: AffiliateRead) => a.createdAt || '',
      render: (a: AffiliateRead) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {a.createdAt ? new Date(a.createdAt).toLocaleDateString('tr-TR') : '-'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (a: AffiliateRead) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAffiliateId(String(a.id));
          }}
          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 touch-feedback"
        >
          Detaylar
        </button>
      )
    }
  ];

  return (
    <>
      <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
        <div className="flex justify-between items-center mb-6">
          <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Affiliate Listesi
          </h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors touch-feedback"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {!isMobile && 'Yeni Affiliate Ekle'}
          </button>
        </div>
        <div className="mb-4">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="İsim, email, telefon veya IBAN ara..."
              className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
          <ResponsiveTable
            data={affiliates}
            columns={columns}
            keyExtractor={(a: AffiliateRead) => String(a.id)}
            onRowClick={(a: AffiliateRead) => setSelectedAffiliateId(String(a.id))}
            emptyMessage="Kayıt bulunamadı."
          />
        </div>
      </div>

      {selectedAffiliateId && (
        <AffiliateDetailModal
          affiliateId={selectedAffiliateId}
          isOpen={!!selectedAffiliateId}
          onClose={() => setSelectedAffiliateId(null)}
          onStatusChange={() => refetch()}
        />
      )}

      <CreateAffiliateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
};

export default AffiliatesPage;

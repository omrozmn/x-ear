import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useListAffiliates, Affiliate } from '@/lib/api-client';
import AffiliateDetailModal from '../../components/admin/AffiliateDetailModal';
import CreateAffiliateModal from '../../components/admin/CreateAffiliateModal';
import { PlusIcon } from 'lucide-react';

const AffiliatesPage: React.FC = () => {
  const { data: affiliatesData, isLoading, error, refetch } = useListAffiliates();
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Backend returns array directly, not wrapped
  // Backend returns array directly, but response envelope might wrap it
  const affiliates = Array.isArray(affiliatesData)
    ? affiliatesData
    : (affiliatesData as any)?.data && Array.isArray((affiliatesData as any).data)
      ? (affiliatesData as any).data
      : [];

  if (isLoading) return <div className="p-4">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-red-600">Hata oluştu: {(error as any).message}</div>;

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Affiliate Listesi</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Yeni Affiliate Ekle
          </button>
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IBAN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktif</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {affiliates.map((a: Affiliate) => (
                <tr
                  key={a.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedAffiliateId(a.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600">
                    {a.display_id || a.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.account_holder_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.phone_number || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.iban || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {a.is_active ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString('tr-TR') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAffiliateId(a.id);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Detaylar
                    </button>
                  </td>
                </tr>
              ))}
              {(!affiliates || affiliates.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">Kayıt bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
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

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Calendar,
  Activity,
  CreditCard,
  Tag,
  Users
} from 'lucide-react';
import { useParty } from '../hooks/useParty';
import { usePartyDevices } from '../hooks/party/usePartyDevices';
import { usePartySales } from '../hooks/party/usePartySales';
import { usePartyTimeline } from '../hooks/party/usePartyTimeline';
import { usePartyDocuments } from '../hooks/party/usePartyDocuments';
import { PartyHeader } from '../components/parties/PartyHeader';
import { PartyTabs, type PartyTab } from '../components/parties/PartyTabs';
import { PartyTabContent } from '../components/parties/PartyTabContent';
import { PartyFormModal } from '../components/parties/PartyFormModal';
import { PartyTagUpdateModal } from '../components/parties/PartyTagUpdateModal';
import { usePartyEditModal } from '../hooks/usePartyEditModal';
// import ReportModal from '../components/parties/modals/ReportModal'; // Not used - showReportModal is false
import { PartyNoteForm } from '../components/forms/PartyNoteForm';
import type { SaleRead } from '@/api/generated/schemas';
import { ErrorMessage, NetworkError, NotFoundError } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useGlobalError } from '../hooks/useGlobalError';
import { PARTY_DETAILS_TAB_LEGACY } from '../constants/storage-keys';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Button } from '@x-ear/ui-web';
import { useDeleteParty, useUpdateParty } from '@/api/client/parties.client';
import { partyApiService } from '../services/party/party-api.service';
// import type { Party } from '../types/party'; // Type inferred from useParty hook



export const DesktopPartyDetailsPage: React.FC = () => {


  const { partyId } = useParams({ strict: false }) as { partyId?: string };
  const navigate = useNavigate();
  const { showError } = useGlobalError();
  const [activeTab, setActiveTab] = useState<PartyTab>(() => {
    const saved = localStorage.getItem(PARTY_DETAILS_TAB_LEGACY);
    return (saved as PartyTab) || 'general';
  });
  const [showTagModal, setShowTagModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [, setShowReportModal] = useState(false); // Value unused, setter used in PartyHeader

  const { party, isLoading, error, refetch } = useParty(partyId);
  
  // Edit modal hook - wrap refetch to return Promise
  const editModal = usePartyEditModal(refetch ? async () => { await refetch(); } : async () => {});
  
  // Tag update mutation (for PartyTagUpdateModal)
  const updatePartyMutation = useUpdateParty({
    mutation: {
      onSuccess: async () => {
        await refetch?.();
      }
    }
  });
  
  const deletePartyMutation = useDeleteParty({
    mutation: {
      onSuccess: () => {
        // Navigate away after successful delete
        navigate({ to: '/parties' });
      }
    }
  });
  const { devices } = usePartyDevices(partyId ?? '');
  const { sales } = usePartySales(partyId);
  const { timeline } = usePartyTimeline(partyId);
  const { documents } = usePartyDocuments(partyId);

  const tabCounts = {
    devices: devices.length,
    sales: sales.length,
    timeline: timeline.length,
    documents: documents.length,
    notes: party?.notes?.length ?? 0,
  };

  // Utility functions
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format currency utility - kept for potential future use in this page
  // const formatCurrency = (amount?: number) => {
  //   if (!amount) return '₺0';
  //   return `₺${amount.toLocaleString('tr-TR')}`;
  // };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Aktif', className: 'bg-green-100 text-green-800' },
      active: { label: 'Aktif', className: 'bg-green-100 text-green-800' },
      INACTIVE: { label: 'Pasif', className: 'bg-yellow-100 text-yellow-800' },
      inactive: { label: 'Pasif', className: 'bg-yellow-100 text-yellow-800' },
      TRIAL: { label: 'Deneme', className: 'bg-blue-100 text-blue-800' },
      trial: { label: 'Deneme', className: 'bg-blue-100 text-blue-800' },
      archived: { label: 'Arşiv', className: 'bg-gray-100 text-gray-800' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getSegmentText = (segment?: string) => {
    const segmentMap: Record<string, string> = {
      lead: 'Potansiyel Müşteri',
      trial: 'Deneme Aşamasında',
      control: 'Kontrol Hastası',
      existing: 'Mevcut Hasta',
      NEW: 'Yeni',
      TRIAL: 'Deneme',
      PURCHASED: 'Satın Almış',
      CONTROL: 'Kontrol',
      RENEWAL: 'Yenileme',
      EXISTING: 'Mevcut',
      VIP: 'VIP'
    };
    return segmentMap[segment || ''] || segment || 'Belirtilmemiş';
  };

  const getAcquisitionTypeText = (type?: string) => {
    const typeMap: Record<string, string> = {
      referral: 'Referans',
      online: 'Online',
      'walk-in': 'Ziyaret',
      'social-media': 'Sosyal Medya',
      advertisement: 'Reklam',
      tabela: 'Tabela'
    };
    return typeMap[type || ''] || type || 'Belirtilmemiş';
  };

  useEffect(() => {
    if (error) {
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Hasta bilgileri yüklenirken bir hata oluştu';
      showError(errorMessage);
    }
  }, [error, showError]);

  const handleTabChange = (tab: PartyTab) => {
    setActiveTab(tab);
    localStorage.setItem(PARTY_DETAILS_TAB_LEGACY, tab);
  };

  const handleGoBack = () => {
    navigate({ to: '/parties' });
  };

  const handleDelete = async () => {
    if (!partyId || !party) {
      console.log('[DELETE] No partyId or party');
      return;
    }
    
    console.log('[DELETE] Starting delete for party:', partyId);
    
    const confirmed = window.confirm(
      `${party.firstName} ${party.lastName} isimli hastayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
    );
    
    if (!confirmed) {
      console.log('[DELETE] User cancelled');
      return;
    }
    
    console.log('[DELETE] User confirmed, calling mutation');
    
    try {
      await deletePartyMutation.mutateAsync({ partyId });
      console.log('[DELETE] Mutation successful');
      // Navigation handled by onSuccess callback
    } catch (err) {
      console.error('[DELETE] Error during deletion:', err);
      showError('Hasta silinirken bir hata oluştu');
    }
  };

  const renderContent = () => {
    if (!partyId) {
      return <NotFoundError resource="hasta ID" />;
    }

    if (isLoading) {
      return <LoadingSpinner size="lg" text="Hasta bilgileri yükleniyor..." fullScreen />;
    }

    if (error) {
      const errorMessage = typeof error === 'string' ? error : error.message || 'Hasta bilgileri yüklenirken bir hata oluştu';
      const isNetworkError = errorMessage.includes('network') || errorMessage.includes('fetch');

      if (isNetworkError) {
        return <NetworkError onRetry={() => window.location.reload()} />;
      }

      return (
        <ErrorMessage
          type="error"
          title="Hasta Bulunamadı"
          message="Hasta bilgileri yüklenirken bir hata oluştu veya hasta bulunamadı."
          onRetry={() => window.location.reload()}
          onDismiss={handleGoBack}
          retryText="Tekrar Dene"
        />
      );
    }

    if (!party) {
      return (
        <ErrorMessage
          type="error"
          title="Hasta Bulunamadı"
          message="Belirtilen hasta bulunamadı."
          onDismiss={handleGoBack}
        />
      );
    }

    return (
      <>
        {/* Party Header */}
        <PartyHeader
          party={party}
          isLoading={isLoading}
          onEdit={() => party && editModal.openModal(party)}
          onTagUpdate={() => setShowTagModal(true)}
          onAddNote={() => setShowNoteModal(true)}
          onGenerateReport={() => setShowReportModal(true)}
          onDelete={handleDelete}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 px-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Kayıt Tarihi</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(party.createdAt || undefined)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cihaz Sayısı</p>
                <p className="font-medium text-gray-900 dark:text-white">{tabCounts.devices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Durum</p>
                <div className="mt-1">{getStatusBadge(party.status ?? 'active')}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Segment</p>
                <p className="font-medium text-gray-900 dark:text-white">{getSegmentText(party.segment || undefined)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Kazanım Türü</p>
                <p className="font-medium text-gray-900 dark:text-white">{getAcquisitionTypeText(party.acquisitionType || undefined)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ErrorBoundary>
          <PartyTabs
            party={party}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            tabCounts={tabCounts}
          />
        </ErrorBoundary>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-900">
          <ErrorBoundary>
            <PartyTabContent
              party={party}
              activeTab={activeTab}
              isLoading={isLoading}
              tabCounts={tabCounts}
              sales={sales as unknown as SaleRead[]}
            />
          </ErrorBoundary>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with back button */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <Button
          onClick={handleGoBack}
          variant="ghost"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Hasta Listesine Dön
        </Button>
      </div>
      {renderContent()}

      {/* Edit Modal */}
      {party && (
        <PartyFormModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          onSubmit={editModal.handleSubmit as (updates: Record<string, unknown>) => Promise<unknown>}
          initialData={party}
          title="Hasta Düzenle"
          isLoading={editModal.isLoading}
        />
      )}

      {/* Tag Update Modal */}
      {showTagModal && party && (
        <PartyTagUpdateModal
          party={party}
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          onUpdate={async (partyId: string, updates: Record<string, unknown>) => {
            try {
              await updatePartyMutation.mutateAsync({
                partyId,
                data: updates
              });
              // refetch handled by onSuccess callback
              setShowTagModal(false); // Close modal after successful update
            } catch (error) {
              console.error('Failed to update party tags:', error);
              throw error;
            }
          }}
        />
      )}

      {/* Note Modal */}
      {showNoteModal && party && (
        <PartyNoteForm
          partyId={party.id!}
          isOpen={showNoteModal}
          onClose={() => setShowNoteModal(false)}
          onSave={async (noteData) => {
            await partyApiService.createNote(party.id!, noteData);
            await refetch?.();
          }}
        />
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Calendar,
  Activity,
  CreditCard
} from 'lucide-react';
import { useParty } from '../hooks/party/useParty';
import { usePartyDevices } from '../hooks/party/usePartyDevices';
import { usePartySales } from '../hooks/party/usePartySales';
import { usePartyTimeline } from '../hooks/party/usePartyTimeline';
import { usePartyDocuments } from '../hooks/party/usePartyDocuments';
import { PartyHeader } from '../components/parties/PartyHeader';
import { PartyTabs, type PartyTab } from '../components/parties/PartyTabs';
import { PartyTabContent } from '../components/parties/PartyTabContent';
import { PartyFormModal } from '../components/parties/PartyFormModal';
import { PartyTagUpdateModal } from '../components/parties/PartyTagUpdateModal';
// import ReportModal from '../components/parties/modals/ReportModal'; // Not used - showReportModal is false
import { PartyNoteForm } from '../components/forms/PartyNoteForm';
import type { SaleRead } from '@/api/generated/schemas';
import { ErrorMessage, NetworkError, NotFoundError } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useGlobalError } from '../components/GlobalErrorHandler';
import { PARTY_DETAILS_TAB_LEGACY } from '../constants/storage-keys';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Button } from '@x-ear/ui-web';
import { useUpdateParty } from '../hooks/useParties';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [, setShowReportModal] = useState(false); // Value unused, setter used in PartyHeader

  const { party, isLoading, error, loadParty } = useParty(partyId);
  const refetch = () => partyId ? loadParty(partyId) : Promise.resolve();
  const updatePartyMutation = useUpdateParty();
  const { devices } = usePartyDevices(partyId ?? '');
  const { sales } = usePartySales(partyId);
  const { timeline } = usePartyTimeline(partyId);
  const { documents } = usePartyDocuments(partyId);

  const tabCounts = {
    devices: devices.length,
    sales: sales.length,
    timeline: timeline.length,
    documents: documents.length,
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
          onEdit={() => setShowEditModal(true)}
          onTagUpdate={() => setShowTagModal(true)}
          onAddNote={() => setShowNoteModal(true)}
          onGenerateReport={() => setShowReportModal(true)}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 px-6">
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

          {/* SGK Durumu - v1'de aktif edilecek
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">SGK Durumu</p>
                <p className="font-medium">{party.sgkInfo ? 'Var' : 'Yok'}</p>
              </div>
            </div>
          </div>
          */}

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Durum</p>
                <div className="mt-1">{getStatusBadge(party.status ?? 'active')}</div>
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
      {showEditModal && party && (
        <PartyFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={async (data) => {
            try {
              await updatePartyMutation.mutateAsync({
                partyId: party.id!,
                updates: {
                  ...data,
                  // Ensure branchId is compatible (string | undefined) if generic type expects string
                  branchId: data.branchId ?? undefined
                }
              });
              setShowEditModal(false);
              await refetch?.();
              return party;
            } catch (error) {
              console.error('Failed to update party:', error);
              throw error;
            }
          }}
          initialData={party}
          title="Hasta Düzenle"
          isLoading={updatePartyMutation.isPending}
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
                updates
              });
              await refetch?.();
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
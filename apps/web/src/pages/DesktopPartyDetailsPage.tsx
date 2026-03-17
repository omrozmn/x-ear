import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
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
import { usePartyHearingTests } from '../hooks/party/usePartyHearingTests';
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
import { useDeleteParty, useUpdateParty } from '@/api/client/parties.client';
import { partyApiService } from '../services/party/party-api.service';
import { HeaderBackButton } from '../components/layout/HeaderBackButton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
// import type { Party } from '../types/party'; // Type inferred from useParty hook
import { useTranslation } from 'react-i18next';



export const DesktopPartyDetailsPage: React.FC = () => {
  const { t } = useTranslation(['parties_extra', 'patients', 'common']);

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
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean}>({open: false});

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
  const { hearingTests } = usePartyHearingTests(partyId);

  const tabCounts = {
    devices: devices.length,
    sales: sales.length,
    timeline: timeline.length,
    documents: documents.length,
    notes: party?.notes?.length ?? 0,
    'hearing-tests': hearingTests.length,
  };

  // Utility functions
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('details.not_specified');
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format currency utility - kept for potential future use in this page
  // const formatCurrency = (amount?: number) => {
  // if (!amount) return '₺0';
  // return `₺${amount.toLocaleString('tr-TR')}`;
  // };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: t('status.active'), className: 'bg-success/10 text-success' },
      active: { label: t('status.active'), className: 'bg-success/10 text-success' },
      INACTIVE: { label: t('status.inactive'), className: 'bg-warning/10 text-yellow-800' },
      inactive: { label: t('status.inactive'), className: 'bg-warning/10 text-yellow-800' },
      TRIAL: { label: t('status.trial'), className: 'bg-primary/10 text-blue-800' },
      trial: { label: t('status.trial'), className: 'bg-primary/10 text-blue-800' },
      archived: { label: t('status.archived'), className: 'bg-muted text-foreground' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'bg-muted text-foreground' };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getSegmentText = (segment?: string) => {
    const segmentMap: Record<string, string> = {
      lead: t('segment.lead'),
      trial: t('segment.trial'),
      control: t('segment.control'),
      existing: t('segment.existing'),
      new: t('segment.new'),
      purchased: t('segment.purchased'),
      renewal: t('segment.renewal'),
      vip: t('segment.vip'),
    };
    const key = (segment || '').toLowerCase();
    return segmentMap[key] || segment || t('segment.not_specified');
  };

  const getAcquisitionTypeText = (type?: string) => {
    const typeMap: Record<string, string> = {
      referral: t('acquisition.referral'),
      online: t('acquisition.online'),
      'walk-in': t('acquisition.walk_in'),
      'social-media': t('acquisition.social_media'),
      advertisement: t('acquisition.advertisement'),
      tabela: t('acquisition.tabela')
    };
    return typeMap[type || ''] || type || t('acquisition.not_specified');
  };

  useEffect(() => {
    if (error) {
      const errorMessage = typeof error === 'string' ? error : error?.message || t('details.load_error');
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

  const handleDelete = () => {
    if (!partyId || !party) {
      console.log('[DELETE] No partyId or party');
      return;
    }

    console.log('[DELETE] Starting delete for party:', partyId);
    setConfirmDelete({open: true});
  };

  const executeDelete = useCallback(async () => {
    if (!partyId) return;
    console.log('[DELETE] User confirmed, calling mutation');

    try {
      await deletePartyMutation.mutateAsync({ partyId });
      console.log('[DELETE] Mutation successful');
      // Navigation handled by onSuccess callback
    } catch (err) {
      console.error('[DELETE] Error during deletion:', err);
      showError(t('details.delete_error'));
    }
  }, [partyId, deletePartyMutation, showError]);

  const renderContent = () => {
    if (!partyId) {
      return <NotFoundError resource="hasta ID" />;
    }

    if (isLoading) {
      return <LoadingSpinner size="lg" text={t('details.loading')} fullScreen />;
    }

    if (error) {
      const errorMessage = typeof error === 'string' ? error : error.message || t('details.load_error');
      const isNetworkError = errorMessage.includes('network') || errorMessage.includes('fetch');

      if (isNetworkError) {
        return <NetworkError onRetry={() => window.location.reload()} />;
      }

      return (
        <ErrorMessage
          type="error"
          title={t('details.not_found_title')}
          message={t('details.not_found_message')}
          onRetry={() => window.location.reload()}
          onDismiss={handleGoBack}
          retryText={t('details.retry')}
        />
      );
    }

    if (!party) {
      return (
        <ErrorMessage
          type="error"
          title={t('details.not_found_title')}
          message={t('details.not_found_specific')}
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{t('details.registration_date')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(party.createdAt || undefined)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">{t('details.device_count')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{tabCounts.devices}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">{t('details.status_label')}</p>
                <div className="mt-1">{getStatusBadge(party.status ?? 'active')}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('details.segment_label')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{getSegmentText(party.segment || undefined)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">{t('details.acquisition_type_label')}</p>
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
      <div className="px-6 pt-5">
        <HeaderBackButton label={t('details.back_to_list')} onClick={handleGoBack} />
      </div>
      {renderContent()}

      {/* Edit Modal */}
      {party && (
        <PartyFormModal
          isOpen={editModal.isOpen}
          onClose={editModal.closeModal}
          onSubmit={editModal.handleSubmit}
          initialData={party}
          title={t('details.edit_title')}
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

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        title={t('delete_modal.confirm_title')}
        description={party ? t('delete_modal.confirm_message', { name: `${party.firstName} ${party.lastName}` }) : t('delete_modal.confirm_message_generic')}
        onClose={() => setConfirmDelete({open: false})}
        onConfirm={async () => { await executeDelete(); setConfirmDelete({open: false}); }}
        confirmLabel={t('delete_modal.confirm')}
        cancelLabel={t('delete_modal.cancel')}
        variant="danger"
      />

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

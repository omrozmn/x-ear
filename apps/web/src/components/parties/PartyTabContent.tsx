import * as React from 'react';
import { Party } from '../../types/party/party-base.types';
import { PartyTab } from './PartyTabs';
import { ErrorBoundary } from '../ErrorBoundary';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { PartyOverviewTab } from './PartyOverviewTab';
import { PartyDevicesTab } from './PartyDevicesTab';
import PartySalesTab from './PartySalesTab';
import { PartyTimelineTab } from './PartyTimelineTab';
import { PartyDocumentsTab } from './PartyDocumentsTab';
import { PartyAppointmentsTab } from './PartyAppointmentsTab';
import { PartyHearingTestsTab } from './PartyHearingTestsTab';
import { PartyNotesTab } from './PartyNotesTab';
import { PartySGKTab } from './PartySGKTab';
import { Clock } from 'lucide-react';

interface PartyTabContentProps {
  party: Party;
  activeTab: PartyTab;
  onPartyUpdate?: (p: Party) => void;
  sales?: any[];
  isLoading?: boolean;
  tabCounts?: any;
  showNoteModal?: boolean;
  onCloseNoteModal?: () => void;
}

export const PartyTabContent: React.FC<PartyTabContentProps> = ({
  party,
  activeTab,
  onPartyUpdate,
  sales,
  isLoading,
  tabCounts,
  showNoteModal,
  onCloseNoteModal
}) => {
  if (isLoading || !party) {
    return (
      <div className="p-6" role="status" aria-label="Hasta bilgileri yükleniyor">
        <LoadingSkeleton lines={6} />
      </div>
    );
  }
  const renderComingSoon = (tabName: string) => (
    <div className="p-6 text-center">
      <div className="max-w-sm mx-auto">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{tabName} Yakında Gelecek</h3>
        <p className="text-gray-500">
          Bu özellik şu anda geliştirme aşamasında. Yakında kullanıma sunulacak.
        </p>
      </div>
    </div>
  );

  const _formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  switch (activeTab) {
    case 'overview':
      return (
        <ErrorBoundary>
          <PartyOverviewTab
            party={party}
            showNoteModal={showNoteModal}
            onCloseNoteModal={onCloseNoteModal}
          />
        </ErrorBoundary>
      );
    case 'devices':
      return (
        <ErrorBoundary>
          <PartyDevicesTab party={party} />
        </ErrorBoundary>
      );
    case 'sales':
      return (
        <ErrorBoundary>
          <PartySalesTab party={party} />
        </ErrorBoundary>
      );
    case 'timeline':
      return (
        <ErrorBoundary>
          <PartyTimelineTab party={party} />
        </ErrorBoundary>
      );
    case 'documents':
      return (
        <ErrorBoundary>
          <PartyDocumentsTab partyId={party?.id || ''} />
        </ErrorBoundary>
      );
    case 'appointments':
      return (
        <ErrorBoundary>
          <PartyAppointmentsTab party={party} onPartyUpdate={onPartyUpdate || (() => { })} />
        </ErrorBoundary>
      );
    case 'hearing-tests':
      return (
        <ErrorBoundary>
          <PartyHearingTestsTab partyId={party?.id || ''} />
        </ErrorBoundary>
      );
    case 'sgk':
      return (
        <ErrorBoundary>
          <PartySGKTab party={party} onPartyUpdate={onPartyUpdate} />
        </ErrorBoundary>
      );
    case 'notes':
      return (
        <ErrorBoundary>
          <PartyNotesTab party={party} onPartyUpdate={onPartyUpdate} />
        </ErrorBoundary>
      );
    case 'settings':
      return renderComingSoon('Ayarlar');
    default:
      return (
        <ErrorBoundary>
          <PartyOverviewTab party={party} />
        </ErrorBoundary>
      );
  }
};
import React from 'react';
import { Patient } from '../types/patient';
import { PatientDeviceCard } from './patient/PatientDeviceCard';
import { PatientSaleCard } from './patient/PatientSaleCard';
import { PatientTimelineCard } from './patient/PatientTimelineCard';
import { PatientDocumentCard } from './patient/PatientDocumentCard';
import { PatientOverviewTab } from './PatientOverviewTab';
import { PatientDevicesTab } from './PatientDevicesTab';
import { PatientSalesTab } from './PatientSalesTab';
import { PatientTimelineTab } from './PatientTimelineTab';
import { PatientDocumentsTab } from './PatientDocumentsTab';
import { PatientAppointmentsTab } from './PatientAppointmentsTab';
import { PatientHearingTestsTab } from './PatientHearingTestsTab';
import { PatientNotesTab } from './PatientNotesTab';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { ErrorBoundary } from './common/ErrorBoundary';
import { Clock } from 'lucide-react';interface PatientTabContentProps {
  activeTab: string;
  patient?: Patient;
  isLoading?: boolean;
  tabCounts?: {
    devices: number;
    sales: number;
    timeline: number;
    documents: number;
  };
}

export const PatientTabContent: React.FC<PatientTabContentProps> = ({ 
  activeTab, 
  patient, 
  isLoading,
  tabCounts 
}) => {
  if (isLoading || !patient) {
    return (
      <div className="p-6" role="status" aria-label="Hasta bilgileri yükleniyor">
        <LoadingSkeleton lines={6} />
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

  switch (activeTab) {
    case 'overview':
      return (
        <ErrorBoundary>
          <PatientOverviewTab patient={patient} />
        </ErrorBoundary>
      );
    case 'devices':
      return (
        <ErrorBoundary>
          <PatientDevicesTab
            patientId={patient?.id || ''}
            devices={patient?.devices}
            tabCount={tabCounts?.devices}
          />
        </ErrorBoundary>
      );
    case 'sales':
      return (
        <ErrorBoundary>
          <PatientSalesTab
            patientId={patient?.id || ''}
            tabCount={tabCounts?.sales}
          />
        </ErrorBoundary>
      );
    case 'timeline':
      return (
        <ErrorBoundary>
          <PatientTimelineTab
            patientId={patient?.id || ''}
            tabCount={tabCounts?.timeline}
          />
        </ErrorBoundary>
      );
    case 'documents':
      return (
        <ErrorBoundary>
          <PatientDocumentsTab
            patientId={patient?.id || ''}
            tabCount={tabCounts?.documents}
          />
        </ErrorBoundary>
      );
    case 'appointments':
      return (
        <ErrorBoundary>
          <PatientAppointmentsTab patientId={patient?.id || ''} />
        </ErrorBoundary>
      );
    case 'tests':
      return (
        <ErrorBoundary>
          <PatientHearingTestsTab patientId={patient?.id || ''} />
        </ErrorBoundary>
      );
    case 'notes':
      return (
        <ErrorBoundary>
          <PatientNotesTab patientId={patient?.id || ''} />
        </ErrorBoundary>
      );
    case 'settings':
      return renderComingSoon('Ayarlar');
    default:
      return (
        <ErrorBoundary>
          <PatientOverviewTab patient={patient} />
        </ErrorBoundary>
      );
  }
};
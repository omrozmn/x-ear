import * as React from 'react';
import { Patient } from '../../types/patient/patient-base.types';
import { PatientTab } from './PatientTabs';
import { ErrorBoundary } from '../ErrorBoundary';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { PatientOverviewTab } from './PatientOverviewTab';
import { PatientDevicesTab } from '../PatientDevicesTab';
import { PatientSalesTab } from '../PatientSalesTab';
import { PatientTimelineTab } from '../PatientTimelineTab';
import { PatientDocumentsTab } from '../PatientDocumentsTab';
import { PatientAppointmentsTab } from '../PatientAppointmentsTab';
import { PatientHearingTestsTab } from '../PatientHearingTestsTab';
import { PatientNotesTab } from '../PatientNotesTab';
import { PatientSGKTab } from './PatientSGKTab';
import { Clock } from 'lucide-react';

interface PatientTabContentProps {
  patient: Patient;
  activeTab: PatientTab;
  onPatientUpdate?: (p: Patient) => void;
  sales?: any[];
  isLoading?: boolean;
  tabCounts?: any;
}

export const PatientTabContent: React.FC<PatientTabContentProps> = ({
  patient,
  activeTab,
  onPatientUpdate,
  sales,
  isLoading,
  tabCounts
}) => {
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

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
          <PatientDevicesTab patientId={patient?.id || ''} />
        </ErrorBoundary>
      );
    case 'sales':
      return (
        <ErrorBoundary>
          <PatientSalesTab patientId={patient?.id || ''} sales={sales} />
        </ErrorBoundary>
      );
    case 'timeline':
      return (
        <ErrorBoundary>
          <PatientTimelineTab patientId={patient?.id || ''} />
        </ErrorBoundary>
      );
    case 'documents':
      return (
        <ErrorBoundary>
          <PatientDocumentsTab patientId={patient?.id || ''} />
        </ErrorBoundary>
      );
    case 'appointments':
      return (
        <ErrorBoundary>
          <PatientAppointmentsTab patientId={patient?.id || ''} />
        </ErrorBoundary>
      );
    case 'hearing-tests':
      return (
        <ErrorBoundary>
          <PatientHearingTestsTab patientId={patient?.id || ''} />
        </ErrorBoundary>
      );
    case 'sgk':
      return (
        <ErrorBoundary>
          <PatientSGKTab patient={patient} onPatientUpdate={onPatientUpdate} />
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
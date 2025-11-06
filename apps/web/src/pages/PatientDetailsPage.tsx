// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { 
  ArrowLeft, 
  AlertCircle, 
  Calendar, 
  Activity, 
  Shield, 
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { usePatient } from '../hooks/patient/usePatient';
import { usePatientDevices } from '../hooks/patient/usePatientDevices';
import { usePatientSales } from '../hooks/patient/usePatientSales';
import { usePatientTimeline } from '../hooks/patient/usePatientTimeline';
import { usePatientDocuments } from '../hooks/patient/usePatientDocuments';
import { PatientHeader } from '../components/patients/PatientHeader';
import { PatientTabs, type PatientTab } from '../components/patients/PatientTabs';
import { PatientTabContent } from '../components/patients/PatientTabContent';
import { PatientFormModal } from '../components/patients/PatientFormModal';
import { PatientTagUpdateModal } from '../components/patients/PatientTagUpdateModal';
import { ErrorMessage, NetworkError, NotFoundError } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useGlobalError } from '../components/GlobalErrorHandler';
import { PATIENT_DETAILS_TAB_LEGACY } from '../constants/storage-keys';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { Button } from '@x-ear/ui-web';
import { useUpdatePatient } from '../hooks/usePatients';

export const PatientDetailsPage: React.FC = () => {
  const { patientId } = useParams({ strict: false }) as { patientId?: string };
  const navigate = useNavigate();
  const { showError } = useGlobalError();
  const [activeTab, setActiveTab] = useState<PatientTab>(() => {
    const saved = localStorage.getItem(PATIENT_DETAILS_TAB_LEGACY);
    return (saved as PatientTab) || 'general';
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const { patient, isLoading, error, refetch } = usePatient(patientId);
  const updatePatientMutation = useUpdatePatient();
  const { devices } = usePatientDevices(patientId, patient?.devices);
  const { sales } = usePatientSales(patientId);
  const { timeline } = usePatientTimeline(patientId);
  const { documents } = usePatientDocuments(patientId);

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

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₺0';
    return `₺${amount.toLocaleString('tr-TR')}`;
  };

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

  const handleTabChange = (tab: PatientTab) => {
    setActiveTab(tab);
    localStorage.setItem(PATIENT_DETAILS_TAB_LEGACY, tab);
  };

  const handleGoBack = () => {
    navigate({ to: '/patients' });
  };

  const renderContent = () => {
    if (!patientId) {
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

    if (!patient) {
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
        {/* Patient Header */}
        <PatientHeader 
          patient={patient} 
          isLoading={isLoading}
          onEdit={() => setShowEditModal(true)}
          onTagUpdate={() => setShowTagModal(true)}
          onAddNote={() => setShowNoteModal(true)}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 px-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Kayıt Tarihi</p>
                <p className="font-medium">{formatDate(patient.createdAt)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Cihaz Sayısı</p>
                <p className="font-medium">{tabCounts.devices}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">SGK Durumu</p>
                <p className="font-medium">{patient.sgkInfo ? 'Var' : 'Yok'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Durum</p>
                <div className="mt-1">{getStatusBadge(patient.status)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ErrorBoundary>
          <PatientTabs
            patient={patient}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </ErrorBoundary>

        {/* Tab Content */}
        <div className="bg-white">
          <ErrorBoundary>
            <PatientTabContent
              patient={patient}
              activeTab={activeTab}
              isLoading={isLoading}
              tabCounts={tabCounts}
              sales={sales}
              showNoteModal={showNoteModal}
              onCloseNoteModal={() => setShowNoteModal(false)}
            />
          </ErrorBoundary>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Button
          onClick={handleGoBack}
          variant="ghost"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Hasta Listesine Dön
        </Button>
      </div>
      {renderContent()}

      {/* Edit Modal */}
      {showEditModal && patient && (
        <PatientFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={async (data) => {
            try {
              await updatePatientMutation.mutateAsync({
                patientId: patient.id!,
                updates: data
              });
              await refetch?.();
              return patient;
            } catch (error) {
              console.error('Failed to update patient:', error);
              throw error;
            }
          }}
          initialData={patient}
          title="Hasta Düzenle"
        />
      )}

      {/* Tag Update Modal */}
      {showTagModal && patient && (
        <PatientTagUpdateModal
          patient={patient}
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          onUpdate={async (updates) => {
            try {
              await updatePatientMutation.mutateAsync({
                patientId: patient.id!,
                updates
              });
              await refetch?.();
            } catch (error) {
              console.error('Failed to update patient tags:', error);
              throw error;
            }
          }}
        />
      )}
    </div>
  );
};
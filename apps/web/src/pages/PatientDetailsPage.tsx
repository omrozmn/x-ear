import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { PatientHeader } from '../components/PatientHeader';
import { PatientTabs } from '../components/PatientTabs';
import { PatientTabContent } from '../components/PatientTabContent';
import { ErrorMessage, NetworkError, NotFoundError } from '../components/ErrorMessage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useGlobalError } from '../components/GlobalErrorHandler';
import { PATIENT_DETAILS_TAB_LEGACY } from '../constants/storage-keys';

export const PatientDetailsPage: React.FC = () => {
  const { patientId } = useParams({ strict: false }) as { patientId?: string };
  const navigate = useNavigate();
  const { showError } = useGlobalError();
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem(PATIENT_DETAILS_TAB_LEGACY) || 'overview'
  })

  const { data: patient, isLoading, error } = usePatient(patientId || '');

  // Show error notification when error occurs
  useEffect(() => {
    if (error) {
      showError('Hasta bilgileri yüklenirken bir hata oluştu');
    }
  }, [error, showError]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    localStorage.setItem(PATIENT_DETAILS_TAB_LEGACY, tab)
  }

  const handleGoBack = () => {
    navigate({ to: '/patients' });
  };

  // Invalid patient ID
  if (!patientId) {
    return (
      <NotFoundError resource="hasta ID" />
    );
  }

  // Loading state
  if (isLoading) {
    return <LoadingSpinner size="xl" text="Hasta bilgileri yükleniyor..." fullScreen />;
  }

  // Error state
  if (error) {
    const isNetworkError = error?.message?.includes('network') || error?.message?.includes('fetch');
    
    if (isNetworkError) {
      return (
        <NetworkError onRetry={() => window.location.reload()} />
      );
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={handleGoBack}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Hasta Listesine Dön
        </button>
      </div>

      {/* Patient Header */}
      <PatientHeader patient={patient} isLoading={isLoading} />

      {/* Tabs */}
      <PatientTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Tab Content */}
      <div className="bg-white">
        <PatientTabContent
          patient={patient}
          activeTab={activeTab}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
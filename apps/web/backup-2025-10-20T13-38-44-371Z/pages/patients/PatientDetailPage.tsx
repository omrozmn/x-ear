import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { usePatient } from '../../hooks/patient/usePatient';
import { usePatientMutations } from '../../hooks/patient/usePatientMutations';
import { Patient } from '../../types/patient';
import { PatientFormModal } from '../../components/patients/PatientFormModal';

interface PatientDetailPageProps {
  className?: string;
}

/**
 * PatientDetailPage Component
 * Displays detailed patient information with tabs for different sections
 * Follows 500 LOC limit and single responsibility principle
 */
export function PatientDetailPage({ className = '' }: PatientDetailPageProps) {
  const { patientId } = useParams({ strict: false });
  const navigate = useNavigate();
  
  // Hooks
  const {
    patient,
    loading,
    error,
    isOnline,
    refresh
  } = usePatient(patientId as string);

  const {
    updatePatient,
    deletePatient,
    loading: mutationLoading,
    error: mutationError,
    clearError: clearMutationError
  } = usePatientMutations();

  // Local state
  const [activeTab, setActiveTab] = useState('general');
  const [showEditModal, setShowEditModal] = useState(false);

  // Computed values
  const isLoading = loading || mutationLoading;
  const currentError = error || mutationError;

  // Handlers
  const handleUpdatePatient = useCallback(async (updates: any) => {
    if (!patient) return null;
    
    const result = await updatePatient(patient.id, updates, {
      onSuccess: () => {
        setShowEditModal(false);
        refresh();
      },
      onError: (error) => {
        console.error('Failed to update patient:', error);
      }
    });
    return result;
  }, [patient, updatePatient, refresh]);

  const handleDeletePatient = useCallback(async () => {
    if (!patient) return;
    
    if (!confirm(`${patient.name} adlı hastayı silmek istediğinizden emin misiniz?`)) {
      return;
    }

      onSuccess: () => {
        navigate({ to: '/patients' });
      },
      onError: (error) => {
        console.error('Failed to delete patient:', error);
      }
    });
  }, [patient, deletePatient, navigate]);

  const handleRefresh = useCallback(() => {
    clearMutationError();
    refresh();
  }, [clearMutationError, refresh]);

  // Tab configuration
  const tabs = useMemo(() => [
    { id: 'general', label: 'Genel Bilgiler', icon: '👤' },
    { id: 'devices', label: 'Cihazlar', icon: '🎧', count: patient?.devices?.length },
    { id: 'appointments', label: 'Randevular', icon: '📅', count: patient?.appointments?.length },
    { id: 'sales', label: 'Satışlar', icon: '💰', count: patient?.sales?.length },
    { id: 'sgk', label: 'SGK', icon: '🏥' },
    { id: 'notes', label: 'Notlar', icon: '📝', count: patient?.notes?.length },
    { id: 'timeline', label: 'Zaman Çizelgesi', icon: '📊' }
  ], [patient]);

  // Format helpers
  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatDate = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render helpers
  const renderHeader = () => {
    if (!patient) return null;

    return (
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: '/patients' })}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Hasta listesine dön"
            >
              ←
            </button>
            
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.status)}`}>
                  {patient.status}
                </span>
                {!isOnline && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Çevrimdışı
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span>📞 {formatPhone(patient.phone)}</span>
                {patient.email && <span>✉️ {patient.email}</span>}
                <span>📅 {formatDate(patient.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoading ? 'Yenileniyor...' : 'Yenile'}
            </button>
            
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Düzenle
            </button>
            
            <button
              onClick={handleDeletePatient}
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTabs = () => (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  const renderGeneralTab = () => {
    if (!patient) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Kişisel Bilgiler</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Ad Soyad:</span>
              <span className="text-sm text-gray-900">{patient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">TC Kimlik No:</span>
              <span className="text-sm text-gray-900">{patient.tcNumber || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Doğum Tarihi:</span>
              <span className="text-sm text-gray-900">{patient.birthDate ? formatDate(patient.birthDate) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Telefon:</span>
              <span className="text-sm text-gray-900">{formatPhone(patient.phone)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">E-posta:</span>
              <span className="text-sm text-gray-900">{patient.email || '-'}</span>
            </div>
            {patient.address && (
              <div>
                <span className="text-sm font-medium text-gray-500">Adres:</span>
                <p className="text-sm text-gray-900 mt-1">{patient.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Classification */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sınıflandırma</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Durum:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.status)}`}>
                {patient.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Segment:</span>
              <span className="text-sm text-gray-900">{patient.segment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Etiket:</span>
              <span className="text-sm text-gray-900">{patient.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-500">Kazanım Türü:</span>
              <span className="text-sm text-gray-900">{patient.acquisitionType}</span>
            </div>
            {patient.priorityScore && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Öncelik Skoru:</span>
                <span className="text-sm text-gray-900">{patient.priorityScore}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {patient.tags && patient.tags.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Etiketler</h3>
            <div className="flex flex-wrap gap-2">
              {patient.tags.map((tag, index) => (
                <span key={index} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'devices':
        return <div className="p-6 text-center text-gray-500">Cihaz bilgileri yakında eklenecek</div>;
      case 'appointments':
        return <div className="p-6 text-center text-gray-500">Randevu bilgileri yakında eklenecek</div>;
      case 'sales':
        return <div className="p-6 text-center text-gray-500">Satış bilgileri yakında eklenecek</div>;
      case 'sgk':
        return <div className="p-6 text-center text-gray-500">SGK bilgileri yakında eklenecek</div>;
      case 'notes':
        return <div className="p-6 text-center text-gray-500">Not bilgileri yakında eklenecek</div>;
      case 'timeline':
        return <div className="p-6 text-center text-gray-500">Zaman çizelgesi yakında eklenecek</div>;
      default:
        return renderGeneralTab();
    }
  };

  const renderError = () => {
    if (!currentError) return null;

    return (
      <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-sm text-red-700">{currentError}</span>
          </div>
          <button
            onClick={clearMutationError}
            className="text-red-600 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && !patient) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Hasta bilgileri yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !patient) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Hasta bulunamadı</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => navigate({ to: '/patients' })}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Hasta Listesine Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {renderHeader()}
      {renderError()}
      {renderTabs()}
      
      <div className="p-6">
        {renderTabContent()}
      </div>

      {/* Edit Modal */}
      {showEditModal && patient && (
        <PatientFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdatePatient}
          initialData={patient}
          title="Hasta Düzenle"
        />
      )}
    </div>
  );
}
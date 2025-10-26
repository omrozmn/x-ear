import React, { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePatients } from '../../hooks/patient/usePatients';
import { usePatientMutations } from '../../hooks/patient/usePatientMutations';
import { Patient } from '../../types/patient';
import { PatientSegment, PatientLabel } from '../../types/patient/patient-base.types';
import { PatientStatus } from '../../generated/orval-types';
import { PatientSearchItem } from '../../types/patient/patient-search.types';
import { PatientCard } from '../../components/patients/PatientCard';
import { PatientSearch } from '../../components/patients/PatientSearch';
import { PatientFilters } from '../../components/patients/PatientFilters';
import { PatientFormModal } from '../../components/patients/PatientFormModal';
import { Button } from '@x-ear/ui-web';

interface PatientListPageProps {
  className?: string;
}

/**
 * PatientListPage Component
 * Main page for displaying and managing patient list with offline-first approach
 * Follows 500 LOC limit and single responsibility principle
 */
export function PatientListPage({ className = '' }: PatientListPageProps) {
  // Hooks
  const navigate = useNavigate();
  const patientsQuery = usePatients();
  const {
    data: patientsData,
    isLoading: loading,
    error,
    refetch: refresh
  } = patientsQuery;

  const {
    createPatient,
    updatePatient,
    deletePatient,
    loading: mutationLoading,
    error: mutationError,
    isOnline,
    clearError: clearMutationError
  } = usePatientMutations();

  // Extract data from query result
  const patients = patientsData?.patients || [];
  const totalCount = patientsData?.total || 0;
  const hasMore = patientsData?.hasMore || false;

  // Local state for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Computed pagination
  const pagination = {
    page: currentPage,
    pageSize: 20,
    total: totalCount,
    hasMore
  };

  // Handlers
  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore]);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
  }, []);

  // Helper function to convert Patient to PatientSearchItem
  const convertToSearchItem = useCallback((patient: Patient): PatientSearchItem => ({
    id: patient.id || '',
    firstName: patient.firstName || '',
    lastName: patient.lastName || '',
    tcNumber: patient.tcNumber,
    phone: patient.phone,
    email: patient.email,
    status: (patient.status as PatientStatus) || PatientStatus.ACTIVE,
    segment: patient.segment as PatientSegment || 'NEW',
    labels: patient.label ? [patient.label as PatientLabel] : [],
    registrationDate: patient.createdAt || '',
    lastVisitDate: patient.updatedAt || '',
    deviceCount: patient.devices?.length || 0,
    hasInsurance: !!patient.sgkInfo,
    outstandingBalance: 0, // This would need to be calculated
    priority: patient.priorityScore || 0
  }), []);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Computed values
  const hasSelectedPatients = selectedPatients.size > 0;
  const isLoading = loading || mutationLoading;
  const currentError = error || mutationError;

  // Handlers
  const handleSelectPatient = useCallback((patientId: string, selected: boolean) => {
    setSelectedPatients(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(patientId);
      } else {
        newSet.delete(patientId);
      }
      return newSet;
    });
  }, []);

  const handleCreatePatient = useCallback(async (patientData: any) => {
    const result = await createPatient(patientData, {
      onSuccess: () => {
        setShowCreateModal(false);
        refresh();
      },
      onError: (error) => {
        console.error('Failed to create patient:', error);
      }
    });
    return result;
  }, [createPatient, refresh]);

  const handleUpdatePatient = useCallback(async (patientId: string, updates: any) => {
    const result = await updatePatient(patientId, updates, {
      onSuccess: () => {
        setEditingPatient(null);
        refresh();
      },
      onError: (error) => {
        console.error('Failed to update patient:', error);
      }
    });
    return result;
  }, [updatePatient, refresh]);

  const handleDeletePatient = useCallback(async (patientId: string) => {
    if (!confirm('Bu hastayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    await deletePatient(patientId, {
      onSuccess: () => {
        setSelectedPatients(prev => {
          const newSet = new Set(prev);
          newSet.delete(patientId);
          return newSet;
        });
        refresh();
      },
      onError: (error) => {
        console.error('Failed to delete patient:', error);
      }
    });
  }, [deletePatient, refresh]);

  const handlePatientClick = useCallback((patient: PatientSearchItem) => {
    navigate({ 
      to: '/patients/$patientId', 
      params: { patientId: patient.id } 
    });
  }, [navigate]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`${selectedPatients.size} hastayı silmek istediğinizden emin misiniz?`)) {
      return;
    }

    const promises = Array.from(selectedPatients).map(patientId =>
      deletePatient(patientId)
    );

    await Promise.allSettled(promises);
    setSelectedPatients(new Set());
    refresh();
  }, [selectedPatients, deletePatient, refresh]);

  const clearError = useCallback(() => {
    // Clear query error by refetching
    refresh();
    clearMutationError();
  }, [refresh, clearMutationError]);

  const handleRefresh = useCallback(() => {
    clearError();
    clearMutationError();
    refresh();
  }, [clearError, clearMutationError, refresh]);

  // Render helpers
  const renderHeader = () => (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Hastalar ({patients.length})
          </h1>
          {!isOnline && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              Çevrimdışı
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            variant="ghost"
            size="sm"
            title={`${viewMode === 'grid' ? 'Liste' : 'Kart'} görünümüne geç`}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </Button>
          
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Yenileniyor...' : 'Yenile'}
          </Button>
          
          <Button
            onClick={() => setShowCreateModal(true)}
          >
            Yeni Hasta
          </Button>
        </div>
      </div>

      {hasSelectedPatients && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedPatients.size} hasta seçildi
          </span>
          <Button
            onClick={handleBulkDelete}
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Seçilenleri Sil
          </Button>
          <Button
            onClick={() => setSelectedPatients(new Set())}
            variant="ghost"
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
          >
            Seçimi Temizle
          </Button>
        </div>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="flex flex-col gap-4 mb-6">
      <PatientSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Hasta ara (isim, telefon, TC)..."
        className="flex-1"
      />
      
            <PatientFilters
        filters={filters}
        onChange={setFilters}
        onClearFilters={clearFilters}
        patientCount={totalCount}
      />
    </div>
  );

  const renderPatientList = () => {
    if (patients.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || Object.keys(filters).length > 0 
              ? 'Arama kriterlerine uygun hasta bulunamadı'
              : 'Henüz hasta eklenmemiş'
            }
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Farklı arama terimleri veya filtreler deneyin'
              : 'İlk hastanızı ekleyerek başlayın'
            }
          </p>
          {!searchTerm && Object.keys(filters).length === 0 && (
            <Button
              onClick={() => setShowCreateModal(true)}
            >
              Yeni Hasta Ekle
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className={`
        ${viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
          : 'space-y-2'
        }
      `}>
        {patients.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={convertToSearchItem(patient)}
            selected={selectedPatients.has(patient.id)}
            onSelect={(patientId) => handleSelectPatient(patientId, !selectedPatients.has(patientId))}
            onClick={handlePatientClick}
            onEdit={() => setEditingPatient(patient)}
            onDelete={() => handleDeletePatient(patient.id)}
            className="hover:shadow-md transition-shadow"
          />
        ))}
      </div>
    );
  };

  const renderLoadMore = () => {
    if (!pagination.hasMore) return null;

    return (
      <div className="text-center mt-8">
        <Button
          onClick={loadMore}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Yükleniyor...' : 'Daha Fazla Göster'}
        </Button>
      </div>
    );
  };

  const renderError = () => {
    if (!currentError) return null;

    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-sm text-red-700">{currentError instanceof Error ? currentError.message : currentError}</span>
          </div>
          <Button
            onClick={() => {
              clearError();
              clearMutationError();
            }}
            variant="ghost"
            size="sm"
          >
            ✕
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 p-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {renderHeader()}
        {renderError()}
        {renderFilters()}
        {renderPatientList()}
        {renderLoadMore()}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <PatientFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePatient}
          title="Yeni Hasta Ekle"
        />
      )}

      {editingPatient && (
        <PatientFormModal
          isOpen={!!editingPatient}
          onClose={() => setEditingPatient(null)}
          onSubmit={(data) => handleUpdatePatient(editingPatient.id || '', data)}
          initialData={editingPatient}
          title="Hasta Düzenle"
        />
      )}
    </div>
  );
}
import React, { useState, useCallback, useMemo } from 'react';
import { usePatients } from '../../hooks/patient/usePatients';
import { usePatientMutations } from '../../hooks/patient/usePatientMutations';
import { Patient } from '../../types/patient';
import { PatientCard } from '../../components/patients/PatientCard';
import { PatientSearch } from '../../components/patients/PatientSearch';
import { PatientFilters } from '../../components/patients/PatientFilters';
import { PatientFormModal } from '../../components/patients/PatientFormModal';

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
  const {
    patients,
    loading,
    error,
    searchTerm,
    filters,
    pagination,
    isOnline,
    setSearchTerm,
    setFilters,
    loadMore,
    refresh,
    clearError
  } = usePatients();

  const {
    createPatient,
    updatePatient,
    deletePatient,
    loading: mutationLoading,
    error: mutationError,
    clearError: clearMutationError
  } = usePatientMutations();

  // Local state
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

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedPatients(new Set(patients.map(p => p.id)));
    } else {
      setSelectedPatients(new Set());
    }
  }, [patients]);

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
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            title={`${viewMode === 'grid' ? 'Liste' : 'Kart'} görünümüne geç`}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? 'Yenileniyor...' : 'Yenile'}
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Yeni Hasta
          </button>
        </div>
      </div>

      {hasSelectedPatients && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedPatients.size} hasta seçildi
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
          >
            Seçilenleri Sil
          </button>
          <button
            onClick={() => setSelectedPatients(new Set())}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            Seçimi Temizle
          </button>
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
        patientCount={patients.length}
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Yeni Hasta Ekle
            </button>
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
            patient={patient}
            viewMode={viewMode}
            selected={selectedPatients.has(patient.id)}
            onSelect={(selected) => handleSelectPatient(patient.id, selected)}
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
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {isLoading ? 'Yükleniyor...' : 'Daha Fazla Göster'}
        </button>
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
            <span className="text-sm text-red-700">{currentError}</span>
          </div>
          <button
            onClick={() => {
              clearError();
              clearMutationError();
            }}
            className="text-red-600 hover:text-red-700"
          >
            ✕
          </button>
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
          onSubmit={(data) => handleUpdatePatient(editingPatient.id, data)}
          initialData={editingPatient}
          title="Hasta Düzenle"
        />
      )}
    </div>
  );
}
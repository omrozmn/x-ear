/**
 * PatientsPage Component
 * @fileoverview Main patients management page with search, filters, and patient list
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger, Modal, Pagination } from '@x-ear/ui-web';
import { useNavigate, Outlet, useParams } from '@tanstack/react-router';
import { usePatients, useCreatePatient, useDeletePatient } from '../hooks/usePatients';
import { Patient } from '../types/patient';
import { Users, CheckCircle, Flame, Headphones, Filter, Search, Plus, RefreshCw, Upload, Edit, Trash2, X, Settings } from 'lucide-react';
import { PatientFormModal } from '../components/patients/PatientFormModal';
import { useUpdatePatient } from '../hooks/usePatients';
import { PatientFilters } from '../components/patients/PatientFilters';
import { PatientList } from '../components/patients/PatientList';
import { PatientCSVUpload } from '../components/patients/csv/PatientCSVUpload';
import UniversalImporter from '../components/importer/UniversalImporter';
import { useToastHelpers, Card } from '@x-ear/ui-web';
import patientsSchema from '../components/importer/schemas/patients';
import { PatientFilters as PatientFiltersType } from '../types/patient/patient-search.types';
import { PatientStatus, PatientSegment, PatientLabel } from '../types/patient/patient-base.types';
import { PatientTagUpdateModal } from '../components/patients/PatientTagUpdateModal';

export function PatientsPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ strict: false }) as { patientId?: string };

  // State
  const [searchValue, setSearchValue] = useState('');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [filters, setFilters] = useState<PatientFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tagUpdatePatient, setTagUpdatePatient] = useState<Patient | null>(null);

  // Hooks
  const { data, isLoading, error } = usePatients();
  const patients = data?.patients || [];
  const updatePatientMutation = useUpdatePatient();
  const createPatientMutation = useCreatePatient();
  const deletePatientMutation = useDeletePatient();

  // Mock stats for now
  const stats = {
    total: (patients?.length || 0),
    active: patients.filter(p => p.status === 'ACTIVE').length,
    inactive: patients.filter(p => p.status === 'INACTIVE').length,
    withDevices: 0
  };

  // Handlers
  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleRefresh = () => {
    // refetch is not available in this hook, we'll use a different approach
    window.location.reload();
  };

  const handleNewPatient = () => {
    setShowNewPatientModal(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setIsEditModalOpen(true);
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatients(prev => {
      if (prev.includes(patientId)) {
        return prev.filter(id => id !== patientId);
      } else {
        return [...prev, patientId];
      }
    });
  };

  const handlePatientClick = (patient: Patient) => {
    console.log('=== PATIENT CLICK ===');
    console.log('Patient:', patient);
    console.log('Patient ID:', patient.id);
    if (patient.id) {
      console.log('Navigating to:', `/patients/${patient.id}`);
      navigate({
        to: '/patients/$patientId',
        params: { patientId: String(patient.id) }
      });
    } else {
      console.error('Patient ID is missing!');
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchValue('');
  };

  const handleCSVUpload = async (file: File) => {
    // TODO: Implement CSV upload logic
    console.log('CSV upload:', file);
    setShowCSVModal(false);
  };

  const handleDeletePatient = (patient: Patient) => {
    setPatientToDelete(patient);
  };

  const confirmDelete = async () => {
    if (!patientToDelete?.id) return;
    try {
      await deletePatientMutation.mutateAsync(patientToDelete.id);
      setPatientToDelete(null);
    } catch (error) {
      console.error('Failed to delete patient:', error);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleTagUpdate = async (patientId: string, updates: any) => {
    try {
      await updatePatientMutation.mutateAsync({ patientId, updates });
      setTagUpdatePatient(null);
    } catch (error) {
      console.error('Failed to update patient tags:', error);
      throw error;
    }
  };

  // Filtered patients based on search and filters
  const filteredPatients = patients.filter(patient => {
    // Search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = (
        (patient.firstName || '').toLowerCase().includes(searchLower) ||
        (patient.lastName || '').toLowerCase().includes(searchLower) ||
        (patient.phone || '').toLowerCase().includes(searchLower) ||
        (patient.tcNumber || '').toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(patient.status as PatientStatus)) return false;
    }

    // Segment filter
    if (filters.segment && filters.segment.length > 0) {
      if (!filters.segment.includes(patient.segment as PatientSegment)) return false;
    }

    // Acquisition Type filter
    if (filters.acquisitionType && filters.acquisitionType.length > 0) {
      if (!patient.acquisitionType || !filters.acquisitionType.includes(patient.acquisitionType)) return false;
    }

    // Labels filter
    if (filters.labels && filters.labels.length > 0) {
      const labels = (patient as any).labels || [];
      if (!labels.some((l: PatientLabel) => filters.labels!.includes(l))) return false;
    }

    // Branch filter
    if (filters.branchId && (patient as any).branchId !== filters.branchId) return false;

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const patientTags = patient.tags || [];
      if (!filters.tags.every(t => patientTags.includes(t))) return false;
    }

    return true;
  });

  // Sorted patients
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        bValue = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        break;
      case 'createdAt':
        aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginated patients
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hastalar</h1>
            <p className="text-sm text-gray-600 mt-1">Hasta kayıtlarını yönetin</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Navigate to settings page with patients tab active
                console.log('TODO: Open settings with patients tab');
                alert('TODO: Ayarlar sayfasında hastalar sekmesi açılacak');
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Hasta Ayarları
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCSVModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Toplu Yükle
            </Button>
            <Button onClick={handleNewPatient}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Hasta
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktif</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pasif</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <Flame className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cihazlı</p>
                <p className="text-2xl font-bold text-purple-600">{stats.withDevices}</p>
              </div>
              <Headphones className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Ad, soyad, telefon veya TC ile ara..."
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtreler
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <PatientFilters
              filters={filters}
              onChange={setFilters}
              onClearFilters={handleClearFilters}
              patientCount={sortedPatients.length}
              loading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Yükleniyor...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-red-600">Bir hata oluştu</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Tekrar Dene
              </Button>
            </div>
          </div>
        ) : sortedPatients.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Hasta bulunamadı</p>
              <Button variant="outline" size="sm" onClick={handleNewPatient} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Hasta Ekle
              </Button>
            </div>
          </div>
        ) : (
          <>
            <PatientList
              patients={paginatedPatients}
              onEdit={handleEditPatient}
              onPatientClick={handlePatientClick}
              onDelete={handleDeletePatient}
              onPatientSelect={handlePatientSelect}
              selectedPatients={selectedPatients}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onTagClick={setTagUpdatePatient}
              showSelection={selectedPatients.length > 0}
              showActions={true}
            />
            <div className="border-t border-gray-200 p-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(sortedPatients.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(newSize) => {
                  setItemsPerPage(newSize);
                  setCurrentPage(1);
                }}
                totalItems={sortedPatients.length}
              />
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <PatientFormModal
        isOpen={showNewPatientModal}
        onClose={() => setShowNewPatientModal(false)}
        onSubmit={async (data) => {
          try {
            const result = await createPatientMutation.mutateAsync(data as any);
            setShowNewPatientModal(false);
            return result;
          } catch (e) {
            console.error('Failed to create patient', e);
            throw e;
          }
        }}
        title="Yeni Hasta"
        isLoading={createPatientMutation.isPending}
      />

      {/* Edit Modal */}
      <PatientFormModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingPatient(null); }}
        onSubmit={async (updates) => {
          try {
            if (!editingPatient?.id) return null;
            await updatePatientMutation.mutateAsync({
              patientId: editingPatient.id,
              updates: updates as Partial<Patient>,
            });
            setIsEditModalOpen(false);
            setEditingPatient(null);
            return editingPatient;
          } catch (e) {
            console.error('Failed to update patient', e);
            throw e;
          }
        }}
        initialData={editingPatient || undefined}
        title="Hasta Düzenle"
        isLoading={updatePatientMutation.isPending}
      />

      {/* Tag Update Modal */}
      <PatientTagUpdateModal
        isOpen={!!tagUpdatePatient}
        onClose={() => setTagUpdatePatient(null)}
        patient={tagUpdatePatient}
        onUpdate={handleTagUpdate}
      />

      {/* CSV Upload Modal (now shared UniversalImporter with mapping + preview) */}
      <UniversalImporter
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        entityFields={[
          { key: 'firstName', label: 'Ad' },
          { key: 'lastName', label: 'Soyad' },
          { key: 'tcNumber', label: 'TC Kimlik No' },
          { key: 'phone', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
          { key: 'birthDate', label: 'Doğum Tarihi' },
          { key: 'gender', label: 'Cinsiyet' }
        ]}
        zodSchema={patientsSchema}
        uploadEndpoint={'/api/patients/bulk_upload'}
        modalTitle={'Toplu Hasta Yükleme'}
        sampleDownloadUrl={'/import_samples/patients_sample.csv'}
        onComplete={(res) => {
          const { success: showSuccess, error: showError } = useToastHelpers();
          if (res.errors && res.errors.length > 0) {
            showError(`Hasta import tamamlandı — Hatalı satır: ${res.errors.length}`);
          } else {
            showSuccess(`Hasta import tamamlandı — Oluşturulan: ${res.created}`);
          }
          // refresh page data simply
          handleRefresh();
          setShowCSVModal(false);
        }}
      />
      {/* Import result card */}
      {/* Note: show a small summary card after import */}
      {false && (
        <div className="mt-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Oluşturulan: <strong>0</strong></div>
                <div className="text-sm">Güncellenen: <strong>0</strong></div>
                <div className="text-sm">Hatalı satır: <strong>0</strong></div>
              </div>
              <div>
                <Button variant="outline">Kapat</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        title="Hastayı Sil"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">
                Bu hastayı silmek istediğinizden emin misiniz?
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {patientToDelete?.firstName} {patientToDelete?.lastName}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Bu işlem geri alınamaz. Hasta kaydı ve tüm ilişkili veriler silinecektir.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPatientToDelete(null)}>İptal</Button>
            <Button variant="danger" onClick={confirmDelete}>Sil</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
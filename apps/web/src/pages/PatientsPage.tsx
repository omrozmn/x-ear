/**
 * PatientsPage Component
 * @fileoverview Main patients management page with search, filters, and patient list
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@x-ear/ui-web';
import { useNavigate, Outlet, useParams } from '@tanstack/react-router';
import { usePatients } from '../hooks/usePatients';
import { Patient } from '../types/patient';
import { Users, CheckCircle, Flame, Headphones, Filter, Search, Plus, RefreshCw, Upload } from 'lucide-react';
import { PatientFormModal } from '../components/patients/PatientFormModal';
import { PatientSearchFilters } from '../components/patients/PatientSearch';
import { PatientFilters } from '../components/patients/PatientFilters';
import { Pagination } from '@x-ear/ui-web';


export function PatientsPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ strict: false }) as { patientId?: string };

  // State
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [filters, setFilters] = useState<PatientSearchFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');

  // Hooks
  const {
    patients,
    isLoading,
    error
  } = usePatients();

  // Mock stats for now
  const stats = {
    total: patients?.length || 0,
    active: patients?.filter(p => p.status === 'ACTIVE').length || 0,
    inactive: patients?.filter(p => p.status === 'INACTIVE').length || 0,
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

  const handlePatientSelect = (patientId: string, selected: boolean) => {
    if (selected) {
      setSelectedPatients(prev => [...prev, patientId]);
    } else {
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  };

  const handleViewPatient = (patient: Patient) => {
    navigate({ to: `/patients/${patient.id}` });
  };

  const handleFiltersChange = (newFilters: PatientSearchFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchValue('');
    setStatusFilter('');
    setSegmentFilter('');
  };

  // Filtered patients based on search and filters
  const filteredPatients = patients.filter(patient => {
    // Search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = (
        patient.firstName?.toLowerCase().includes(searchLower) ||
        patient.lastName?.toLowerCase().includes(searchLower) ||
        patient.tcNumber?.includes(searchValue) ||
        patient.phone?.includes(searchValue)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter && patient.status !== statusFilter) {
      return false;
    }

    // Segment filter
    if (segmentFilter && patient.segment !== segmentFilter) {
      return false;
    }

    return true;
  });

  // Pagination calculations
  const totalItems = filteredPatients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (patientId) {
    return <Outlet />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hastalar</h1>
          <p className="text-gray-600">Hasta kayıtlarını yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button onClick={handleNewPatient}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Hasta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Toplam Hasta</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Flame className="w-8 h-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pasif</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Headphones className="w-8 h-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Cihazlı</p>
              <p className="text-2xl font-bold text-gray-900">{stats.withDevices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="list">Hasta Listesi</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Hasta ara (ad, soyad, TC, telefon)..."
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtreler
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tümü</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Pasif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segment</label>
                  <select
                    value={segmentFilter}
                    onChange={(e) => setSegmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tümü</option>
                    <option value="NEW">Yeni</option>
                    <option value="TRIAL">Deneme</option>
                    <option value="PURCHASED">Satın Alınmış</option>
                    <option value="CONTROL">Kontrol</option>
                    <option value="RENEWAL">Yenileme</option>
                    <option value="EXISTING">Mevcut</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter('');
                      setSegmentFilter('');
                    }}
                    className="w-full"
                  >
                    Filtreleri Temizle
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Patient List */}
          <div className="bg-white rounded-lg border">
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <p className="text-red-600">Hata: {typeof error === 'string' ? error : 'Bir hata oluştu'}</p>
              </div>
            )}
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Hastalar yükleniyor...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPatients(filteredPatients.map(p => p.id!));
                            } else {
                              setSelectedPatients([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Ad Soyad</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">TC Kimlik</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Telefon</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Durum</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Kayıt Tarihi</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedPatients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          {searchValue ? 'Arama kriterlerine uygun hasta bulunamadı.' : 'Henüz hasta kaydı bulunmuyor.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedPatients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={selectedPatients.includes(patient.id!)}
                              onChange={(e) => handlePatientSelect(patient.id!, e.target.checked)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => handleViewPatient(patient)}>
                              {patient.firstName} {patient.lastName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {patient.tcNumber}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {patient.phone}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              patient.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {patient.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPatient(patient)}
                            >
                              Görüntüle
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalItems > 0 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-700">
                  {startIndex + 1}-{Math.min(endIndex, totalItems)} / {totalItems} hasta gösteriliyor
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  showItemsPerPage={true}
                  showTotalItems={false}
                  itemsPerPageOptions={[10, 20, 50, 100]}
                  size="md"
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Toplu İşlemler</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV Dosyası Yükle
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    CSV dosyasını sürükleyip bırakın veya seçin
                  </p>
                  <Button variant="outline" className="mt-2">
                    Dosya Seç
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Patient Modal */}
      <PatientFormModal
        isOpen={showNewPatientModal}
        onClose={() => setShowNewPatientModal(false)}
        onSubmit={async (patientData) => {
          try {
            // Here you would typically call an API to create the patient
            console.log('Creating new patient:', patientData);
            // For now, just close the modal
            setShowNewPatientModal(false);
            // Optionally refresh the patient list
            handleRefresh();
            return null;
          } catch (error) {
            console.error('Error creating patient:', error);
            return null;
          }
        }}
        title="Yeni Hasta Ekle"
      />
    </div>
  );
}
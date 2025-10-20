/**
 * PatientsPage Component
 * @fileoverview Main patients management page with search, filters, and patient list
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Button, Input, Select, DataTable, Modal } from '@x-ear/ui-web';
import { useNavigate, Outlet, useParams } from '@tanstack/react-router';
import { usePatients } from '../hooks/usePatients';
import { SimpleCacheFilters } from '../services/patient/patient-cache.service';
import { Patient } from '../types/patient';
import { PatientSearchItem } from '../types/patient/patient-search.types';
import { Users, CheckCircle, Flame, Headphones, Filter, Search, Plus, RefreshCw } from 'lucide-react';

export function PatientsPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ strict: false }) as { patientId?: string };

  // State
  const [filters, setFilters] = useState<SimpleCacheFilters>({
    search: '',
    status: [],
    segment: [],
    label: [],
    hasDevices: undefined,
    page: 1,
    limit: 20
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // Hooks
  const {
    patients,
    searchResults,
    isLoading,
    isSyncing,
    error,
    searchPatients,
    refreshPatients,
    syncPatients
  } = usePatients({
    enableRealTimeSync: true,
    cacheEnabled: true,
    autoRefresh: true,
    refreshInterval: 60000
  });

  // Effects
  useEffect(() => {
    searchPatients(filters);
  }, []);

  // Computed values
  const totalPatients = searchResults?.totalCount || 0;
  const filteredPatients = searchResults?.patients || [];

  // Filter options
  const statusOptions = [
    { value: '', label: 'Tüm Durumlar' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Pasif' },
    { value: 'archived', label: 'Arşivlenmiş' }
  ];

  const segmentOptions = [
    { value: '', label: 'Tüm Segmentler' },
    { value: 'new', label: 'Yeni' },
    { value: 'trial', label: 'Deneme' },
    { value: 'purchased', label: 'Satın Almış' },
    { value: 'control', label: 'Kontrol' },
    { value: 'renewal', label: 'Yenileme' }
  ];

  const labelOptions = [
    { value: '', label: 'Tüm Etiketler' },
    { value: 'yeni', label: 'Yeni' },
    { value: 'arama-bekliyor', label: 'Arama Bekliyor' },
    { value: 'randevu-verildi', label: 'Randevu Verildi' },
    { value: 'deneme-yapildi', label: 'Deneme Yapıldı' },
    { value: 'kontrol-hastasi', label: 'Kontrol Hastası' },
    { value: 'satis-tamamlandi', label: 'Satış Tamamlandı' }
  ];

  // Handlers
  const handleSearch = (searchTerm: string) => {
    const updatedFilters = { ...filters, search: searchTerm, page: 1 };
    setFilters(updatedFilters);
    searchPatients(updatedFilters);
  };

  const handleFilterChange = (key: keyof SimpleCacheFilters, value: any) => {
    const updatedFilters = { ...filters, [key]: value, page: 1 };
    setFilters(updatedFilters);
    searchPatients(updatedFilters);
  };

  const handlePatientClick = (patient: Patient) => {
    if (patient?.id) {
      navigate({ to: `/patients/${patient.id}` });
    }
  };

  const handleRefresh = async () => {
    await refreshPatients();
  };

  const handleSync = async () => {
    await syncPatients();
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'Ad Soyad',
      render: (patient: PatientSearchItem) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900">{patient?.firstName || ''} {patient?.lastName || ''}</div>
            <div className="text-sm text-gray-500">{patient?.phone || ''}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      render: (patient: PatientSearchItem) => {
        const statusConfig = {
          active: { color: 'green', icon: CheckCircle, label: 'Aktif' },
          inactive: { color: 'gray', icon: Users, label: 'Pasif' },
          archived: { color: 'red', icon: Users, label: 'Arşiv' }
        };
        const config = statusConfig[patient?.status] || statusConfig.active;
        const Icon = config.icon;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'segment',
      title: 'Segment',
      render: (patient: PatientSearchItem) => {
        const segmentConfig = {
          new: { color: 'blue', label: 'Yeni' },
          trial: { color: 'yellow', label: 'Deneme' },
          purchased: { color: 'green', label: 'Satın Almış' },
          control: { color: 'purple', label: 'Kontrol' },
          renewal: { color: 'orange', label: 'Yenileme' }
        };
        const config = segmentConfig[patient?.segment] || segmentConfig.new;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'labels',
      title: 'Etiket',
      render: (patient: PatientSearchItem) => (
        <span className="text-sm text-gray-600 capitalize">
          {patient.labels?.[0]?.replace('-', ' ') || '-'}
        </span>
      )
    },
    {
      key: 'priority',
      title: 'Öncelik',
      render: (patient: PatientSearchItem) => {
        const score = patient?.priority || 0;
        const color = score >= 80 ? 'red' : score >= 60 ? 'yellow' : 'green';
        
        return (
          <div className="flex items-center">
            <Flame className={`w-4 h-4 mr-1 text-${color}-500`} />
            <span className="text-sm font-medium">{score}</span>
          </div>
        );
      }
    },
    {
      key: 'deviceCount',
      title: 'Cihaz',
      render: (patient: PatientSearchItem) => {
        const hasDevice = (patient?.deviceCount || 0) > 0;
        return (
          <div className="flex items-center">
            <Headphones className={`w-4 h-4 ${hasDevice ? 'text-green-500' : 'text-gray-400'}`} />
            <span className="ml-1 text-sm">
              {hasDevice ? patient?.deviceCount : 'Yok'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'registrationDate',
      title: 'Kayıt Tarihi',
      render: (patient: PatientSearchItem) => (
        <span className="text-sm text-gray-600">
          {patient?.registrationDate ? new Date(patient.registrationDate).toLocaleDateString('tr-TR') : '-'}
        </span>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hastalar</h1>
          <p className="text-gray-600">
            Toplam {totalPatients} hastadan {filteredPatients.length} tanesi gösteriliyor
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>

          <Button
            variant={showFilters ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filtreler</span>
          </Button>

          <Button
            onClick={() => setShowNewPatientModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Hasta</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Hasta adı, telefon, TC kimlik no ile arama yapın..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full"
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Select
                placeholder="Durum"
                value={filters.status?.[0] || ''}
                onChange={(value) => handleFilterChange('status', value ? [value] : [])}
                options={statusOptions}
              />
              
              <Select
                placeholder="Segment"
                value={filters.segment?.[0] || ''}
                onChange={(value) => handleFilterChange('segment', value ? [value] : [])}
                options={segmentOptions}
              />
              
              <Select
                placeholder="Etiket"
                value={filters.label?.[0] || ''}
                onChange={(value) => handleFilterChange('label', value ? [value] : [])}
                options={labelOptions}
              />

              <Select
                  placeholder="Cihaz Durumu"
                  value={filters.hasDevices === true ? 'true' : filters.hasDevices === false ? 'false' : ''}
                  onChange={(e) => handleFilterChange('hasDevices', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                  options={[
                    { value: '', label: 'Tümü' },
                    { value: 'true', label: 'Cihazı Var' },
                    { value: 'false', label: 'Cihazı Yok' }
                  ]}
                />

              </div>
            </div>
          )}
        </div>

        {/* Patient List */}
        <div className="bg-white rounded-lg shadow">
          <DataTable
            data={filteredPatients}
            columns={columns}
            loading={isLoading}
            pagination={{
              current: filters.page || 1,
              pageSize: filters.limit || 20,
              total: totalPatients,
              onChange: (page: number, pageSize: number) => {
                const updatedFilters = { ...filters, page, limit: pageSize };
                setFilters(updatedFilters);
                searchPatients(updatedFilters);
              }
            }}
            emptyText="Hasta bulunamadı"
            actions={[
              {
                key: 'view',
                label: 'Görüntüle',
                onClick: handlePatientClick,
                variant: 'primary'
              }
            ]}
          />
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <Modal
          isOpen={showNewPatientModal}
          onClose={() => setShowNewPatientModal(false)}
          title="Yeni Hasta Ekle"
          size="lg"
        >
          <div className="p-6">
            <div className="text-center text-gray-500">
              PatientForm component will be implemented here
            </div>
          </div>
        </Modal>
      )}

      {/* Outlet for nested routes */}
      <Outlet />
    </div>
  );
}
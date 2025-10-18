import React, { useState, useEffect } from 'react';
import { Button, Input, Select, DataTable, Modal } from '@x-ear/ui-web';
import { useNavigate, Outlet, useParams } from '@tanstack/react-router';
import { usePatients } from '../../hooks/usePatients';
import { PatientForm } from './PatientForm';
import { Patient, PatientFilters } from '../../types/patient';
import { Users, CheckCircle, Flame, Headphones } from 'lucide-react';

export function PatientsPage() {
  const navigate = useNavigate();
  const { patientId } = useParams({ strict: false }) as { patientId?: string };
  const { 
    patients, 
    loading, 
    error, 
    searchPatients, 
    createPatient, 
    updatePatient, 
    deletePatient,
    stats 
  } = usePatients();

  const [filters, setFilters] = useState<PatientFilters>({
    search: '',
    status: undefined,
    segment: undefined,
    label: undefined,
    acquisitionType: undefined,
    page: 1,
    limit: 20
  });

  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchResult, setSearchResult] = useState<any>(null);

  // Filter options
  const statusOptions = [
    { value: '', label: 'Tüm Durumlar' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Pasif' },
    { value: 'archived', label: 'Arşivlenmiş' }
  ];

  const branchOptions = [
    { value: '', label: 'Tüm Şubeler' },
    { value: 'merkez', label: 'Merkez' },
    { value: 'kadikoy', label: 'Kadıköy' },
    { value: 'bakirkoy', label: 'Bakırköy' }
  ];

  const segmentOptions = [
    { value: '', label: 'Tüm Segmentler' },
    { value: 'new', label: 'Yeni' },
    { value: 'trial', label: 'Deneme' },
    { value: 'purchased', label: 'Satın Alınmış' },
    { value: 'control', label: 'Kontrol' },
    { value: 'renewal', label: 'Yenileme' }
  ];

  const acquisitionOptions = [
    { value: '', label: 'Tüm Kazanım Türleri' },
    { value: 'tabela', label: 'Tabela' },
    { value: 'referans', label: 'Referans' },
    { value: 'sosyal-medya', label: 'Sosyal Medya' },
    { value: 'tanitim', label: 'Tanıtım' },
    { value: 'diger', label: 'Diğer' }
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

  const pageSizeOptions = [
    { value: '10', label: '10 hasta/sayfa' },
    { value: '20', label: '20 hasta/sayfa' },
    { value: '50', label: '50 hasta/sayfa' },
    { value: '100', label: '100 hasta/sayfa' }
  ];

  // Table columns configuration
  const columns = [
    {
      key: 'select',
      title: '',
      render: (value: any, patient: Patient) => (
        <input
          type="checkbox"
          checked={selectedPatients.includes(patient.id || '')}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedPatients([...selectedPatients, patient.id || '']);
            } else {
              setSelectedPatients(selectedPatients.filter(id => id !== (patient.id || '')));
            }
          }}
          className="rounded border-gray-300"
        />
      )
    },
    {
      key: 'name',
      title: 'Ad Soyad',
      render: (value: any, patient: Patient) => {
        const handleClick = () => {
          // Debug: log patient object and what we will attempt to navigate to
          console.log('[patients:click] patient', { id: patient?.id, patient });
          if (!patient?.id) {
            // Defensive: avoid navigating with empty id and log useful debug info
            console.error('[patients:navigate] missing patient.id, cannot navigate', { patient });
            return;
          }

          const params = { patientId: patient.id };
          console.log('[patients:navigate] navigating to', { to: '/patients/$patientId', params });
          navigate({ to: '/patients/$patientId', params });
        };

        return (
          <div 
            className="cursor-pointer hover:text-blue-600"
            onClick={handleClick}
          >
            <div className="font-medium text-gray-900">
              {patient.firstName} {patient.lastName}
            </div>
            <div className="text-sm text-gray-500">{patient.phone}</div>
          </div>
        );
      }
    },
    {
      key: 'status',
      title: 'Durum',
      render: (value: any, patient: Patient) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          patient.status === 'active' 
            ? 'bg-green-100 text-green-800'
            : patient.status === 'inactive'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {patient.status === 'active' ? 'Aktif' : 
           patient.status === 'inactive' ? 'Pasif' : 'Arşivlenmiş'}
        </span>
      )
    },
    {
      key: 'segment',
      title: 'Segment',
      render: (value: any, patient: Patient) => (
        <span className="text-sm text-gray-900">
          {patient.segment === 'new' ? 'Yeni' :
           patient.segment === 'trial' ? 'Deneme' :
           patient.segment === 'purchased' ? 'Satın Alınmış' :
           patient.segment === 'control' ? 'Kontrol' :
           patient.segment === 'renewal' ? 'Yenileme' :
           patient.segment}
        </span>
      )
    },
    {
      key: 'acquisitionType',
      title: 'Kazanım',
      render: (value: any, patient: Patient) => (
        <span className="text-sm text-gray-900">
          {patient.acquisitionType === 'tabela' ? 'Tabela' :
           patient.acquisitionType === 'referans' ? 'Referans' :
           patient.acquisitionType === 'sosyal-medya' ? 'Sosyal Medya' :
           patient.acquisitionType === 'tanitim' ? 'Tanıtım' :
           patient.acquisitionType === 'diger' ? 'Diğer' :
           patient.acquisitionType}
        </span>
      )
    },
    {
      key: 'label',
      title: 'Etiket',
      render: (value: any, patient: Patient) => (
        <span className="text-sm text-gray-900">
          {patient.label === 'yeni' ? 'Yeni' :
           patient.label === 'arama-bekliyor' ? 'Arama Bekliyor' :
           patient.label === 'randevu-verildi' ? 'Randevu Verildi' :
           patient.label === 'deneme-yapildi' ? 'Deneme Yapıldı' :
           patient.label === 'kontrol-hastasi' ? 'Kontrol Hastası' :
           patient.label === 'satis-tamamlandi' ? 'Satış Tamamlandı' :
           patient.label}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: 'Kayıt Tarihi',
      render: (value: any, patient: Patient) => (
        <span className="text-sm text-gray-900">
          {new Date(patient.createdAt).toLocaleDateString('tr-TR')}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'İşlemler',
      render: (value: any, patient: Patient) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditPatient(patient)}
          >
            Düzenle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/patients/${patient.id}`, '_blank')}
          >
            Detay
          </Button>
        </div>
      )
    }
  ];

  // Event handlers
  const handleFilterChange = (key: keyof PatientFilters, value: string) => {
    const newFilters = { 
      ...filters, 
      [key]: key === 'limit' ? parseInt(value) : (value === '' ? undefined : value)
    };
    setFilters(newFilters);
  };

  const handleSearch = async () => {
    const result = await searchPatients(filters);
    setSearchResult(result);
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === patients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(patients.map(p => p.id));
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setShowNewPatientModal(true);
  };

  const handleSavePatient = async (patientData: Patient) => {
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, patientData);
      } else {
        await createPatient(patientData);
      }
      setShowNewPatientModal(false);
      setEditingPatient(null);
    } catch (error) {
      console.error('Error saving patient:', error);
    }
  };

  const handleBulkSMS = () => {
    console.log('Bulk SMS for patients:', selectedPatients);
    alert('SMS gönderme özelliği yakında eklenecek');
  };

  const handleBulkExport = () => {
    console.log('Export patients:', selectedPatients);
    alert('CSV export özelliği yakında eklenecek');
  };

  const handleBulkUpdateLabel = () => {
    console.log('Update labels for patients:', selectedPatients);
    alert('Toplu etiket güncelleme özelliği yakında eklenecek');
  };

  // Auto-search when filters change
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const result = await searchPatients(filters);
      setSearchResult(result);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, searchPatients]);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Hata</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // If a child route (patientId) is present, render its outlet so PatientDetailsPage mounts
  if (patientId) {
    return <Outlet />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Hastalar</h1>
        <Button onClick={() => setShowNewPatientModal(true)}>
          Yeni Hasta Ekle
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Toplam Hasta</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="text-2xl"><Users className="w-8 h-8 text-blue-500" /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Aktif Hastalar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus.active || 0}</p>
              </div>
              <div className="text-2xl"><CheckCircle className="w-8 h-8 text-green-500" /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Yüksek Öncelik</p>
                <p className="text-2xl font-bold text-gray-900">{stats.highPriority}</p>
              </div>
              <div className="text-2xl"><Flame className="w-8 h-8 text-red-500" /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Cihazlı Hastalar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.withDevices}</p>
              </div>
              <div className="text-2xl"><Headphones className="w-8 h-8 text-purple-500" /></div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <Input
              placeholder="Hasta ara (ad, soyad, telefon)..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <Select
            options={statusOptions}
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            placeholder="Durum"
          />
          <Select
            options={segmentOptions}
            value={filters.segment || ''}
            onChange={(e) => handleFilterChange('segment', e.target.value)}
            placeholder="Segment"
          />
          <Select
            options={acquisitionOptions}
            value={filters.acquisitionType || ''}
            onChange={(e) => handleFilterChange('acquisitionType', e.target.value)}
            placeholder="Kazanım"
          />
          <Select
            options={labelOptions}
            value={filters.label || ''}
            onChange={(e) => handleFilterChange('label', e.target.value)}
            placeholder="Etiket"
          />
        </div>
        
        {/* Page Size Selector */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Sayfa başına:</span>
          <Select
            options={pageSizeOptions}
            value={String(filters.limit || 20)}
            onChange={(e) => handleFilterChange('limit', e.target.value)}
            placeholder="Sayfa boyutu"
            className="w-40"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPatients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-700 font-medium">
                {selectedPatients.length} hasta seçildi
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedPatients.length === patients.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkUpdateLabel}
              >
                Etiket Güncelle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSMS}
              >
                SMS Gönder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
              >
                CSV İndir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Hasta Listesi</h3>
        </div>
        <DataTable
          data={patients}
          columns={columns}
          loading={loading}
          emptyText="Hasta bulunamadı"
          pagination={{
            current: searchResult?.page || 1,
            pageSize: searchResult?.pageSize || 20,
            total: searchResult?.total || 0,
            onChange: (page: number, pageSize: number) => {
              setFilters(prev => ({ ...prev, page, limit: pageSize }));
            }
          }}
        />
      </div>

      {/* New/Edit Patient Modal */}
      <Modal
        isOpen={showNewPatientModal}
        onClose={() => {
          setShowNewPatientModal(false);
          setEditingPatient(null);
        }}
        title={editingPatient ? 'Hasta Düzenle' : 'Yeni Hasta Ekle'}
        size="lg"
      >
        <PatientForm
          patient={editingPatient}
          onSave={handleSavePatient}
          onCancel={() => {
            setShowNewPatientModal(false);
            setEditingPatient(null);
          }}
          isModal={true}
        />
      </Modal>
    </div>
  );
}
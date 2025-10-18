import { useState } from 'react';
import { Patient, PatientFilters } from '../types/patient';
import { PatientList } from '../components/patients/PatientList';
import { PatientForm } from '../components/patients/PatientForm';
import { usePatientStats } from '../hooks/usePatients';
import { Button } from '@x-ear/ui-web';

export function PatientsPage() {
  const { stats } = usePatientStats();
  const [_showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [filters, _setFilters] = useState<PatientFilters>({});
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('details');
  };

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setShowForm(true);
    setViewMode('form');
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowForm(true);
    setViewMode('form');
  };

  const handleFormSave = (patient: Patient) => {
    setShowForm(false);
    setSelectedPatient(patient);
    setViewMode('details');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setViewMode(selectedPatient ? 'details' : 'list');
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setShowForm(false);
    setViewMode('list');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              {viewMode !== 'list' && (
                <Button
                  variant="ghost"
                  onClick={handleBackToList}
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  }
                  iconPosition="left"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Geri
                </Button>
              )}
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {viewMode === 'form' 
                    ? (selectedPatient ? 'Hasta Düzenle' : 'Yeni Hasta')
                    : viewMode === 'details'
                    ? 'Hasta Detayları'
                    : 'Hastalar'
                  }
                </h1>
                
                {viewMode === 'list' && stats && (
                  <p className="mt-1 text-sm text-gray-500">
                    Toplam {stats.total} hasta • {stats.byStatus.active} aktif • {stats.highPriority} yüksek öncelik
                  </p>
                )}
              </div>
            </div>

            {viewMode === 'list' && (
              <div className="flex items-center space-x-3">
                <Button
                  variant="primary"
                  onClick={handleNewPatient}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                  iconPosition="left"
                >
                  Yeni Hasta
                </Button>
              </div>
            )}

            {viewMode === 'details' && selectedPatient && (
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => handleEditPatient(selectedPatient)}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  }
                  iconPosition="left"
                >
                  Düzenle
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {viewMode === 'list' && stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Toplam Hasta</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Aktif Hasta</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.byStatus.active}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Yüksek Öncelik</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.highPriority}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Cihazlı Hasta</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.withDevices}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {viewMode === 'list' && (
          <PatientList
            onPatientSelect={handlePatientSelect}
            filters={filters}
            showActions={true}
          />
        )}

        {viewMode === 'form' && (
          <PatientForm
            patient={selectedPatient}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        )}

        {viewMode === 'details' && selectedPatient && (
          <PatientDetails
            patient={selectedPatient}
            onEdit={() => handleEditPatient(selectedPatient)}
          />
        )}
      </div>
    </div>
  );
}

// Patient Details Component
interface PatientDetailsProps {
  patient: Patient;
  onEdit: () => void;
}

function PatientDetails({ patient, onEdit }: PatientDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length === 11 && phone.startsWith('0')) {
      return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`;
    }
    return phone;
  };

  const getStatusColor = (status: Patient['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Patient['status']) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'archived': return 'Arşiv';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xl font-medium text-gray-700">
                  {(patient.firstName || patient.name || '').charAt(0)}{(patient.lastName || '').charAt(0)}
                </span>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {patient.firstName && patient.lastName 
                    ? `${patient.firstName} ${patient.lastName}` 
                    : patient.name || 'İsimsiz Hasta'}
                </h2>
                
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                    {getStatusLabel(patient.status)}
                  </span>
                  
                  {patient.priorityScore && patient.priorityScore >= 50 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Yüksek Öncelik ({patient.priorityScore})
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              onClick={onEdit}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              variant='default'>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Düzenle
            </Button>
          </div>
        </div>
      </div>
      {/* Patient Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Temel Bilgiler</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefon</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatPhoneNumber(patient.phone)}</dd>
              </div>
              
              {patient.tcNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">TC Kimlik No</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.tcNumber}</dd>
                </div>
              )}
              
              {patient.birthDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Doğum Tarihi</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(patient.birthDate)}</dd>
                </div>
              )}
              
              {patient.email && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">E-posta</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.email}</dd>
                </div>
              )}
            </div>
            
            {patient.address && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Adres</dt>
                <dd className="mt-1 text-sm text-gray-900">{patient.address}</dd>
              </div>
            )}
          </div>
        </div>

        {/* Classification */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Sınıflandırma</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Segment</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{patient.segment}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Etiket</dt>
                <dd className="mt-1 text-sm text-gray-900">{patient.label}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Kazanım Türü</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{patient.acquisitionType}</dd>
              </div>
              
              {patient.priorityScore && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Öncelik Skoru</dt>
                  <dd className="mt-1 text-sm text-gray-900">{patient.priorityScore}</dd>
                </div>
              )}
            </div>
            
            {patient.tags && patient.tags.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Etiketler</dt>
                <dd className="mt-1">
                  <div className="flex flex-wrap gap-1">
                    {patient.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
          </div>
        </div>

        {/* SGK Information */}
        {patient.sgkInfo.hasInsurance && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">SGK Bilgileri</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {patient.sgkInfo.insuranceNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sigorta Numarası</dt>
                    <dd className="mt-1 text-sm text-gray-900">{patient.sgkInfo.insuranceNumber}</dd>
                  </div>
                )}
                
                {patient.sgkInfo.insuranceType && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sigorta Türü</dt>
                    <dd className="mt-1 text-sm text-gray-900 uppercase">{patient.sgkInfo.insuranceType}</dd>
                  </div>
                )}
                
                {patient.sgkInfo.coveragePercentage && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Kapsam Yüzdesi</dt>
                    <dd className="mt-1 text-sm text-gray-900">%{patient.sgkInfo.coveragePercentage}</dd>
                  </div>
                )}
                
                {patient.sgkStatus && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">SGK Durumu</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{patient.sgkStatus}</dd>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Device Information */}
        {patient.devices && patient.devices.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Cihaz Bilgileri</h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {patient.devices.map((device) => (
                  <div key={device.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {device.brand} {device.model}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        device.status === 'active' ? 'bg-green-100 text-green-800' :
                        device.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {device.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>Taraf: {device.side}</div>
                      <div>Tip: {device.type}</div>
                      {device.serialNumber && <div>Seri No: {device.serialNumber}</div>}
                      {device.purchaseDate && <div>Satın Alma: {formatDate(device.purchaseDate)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Notes Section */}
      {patient.notes && patient.notes.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Notlar</h3>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {patient.notes.slice(0, 5).map((note) => (
                <div key={note.id} className="border-l-4 border-blue-400 pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{note.author}</span>
                    <span className="text-xs text-gray-500">{formatDate(note.date)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{note.text}</p>
                  {note.type && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                      {note.type}
                    </span>
                  )}
                </div>
              ))}
              
              {patient.notes.length > 5 && (
                <div className="text-center">
                  <Button className="text-sm text-blue-600 hover:text-blue-500" variant='default'>
                    {patient.notes.length - 5} not daha göster
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
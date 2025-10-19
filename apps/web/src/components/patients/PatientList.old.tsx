import { Button, Input } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Patient, PatientFilters } from '../../types/patient';
import { usePatients } from '../../hooks/usePatients';
import { MessageSquare, Download, Tag, CheckSquare, Square } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';

interface PatientListProps {
  onPatientSelect?: (patient: Patient) => void;
  filters?: PatientFilters;
  showActions?: boolean;
  compact?: boolean;
}

export function PatientList({ 
  onPatientSelect, 
  filters, 
  showActions = true, 
  compact = false 
}: PatientListProps) {
  const navigate = useNavigate();
  const {
    patients,
    loading,
    error,
    searchPatients,
    deletePatient,
    updatePatient,
    addCommunication
  } = usePatients(filters);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkSmsModal, setShowBulkSmsModal] = useState(false);
  const [bulkSmsText, setBulkSmsText] = useState('Merhaba. X-ear hatirlatma mesajidir.');
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [bulkTagText, setBulkTagText] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title?: string; description?: string; onConfirm?: () => Promise<void> | void }>({ isOpen: false });
  
  // confirmDialog state controls the shared ConfirmDialog component

  // Handle search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim()) {
        searchPatients({
          ...filters,
          search: searchTerm.trim()
        });
      } else {
        searchPatients(filters || {});
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters, searchPatients]);

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    onPatientSelect?.(patient);
    
  // Debug: log patient object and intended navigation
  console.log('[patients:click] patient', { id: patient?.id, patient });
    if (!patient?.id) {
      console.error('[patients:navigate] missing patient.id, cannot navigate', { patient });
      return;
    }

  const params = { patientId: patient.id };
  console.log('[patients:navigate] navigating to', { to: '/patients/$patientId', params });
    navigate({ to: '/patients/$patientId', params });
  };

  const handleDeletePatient = async (patient: Patient, event: React.MouseEvent) => {
    event.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Hasta Silinecek',
      description: `${patient.firstName} ${patient.lastName} adlı hastayı silmek istediğinizden emin misiniz?`,
      onConfirm: async () => {
        try {
          const success = await deletePatient(patient.id);
          if (!success) setInfoMessage('Hasta silinemedi');
        } catch (err) {
          console.error('Failed to delete patient', err);
          setInfoMessage('Hasta silinirken hata oluştu');
        } finally {
          setConfirmDialog((s) => ({ ...s, isOpen: false }));
        }
      }
    });
  };

  // Bulk actions handlers
  const handleSelectPatient = (patientId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedPatients.size === patients.length) {
      setSelectedPatients(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedPatients(new Set(patients.map(p => p.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkSMS = () => setShowBulkSmsModal(true);

  const handleBulkExport = () => {
    const selectedPatientsList = patients.filter(p => selectedPatients.has(p.id));
  if (selectedPatientsList.length === 0) return setInfoMessage('Seçili hasta yok');
    const json = JSON.stringify(selectedPatientsList, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  setInfoMessage(`${selectedPatientsList.length} hasta verisi dışarı aktarıldı`);
  };

  const handleBulkTag = () => setShowBulkTagModal(true);

  const clearSelection = () => {
    setSelectedPatients(new Set());
    setShowBulkActions(false);
  };

  const getPriorityColor = (priorityScore?: number) => {
    if (!priorityScore) return 'text-gray-600 bg-gray-50';
    
    if (priorityScore >= 80) return 'text-red-600 bg-red-50';
    if (priorityScore >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getPriorityLabel = (priorityScore?: number) => {
    if (!priorityScore) return 'Normal';
    
    if (priorityScore >= 80) return 'Yüksek';
    if (priorityScore >= 50) return 'Orta';
    return 'Düşük';
  };

  const getStatusColor = (status: Patient['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'archived': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format Turkish phone numbers
    if (phone.length === 11 && phone.startsWith('0')) {
      return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Hastalar yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Hata</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white shadow rounded-lg">
      {infoMessage && (
        <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-md m-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-yellow-900">{infoMessage}</div>
            <Button variant="ghost" size="sm" className="text-yellow-700 underline text-sm" onClick={() => setInfoMessage(null)}>Kapat</Button>
          </div>
        </div>
      )}
      {/* Search Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <Input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ad, soyad, telefon veya TC kimlik no ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {patients.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                icon={selectedPatients.size === patients.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                iconPosition="left"
              >
                {selectedPatients.size === patients.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
              </Button>
            )}
            <div className="text-sm text-gray-500">
              {patients.length} hasta
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-900">
                  {selectedPatients.size} hasta seçildi
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkSMS}
                  icon={<MessageSquare className="w-4 h-4" />}
                  iconPosition="left"
                >
                  SMS Gönder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkExport}
                  icon={<Download className="w-4 h-4" />}
                  iconPosition="left"
                >
                  Dışa Aktar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkTag}
                  icon={<Tag className="w-4 h-4" />}
                  iconPosition="left"
                >
                  Etiket Ekle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  İptal
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Patient List */}
      <div className="divide-y divide-gray-200">
        {patients.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Hasta bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Arama kriterlerinize uygun hasta bulunamadı.' : 'Henüz hasta kaydı bulunmuyor.'}
            </p>
          </div>
        ) : (
          patients.map((patient) => (
            <div
              key={patient.id}
              className={`px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedPatient?.id === patient.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              } ${compact ? 'py-2' : ''}`}
              onClick={() => handlePatientClick(patient)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Selection Checkbox */}
                   <div className="flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        onClick={(e) => handleSelectPatient(patient.id, e)}
                        title={selectedPatients.has(patient.id) ? "Seçimi kaldır" : "Seç"}
                      >
                        {selectedPatients.has(patient.id) ? 
                          <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                          <Square className="w-4 h-4 text-gray-400" />
                        }
                      </Button>
                    </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {(patient.firstName || patient.name || '').charAt(0)}{(patient.lastName || '').charAt(0)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {patient.firstName && patient.lastName 
                          ? `${patient.firstName} ${patient.lastName}` 
                          : patient.name || 'İsimsiz Hasta'}
                      </p>
                      
                      {/* Priority Badge */}
                      {patient.priorityScore && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(patient.priorityScore)}`}>
                          {getPriorityLabel(patient.priorityScore)}
                        </span>
                      )}
                      
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                        {patient.status === 'active' ? 'Aktif' : 
                         patient.status === 'inactive' ? 'Pasif' : 'Arşiv'}
                      </span>
                    </div>
                    
                    {!compact && (
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        {patient.phone && (
                          <span className="flex items-center">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {formatPhoneNumber(patient.phone)}
                          </span>
                        )}
                        
                        {patient.tcNumber && (
                          <span>TC: {patient.tcNumber}</span>
                        )}
                        
                        {patient.birthDate && (
                          <span>
                            {new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} yaş
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                {showActions && (
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit action
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Düzenle"
                      variant='outline'>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    
                    <Button
                      onClick={(e) => handleDeletePatient(patient, e)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Sil"
                      variant='outline'>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Additional Info for Compact Mode */}
              {compact && patient.phone && (
                <div className="mt-1 text-xs text-gray-500">
                  {formatPhoneNumber(patient.phone)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
  </div>
  {/* Bulk SMS Modal */}
    {showBulkSmsModal && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <h4 className="text-lg font-medium mb-4">Toplu SMS Gönder</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700">Mesaj</label>
              <textarea data-allow-raw="true" value={bulkSmsText} onChange={(e) => setBulkSmsText(e.target.value)} className="w-full px-3 py-2 border rounded" rows={4} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBulkSmsModal(false)}>İptal</Button>
              <Button variant="primary" onClick={async () => {
                const selectedPatientsList = patients.filter(p => selectedPatients.has(p.id));
              if (selectedPatientsList.length === 0) return setInfoMessage('Seçili hasta yok');
                let success = 0;
                for (const p of selectedPatientsList) {
                  try {
                    const comm = await addCommunication(p.id, { type: 'sms', direction: 'outbound', content: bulkSmsText, timestamp: new Date().toISOString(), status: 'sent' });
                    if (comm) success++;
                  } catch (err) {
                    console.error('Failed to queue SMS for', p.id, err);
                  }
                }
                setInfoMessage(`${success} / ${selectedPatients.size} hastaya SMS kuyruğa eklendi`);
                setShowBulkSmsModal(false);
              }}>Gönder</Button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Bulk Tag Modal */}
    {showBulkTagModal && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h4 className="text-lg font-medium mb-4">Etiket Ekle</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700">Etiket anahtarı</label>
              <input data-allow-raw="true" value={bulkTagText} onChange={(e) => setBulkTagText(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBulkTagModal(false)}>İptal</Button>
              <Button variant="primary" onClick={async () => {
                const selectedPatientsList = patients.filter(p => selectedPatients.has(p.id));
                if (selectedPatientsList.length === 0) return setInfoMessage('Seçili hasta yok');
                let success = 0;
                for (const p of selectedPatientsList) {
                  try {
                    const updated = await updatePatient(p.id, { label: bulkTagText as Patient['label'] });
                    if (updated) success++;
                  } catch (err) {
                    console.error('Failed to update label for', p.id, err);
                  }
                }
                setInfoMessage(`${success} / ${selectedPatients.size} hastanın etiketi güncellendi`);
                setShowBulkTagModal(false);
              }}>Uygula</Button>
            </div>
          </div>
        </div>
      </div>
    )}
    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      title={confirmDialog.title}
      description={confirmDialog.description}
      onClose={() => setConfirmDialog((s) => ({ ...s, isOpen: false }))}
      onConfirm={async () => { if (confirmDialog.onConfirm) await confirmDialog.onConfirm(); }}
    />
    </>
  );
}
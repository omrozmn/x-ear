import React, { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';
import { Patient, PatientDevice, Sale, PaymentRecord } from '../../types/patient';
import { useUpdatePatient } from '../../hooks/patient/usePatients';
import { PatientTab } from './PatientTabs';
import { Button } from '@x-ear/ui-web';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface PatientTabContentProps {
  patient: Patient;
  activeTab: PatientTab;
  onPatientUpdate?: (p: Patient) => void;
}

export const PatientTabContent: React.FC<PatientTabContentProps> = ({
  patient,
  activeTab,
  onPatientUpdate,
}) => {
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PatientDevice | null>(null);
   const [editingNote, setEditingNote] = useState<import('../../types/patient').PatientNote | null>(null);
  
  const [showCreateSaleModal, setShowCreateSaleModal] = useState(false);
  const [newSaleTotal, setNewSaleTotal] = useState<string>('');
  const [newSaleDate, setNewSaleDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [newSaleNotes, setNewSaleNotes] = useState<string>('');
  const [showAddPaymentForSaleId, setShowAddPaymentForSaleId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState<{ id?: string; date: string; note?: string; status: string }>({ id: undefined, date: new Date().toISOString().slice(0,16), note: '', status: 'scheduled' });
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title?: string; description?: string; onConfirm?: () => Promise<void> }>({ open: false });
  const [editingSaleNoteSaleId, setEditingSaleNoteSaleId] = useState<string | null>(null);
  const [saleNoteText, setSaleNoteText] = useState<string>('');
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const [reportForm, setReportForm] = useState<{ type: string; title: string }>({ type: 'device', title: '' });
  
  const [newDevice, setNewDevice] = useState<{
    brand: string;
    model: string;
    serialNumber?: string;
    status: PatientDevice['status'];
  }>({
    brand: '',
    model: '',
    serialNumber: '',
    status: 'active'
  });
  const [deviceError, setDeviceError] = useState<string | null>(null);
  
  // Patient service methods
  const updatePatientMutation = useUpdatePatient();
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Genel Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Name Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Ad Soyad</h4>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">{`${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'İsimsiz Hasta'}</p>
              </div>

              {/* TC Number Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">TC Kimlik No</h4>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">{patient.tcNumber || 'Belirtilmemiş'}</p>
              </div>

              {/* Phone Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Telefon</h4>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">{patient.phone || 'Belirtilmemiş'}</p>
              </div>

              {/* Email Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">E-posta</h4>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">{patient.email || 'Belirtilmemiş'}</p>
              </div>

              {/* Birth Date Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Doğum Tarihi</h4>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                </p>
              </div>

              {/* Address Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Adres</h4>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">{patient.address || 'Belirtilmemiş'}</p>
              </div>
            </div>
          </div>
        );

      case 'devices':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cihazlar</h3>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddingDevice(true)}
                icon={<Plus className="w-4 h-4" />}
                iconPosition="left"
              >
                Cihaz Ekle
              </Button>
            </div>

            {/* Add Device Form */}
            {isAddingDevice && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-md font-medium text-gray-900 mb-3">Yeni Cihaz Ekle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                    <input
                      type="text"
                      value={newDevice.brand}
                      onChange={(e) => setNewDevice({...newDevice, brand: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn: Phonak"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={newDevice.model}
                      onChange={(e) => setNewDevice({...newDevice, model: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn: Audéo Paradise"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
                    <input
                      type="text"
                      value={newDevice.serialNumber}
                      onChange={(e) => setNewDevice({...newDevice, serialNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Seri numarası"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                    <select
                      value={newDevice.status}
                      onChange={(e) => {
                        const val = e.target.value;
                        const allowed: PatientDevice['status'][] = ['active','trial','returned','replaced'];
                        setNewDevice(prev => ({...prev, status: allowed.includes(val as any) ? (val as PatientDevice['status']) : 'active'}));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Aktif</option>
                      <option value="trial">Deneme</option>
                      <option value="returned">İade</option>
                      <option value="replaced">Değiştirildi</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="primary"
                    size="sm"
                      onClick={async () => {
                      // validation
                      setDeviceError(null);
                      if (!newDevice.brand.trim() || !newDevice.model.trim()) {
                        setDeviceError('Marka ve model zorunludur.');
                        return;
                      }
                      try {
                        // construct device and patch via updatePatient
                        const deviceToAdd = {
                          id: `device-${Date.now()}`,
                          brand: newDevice.brand,
                          model: newDevice.model,
                          serialNumber: newDevice.serialNumber,
                          status: newDevice.status,
                          type: (['hearing_aid','cochlear_implant','bone_anchored','middle_ear'] as PatientDevice['type'][]).includes(patient.deviceType as any) ? patient.deviceType as PatientDevice['type'] : 'hearing_aid',
                          side: 'both'
                        } as PatientDevice;
                        const res = await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { devices: [...(patient.devices || []), deviceToAdd] } });
                        if (res) {
                          setIsAddingDevice(false);
                          setNewDevice({ brand: '', model: '', serialNumber: '', status: 'active' });
                          if (onPatientUpdate) onPatientUpdate(res);
                        } else {
                          setConfirmDialog({ open: true, title: 'Cihaz eklenemedi', description: 'Cihaz eklenemedi. Lütfen tekrar deneyin.', onConfirm: async () => {} });
                        }
                      } catch (err) {
                        console.error('Failed to add device:', err);
                        setConfirmDialog({ open: true, title: 'Cihaz eklenirken hata', description: 'Cihaz eklenirken bir hata oluştu. Konsolu kontrol edin.', onConfirm: async () => {} });
                      }
                    }}
                    icon={<Save className="w-4 h-4" />}
                    iconPosition="left"
                    disabled={!newDevice.brand.trim() || !newDevice.model.trim()}
                  >
                    Kaydet
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingDevice(false);
                      setNewDevice({ brand: '', model: '', serialNumber: '', status: 'active' });
                    }}
                    icon={<X className="w-4 h-4" />}
                    iconPosition="left"
                  >
                    İptal
                  </Button>
                </div>
                {deviceError && (
                  <div className="mt-2 text-sm text-red-600">{deviceError}</div>
                )}
              </div>
            )}

            {/* Existing Devices */}
            {patient?.devices && patient.devices.length > 0 ? (
              <div className="space-y-4">
                {patient?.devices?.map((device, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Marka/Model</label>
                          <p className="mt-1 text-sm text-gray-900">{device.brand} {device.model}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Seri No</label>
                          <p className="mt-1 text-sm text-gray-900">{device.serialNumber}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Durum</label>
                          <p className="mt-1 text-sm text-gray-900">{device.status}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingDevice(device)}
                          icon={<Edit className="w-4 h-4" />}
                        >
                          Düzenle
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDialog({
                            open: true,
                            title: 'Cihazı sil',
                            description: 'Bu cihazı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
                            onConfirm: async () => {
                              try {
                                const remaining = (patient.devices || []).filter(d => d.id !== device.id);
                                const res = await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { devices: remaining } });
                                if (!res) setConfirmDialog({ open: true, title: 'Cihaz silinemedi', description: 'Cihaz silinemedi.', onConfirm: async () => {} });
                              } catch (err) {
                                console.error('Failed to delete device:', err);
                                setConfirmDialog({ open: true, title: 'Silme hatası', description: 'Cihaz silinirken bir hata oluştu.', onConfirm: async () => {} });
                              }
                            }
                          })}
                          icon={<Trash2 className="w-4 h-4 text-red-500" />}
                        >
                          Sil
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Henüz cihaz kaydı bulunmuyor.</p>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingDevice(true)}
                  icon={<Plus className="w-4 h-4" />}
                  iconPosition="left"
                >
                  İlk Cihazı Ekle
                </Button>
              </div>
            )}
          </div>
        );

      case 'sales':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Satışlar</h3>
            {patient.sales && patient.sales.length > 0 ? (
              <div className="space-y-4">
                {patient.sales.map((sale, idx) => (
                  <div key={sale.id || idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Toplam</label>
                        <p className="mt-1 text-sm text-gray-900">{sale.totalAmount} TL</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Durum</label>
                        <p className="mt-1 text-sm text-gray-900">{sale.status || 'draft'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Satış Tarihi</label>
                        <p className="mt-1 text-sm text-gray-900">{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('tr-TR') : '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Ödeme Kayıtları</label>
                        <p className="mt-1 text-sm text-gray-900">{(sale.payments || []).length} kayıt</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDialog({
                          open: true,
                          title: 'Satışı ödenmiş olarak işaretle',
                          description: 'Bu satışı tamamen ödenmiş olarak işaretlemek istiyor musunuz?',
                          onConfirm: async () => {
                            try {
                              const updatedSales: Sale[] = (patient.sales || []).map(s => s.id === sale.id ? { ...s, status: 'paid' as Sale['status'], updatedAt: new Date().toISOString() } : s);
                              await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { sales: updatedSales } });
                            } catch (err) {
                              console.error('Failed to mark sale paid', err);
                              setConfirmDialog({ open: true, title: 'İşlem başarısız', description: 'Satış durumu güncellenemedi.', onConfirm: async () => {} });
                            }
                          }
                        })}
                      >
                        Ödendi
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddPaymentForSaleId(sale.id || null);
                          setPaymentAmount('');
                          setPaymentMethod('cash');
                          setPaymentNote('');
                        }}
                      >
                        Ödeme Ekle
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSaleNoteSaleId(sale.id || null);
                          setSaleNoteText(sale.notes || '');
                        }}
                      >
                        Not
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDialog({
                          open: true,
                          title: 'Satışı iptal et',
                          description: 'Bu satışı iptal etmek istiyor musunuz? Bu işlem satışı silecektir.',
                          onConfirm: async () => {
                            try {
                              const remaining = (patient.sales || []).filter(s => s.id !== sale.id);
                              await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { sales: remaining } });
                            } catch (err) {
                              console.error('Failed to delete sale', err);
                              setConfirmDialog({ open: true, title: 'Satış silinemedi', description: 'Satış silinirken bir hata oluştu.', onConfirm: async () => {} });
                            }
                          }
                        })}
                      >
                        İptal / Sil
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // try to open invoice widget if available (legacy behavior)
                          try {
                            (window as any).invoiceWidget?.openForSale?.(sale.id, patient.id);
                          } catch (err) {
                            console.warn('invoice widget not available', err);
                            setConfirmDialog({ open: true, title: 'Fatura modülü yok', description: 'Fatura oluşturma modülü bulunamadı.', onConfirm: async () => {} });
                          }
                        }}
                      >
                        Fatura
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Henüz satış kaydı bulunmuyor.</p>
            )}

            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => setShowCreateSaleModal(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Yeni Satış
              </Button>
            </div>
          </div>
        );

      case 'sgk':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">SGK İşlemleri</h3>
            {patient.sgkInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sigorta Durumu</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {patient.sgkInfo.hasInsurance ? 'Var' : 'Yok'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sigorta Numarası</label>
                    <p className="mt-1 text-sm text-gray-900">{patient.sgkInfo.insuranceNumber || 'Belirtilmemiş'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">SGK bilgisi bulunmuyor.</p>
            )}
          </div>
        );

      case 'documents':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Belgeler</h3>
            {patient.reports && patient.reports.length > 0 ? (
              <div className="space-y-4">
                {patient.reports.map((report, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Belge Türü</label>
                        <p className="mt-1 text-sm text-gray-900">{report.type}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Başlık</label>
                        <p className="mt-1 text-sm text-gray-900">{report.title}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Oluşturulma Tarihi</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(report.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (report.fileUrl) {
                              window.open(report.fileUrl, '_blank');
                            } else {
                              setConfirmDialog({ open: true, title: 'Dosya yok', description: 'Dosya mevcut değil.', onConfirm: async () => {} });
                            }
                          }}
                        >
                          İndir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDialog({
                            open: true,
                            title: 'Belgeyi sil',
                            description: 'Bu belgeyi silmek istediğinize emin misiniz?',
                            onConfirm: async () => {
                              try {
                                const remaining = (patient.reports || []).filter(r => r.id !== report.id);
                                await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { reports: remaining } });
                              } catch (err) {
                                console.error('Failed to delete report', err);
                                setConfirmDialog({ open: true, title: 'Silme başarısız', description: 'Belge silinirken bir hata oluştu.', onConfirm: async () => {} });
                              }
                            }
                          })}
                        >
                          Sil
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Henüz belge bulunmuyor.</p>
            )}
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => {
                  setReportForm({ type: 'device', title: '' });
                  setShowCreateReportModal(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Belge Ekle
              </Button>
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Zaman Çizelgesi</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm font-medium text-gray-900">Hasta Kaydı Oluşturuldu</p>
                <p className="text-sm text-gray-500">
                  {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                </p>
              </div>

              {patient.updatedAt && (
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-sm font-medium text-gray-900">Son Güncelleme</p>
                  <p className="text-sm text-gray-500">
                    {new Date(patient.updatedAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              )}

              {patient.notes && patient.notes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {patient.notes.map((n) => (
                    <div key={n.id} className="border-l-4 border-gray-200 pl-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm text-gray-700">{n.text}</p>
                          <p className="text-xs text-gray-500">{new Date(n.date).toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingNote(n)}>Düzenle</Button>
                          <Button variant="outline" size="sm" onClick={() => setConfirmDialog({
                            open: true,
                            title: 'Notu sil',
                            description: 'Bu notu silmek istediğinize emin misiniz?',
                            onConfirm: async () => {
                              try {
                                const remaining = (patient.notes || []).filter(note => note.id !== n.id);
                                await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { notes: remaining } });
                              } catch (err) {
                                console.error('Failed to delete note', err);
                                setConfirmDialog({ open: true, title: 'Silme hatası', description: 'Not silinirken bir hata oluştu.', onConfirm: async () => {} });
                              }
                            }
                          })}>Sil</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
          {/* Edit Device Modal */}
          {editingDevice && (() => {
            const dev = editingDevice!;
            return (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h4 className="text-lg font-medium mb-4">Cihaz Düzenle</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700">Marka</label>
                      <input value={dev.brand} onChange={(e) => setEditingDevice(prev => prev ? { ...prev, brand: e.target.value } : prev)} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Model</label>
                      <input value={dev.model} onChange={(e) => setEditingDevice(prev => prev ? { ...prev, model: e.target.value } : prev)} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Seri No</label>
                      <input value={dev.serialNumber || ''} onChange={(e) => setEditingDevice(prev => prev ? { ...prev, serialNumber: e.target.value } : prev)} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Durum</label>
                      <select value={dev.status} onChange={(e) => setEditingDevice(prev => prev ? { ...prev, status: e.target.value as PatientDevice['status'] } : prev)} className="w-full px-3 py-2 border rounded">
                        <option value="active">Aktif</option>
                        <option value="trial">Deneme</option>
                        <option value="returned">İade</option>
                        <option value="replaced">Değiştirildi</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setEditingDevice(null)}>İptal</Button>
                    <Button
                      variant="primary"
                      onClick={async () => {
                        try {
                          // Update devices by patching the whole devices array via updatePatient
                          const updated = (patient.devices || []).map(d => d.id === dev.id ? dev : d);
                          await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { devices: updated } });
                          setEditingDevice(null);
                        } catch (err) {
                          console.error('Failed to update device', err);
                          setConfirmDialog({ open: true, title: 'Güncelleme başarısız', description: 'Cihaz güncellenemedi.', onConfirm: async () => {} });
                        }
                      }}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

              {/* Appointment Modal */}
              {isAppointmentModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h4 className="text-lg font-medium mb-4">{isEditingAppointment ? 'Randevuyu Düzenle' : 'Yeni Randevu'}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700">Tarih ve Saat</label>
                        <input type="datetime-local" value={appointmentForm.date} onChange={(e) => setAppointmentForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700">Not (opsiyonel)</label>
                        <textarea value={appointmentForm.note} onChange={(e) => setAppointmentForm(prev => ({ ...prev, note: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={3} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700">Durum</label>
                        <select value={appointmentForm.status} onChange={(e) => setAppointmentForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border rounded">
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAppointmentModalOpen(false)}>İptal</Button>
                      <Button variant="primary" onClick={async () => {
                        try {
                          const appt = {
                            id: appointmentForm.id || `appt_${Date.now()}`,
                            date: new Date(appointmentForm.date).toISOString(),
                            note: appointmentForm.note,
                            status: appointmentForm.status,
                            createdAt: appointmentForm.id ? undefined : new Date().toISOString()
                          } as any;
                          if (isEditingAppointment) {
                            const updated = (patient.appointments || []).map((a: any) => a.id === appt.id ? { ...a, ...appt } : a);
                            await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { appointments: updated } });
                          } else {
                            await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { appointments: [...(patient.appointments || []), appt] } });
                          }
                          setIsAppointmentModalOpen(false);
                          } catch (err) {
                          console.error('Failed to save appointment', err);
                          setConfirmDialog({ open: true, title: 'Randevu kaydedilemedi', description: 'Randevu kaydedilemedi.', onConfirm: async () => {} });
                        }
                      }}>Kaydet</Button>
                    </div>
                  </div>
                </div>
              )}

      case 'appointments':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Randevular</h3>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsEditingAppointment(false);
                  setAppointmentForm({ id: undefined, date: new Date().toISOString().slice(0,16), note: '', status: 'scheduled' });
                  setIsAppointmentModalOpen(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Randevu Ekle
              </Button>
            </div>

            {patient.appointments && patient.appointments.length > 0 ? (
              <div className="space-y-4">
                {patient.appointments.map((appt: any) => (
                  <div key={appt.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{new Date(appt.date).toLocaleString('tr-TR')}</p>
                        {appt.note && <p className="text-sm text-gray-700">{appt.note}</p>}
                        <p className="text-xs text-gray-500">Durum: {appt.status}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {appt.status !== 'completed' && (
                          <Button variant="outline" size="sm" onClick={async () => {
                            try {
                              const updated = (patient.appointments || []).map((a: any) => a.id === appt.id ? { ...a, status: 'completed' } : a);
                              await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { appointments: updated } });
                            } catch (err) {
                              console.error('Failed to mark appointment completed', err);
                              setConfirmDialog({ open: true, title: 'İşlem başarısız', description: 'Randevu durumu güncellenemedi.', onConfirm: async () => {} });
                            }
                          }}>Tamamlandı</Button>
                        )}
                        {appt.status !== 'cancelled' && (
                          <Button variant="outline" size="sm" onClick={() => setConfirmDialog({
                            open: true,
                            title: 'Randevuyu iptal et',
                            description: 'Randevuyu iptal etmek istediğinize emin misiniz?',
                            onConfirm: async () => {
                              try {
                                const updated = (patient.appointments || []).map((a: any) => a.id === appt.id ? { ...a, status: 'cancelled' } : a);
                                await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { appointments: updated } });
                              } catch (err) {
                                console.error('Failed to cancel appointment', err);
                                setConfirmDialog({ open: true, title: 'İşlem başarısız', description: 'Randevu iptal edilemedi.', onConfirm: async () => {} });
                              }
                            }
                          })}>İptal</Button>
                        )}
                        <Button variant="outline" size="sm" onClick={async () => {
                          // Open appointment modal pre-filled for editing
                          setIsEditingAppointment(true);
                          setAppointmentForm({ id: appt.id, date: new Date(appt.date).toISOString().slice(0,16), note: appt.note || '', status: appt.status || 'scheduled' });
                          setIsAppointmentModalOpen(true);
                        }}>Düzenle</Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirmDialog({
                          open: true,
                          title: 'Randevuyu sil',
                          description: 'Bu randevuyu silmek istediğinize emin misiniz?',
                          onConfirm: async () => {
                            try {
                              const remaining = (patient.appointments || []).filter((a: any) => a.id !== appt.id);
                              await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { appointments: remaining } });
                            } catch (err) {
                              console.error('Failed to delete appointment', err);
                              setConfirmDialog({ open: true, title: 'Randevu silinemedi', description: 'Randevu silinirken bir hata oluştu.', onConfirm: async () => {} });
                            }
                          }
                        })} icon={<Trash2 className="w-4 h-4 text-red-500" />}>Sil</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Henüz randevu bulunmuyor.</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-6">
            <p className="text-gray-500">İçerik bulunamadı.</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {renderTabContent()}

      {/* Create Sale Modal */}
      {showCreateSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-medium mb-4">Yeni Satış Oluştur</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Toplam Tutar (TL)</label>
                <input value={newSaleTotal} onChange={(e) => setNewSaleTotal(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Satış Tarihi</label>
                <input type="date" value={newSaleDate} onChange={(e) => setNewSaleDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Notlar (opsiyonel)</label>
                <input value={newSaleNotes} onChange={(e) => setNewSaleNotes(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateSaleModal(false)}>İptal</Button>
              <Button
                variant="primary"
                onClick={async () => {
                  // disabled is handled via prop below; keep click safe
                  try {
                    const total = parseFloat(newSaleTotal.replace(',', '.'));
                    if (Number.isNaN(total) || total <= 0) return setConfirmDialog({ open: true, title: 'Geçersiz tutar', description: 'Geçerli pozitif bir tutar girin.', onConfirm: async () => {} });
                    const newSale: Sale = {
                      id: `sale_${Date.now()}`,
                      totalAmount: total,
                      saleDate: new Date(newSaleDate).toISOString(),
                      status: 'confirmed',
                      notes: newSaleNotes || undefined,
                      payments: [],
                      createdAt: new Date().toISOString(),
                    };
                    await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { sales: [...(patient.sales || []), newSale] } });
                    setShowCreateSaleModal(false);
                    setNewSaleTotal('');
                    setNewSaleDate(new Date().toISOString().slice(0,10));
                    setNewSaleNotes('');
                    } catch (err) {
                    console.error('Failed to create sale', err);
                    setConfirmDialog({ open: true, title: 'Satış oluşturulamadı', description: 'Satış oluşturulamadı.', onConfirm: async () => {} });
                  }
                }}
                disabled={!newSaleTotal.trim() || Number.isNaN(parseFloat(newSaleTotal.replace(',', '.'))) || parseFloat(newSaleTotal.replace(',', '.')) <= 0}
              >
                Oluştur
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Note Modal */}
      {editingSaleNoteSaleId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-medium mb-4">Satış Notu Düzenle</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Not</label>
                <textarea value={saleNoteText} onChange={(e) => setSaleNoteText(e.target.value)} className="w-full px-3 py-2 border rounded" rows={4} />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setEditingSaleNoteSaleId(null); setSaleNoteText(''); }}>İptal</Button>
              <Button variant="primary" onClick={async () => {
                try {
                  const updatedSales: Sale[] = (patient.sales || []).map(s => s.id === editingSaleNoteSaleId ? { ...s, notes: saleNoteText, updatedAt: new Date().toISOString() } : s);
                  await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { sales: updatedSales } });
                  setEditingSaleNoteSaleId(null);
                  setSaleNoteText('');
                } catch (err) {
                  console.error('Failed to update sale note', err);
                  setConfirmDialog({ open: true, title: 'Güncelleme başarısız', description: 'Satış notu güncellenemedi.', onConfirm: async () => {} });
                }
              }}>Kaydet</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Report Modal */}
      {showCreateReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-medium mb-4">Belge Oluştur</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Belge Türü</label>
                <select value={reportForm.type} onChange={(e) => setReportForm(prev => ({ ...prev, type: e.target.value }))} className="w-full px-3 py-2 border rounded">
                  <option value="audiogram">audiogram</option>
                  <option value="battery">battery</option>
                  <option value="device">device</option>
                  <option value="sgk">sgk</option>
                  <option value="medical">medical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Başlık</label>
                <input value={reportForm.title} onChange={(e) => setReportForm(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateReportModal(false)}>İptal</Button>
              <Button variant="primary" onClick={async () => {
                try {
                  const newReport = { id: `rep_${Date.now()}`, type: reportForm.type, title: reportForm.title, createdAt: new Date().toISOString(), createdBy: 'System' } as any;
                  await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { reports: [...(patient.reports || []), newReport] } });
                  setShowCreateReportModal(false);
                } catch (err) {
                  console.error('Failed to add report', err);
                  setConfirmDialog({ open: true, title: 'Belge eklenemedi', description: 'Belge eklenemedi.', onConfirm: async () => {} });
                }
              }}>Oluştur</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentForSaleId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-medium mb-4">Ödeme Ekle</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Tutar (TL)</label>
                <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Yöntem</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border rounded">
                  <option value="cash">Nakit</option>
                  <option value="card">Kart</option>
                  <option value="bank_transfer">EFT/Havale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Not (opsiyonel)</label>
                <input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddPaymentForSaleId(null)}>İptal</Button>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    const amt = parseFloat(paymentAmount.replace(',', '.'));
                    if (Number.isNaN(amt)) return setConfirmDialog({ open: true, title: 'Geçersiz tutar', description: 'Geçerli bir tutar girin.', onConfirm: async () => {} });
                    const saleId = showAddPaymentForSaleId;
                    if (!saleId) return;
                    const payment: PaymentRecord = { id: `pay_${Date.now()}`, amount: amt, date: new Date().toISOString(), method: paymentMethod, status: 'completed', note: paymentNote || undefined };
                    const updatedSales: Sale[] = (patient.sales || []).map(s => {
                      if (s.id !== saleId) return s;
                      const payments = [...(s.payments || []), payment];
                      // compute sum
                      const paidSum = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
                      const status: Sale['status'] = paidSum >= (s.totalAmount || 0) ? 'paid' : (s.status || 'confirmed');
                      return { ...s, payments, status, updatedAt: new Date().toISOString() };
                    });
                    await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { sales: updatedSales } });
                    setShowAddPaymentForSaleId(null);
                    setPaymentAmount('');
                    setPaymentMethod('cash');
                    setPaymentNote('');
                  } catch (err) {
                    console.error('Failed to add payment', err);
                    setConfirmDialog({ open: true, title: 'Ödeme eklenemedi', description: 'Ödeme eklenemedi.', onConfirm: async () => {} });
                  }
                }}
              >
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onClose={() => setConfirmDialog({ open: false })}
        onConfirm={async () => { if (confirmDialog.onConfirm) await confirmDialog.onConfirm(); setConfirmDialog({ open: false }); }}
      />

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-medium mb-4">Notu Düzenle</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Not İçeriği</label>
                <textarea
                  value={editingNote.text}
                  onChange={(e) => setEditingNote(prev => prev ? { ...prev, text: e.target.value } : prev)}
                  className="w-full px-3 py-2 border rounded"
                  rows={5}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingNote(null)}>İptal</Button>
              <Button variant="primary" onClick={async () => {
                try {
                  const updatedNotes = (patient.notes || []).map(n => n.id === editingNote.id ? { ...n, text: editingNote.text, date: new Date().toISOString() } : n);
                  await updatePatientMutation.mutateAsync({ patientId: patient.id, updates: { notes: updatedNotes } });
                  setEditingNote(null);
                } catch (err) {
                  console.error('Failed to update note', err);
                  setConfirmDialog({ open: true, title: 'Not güncellenemedi', description: 'Not güncellenemedi.', onConfirm: async () => {} });
                }
              }}>Kaydet</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
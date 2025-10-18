import React, { useState } from 'react';
import { Patient } from '../../types/patient';
import { PatientTab } from './PatientTabs';
import { Button } from '@x-ear/ui-web';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface PatientTabContentProps {
  patient: Patient;
  activeTab: PatientTab;
}

export const PatientTabContent: React.FC<PatientTabContentProps> = ({
  patient,
  activeTab,
}) => {
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newDevice, setNewDevice] = useState({
    brand: '',
    model: '',
    serialNumber: '',
    status: 'aktif'
  });
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Genel Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                <p className="mt-1 text-sm text-gray-900">{patient.firstName} {patient.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                <p className="mt-1 text-sm text-gray-900">{patient.phone || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                <p className="mt-1 text-sm text-gray-900">{patient.email || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">TC Kimlik No</label>
                <p className="mt-1 text-sm text-gray-900">{patient.tcNumber || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Doğum Tarihi</label>
                <p className="mt-1 text-sm text-gray-900">
                  {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Durum</label>
                <p className="mt-1 text-sm text-gray-900">{patient.status}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Adres</label>
                <p className="mt-1 text-sm text-gray-900">{patient.address || 'Belirtilmemiş'}</p>
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
                      onChange={(e) => setNewDevice({...newDevice, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="pasif">Pasif</option>
                      <option value="bakimda">Bakımda</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement device save functionality
                      console.log('Save device:', newDevice);
                      setIsAddingDevice(false);
                      setNewDevice({ brand: '', model: '', serialNumber: '', status: 'aktif' });
                    }}
                    icon={<Save className="w-4 h-4" />}
                    iconPosition="left"
                  >
                    Kaydet
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingDevice(false);
                      setNewDevice({ brand: '', model: '', serialNumber: '', status: 'aktif' });
                    }}
                    icon={<X className="w-4 h-4" />}
                    iconPosition="left"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Devices */}
            {patient.devices && patient.devices.length > 0 ? (
              <div className="space-y-4">
                {patient.devices.map((device, index) => (
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
                            onClick={() => {
                              // TODO: Implement device edit functionality
                              console.log('Edit device:', device);
                            }}
                            icon={<Edit className="w-4 h-4" />}
                          >
                            Düzenle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement device delete functionality
                              if (window.confirm('Bu cihazı silmek istediğinizden emin misiniz?')) {
                                console.log('Delete device:', device);
                              }
                            }}
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
            {patient.installments && patient.installments.length > 0 ? (
              <div className="space-y-4">
                {patient.installments.map((installment, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tutar</label>
                        <p className="mt-1 text-sm text-gray-900">{installment.amount} TL</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Vade Tarihi</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(installment.dueDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Durum</label>
                        <p className="mt-1 text-sm text-gray-900">{installment.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Henüz satış kaydı bulunmuyor.</p>
            )}
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Henüz belge bulunmuyor.</p>
            )}
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
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Notlar</h3>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddingNote(true)}
                icon={<Plus className="w-4 h-4" />}
                iconPosition="left"
              >
                Not Ekle
              </Button>
            </div>

            {/* Add Note Form */}
            {isAddingNote && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-md font-medium text-gray-900 mb-3">Yeni Not Ekle</h4>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Not İçeriği</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Not içeriğini buraya yazın..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement note save functionality
                      console.log('Save note:', newNote);
                      setIsAddingNote(false);
                      setNewNote('');
                    }}
                    icon={<Save className="w-4 h-4" />}
                    iconPosition="left"
                  >
                    Kaydet
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNote('');
                    }}
                    icon={<X className="w-4 h-4" />}
                    iconPosition="left"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Notes */}
            {patient.notes && patient.notes.length > 0 ? (
              <div className="space-y-4">
                {patient.notes.map((note, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Not #{index + 1}</h4>
                        <p className="text-sm text-gray-700 mb-2">{note.text}</p>
                        <div className="flex items-center text-xs text-gray-500 space-x-4">
                          <span>{new Date(note.date).toLocaleDateString('tr-TR')}</span>
                          {note.author && <span>Yazan: {note.author}</span>}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement note edit functionality
                            console.log('Edit note:', note);
                          }}
                          icon={<Edit className="w-4 h-4" />}
                        >
                          Düzenle
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement note delete functionality
                            if (window.confirm('Bu notu silmek istediğinizden emin misiniz?')) {
                              console.log('Delete note:', note);
                            }
                          }}
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
                <p className="text-gray-500 mb-4">Henüz not bulunmuyor.</p>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingNote(true)}
                  icon={<Plus className="w-4 h-4" />}
                  iconPosition="left"
                >
                  İlk Notu Ekle
                </Button>
              </div>
            )}
          </div>
        );

      case 'appointments':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Randevular</h3>
            <p className="text-gray-500">Randevu sistemi henüz implement edilmemiş.</p>
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
    </div>
  );
};
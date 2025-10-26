import React, { useState, useEffect } from 'react';
import { Button } from '@x-ear/ui-web';
import { Download, Edit, Eye, Search, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import { useToastHelpers } from '@x-ear/ui-web';
import { sgkService } from '../services/sgk.service';

interface EReceipt {
  id: string;
  number: string;
  date: string;
  doctorName: string;
  validUntil: string;
  patientName: string;
  patientTcNumber: string;
  materials: Array<{
    code: string;
    name: string;
    applicationDate: string;
    deliveryStatus: 'delivered' | 'pending';
  }>;
  sgkDocumentAvailable: boolean;
  patientFormAvailable: boolean;
  sgkStatus: 'success' | 'processing' | 'error';
}

interface PatientSGKTabProps {
  patientId: string;
}

export const PatientSGKTab: React.FC<PatientSGKTabProps> = ({ patientId }) => {
  const { success: showSuccess, error: showError, info: showInfo } = useToastHelpers();
  const [savedEReceipts, setSavedEReceipts] = useState<EReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEReceipt, setSelectedEReceipt] = useState<EReceipt | null>(null);
  const [editingEReceipt, setEditingEReceipt] = useState<EReceipt | null>(null);

  useEffect(() => {
    loadSavedEReceipts();
  }, [patientId]);

  const loadSavedEReceipts = async () => {
    setLoading(true);
    try {
      // Mock data - gerçek uygulamada API'den gelecek
      const mockEReceipts: EReceipt[] = [
        {
          id: 'er1',
          number: 'ER20241001',
          date: '2024-10-15',
          doctorName: 'Dr. Zeynep Kaya',
          validUntil: '2026-10-15',
          patientName: 'Ahmet Yılmaz',
          patientTcNumber: '12345678901',
          materials: [
            {
              code: 'DMT001',
              name: 'Dijital programlanabilir işitme cihazı - sağ',
              applicationDate: '2024-10-15',
              deliveryStatus: 'delivered'
            }
          ],
          sgkDocumentAvailable: true,
          patientFormAvailable: true,
          sgkStatus: 'success'
        },
        {
          id: 'er2',
          number: 'ER20241002',
          date: '2024-10-20',
          doctorName: 'Dr. Mehmet Öz',
          validUntil: '2026-10-20',
          patientName: 'Ayşe Demir',
          patientTcNumber: '23456789012',
          materials: [
            {
              code: 'DMT002',
              name: 'Dijital programlanabilir işitme cihazı - sol',
              applicationDate: '2024-10-20',
              deliveryStatus: 'delivered'
            }
          ],
          sgkDocumentAvailable: true,
          patientFormAvailable: true,
          sgkStatus: 'success'
        },
        {
          id: 'er3',
          number: 'ER20241003',
          date: '2024-10-25',
          doctorName: 'Dr. Ali Veli',
          validUntil: '2026-10-25',
          patientName: 'Fatma Kaya',
          patientTcNumber: '34567890123',
          materials: [
            {
              code: 'DMT003',
              name: 'Dijital programlanabilir işitme cihazı - çift',
              applicationDate: '2024-10-25',
              deliveryStatus: 'delivered'
            }
          ],
          sgkDocumentAvailable: true,
          patientFormAvailable: true,
          sgkStatus: 'success'
        },
        {
          id: 'er4',
          number: 'ER20241004',
          date: '2024-10-26',
          doctorName: 'Dr. Hasan Demir',
          validUntil: '2026-10-26',
          patientName: 'Mehmet Öz',
          patientTcNumber: '45678901234',
          materials: [
            {
              code: 'DMT004',
              name: 'Dijital programlanabilir işitme cihazı - sağ',
              applicationDate: '2024-10-26',
              deliveryStatus: 'delivered'
            }
          ],
          sgkDocumentAvailable: true,
          patientFormAvailable: true,
          sgkStatus: 'success'
        }
      ];

      setSavedEReceipts(mockEReceipts);
    } catch (error) {
      console.error('Error loading saved e-receipts:', error);
      showError('Hata', 'Kaydedilen e-reçeteler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const downloadPatientForm = async (eReceipt: EReceipt) => {
    try {
      setLoading(true);
      showInfo('İndirme Başlatılıyor', 'Hasta işlem formu indiriliyor...');

      // Gerçek API çağrısı ile hasta formunu indir
      const blob = await sgkService.downloadPatientForm(eReceipt.id);

      // Dosyayı indir
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hasta_formu_${eReceipt.number}.txt`; // Backend'den gelen dosya adı
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess('İndirme Tamamlandı', 'Hasta işlem formu başarıyla indirildi.');
    } catch (error) {
      console.error('Download patient form error:', error);
      showError('İndirme Hatası', 'Hasta işlem formu indirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEReceipt = (eReceipt: EReceipt) => {
    setEditingEReceipt(eReceipt);
  };

  const handleSaveEReceipt = async (updatedEReceipt: EReceipt) => {
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 500));

      setSavedEReceipts(prev =>
        prev.map(er => er.id === updatedEReceipt.id ? updatedEReceipt : er)
      );

      setEditingEReceipt(null);
      showSuccess('Başarılı', 'E-reçete güncellendi');
    } catch (error) {
      showError('Hata', 'E-reçete güncellenirken bir hata oluştu');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'SGK Onaylandı';
      case 'processing':
        return 'SGK İşleniyor';
      case 'error':
        return 'SGK Hatası';
      default:
        return 'Bilinmiyor';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">E-reçeteler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Kaydedilen E-Reçeteler</h2>
          <p className="text-sm text-gray-600">SGK işlemleri için kaydedilen e-reçeteler</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Yeni E-Reçete Sorgula
        </Button>
      </div>

      {/* Saved E-Receipts List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Kaydedilen E-Reçeteler ({savedEReceipts.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {savedEReceipts.length > 0 ? (
            savedEReceipts.map((eReceipt) => (
              <div key={eReceipt.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">E-Reçete #{eReceipt.number}</h4>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(eReceipt.sgkStatus)}
                        <span className="text-sm text-gray-600">{getStatusText(eReceipt.sgkStatus)}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <span>{eReceipt.doctorName}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(eReceipt.date).toLocaleDateString('tr-TR')}</span>
                      <span className="mx-2">•</span>
                      <span>{eReceipt.materials.length} malzeme</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEReceipt(eReceipt)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Görüntüle
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditEReceipt(eReceipt)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Düzenle
                    </Button>

                    {/* Hasta İşlem Formu İndir butonu - koşullu gösterim */}
                    {eReceipt.materials.every(m => m.deliveryStatus === 'delivered') &&
                     eReceipt.sgkDocumentAvailable &&
                     eReceipt.patientFormAvailable && (
                      <Button
                        size="sm"
                        onClick={() => downloadPatientForm(eReceipt)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Hasta İşlem Formu İndir
                      </Button>
                    )}
                  </div>
                </div>

                {/* Materials summary */}
                <div className="mt-3 text-xs text-gray-500">
                  {eReceipt.materials.map((material, index) => (
                    <span key={index}>
                      {material.name} ({material.code})
                      {index < eReceipt.materials.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>Kaydedilen e-reçete bulunamadı.</p>
              <p className="text-sm">Yeni e-reçete sorgulamak için yukarıdaki butona tıklayın.</p>
            </div>
          )}
        </div>
      </div>

      {/* E-Receipt Detail Modal */}
      {selectedEReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">E-Reçete Detayları - {selectedEReceipt.number}</h3>
                <button
                  onClick={() => setSelectedEReceipt(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hasta</label>
                    <p className="text-sm text-gray-900">{selectedEReceipt.patientName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">TC Kimlik</label>
                    <p className="text-sm text-gray-900">{selectedEReceipt.patientTcNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Doktor</label>
                    <p className="text-sm text-gray-900">{selectedEReceipt.doctorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tarih</label>
                    <p className="text-sm text-gray-900">{new Date(selectedEReceipt.date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Geçerlilik</label>
                    <p className="text-sm text-gray-900">{new Date(selectedEReceipt.validUntil).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SGK Durumu</label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedEReceipt.sgkStatus)}
                      <span className="text-sm text-gray-900">{getStatusText(selectedEReceipt.sgkStatus)}</span>
                    </div>
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">Malzemeler</label>
                  <div className="space-y-3">
                    {selectedEReceipt.materials.map((material, index) => (
                      <div key={`${material.code}-${index}`} className={`border rounded-lg p-4 ${
                        material.deliveryStatus === 'delivered'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className={`font-medium ${
                              material.deliveryStatus === 'delivered' ? 'text-green-800' : 'text-yellow-800'
                            }`}>
                              {material.name}
                            </p>
                            <p className={`text-sm ${
                              material.deliveryStatus === 'delivered' ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              Kod: {material.code}
                            </p>
                            <p className={`text-sm ${
                              material.deliveryStatus === 'delivered' ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              Başvuru Tarihi: {new Date(material.applicationDate).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            material.deliveryStatus === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {material.deliveryStatus === 'delivered' ? 'Teslim Edildi' : 'Bekliyor'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {selectedEReceipt.materials.every(m => m.deliveryStatus === 'delivered') &&
                   selectedEReceipt.sgkDocumentAvailable &&
                   selectedEReceipt.patientFormAvailable && (
                    <Button
                      onClick={() => downloadPatientForm(selectedEReceipt)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Hasta İşlem Formunu İndir
                    </Button>
                  )}
                  <Button onClick={() => setSelectedEReceipt(null)} variant="outline">
                    Kapat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit E-Receipt Modal */}
      {editingEReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">E-Reçete Düzenle - {editingEReceipt.number}</h3>
                <button
                  onClick={() => setEditingEReceipt(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Form fields would go here */}
                <div className="text-center py-8">
                  <p className="text-gray-500">Düzenleme formu yakında eklenecek...</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button onClick={() => setEditingEReceipt(null)} variant="outline">
                    İptal
                  </Button>
                  <Button
                    onClick={() => handleSaveEReceipt(editingEReceipt)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Kaydet
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
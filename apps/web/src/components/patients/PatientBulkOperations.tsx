import React, { useState, useCallback } from 'react';
import { Upload, Download, Users, Tag, MessageSquare, Trash2, FileText, AlertCircle } from 'lucide-react';
import { Button, Modal, useModal, Input, Select, Textarea, Checkbox, Badge, useToastHelpers } from '@x-ear/ui-web';
import { Patient } from '../../types/patient';
import { patientsBulkUploadPatients, patientsExportPatientsCsv } from '../../api/generated/patients/patients';

interface PatientBulkOperationsProps {
  selectedPatients: Patient[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresConfirmation: boolean;
  color: 'primary' | 'secondary' | 'danger' | 'warning';
}

interface CSVImportData {
  file: File | null;
  mapping: Record<string, string>;
  preview: any[];
  errors: string[];
}

const BULK_ACTIONS: BulkAction[] = [
  {
    id: 'export-csv',
    label: 'CSV Dışa Aktar',
    icon: <Download className="w-4 h-4" />,
    description: 'Seçili hastaları CSV formatında dışa aktar',
    requiresConfirmation: false,
    color: 'primary'
  },
  {
    id: 'bulk-tag',
    label: 'Toplu Etiketleme',
    icon: <Tag className="w-4 h-4" />,
    description: 'Seçili hastalara toplu etiket ekle/çıkar',
    requiresConfirmation: false,
    color: 'secondary'
  },
  {
    id: 'bulk-sms',
    label: 'Toplu SMS',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'Seçili hastalara toplu SMS gönder',
    requiresConfirmation: true,
    color: 'primary'
  },
  {
    id: 'bulk-delete',
    label: 'Toplu Silme',
    icon: <Trash2 className="w-4 h-4" />,
    description: 'Seçili hastaları kalıcı olarak sil',
    requiresConfirmation: true,
    color: 'danger'
  }
];

const CSV_FIELD_MAPPING = {
  'name': 'Ad Soyad',
  'phone': 'Telefon',
  'email': 'E-posta',
  'birthDate': 'Doğum Tarihi',
  'address': 'Adres',
  'notes': 'Notlar',
  'tags': 'Etiketler',
  'segment': 'Segment',
  'status': 'Durum'
};

export const PatientBulkOperations: React.FC<PatientBulkOperationsProps> = ({
  selectedPatients,
  onClearSelection,
  onRefresh
}) => {
  const { success, error } = useToastHelpers();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // CSV Import State
  const [csvImport, setCsvImport] = useState<CSVImportData>({
    file: null,
    mapping: {},
    preview: [],
    errors: []
  });
  
  // Bulk Actions State
  const [bulkTagData, setBulkTagData] = useState({
    action: 'add' as 'add' | 'remove',
    tags: [] as string[],
    newTag: ''
  });
  
  const [bulkSmsData, setBulkSmsData] = useState({
    message: '',
    template: '',
    sendTime: 'now' as 'now' | 'scheduled',
    scheduledTime: ''
  });

  // Modals
  const exportModal = useModal();
  const importModal = useModal();
  const tagModal = useModal();
  const smsModal = useModal();
  const deleteModal = useModal();

  const handleActionClick = useCallback((actionId: string) => {
    setActiveAction(actionId);
    
    switch (actionId) {
      case 'export-csv':
        exportModal.openModal();
        break;
      case 'import-csv':
        importModal.openModal();
        break;
      case 'bulk-tag':
        tagModal.openModal();
        break;
      case 'bulk-sms':
        smsModal.openModal();
        break;
      case 'bulk-delete':
        deleteModal.openModal();
        break;
    }
  }, [exportModal, importModal, tagModal, smsModal, deleteModal]);

  const handleCSVExport = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      // Backend API'den CSV export et
      const response = await patientsExportPatientsCsv();
      
      // Response'dan blob oluştur ve indir
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `hastalar_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      success(`Hasta verileri CSV formatında dışa aktarıldı`);
      exportModal.closeModal();
      
    } catch (err: any) {
      console.error('CSV export error:', err);
      error(err?.response?.data?.error || 'CSV dışa aktarma sırasında hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  }, [success, error, exportModal]);

  const handleCSVImport = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      
      // Önce dosyayı okuyup preview oluştur
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV dosyası en az 2 satır içermelidir (başlık + veri)');
      }
      
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {} as any);
      });
      
      setCsvImport({
        file,
        mapping: {},
        preview,
        errors: []
      });
      
    } catch (err: any) {
      console.error('CSV read error:', err);
      error('CSV dosyası okunurken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  }, [error]);

  const handleCSVImportSubmit = useCallback(async () => {
    if (!csvImport.file) return;
    
    try {
      setIsProcessing(true);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('file', csvImport.file);
      
      // Backend API'ye gönder
      const response = await patientsBulkUploadPatients(formData);
      
      if (response.data?.success) {
        const { created = 0, updated = 0, errors = [] } = response.data;
        
        if (errors.length > 0) {
          warning(`${created + updated} hasta işlendi, ${errors.length} hata oluştu`);
        } else {
          success(`${created} yeni hasta eklendi, ${updated} hasta güncellendi`);
        }
        
        importModal.closeModal();
        onRefresh();
        
        // CSV import state'ini temizle
        setCsvImport({
          file: null,
          mapping: {},
          preview: [],
          errors: []
        });
      } else {
        throw new Error(response.data?.error || 'Import işlemi başarısız');
      }
      
    } catch (err: any) {
      console.error('CSV import error:', err);
      error(err?.response?.data?.error || 'CSV içe aktarma sırasında hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  }, [csvImport.file, success, warning, error, importModal, onRefresh]);

  const handleBulkTag = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      // API çağrısı simülasyonu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const action = bulkTagData.action === 'add' ? 'eklendi' : 'kaldırıldı';
      success(`${selectedPatients.length} hastaya etiket ${action}`);
      
      tagModal.closeModal();
      onRefresh();
      
    } catch (err) {
      error('Toplu etiketleme sırasında hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  }, [bulkTagData, selectedPatients.length, success, error, tagModal, onRefresh]);

  const handleBulkSMS = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      // API çağrısı simülasyonu
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      success(`${selectedPatients.length} hastaya SMS gönderildi`);
      
      smsModal.closeModal();
      onRefresh();
      
    } catch (err) {
      error('Toplu SMS gönderimi sırasında hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPatients.length, success, error, smsModal, onRefresh]);

  const handleBulkDelete = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      // API çağrısı simülasyonu
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      success(`${selectedPatients.length} hasta silindi`);
      
      deleteModal.closeModal();
      onClearSelection();
      onRefresh();
      
    } catch (err) {
      error('Toplu silme sırasında hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPatients.length, success, error, deleteModal, onClearSelection, onRefresh]);

  if (selectedPatients.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bulk Operations Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedPatients.length} hasta seçildi
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {BULK_ACTIONS.map(action => (
                <Button
                  key={action.id}
                  variant={action.color === 'danger' ? 'danger' : action.color === 'primary' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleActionClick(action.id)}
                  disabled={isProcessing}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActionClick('import-csv')}
                disabled={isProcessing}
              >
                <Upload className="w-4 h-4" />
                CSV İçe Aktar
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            Seçimi Temizle
          </Button>
        </div>
      </div>

      {/* CSV Export Modal */}
      <Modal
        isOpen={exportModal.isOpen}
        onClose={exportModal.closeModal}
        title="CSV Dışa Aktarma"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Dışa Aktarılacak Veriler</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              {Object.values(CSV_FIELD_MAPPING).map(field => (
                <div key={field} className="flex items-center space-x-2">
                  <FileText className="w-3 h-3" />
                  <span>{field}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={exportModal.closeModal}>
              İptal
            </Button>
            <Button 
              onClick={handleCSVExport}
              loading={isProcessing}
            >
              <Download className="w-4 h-4 mr-2" />
              Dışa Aktar
            </Button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={importModal.isOpen}
        onClose={importModal.closeModal}
        title="CSV İçe Aktarma"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV Dosyası Seç
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCSVImport(file);
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          {csvImport.preview.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Önizleme</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(csvImport.preview[0]).map(header => (
                        <th key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvImport.preview.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={importModal.closeModal}>
              İptal
            </Button>
            <Button 
              disabled={!csvImport.file}
              loading={isProcessing}
              onClick={handleCSVImportSubmit}
            >
              <Upload className="w-4 h-4 mr-2" />
              İçe Aktar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Tag Modal */}
      <Modal
        isOpen={tagModal.isOpen}
        onClose={tagModal.closeModal}
        title="Toplu Etiketleme"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşlem Türü
            </label>
            <Select
              value={bulkTagData.action}
              onChange={(value) => setBulkTagData(prev => ({ ...prev, action: value }))}
              options={[
                { label: 'Etiket Ekle', value: 'add' },
                { label: 'Etiket Kaldır', value: 'remove' }
              ]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Etiket Ekle
            </label>
            <div className="flex space-x-2">
              <Input
                value={bulkTagData.newTag}
                onChange={(e) => setBulkTagData(prev => ({ ...prev, newTag: e.target.value }))}
                placeholder="Etiket adı..."
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (bulkTagData.newTag.trim()) {
                    setBulkTagData(prev => ({
                      ...prev,
                      tags: [...prev.tags, prev.newTag.trim()],
                      newTag: ''
                    }));
                  }
                }}
              >
                Ekle
              </Button>
            </div>
          </div>
          
          {bulkTagData.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seçili Etiketler
              </label>
              <div className="flex flex-wrap gap-2">
                {bulkTagData.tags.map((tag, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200"
                    onClick={() => setBulkTagData(prev => ({
                      ...prev,
                      tags: prev.tags.filter((_, i) => i !== index)
                    }))}
                  >
                    {tag} ×
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={tagModal.closeModal}>
              İptal
            </Button>
            <Button 
              onClick={handleBulkTag}
              loading={isProcessing}
              disabled={bulkTagData.tags.length === 0}
            >
              <Tag className="w-4 h-4 mr-2" />
              Uygula
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk SMS Modal */}
      <Modal
        isOpen={smsModal.isOpen}
        onClose={smsModal.closeModal}
        title="Toplu SMS Gönderimi"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMS Mesajı
            </label>
            <Textarea
              value={bulkSmsData.message}
              onChange={(e) => setBulkSmsData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="SMS mesajınızı yazın..."
              rows={4}
            />
            <div className="text-sm text-gray-500 mt-1">
              {bulkSmsData.message.length}/160 karakter
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Uyarı:</strong> {selectedPatients.length} hastaya SMS gönderilecek. 
                Bu işlem geri alınamaz ve SMS ücreti uygulanacaktır.
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={smsModal.closeModal}>
              İptal
            </Button>
            <Button 
              onClick={handleBulkSMS}
              loading={isProcessing}
              disabled={!bulkSmsData.message.trim()}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS Gönder
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.closeModal}
        title="Toplu Silme Onayı"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Dikkat!</h4>
                <p className="text-sm text-red-800 mt-1">
                  {selectedPatients.length} hasta kalıcı olarak silinecek. 
                  Bu işlem geri alınamaz ve tüm hasta verileri kaybolacaktır.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h5 className="font-medium text-gray-900">Silinecek Hastalar:</h5>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedPatients.slice(0, 10).map(patient => (
                <div key={patient.id} className="text-sm text-gray-600">
                  • {patient.name} ({patient.phone})
                </div>
              ))}
              {selectedPatients.length > 10 && (
                <div className="text-sm text-gray-500">
                  ... ve {selectedPatients.length - 10} hasta daha
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={deleteModal.closeModal}>
              İptal
            </Button>
            <Button 
              variant="danger"
              onClick={handleBulkDelete}
              loading={isProcessing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Sil
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PatientBulkOperations;
import React, { useState, useEffect } from 'react';
import { Button, Input, Badge } from '@x-ear/ui-web';
import { Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import { Upload, Eye, Download, Trash2, FileText, X, AlertCircle, CheckCircle, Clock, Search, Filter } from 'lucide-react';

// API imports
import { getPatients } from '../../api/generated/patients/patients';
import { getSgk } from '../../api/generated/sgk/sgk';
import { getOcr } from '../../api/generated/ocr/ocr';
import { getAutomation } from '../../api/generated/automation/automation';

interface Document {
  id: string;
  name: string;
  type: 'sgk' | 'medical' | 'invoice' | 'other';
  uploadDate: string;
  size: string;
  status: 'processing' | 'completed' | 'error';
  url?: string;
}

interface PatientDocumentsTabProps {
  patientId: string;
}

export const PatientDocumentsTab: React.FC<PatientDocumentsTabProps> = ({ patientId }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Toast helpers
  const { success, error, info } = useToastHelpers();


  // API functions
  const { sgkGetPatientSgkDocuments } = getPatients();
  const { sgkUploadSgkDocument, sgkDeleteSgkDocument } = getSgk();
  const { sgkProcessOcr } = getOcr();
  const { automationTriggerSgkProcessing } = getAutomation();

  useEffect(() => {
    loadDocuments();
  }, [patientId]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      // Load SGK documents for the patient
      await sgkGetPatientSgkDocuments(patientId);
      
      // Mock data for now - replace with actual API response
      const mockDocuments: Document[] = [
        {
          id: '1',
          name: 'SGK Raporu - Ocak 2024.pdf',
          type: 'sgk',
          uploadDate: '2024-01-15',
          size: '2.3 MB',
          status: 'completed'
        },
        {
          id: '2',
          name: 'Odyoloji Testi Sonuçları.pdf',
          type: 'medical',
          uploadDate: '2024-01-10',
          size: '1.8 MB',
          status: 'completed'
        },
        {
          id: '3',
          name: 'Fatura - INV-2024-001.pdf',
          type: 'invoice',
          uploadDate: '2024-01-08',
          size: '0.5 MB',
          status: 'processing'
        }
      ];
      
      setDocuments(mockDocuments);
    } catch (loadError) {
      console.error('Error loading documents:', loadError);
      error('Dokümanlar yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedDocumentType === 'all' || doc.type === selectedDocumentType;
    return matchesSearch && matchesType;
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setIsUploading(true);
      
      for (const file of Array.from(files)) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patient_id', patientId);
        formData.append('document_type', selectedDocumentType === 'all' ? 'other' : selectedDocumentType);
        
        // Upload SGK document
        if (selectedDocumentType === 'sgk' || file.name.toLowerCase().includes('sgk')) {
          await sgkUploadSgkDocument(formData as any);
          
          // Trigger OCR processing for SGK documents
          await sgkProcessOcr({
            document_id: `temp_${Date.now()}`, // This would come from upload response
            patient_id: patientId
          });
          
          // Trigger automated SGK processing
          await automationTriggerSgkProcessing({
            patient_id: patientId,
            document_id: `temp_${Date.now()}`
          });
        }
      }
      
      success(`${files.length} doküman başarıyla yüklendi.`);
      
      // Reload documents
      await loadDocuments();
      setIsUploadModalOpen(false);
    } catch (err) {
      console.error('Error uploading files:', err);
      error('Doküman yüklenirken bir hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDocument = (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (document?.url) {
      window.open(document.url, '_blank');
    } else {
      info('Doküman görüntüleme özelliği yakında eklenecek.');
    }
  };

  const handleDownloadDocument = (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (document) {
      // Create a temporary download link
      const link = window.document.createElement('a');
      link.href = document.url || '#';
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await sgkDeleteSgkDocument(documentId);
      
      success('Doküman başarıyla silindi.');
      
      // Reload documents
      await loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      error('Doküman silinirken bir hata oluştu.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      completed: 'Tamamlandı',
      processing: 'İşleniyor',
      error: 'Hata'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatFileSize = (sizeStr: string) => {
    return sizeStr; // Already formatted in mock data
  };

  return (
    <div className="space-y-6">
      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Belge Yükle</h3>
              <Button
                onClick={() => setIsUploadModalOpen(false)}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dosya Seç
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isUploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Belge Türü
                </label>
                <select 
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="other">Diğer</option>
                  <option value="sgk">SGK Belgesi</option>
                  <option value="medical">Tıbbi Rapor</option>
                  <option value="invoice">Fatura</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setIsUploadModalOpen(false)}
                  variant="outline"
                  disabled={isUploading}
                >
                  İptal
                </Button>
                <Button 
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                >
                  {isUploading ? 'Yükleniyor...' : 'Kapat'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Upload Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Belge Yönetimi</h3>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Belge Yükle
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Belge ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedDocumentType}
          onChange={(e) => setSelectedDocumentType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tümü</option>
          <option value="sgk">SGK</option>
          <option value="medical">Tıbbi</option>
          <option value="invoice">Fatura</option>
          <option value="other">Diğer</option>
        </select>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Dokümanlar yükleniyor...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{doc.type}</p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(doc.size)} • {new Date(doc.uploadDate).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(doc.status)}
                    {getStatusBadge(doc.status)}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={() => handleViewDocument(doc.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDownloadDocument(doc.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteDocument(doc.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredDocuments.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>
                {searchTerm || selectedDocumentType !== 'all' 
                  ? 'Arama kriterlerine uygun belge bulunamadı.' 
                  : 'Henüz yüklenmiş belge bulunmamaktadır.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
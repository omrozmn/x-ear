import React, { useState, useMemo } from 'react';
import { usePatientDocuments, PatientDocument } from '../hooks/patient/usePatientDocuments';
import { PatientDocumentCard } from './patient/PatientDocumentCard';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { DocumentUploadForm } from './forms/DocumentUploadForm';
import { File, AlertCircle, Clock, FileText, Smartphone, Plus } from 'lucide-react';
import { Button, Input, Select } from '@x-ear/ui-web';

interface PatientDocumentsTabProps {
  patientId: string;
  tabCount?: number;
}

export const PatientDocumentsTab: React.FC<PatientDocumentsTabProps> = ({
  patientId,
  tabCount
}) => {
  const { documents, isLoading: documentsLoading, error: documentsError } = usePatientDocuments(patientId);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Document type filter
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === documentTypeFilter);
    }

    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(doc => doc.uploadDate && new Date(doc.uploadDate) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(doc => doc.uploadDate && new Date(doc.uploadDate) <= endDate);
    }

    return filtered;
  }, [documents, searchTerm, documentTypeFilter, dateRange]);

  // Calculate statistics based on filtered documents
  const filteredStats = useMemo(() => {
    const documentTypeCounts = filteredDocuments.reduce((acc, doc) => {
      acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalSize = filteredDocuments.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
    const recentDocuments = filteredDocuments.filter(doc =>
      doc.uploadDate && new Date(doc.uploadDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    return { documentTypeCounts, totalSize, recentDocuments };
  }, [filteredDocuments]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (documentsLoading) {
    return (
      <div className="p-6" role="status" aria-label="Belgeler yükleniyor">
        <LoadingSkeleton lines={4} className="mb-4" />
        <div className="grid gap-4">
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (documentsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Belgeler yüklenirken hata oluştu</h3>
              <p className="mt-1 text-sm text-red-700">
                {typeof documentsError === 'string' ? documentsError : documentsError.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleDocumentClick = (document: PatientDocument) => {
    // TODO: Implement document preview modal
    console.log('Document clicked:', document);
  };

  const handleUploadFormClose = () => {
    setShowUploadForm(false);
  };

  const handleDocumentUpload = async (formData: FormData) => {
    setIsUploading(true);
    try {
      // TODO: Implement document upload API call
      console.log('Document upload:', formData);
      setShowUploadForm(false);
    } catch (error) {
      console.error('Document upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadClick = (document: PatientDocument) => {
    // TODO: Implement document download
    console.log('Download document:', document);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <File className="w-5 h-5 mr-2" aria-hidden="true" />
          Hasta Belgeleri {tabCount !== undefined && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {tabCount}
            </span>
          )}
        </h3>
        {filteredDocuments.length > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Toplam Boyut</p>
            <p className="text-lg font-semibold text-green-600">{formatFileSize(filteredStats.totalSize)}</p>
          </div>
        )}
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Belge Ara
            </label>
            <div className="mt-1">
              <Input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Belge adını yazın..."
              />
            </div>
          </div>
          <div>
            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
              Belge Tipi
            </label>
            <div className="mt-1">
              <Select
                id="documentType"
                value={documentTypeFilter}
                onChange={(e) => setDocumentTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Tümü' },
                  { value: 'report', label: 'Raporlar' },
                  { value: 'test_result', label: 'Test Sonuçları' }
                ]}
              />
            </div>
          </div>
          <div>
            <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
              Tarih Aralığı
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input
                type="date"
                id="startDate"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <Input
                type="date"
                id="endDate"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <File className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Toplam Belge</p>
                <p className="text-lg font-semibold text-blue-900">{filteredDocuments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-green-600">Son 30 Gün</p>
                <p className="text-lg font-semibold text-green-900">{filteredStats.recentDocuments}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-purple-600">Raporlar</p>
                <p className="text-lg font-semibold text-purple-900">{filteredStats.documentTypeCounts['report'] || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Smartphone className="w-5 h-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-orange-600">Test Sonuçları</p>
                <p className="text-lg font-semibold text-orange-900">{filteredStats.documentTypeCounts['test_result'] || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12" role="status">
          <File className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {documents.length === 0 ? 'Henüz belge yok' : 'Filtreye uygun belge bulunamadı'}
          </h3>
          <p className="text-gray-500">
            {documents.length === 0
              ? 'Bu hastaya ait henüz hiçbir belge yüklenmemiş.'
              : 'Arama kriterlerinizi değiştirerek daha fazla sonuç görebilirsiniz.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4" role="list" aria-label="Hasta belgeleri listesi">
          {filteredDocuments.map((document) => (
            <div key={document.id} role="listitem">
              <PatientDocumentCard
                document={document}
                onDocumentClick={handleDocumentClick}
                onDownloadClick={handleDownloadClick}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Button
          onClick={() => setShowUploadForm(true)}
          className="w-full sm:w-auto"
          variant="primary"
        >
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Yeni Belge Yükle
        </Button>
      </div>

      {showUploadForm && (
        <DocumentUploadForm
          patientId={patientId}
          isOpen={showUploadForm}
          onClose={handleUploadFormClose}
          onUpload={handleDocumentUpload}
          isLoading={isUploading}
        />
      )}
    </div>
  );
};
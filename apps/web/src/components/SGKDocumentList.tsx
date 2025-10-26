import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Input, Select } from '@x-ear/ui-web';
import { 
  SGKDocument, 
  SGKDocumentFilters, 
  SGKSearchResult,
  SGKWorkflowStatus,
  SGKDocumentType
} from '../types/sgk';
import sgkService from '../services/sgk/sgk.service';
import { 
  Download, 
  Trash2, 
  CheckSquare, 
  Square, 
  Eye,
  Edit
} from 'lucide-react';
import DocumentViewer from './sgk/DocumentViewer';

type SGKProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface SGKDocumentListProps {
  patientId?: string;
  filters?: SGKDocumentFilters;
  onDocumentSelect?: (document: SGKDocument) => void;
  onDocumentEdit?: (document: SGKDocument) => void;
  onDocumentDelete?: (documentId: string) => void;
  onWorkflowUpdate?: (documentId: string, status: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const SGKDocumentList: React.FC<SGKDocumentListProps> = ({
  patientId,
  filters: externalFilters,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  onWorkflowUpdate,
  showActions = true,
  compact = false
}) => {
  const [documents, setDocuments] = useState<SGKDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<SGKDocumentType | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<SGKWorkflowStatus | ''>('');
  const [selectedProcessingStatus, setSelectedProcessingStatus] = useState<SGKProcessingStatus | ''>('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Batch operations state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  
  // Document viewer state
  const [viewerDocument, setViewerDocument] = useState<SGKDocument | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  // Load documents function
  const filters = useMemo(() => ({
    ...externalFilters,
    patientId,
    search: searchTerm || undefined,
    documentType: selectedType || undefined,
    status: selectedStatus || undefined,
    processingStatus: selectedProcessingStatus || undefined
  }), [externalFilters, patientId, searchTerm, selectedType, selectedStatus, selectedProcessingStatus]);

  const loadDocuments = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await sgkService.listDocuments(patientId, filters);
      const documents = Array.isArray(response.data) ? response.data : [];
      setDocuments(documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belgeler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const sortedDocuments = useMemo(() => {
    const sorted = [...documents];
    
    sorted.sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      switch (sortBy) {
        case 'name':
          aValue = a.filename;
          bValue = b.filename;
          break;
        case 'type':
          aValue = a.documentType;
          bValue = b.documentType;
          break;
        case 'status':
          aValue = a.processingStatus;
          bValue = b.processingStatus;
          break;
        case 'date':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      const aStr = String(aValue);
      const bStr = String(bValue);

      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [documents, sortBy, sortOrder]);

  const getDocumentTypeLabel = (type: SGKDocumentType): string => {
    const labels: Record<SGKDocumentType, string> = {
      recete: 'E-Reçete',
      rapor: 'Rapor',
      belge: 'Belge',
      fatura: 'Fatura',
      teslim: 'Teslim Belgesi',
      iade: 'İade Belgesi'
    };
    return labels[type] || type;
  };

  const getProcessingStatusColor = (status: SGKProcessingStatus): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProcessingStatusLabel = (status: SGKProcessingStatus): string => {
    const labels: Record<SGKProcessingStatus, string> = {
      pending: 'Bekliyor',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      failed: 'Başarısız'
    };
    return labels[status] || status;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Batch operations handlers
  const handleSelectAll = () => {
    if (selectedDocuments.size === sortedDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(sortedDocuments.map(doc => doc.id)));
    }
  };

  const handleSelectDocument = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;
    
    const confirmMessage = `${selectedDocuments.size} belgeyi silmek istediğinizden emin misiniz?`;
    if (!window.confirm(confirmMessage)) return;

    setBatchLoading(true);
    try {
      const deletePromises = Array.from(selectedDocuments).map(id => 
        sgkService.deleteDocument(id)
      );
      await Promise.all(deletePromises);
      
      await loadDocuments();
      setSelectedDocuments(new Set());
      setShowBatchActions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu silme işlemi başarısız');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocuments.size === 0) return;
    
    setBatchLoading(true);
    try {
      const selectedDocs = sortedDocuments.filter(doc => selectedDocuments.has(doc.id));
      
      // Create a zip file or download individually
      for (const doc of selectedDocs) {
        if (doc.fileUrl) {
          const link = window.document.createElement('a');
          link.href = doc.fileUrl;
          link.download = doc.filename;
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
          
          // Add small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setSelectedDocuments(new Set());
      setShowBatchActions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu indirme işlemi başarısız');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (status: SGKWorkflowStatus) => {
    if (selectedDocuments.size === 0) return;
    
    setBatchLoading(true);
    try {
      const updatePromises = Array.from(selectedDocuments).map(id => 
        sgkService.updateDocumentStatus(id, status)
      );
      await Promise.all(updatePromises);
      
      await loadDocuments();
      setSelectedDocuments(new Set());
      setShowBatchActions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu durum güncelleme başarısız');
    } finally {
      setBatchLoading(false);
    }
  };

  // Document viewer handlers
  const handleViewDocument = (document: SGKDocument) => {
    setViewerDocument(document);
    setShowViewer(true);
  };

  const handleDownloadDocument = (document: SGKDocument) => {
    if (document.fileUrl) {
      const link = window.document.createElement('a');
      link.href = document.fileUrl;
      link.download = document.filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  // Update showBatchActions when selection changes
  useEffect(() => {
    setShowBatchActions(selectedDocuments.size > 0);
  }, [selectedDocuments]);

  // Load documents on mount and filter changes
  useEffect(() => {
    loadDocuments();
  }, [patientId, filters, loadDocuments]);

  // Handle sorting
  const handleSort = (field: 'date' | 'name' | 'type' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Handle delete
  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await sgkService.deleteDocument(documentId);
      await loadDocuments();
      onDocumentDelete?.(documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge silinirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Belgeler yükleniyor...</span>
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
            <p className="mt-1 text-sm text-red-700">{error}</p>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {!compact && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Belge ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as SGKDocumentType | '')}
                options={[
                  { value: '', label: 'Tüm türler' },
                  { value: 'recete', label: 'E-Reçete' },
                  { value: 'rapor', label: 'Rapor' },
                  { value: 'belge', label: 'Belge' },
                  { value: 'fatura', label: 'Fatura' },
                  { value: 'teslim', label: 'Teslim Belgesi' },
                  { value: 'iade', label: 'İade Belgesi' }
                ]}
                placeholder="Belge türü"
                className="w-full"
              />
            </div>
            <div>
              <Select
                value={selectedProcessingStatus}
                onChange={(e) => setSelectedProcessingStatus(e.target.value as SGKProcessingStatus | '')}
                options={[
                  { value: '', label: 'Tüm durumlar' },
                  { value: 'pending', label: 'Bekliyor' },
                  { value: 'processing', label: 'İşleniyor' },
                  { value: 'completed', label: 'Tamamlandı' },
                  { value: 'failed', label: 'Başarısız' }
                ]}
                placeholder="İşlem durumu"
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Batch Actions Bar */}
      {showBatchActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedDocuments.size} belge seçildi
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocuments(new Set())}
                disabled={batchLoading}
              >
                Seçimi Temizle
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                disabled={batchLoading}
                className="flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>İndir</span>
              </Button>
              
              <Select
                value=""
                onChange={(e) => handleBulkStatusUpdate(e.target.value as SGKWorkflowStatus)}
                options={[
                  { value: 'pending', label: 'Bekliyor' },
                  { value: 'processing', label: 'İşleniyor' },
                  { value: 'completed', label: 'Tamamlandı' },
                  { value: 'failed', label: 'Başarısız' }
                ]}
                placeholder="Durum Güncelle"
                disabled={batchLoading}
                className="w-48"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={batchLoading}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sil</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {sortedDocuments.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belge bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Filtreleri değiştirerek tekrar deneyin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <Button
                      onClick={handleSelectAll}
                      variant="ghost"
                      size="sm"
                      className="w-5 h-5 p-0"
                      data-allow-raw="true"
                    >
                      {selectedDocuments.size === sortedDocuments.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </Button>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    Belge Adı
                    {sortBy === 'name' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('type')}
                  >
                    Tür
                    {sortBy === 'type' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    Durum
                    {sortBy === 'status' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boyut
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('date')}
                  >
                    Tarih
                    {sortBy === 'date' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  {showActions && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDocuments.map((document) => (
                  <tr 
                    key={document.id} 
                    className={`hover:bg-gray-50 ${selectedDocuments.has(document.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        onClick={() => handleSelectDocument(document.id)}
                        variant="ghost"
                        size="sm"
                        className="w-5 h-5 p-0 text-gray-500 hover:text-gray-700"
                        data-allow-raw="true"
                      >
                        {selectedDocuments.has(document.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {document.filename}
                          </div>
                          {document.extractedInfo?.patientName && (
                            <div className="text-sm text-gray-500">
                              {document.extractedInfo.patientName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getDocumentTypeLabel(document.documentType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProcessingStatusColor(document.processingStatus)}`}>
                        {getProcessingStatusLabel(document.processingStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(document.fileSize || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(document.createdAt)}
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDocument(document);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {onDocumentEdit && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDocumentEdit(document);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(document.id);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Summary */}
      {!compact && sortedDocuments.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Toplam {sortedDocuments.length} belge gösteriliyor
          {selectedDocuments.size > 0 && (
            <span className="ml-2 text-blue-600">
              • {selectedDocuments.size} seçili
            </span>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewer
        document={viewerDocument}
        isOpen={showViewer}
        onClose={() => {
          setShowViewer(false);
          setViewerDocument(null);
        }}
        onDownload={handleDownloadDocument}
      />
    </div>
  );
};
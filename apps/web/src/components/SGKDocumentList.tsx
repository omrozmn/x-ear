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
  onWorkflowUpdate?: (documentId: string, status: SGKWorkflowStatus) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const SGKDocumentList: React.FC<SGKDocumentListProps> = ({
  patientId,
  filters: _externalFilters,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentDelete,
  showActions = true,
  compact = false
}) => {
  const [documents, setDocuments] = useState<SGKDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<SGKDocumentType | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<SGKWorkflowStatus | ''>('');
  const [selectedProcessingStatus, setSelectedProcessingStatus] = useState<SGKProcessingStatus | ''>('');
  const [sortBy, _setSortBy] = useState<'date' | 'name' | 'type' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Batch operations state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  
  // Document viewer state
  const [viewerDocument, setViewerDocument] = useState<SGKDocument | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  // Load documents function


  const loadDocuments = useCallback(async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await sgkService.listDocuments(patientId);
      const documents = ((result as unknown) as SGKSearchResult).documents || [];
      setDocuments(documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belgeler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

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
      const selectedDocs = sortedDocuments.filter(doc => selectedDocuments.has(doc.id));
      const updatePromises = selectedDocs
        .filter(doc => doc.workflow?.id)
        .map(doc => sgkService.updateWorkflowStatus(doc.workflow!.id, status));
      await Promise.all(updatePromises);
      
      await loadDocuments();
      setSelectedDocuments(new Set());
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
    onDocumentSelect?.(document);
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



  // Load documents on mount and filter changes
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle sorting


  // Handle delete
  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await sgkService.deleteDocument(documentId);
      await loadDocuments();
      onDocumentDelete?.(documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge silme işlemi başarısız');
    }
  };



  const handleEdit = (document: SGKDocument) => {
    onDocumentEdit?.(document);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleTypeChange = (type: SGKDocumentType | '') => {
    setSelectedType(type);
  };

  const handleStatusChange = (status: SGKWorkflowStatus | '') => {
    setSelectedStatus(status);
  };

  const handleProcessingStatusChange = (status: SGKProcessingStatus | '') => {
    setSelectedProcessingStatus(status);
  };

  return (
    <div className="p-4">
      {/* Filters */}
      <div className={`bg-white border rounded-lg p-4 mb-4 ${compact ? 'text-sm' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
            <Input
              type="text"
              placeholder="Belge adı, türü veya açıklama"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Belge Türü</label>
            <Select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value as SGKDocumentType | '')}
              options={[
                { value: '', label: 'Tümü' },
                { value: 'recete', label: 'E-Reçete' },
                { value: 'rapor', label: 'Rapor' },
                { value: 'belge', label: 'Belge' },
                { value: 'fatura', label: 'Fatura' },
                { value: 'teslim', label: 'Teslim Belgesi' },
                { value: 'iade', label: 'İade Belgesi' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Durumu</label>
            <Select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as SGKWorkflowStatus | '')}
              options={[
                { value: '', label: 'Tümü' },
                { value: 'pending', label: 'Bekliyor' },
                { value: 'processing', label: 'İşleniyor' },
                { value: 'completed', label: 'Tamamlandı' },
                { value: 'failed', label: 'Başarısız' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İşleme Durumu</label>
            <Select
              value={selectedProcessingStatus}
              onChange={(e) => handleProcessingStatusChange(e.target.value as SGKProcessingStatus | '')}
              options={[
                { value: '', label: 'Tümü' },
                { value: 'pending', label: 'Bekliyor' },
                { value: 'processing', label: 'İşleniyor' },
                { value: 'completed', label: 'Tamamlandı' },
                { value: 'failed', label: 'Başarısız' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className={`bg-white border rounded-lg ${compact ? 'text-sm' : ''}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Belgeler</h4>
          {showActions && (
            <div className="flex items-center gap-2">
              <Button onClick={handleSelectAll} size="sm" variant="outline">
                {selectedDocuments.size === sortedDocuments.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-1" /> Seçimi Kaldır
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-1" /> Tümünü Seç
                  </>
                )}
              </Button>
              <Button onClick={handleBulkDownload} size="sm" disabled={loading || selectedDocuments.size === 0 || batchLoading}>
                <Download className="w-4 h-4 mr-1" /> İndir
              </Button>
              <Button onClick={handleBulkDelete} size="sm" variant="danger" disabled={loading || selectedDocuments.size === 0 || batchLoading}>
                <Trash2 className="w-4 h-4 mr-1" /> Sil
              </Button>
            </div>
          )}
        </div>
        <div className="divide-y">
          {sortedDocuments.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Belge bulunamadı</div>
          ) : (
            sortedDocuments.map((doc) => (
              <div key={doc.id} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <div>
                  <div className="text-sm font-medium text-gray-900">{doc.filename}</div>
                  <div className="text-xs text-gray-500">{getDocumentTypeLabel(doc.documentType)} • {formatFileSize(doc.fileSize || 0)}</div>
                  <div className="text-xs text-gray-500">{formatDate(doc.createdAt)}</div>
                </div>
                <div>
                  <span className={`px-2 py-1 rounded text-xs ${getProcessingStatusColor(doc.processingStatus as SGKProcessingStatus)}`}>
                    {getProcessingStatusLabel(doc.processingStatus as SGKProcessingStatus)}
                  </span>
                </div>
                <div>
                  {doc.workflow?.currentStatus && (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                      {doc.workflow.currentStatus}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-2">
                    <Button onClick={() => handleViewDocument(doc)} size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" /> Görüntüle
                    </Button>
                    {showActions && (
                      <>
                        <Button onClick={() => handleSelectDocument(doc.id)} size="sm" variant="ghost">
                          {selectedDocuments.has(doc.id) ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                        <Button onClick={() => handleDownloadDocument(doc)} size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleEdit(doc)} size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDelete(doc.id)} size="sm" variant="danger">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Viewer */}
      {showViewer && viewerDocument && (
        <DocumentViewer
          document={viewerDocument}
          isOpen={showViewer}
          onClose={() => setShowViewer(false)}
          onDownload={handleDownloadDocument}
        />
      )}
    </div>
  );
};
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Grid, List, Download, Trash2, Eye, Filter, RotateCcw, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, FileText, MoreVertical, SortAsc, SortDesc, CheckSquare, Square, RefreshCw, Calendar, HardDrive, User } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import DocumentViewer from './DocumentViewer';
import DocumentPreview from './DocumentPreview';
import { SGKDocument, SGKDocumentType } from '../../types/sgk';

interface DocumentGalleryProps {
  documents: SGKDocument[];
  onDocumentSelect?: (document: SGKDocument) => void;
  onDocumentDelete?: (documentId: string) => void;
  onBulkDelete?: (documentIds: string[]) => void;
  onBulkDownload?: (documentIds: string[]) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type';

export const DocumentGallery: React.FC<DocumentGalleryProps> = ({
  documents,
  onDocumentSelect,
  onDocumentDelete,
  onBulkDelete,
  onBulkDownload,
  onRefresh,
  loading = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<SGKDocumentType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  
  // Advanced filters
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [fileSizeRange, setFileSizeRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewerDocument, setViewerDocument] = useState<SGKDocument | null>(null);
  const [previewDocument, setPreviewDocument] = useState<SGKDocument | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      // Search filter
      const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (doc.ocrText && doc.ocrText.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Type filter
      const matchesType = selectedType === 'all' || doc.documentType === selectedType;
      
      // Status filter
      const matchesStatus = selectedStatus === 'all' || doc.processingStatus === selectedStatus;
      
      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start || dateRange.end) {
        const docDate = new Date(doc.uploadedAt);
        if (dateRange.start) {
          matchesDateRange = matchesDateRange && docDate >= new Date(dateRange.start);
        }
        if (dateRange.end) {
          matchesDateRange = matchesDateRange && docDate <= new Date(dateRange.end);
        }
      }
      
      // File size filter (in MB)
      let matchesFileSize = true;
      if (doc.fileSize) {
        const fileSizeMB = doc.fileSize / (1024 * 1024);
        matchesFileSize = fileSizeMB >= fileSizeRange.min && fileSizeMB <= fileSizeRange.max;
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDateRange && matchesFileSize;
    });

    // Sort documents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename);
        case 'size':
          return (a.fileSize || 0) - (b.fileSize || 0);
        case 'date':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(); // Most recent first
        case 'type':
          return a.documentType.localeCompare(b.documentType);
        default:
          return 0;
      }
    });

    return filtered;
  }, [documents, searchTerm, selectedType, selectedStatus, sortBy, dateRange, fileSizeRange]);

  // Handle document selection
  const handleSelectDocument = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  // Bulk operations
  const handleBulkDelete = () => {
    if (selectedDocuments.size > 0 && onBulkDelete) {
      onBulkDelete(Array.from(selectedDocuments));
      setSelectedDocuments(new Set());
    }
  };

  const handleBulkDownload = () => {
    if (selectedDocuments.size > 0 && onBulkDownload) {
      onBulkDownload(Array.from(selectedDocuments));
    }
  };

  // Document actions
  const handleViewDocument = (document: SGKDocument) => {
    setViewerDocument(document);
  };

  const handlePreviewDocument = (document: SGKDocument) => {
    setPreviewDocument(document);
  };

  const handleDownloadDocument = (document: SGKDocument) => {
    if (document.fileUrl) {
      const link = window.document.createElement('a');
      link.href = document.fileUrl;
      link.download = document.filename;
      link.click();
    }
  };

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'text-green-600 bg-green-100', icon: CheckCircle, label: 'Tamamlandı' };
      case 'processing':
        return { color: 'text-blue-600 bg-blue-100', icon: Clock, label: 'İşleniyor' };
      case 'pending':
        return { color: 'text-yellow-600 bg-yellow-100', icon: Clock, label: 'Bekliyor' };
      case 'failed':
        return { color: 'text-red-600 bg-red-100', icon: AlertCircle, label: 'Hata' };
      default:
        return { color: 'text-gray-600 bg-gray-100', icon: FileText, label: status };
    }
  };

  // Get document type display name
  const getDocumentTypeLabel = (type: SGKDocumentType) => {
    const labels: Record<SGKDocumentType, string> = {
      'recete': 'Reçete',
      'rapor': 'Rapor',
      'belge': 'Belge',
      'fatura': 'Fatura',
      'teslim': 'Teslim',
      'iade': 'İade'
    };
    return labels[type] || type;
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Belgeler ({filteredDocuments.length})</h2>
          {selectedDocuments.size > 0 && (
            <span className="text-sm text-gray-500">
              ({selectedDocuments.size} seçili)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk actions */}
          {selectedDocuments.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                İndir ({selectedDocuments.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Sil ({selectedDocuments.size})
              </Button>
            </>
          )}

          {/* View mode toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            Filtrele
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Belge ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Document type filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as SGKDocumentType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Türler</option>
              <option value="recete">Reçete</option>
              <option value="rapor">Rapor</option>
              <option value="belge">Belge</option>
              <option value="fatura">Fatura</option>
              <option value="teslim">Teslim</option>
              <option value="iade">İade</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'pending' | 'processing' | 'completed' | 'failed')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="processing">İşleniyor</option>
              <option value="completed">Tamamlandı</option>
              <option value="failed">Hata</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Tarihe Göre</option>
              <option value="name">İsme Göre</option>
              <option value="size">Boyuta Göre</option>
              <option value="type">Türe Göre</option>
            </select>
          </div>
          
          {/* Advanced Filters Toggle */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Gelişmiş Filtreler
              {showAdvancedFilters ? ' (Gizle)' : ' (Göster)'}
            </button>
          </div>
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Gelişmiş Filtreler</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tarih Aralığı</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Başlangıç"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bitiş"
                    />
                  </div>
                </div>
                
                {/* File Size Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Dosya Boyutu (MB): {fileSizeRange.min} - {fileSizeRange.max}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fileSizeRange.min}
                      onChange={(e) => setFileSizeRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fileSizeRange.max}
                      onChange={(e) => setFileSizeRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 MB</span>
                    <span>100 MB</span>
                  </div>
                </div>
              </div>
              
              {/* Clear Filters */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setDateRange({ start: '', end: '' });
                    setFileSizeRange({ min: 0, max: 100 });
                    setSearchTerm('');
                    setSelectedType('all');
                    setSelectedStatus('all');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Select all checkbox */}
      {filteredDocuments.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedDocuments.size === filteredDocuments.length}
            onChange={handleSelectAll}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-600">
            Tümünü seç ({filteredDocuments.length} belge)
          </label>
        </div>
      )}

      {/* Document grid/list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Belgeler yükleniyor...</span>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Belge bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
              ? 'Arama kriterlerinize uygun belge bulunamadı.'
              : 'Henüz belge yüklenmemiş.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map((document) => {
            const statusInfo = getStatusInfo(document.processingStatus);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={document.id}
                className={`relative bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  selectedDocuments.has(document.id) ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={selectedDocuments.has(document.id)}
                  onChange={() => handleSelectDocument(document.id)}
                  className="absolute top-2 left-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                {/* Document thumbnail/icon */}
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg mb-3 mt-6">
                  {document.fileUrl ? (
                    <img
                      src={document.fileUrl}
                      alt={document.filename}
                      className="max-h-full max-w-full object-contain rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>

                {/* Document info */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm truncate" title={document.filename}>
                    {document.filename}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{getDocumentTypeLabel(document.documentType)}</span>
                    <span>{formatFileSize(document.fileSize)}</span>
                  </div>

                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </div>

                  <div className="text-xs text-gray-500">
                    {formatDate(document.uploadedAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(document)}
                    className="flex-1 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Görüntüle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(document)}
                    className="flex-1 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    İndir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.size === filteredDocuments.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Belge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boyut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((document) => {
                  const statusInfo = getStatusInfo(document.processingStatus);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={document.id}
                      className={`hover:bg-gray-50 ${
                        selectedDocuments.has(document.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.has(document.id)}
                          onChange={() => handleSelectDocument(document.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {document.filename}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getDocumentTypeLabel(document.documentType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(document.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(document.uploadedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(document)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocument(document)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewDocument(document)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewerDocument && (
        <DocumentViewer
          isOpen={!!viewerDocument}
          document={viewerDocument}
          onClose={() => setViewerDocument(null)}
          onDownload={() => handleDownloadDocument(viewerDocument)}
        />
      )}

      {/* Document Preview Modal */}
       {previewDocument && (
         <DocumentPreview
           result={{
             fileName: previewDocument.filename,
             status: 'processed',
             result: {
               document_type: previewDocument.documentType,
               ocr_text: previewDocument.ocrText || '',
               pdf_generated: false,
               pdf_filename: undefined,
               confidence_score: undefined,
               file_size: previewDocument.fileSize,
               created_at: previewDocument.uploadedAt,
               image_url: previewDocument.fileUrl,
               matched_patient: undefined
             }
           }}
           isOpen={!!previewDocument}
           onClose={() => setPreviewDocument(null)}
           onChangeDocumentType={() => {
             // Handle document type change
             console.log('Document type changed for:', previewDocument.id);
           }}
           onSave={() => {
             // Handle save
             console.log('Document saved:', previewDocument.id);
             setPreviewDocument(null);
           }}
         />
       )}
    </div>
  );
};

export default DocumentGallery;
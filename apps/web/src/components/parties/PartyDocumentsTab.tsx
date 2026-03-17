import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Badge } from '@x-ear/ui-web';
import { Card, CardContent } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import { Upload, Eye, Download, Trash2, FileText, X, AlertCircle, CheckCircle, Clock, Search, Receipt } from 'lucide-react';

// API imports
import {
  listPatientDocuments as listPartyDocuments,
  createPatientDocuments as createPartyDocuments,
  deletePatientDocument as deletePartyDocument
} from '@/api/client/documents.client';
import type {
  ResponseEnvelopeListDocumentRead,
  DocumentRead
} from '@/api/generated/schemas';
import { createSales } from '@/api/client/sales.client';
import { listInventory } from '@/api/client/inventory.client';
import { customInstance } from '@/api/orval-mutator';
import { buildInvoiceDraftFromProforma } from '@/utils/invoiceDraft';
import { buildSalesPayloadsFromProforma } from '@/utils/proforma';
import { unwrapArray } from '@/utils/response-unwrap';
import { InvoiceModal } from '../modals/InvoiceModal';
import type { Invoice } from '@/types/invoice';

// PDF Viewer Modal
import DocumentViewer from '../sgk/DocumentViewer';
import type { SGKDocument } from '../../types/sgk';

interface HttpLikeError {
  message?: string;
  status?: number;
  body?: unknown;
}

function getHttpLikeError(error: unknown): HttpLikeError {
  return typeof error === 'object' && error !== null ? error as HttpLikeError : {};
}


interface Document {
  id: string;
  name: string;
  type: 'sgk' | 'medical' | 'invoice' | 'proforma' | 'other';
  uploadDate: string;
  size: string;
  status: 'processing' | 'completed' | 'error';
  url?: string;
  metadata?: Record<string, unknown>;
}

interface PartyDocumentsTabProps {
  partyId: string;
  party?: {
    id: string;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    tcNumber?: string;
    tc_number?: string;
    taxNumber?: string;
    tax_number?: string;
    addressFull?: string;
    address_full?: string;
    addressCity?: string;
    address_city?: string;
    addressDistrict?: string;
    address_district?: string;
  };
}

export const PartyDocumentsTab: React.FC<PartyDocumentsTabProps> = ({ partyId, party }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [dragActive, setDragActive] = useState(false);
  const [bulkUploadMode, setBulkUploadMode] = useState(false);
  const [documentNotes, setDocumentNotes] = useState('');
  
  // PDF Viewer state
  const [viewerDocument, setViewerDocument] = useState<SGKDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Toast helpers
  const { success, error } = useToastHelpers();
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceModalInitialData, setInvoiceModalInitialData] = useState<Invoice | null>(null);


  // API functions


  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      // Load documents from API using ORVAL-generated client
      const response: ResponseEnvelopeListDocumentRead = await listPartyDocuments(partyId);

      // Transform API response to component format
      const apiDocuments: Document[] = (response?.data || []).map((doc: DocumentRead) => ({
        id: doc.id || '',
        name: doc.fileName || doc.originalName || 'Untitled',
        type: (doc.type || 'other') as Document['type'],
        uploadDate: doc.uploadedAt || doc.createdAt || new Date().toISOString(),
        size: doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        status: (doc.status || 'completed') as Document['status'],
        // Construct proper API URL for document access
        url: doc.id ? `/api/parties/${partyId}/documents/${doc.id}` : undefined,
        metadata: (doc as unknown as { metadata?: Record<string, unknown> }).metadata || undefined,
      }));

      setDocuments(apiDocuments);
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

    await processFileUploads(Array.from(files));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (bulkUploadMode) {
      setSelectedFiles(prev => [...prev, ...files]);
    } else {
      processFileUploads(files);
    }
  };

  const processFileUploads = async (files: File[]) => {
    try {
      setIsUploading(true);
      // const { documentsAddPartyDocument } = await import('@/api/generated');

      for (const file of files) {
        const fileId = `${file.name}_${Date.now()}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Simulate progress for UI feedback
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const currentProgress = prev[fileId] || 0;
            if (currentProgress >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return { ...prev, [fileId]: currentProgress + 10 };
          });
        }, 200);

        // Convert file to base64
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = result.split(',')[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Prepare document data for API
        const documentData: {
          fileName: string;
          originalName?: string;
          type: string;
          content: string;
          mimeType?: string;
          metadata?: Record<string, unknown>;
        } = {
          fileName: file.name,
          originalName: file.name,
          type: selectedDocumentType === 'all' ? 'other' : selectedDocumentType,
          content: base64Content,
          mimeType: file.type || 'application/octet-stream',
          // size: file.size, // Not in schema
          // createdBy: 'current_user', // Not in schema often
          // status: 'completed' as const,
          metadata: documentNotes ? { notes: documentNotes } : {}
        };

        // Upload using ORVAL-generated client
        await createPartyDocuments(partyId, documentData);

        // Complete progress
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        // Remove progress after delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 2000);
      }

      success(`${files.length} doküman başarıyla yüklendi.`);

      // Reload documents and reset form
      await loadDocuments();
      setIsUploadModalOpen(false);
      setSelectedFiles([]);
      setDocumentNotes('');
    } catch (err) {
      console.error('Error uploading files:', err);
      error('Doküman yüklenirken bir hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processBulkUpload = async () => {
    if (selectedFiles.length === 0) return;
    await processFileUploads(selectedFiles);
  };

  const fetchDocumentBlob = async (documentUrl: string): Promise<Blob> => {
    const response = await customInstance<Blob>({
      url: documentUrl,
      method: 'GET',
      responseType: 'blob',
    });
    return response instanceof Blob ? response : new Blob([JSON.stringify(response)]);
  };

  const handleViewDocument = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document?.url) {
      error('Doküman URL\'si bulunamadı.');
      return;
    }

    try {
      console.log('🔍 Fetching document:', {
        documentId,
        url: document.url,
        name: document.name
      });

      const blob = await fetchDocumentBlob(document.url);

      console.log('✅ Document fetched successfully:', {
        dataType: typeof blob,
        isBlob: blob instanceof Blob,
        blobSize: blob instanceof Blob ? blob.size : 'N/A'
      });
      
      if (!(blob instanceof Blob)) {
        throw new Error(`Expected Blob but got ${typeof blob}`);
      }
      
      const blobUrl = URL.createObjectURL(blob);

      // Convert to SGKDocument format for viewer
      const sgkDoc: SGKDocument = {
        id: document.id,
        partyId: partyId,
        filename: document.name,
        documentType: document.type as SGKDocument['documentType'],
        fileUrl: blobUrl,
        fileSize: blob.size,
        mimeType: 'application/pdf',
        processingStatus: 'completed',
        uploadedBy: 'system',
        uploadedAt: document.uploadDate,
        createdAt: document.uploadDate,
        updatedAt: document.uploadDate
      };
      
      setViewerDocument(sgkDoc);
      setIsViewerOpen(true);
    } catch (err: unknown) {
      const httpError = getHttpLikeError(err);
      console.error('❌ Error loading document:', {
        error: err,
        message: err instanceof Error ? err.message : String(err),
        response: httpError.body,
        status: httpError.status,
        url: document.url
      });
      error('Doküman görüntülenirken bir hata oluştu.');
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document?.url) {
      error('Doküman URL\'si bulunamadı.');
      return;
    }

    try {
      console.log('📥 Downloading document:', {
        documentId,
        url: document.url,
        name: document.name
      });

      const blob = await fetchDocumentBlob(document.url);

      console.log('✅ Document downloaded successfully:', {
        dataType: typeof blob,
        isBlob: blob instanceof Blob,
        blobSize: blob instanceof Blob ? blob.size : 'N/A'
      });
      
      if (!(blob instanceof Blob)) {
        throw new Error(`Expected Blob but got ${typeof blob}`);
      }
      
      // Ensure filename has extension
      let filename = document.name;
      if (!filename.toLowerCase().endsWith('.pdf') && 
          !filename.toLowerCase().endsWith('.jpg') && 
          !filename.toLowerCase().endsWith('.jpeg') && 
          !filename.toLowerCase().endsWith('.png')) {
        // Add .pdf extension if no extension found
        filename = `${filename}.pdf`;
      }
      
      const blobUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      const httpError = getHttpLikeError(err);
      console.error('❌ Error downloading document:', {
        error: err,
        message: httpError.message,
        response: httpError.body,
        status: httpError.status,
        url: document.url
      });
      error('Doküman indirilirken bir hata oluştu.');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deletePartyDocument(partyId, documentId);

      success('Doküman başarıyla silindi.');

      // Reload documents
      await loadDocuments();
      
      // Close confirmation modal
      setDeleteConfirmOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      console.error('Error deleting document:', err);
      error('Doküman silinirken bir hata oluştu.');
    }
  };
  
  const confirmDelete = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteConfirmOpen(true);
  };

  const handleCreateInvoiceFromProforma = (doc: Document) => {
    const invoiceDraft = buildInvoiceDraftFromProforma({
      document: doc,
      party,
      partyId,
    });
    setInvoiceModalInitialData(invoiceDraft as unknown as Invoice);
    setShowInvoiceModal(true);
  };

  const handleConvertProformaToSale = async (doc: Document) => {
    const meta = doc.metadata || {};
    const proformaItems = Array.isArray(meta.items) ? meta.items : [];

    if (proformaItems.length === 0) {
      error('Proforma kalemi bulunamadı.');
      return;
    }

    try {
      setIsLoading(true);
      const inventoryResponse = await listInventory();
      const inventoryItems = unwrapArray<Record<string, unknown>>(inventoryResponse);
      const { payloads, missingItems } = buildSalesPayloadsFromProforma({
        partyId,
        items: proformaItems as Array<Record<string, unknown>>,
        inventory: inventoryItems,
        notes: typeof meta.notes === 'string' ? meta.notes : `Proforma dönüşümü: ${doc.name}`,
      });

      if (payloads.length === 0) {
        error(`Uygun ürün eşleşmedi: ${missingItems.join(', ')}`);
        return;
      }

      for (const payload of payloads) {
        await createSales(payload);
      }

      window.dispatchEvent(new CustomEvent('xEar:dataChanged'));
      success(
        missingItems.length > 0
          ? `${payloads.length} kalem satışa dönüştürüldü. Eşleşmeyenler: ${missingItems.join(', ')}`
          : `${payloads.length} kalem satışa dönüştürüldü.`,
      );
    } catch (conversionError) {
      console.error('Error converting proforma to sale:', conversionError);
      error('Proforma satışa dönüştürülürken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-success/10 text-success',
      processing: 'bg-warning/10 text-yellow-800',
      error: 'bg-destructive/10 text-red-800'
    };

    const labels = {
      completed: 'Tamamlandı',
      processing: 'İşleniyor',
      error: 'Hata'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-muted text-foreground'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatFileSize = (sizeStr: string) => {
    return sizeStr; // Already formatted when loading from API
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Tarih belirtilmemiş';
      }
      return date.toLocaleDateString('tr-TR');
    } catch {
      return 'Tarih belirtilmemiş';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {bulkUploadMode ? 'Toplu Belge Yükleme' : 'Belge Yükle'}
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setBulkUploadMode(!bulkUploadMode)}
                  variant="outline"
                  size="sm"
                >
                  {bulkUploadMode ? 'Tekli Mod' : 'Toplu Mod'}
                </Button>
                <Button
                  onClick={() => setIsUploadModalOpen(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Drag and Drop Area */}
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${dragActive
                  ? 'border-blue-500 bg-primary/10'
                  : 'border-border hover:border-gray-400 dark:hover:border-gray-500 dark:bg-gray-700/50'
                  }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Dosyaları buraya sürükleyin veya seçin
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  PDF, JPG, PNG, DOC, DOCX formatları desteklenir
                </p>
                <input
                  data-allow-raw="true"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  multiple={bulkUploadMode}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading}
                  className="premium-gradient tactile-press"
                >
                  Dosya Seç
                </Button>
              </div>

              {/* Selected Files (Bulk Mode) */}
              {bulkUploadMode && selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Seçilen Dosyalar ({selectedFiles.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm dark:text-gray-200">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          onClick={() => removeSelectedFile(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {Object.keys(uploadProgress).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Yükleme Durumu</h4>
                  {Object.entries(uploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="space-y-1">
                      <div className="flex justify-between text-sm dark:text-gray-300">
                        <span>{fileId.split('_')[0]}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-accent rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Document Type and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Belge Türü
                  </label>
                  <Select
                    value={selectedDocumentType}
                    onChange={(e) => setSelectedDocumentType(e.target.value)}
                    placeholder="Belge türü seçiniz..."
                    options={[
                      { value: 'other', label: 'Diğer' },
                      { value: 'sgk', label: 'SGK Belgesi' },
                      { value: 'medical', label: 'Tıbbi Rapor' },
                      { value: 'invoice', label: 'Fatura' },
                      { value: 'proforma', label: 'Proforma Fatura' },
                      { value: 'contract', label: 'Sözleşme' },
                      { value: 'id', label: 'Kimlik Belgesi' }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notlar (Opsiyonel)
                  </label>
                  <Input
                    value={documentNotes}
                    onChange={(e) => setDocumentNotes(e.target.value)}
                    placeholder="Belge hakkında notlar..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setSelectedFiles([]);
                    setDocumentNotes('');
                  }}
                  variant="outline"
                  disabled={isUploading}
                >
                  İptal
                </Button>
                {bulkUploadMode && selectedFiles.length > 0 && (
                  <Button
                    onClick={processBulkUpload}
                    disabled={isUploading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUploading ? 'Yükleniyor...' : `${selectedFiles.length} Dosyayı Yükle`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Upload Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Belgeler</h3>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="premium-gradient tactile-press w-full sm:w-auto"
        >
          <Upload className="w-4 h-4 mr-2" />
          Belge Yükle
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Belge ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Select
          value={selectedDocumentType}
          onChange={(e) => setSelectedDocumentType(e.target.value)}
          className="w-full sm:w-48"
          options={[
            { value: 'all', label: 'Tüm Belgeler' },
            { value: 'proforma', label: 'Proforma' },
            { value: 'sgk', label: 'SGK' },
            { value: 'medical', label: 'Tıbbi' },
            { value: 'invoice', label: 'Fatura' },
            { value: 'other', label: 'Diğer' }
          ]}
        />
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Dokümanlar yükleniyor...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{doc.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} • {formatDate(doc.uploadDate)}
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
                  {doc.type === 'proforma' && (
                    <Button
                      onClick={() => void handleConvertProformaToSale(doc)}
                      variant="outline"
                      size="sm"
                      className="text-emerald-600 hover:text-emerald-800"
                      title="Proformayı Satışa Dönüştür"
                    >
                      Satışa Dönüştür
                    </Button>
                  )}
                  {doc.type === 'proforma' && (
                    <Button
                      onClick={() => handleCreateInvoiceFromProforma(doc)}
                      variant="default"
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      title="Proformadan Fatura Kes"
                    >
                      <Receipt className="w-4 h-4 mr-1" />
                      Fatura Kes
                    </Button>
                  )}
                  <Button
                    onClick={() => confirmDelete(doc.id)}
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredDocuments.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Dokümanı Sil
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Bu işlem geri alınamaz
                  </p>
                </div>
              </div>
              
              <p className="text-foreground mb-6">
                Bu dokümanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve doküman kalıcı olarak silinecektir.
              </p>
              
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDocumentToDelete(null);
                  }}
                  variant="outline"
                  className="px-4 py-2"
                >
                  İptal
                </Button>
                <Button
                  onClick={() => documentToDelete && handleDeleteDocument(documentToDelete)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  Sil
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewerDocument && (
        <DocumentViewer
          document={viewerDocument}
          isOpen={isViewerOpen}
          onClose={() => {
            // Clean up blob URL
            if (viewerDocument.fileUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(viewerDocument.fileUrl);
            }
            setIsViewerOpen(false);
            setViewerDocument(null);
          }}
          onDownload={(doc) => {
            if (doc.fileUrl) {
              // Ensure filename has extension
              let filename = doc.filename || 'document.pdf';
              if (!filename.toLowerCase().endsWith('.pdf') && 
                  !filename.toLowerCase().endsWith('.jpg') && 
                  !filename.toLowerCase().endsWith('.jpeg') && 
                  !filename.toLowerCase().endsWith('.png')) {
                filename = `${filename}.pdf`;
              }
              
              const link = window.document.createElement('a');
              link.href = doc.fileUrl;
              link.download = filename;
              window.document.body.appendChild(link);
              link.click();
              window.document.body.removeChild(link);
            }
          }}
        />
      )}

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setInvoiceModalInitialData(null);
        }}
        initialData={invoiceModalInitialData}
        partyId={partyId}
        mode="create"
      />
    </div>
  );
};

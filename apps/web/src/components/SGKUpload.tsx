import React, { useState, useRef, useCallback } from 'react';
import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import { 
  SGKDocument, 
  SGKDocumentType, 
  SGKDocumentFormData,
  SGKValidation,
  OCRProcessingResult
} from '../types/sgk';
import sgkService from '../services/sgk/sgk.service';

interface SGKUploadProps {
  partyId?: string;
  onUploadComplete?: (document: SGKDocument) => void;
  onUploadError?: (error: string) => void;
  allowedTypes?: SGKDocumentType[];
  maxFileSize?: number; // in bytes
  autoProcess?: boolean;
  compact?: boolean;
}

export const SGKUpload: React.FC<SGKUploadProps> = ({
  partyId,
  onUploadComplete,
  onUploadError,
  allowedTypes = ['recete', 'rapor', 'belge', 'fatura', 'teslim', 'iade'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  autoProcess = true,
  compact = false
}) => {
  const [formData, setFormData] = useState<SGKDocumentFormData>({
    partyId: partyId || '',
    documentType: 'recete',
    autoProcess
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validation, setValidation] = useState<SGKValidation | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRProcessingResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return `Dosya boyutu ${Math.round(maxFileSize / 1024 / 1024)}MB'dan büyük olamaz`;
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'image/tiff'
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return 'Desteklenmeyen dosya formatı. JPG, PNG, PDF, TIFF dosyaları yükleyebilirsiniz.';
    }

    return null;
  }, [maxFileSize]);

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      onUploadError?.(error);
      return;
    }

    setSelectedFile(file);
    setFormData(prev => ({ ...prev, file }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Clear previous results
    setOcrResult(null);
    setValidation(null);
  }, [onUploadError, validateFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const processWithOCR = async (file: File): Promise<OCRProcessingResult | null> => {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    try {
      setProcessing(true);
      const result = await sgkService.processDocument({
        imagePath: URL.createObjectURL(file),
        documentType: formData.documentType,
        partyId: formData.partyId,
        autoCrop: true,
        enhanceImage: true
      });
      setOcrResult(result);
      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationResult = sgkService.validateDocument(formData);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      return;
    }

    try {
      setUploading(true);

      // Process with OCR if enabled and file is an image
      let ocrData: OCRProcessingResult | null = null;
      if (autoProcess && selectedFile) {
        ocrData = await processWithOCR(selectedFile);
      }

      // Create document
      const documentData: Omit<SGKDocument, 'id' | 'createdAt' | 'updatedAt'> = {
        partyId: formData.partyId,
        filename: selectedFile?.name || 'document',
        documentType: formData.documentType,
        fileSize: selectedFile?.size || 0,
        mimeType: selectedFile?.type || 'application/octet-stream',
        processingStatus: 'pending' as const,
        uploadedBy: 'current-user',
        uploadedAt: new Date().toISOString(),
        notes: formData.notes,
        ocrText: ocrData?.extractedText,
        extractedInfo: ocrData?.extractedInfo
      };

      const document = await sgkService.createDocument(documentData as unknown as Record<string, unknown>);
      
      // Create workflow
      await sgkService.createWorkflow(document.id, document.partyId);

      onUploadComplete?.(document);
      
      // Reset form
      setFormData({
        partyId: partyId || '',
        documentType: 'recete',
        autoProcess
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setOcrResult(null);
      setValidation(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Party Selection */}
        {!partyId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.partyId}
              onChange={(e) => setFormData(prev => ({ ...prev, partyId: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validation?.errors.partyId ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Hasta ID'si girin"
            />
            {validation?.errors.partyId && (
              <p className="mt-1 text-sm text-red-600">{validation.errors.partyId}</p>
            )}
          </div>
        )}

        {/* Document Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Belge Türü <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.documentType}
            onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value as SGKDocumentType }))}
            options={allowedTypes.map(type => ({
              value: type,
              label: getDocumentTypeLabel(type)
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dosya {!formData.notes && <span className="text-red-500">*</span>}
          </label>
          
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : validation?.errors.file
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              accept="image/*,.pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-allow-raw
            />
            
            {selectedFile ? (
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setOcrResult(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                  variant='default'>
                  Kaldır
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">Dosya seçin</span>
                    {' '}veya sürükleyip bırakın
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, PDF dosyaları (max {Math.round(maxFileSize / 1024 / 1024)}MB)
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {validation?.errors.file && (
            <p className="mt-1 text-sm text-red-600">{validation.errors.file}</p>
          )}
        </div>

        {/* Preview */}
        {previewUrl && !compact && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Önizleme
            </label>
            <div className="border border-gray-200 rounded-lg p-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full h-auto max-h-64 mx-auto rounded"
              />
            </div>
          </div>
        )}

        {/* OCR Results */}
        {ocrResult && !compact && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OCR Sonuçları
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm">
                <div className="mb-2">
                  <span className="font-medium">Güven Skoru:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    ocrResult.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                    ocrResult.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {Math.round(ocrResult.confidence * 100)}%
                  </span>
                </div>
                
                {ocrResult.extractedInfo && (
                  <div className="space-y-1">
                    {ocrResult.extractedInfo.partyName && (
                      <div><span className="font-medium">Hasta Adı:</span> {ocrResult.extractedInfo.partyName}</div>
                    )}
                    {ocrResult.extractedInfo.tcNumber && (
                      <div><span className="font-medium">TC No:</span> {ocrResult.extractedInfo.tcNumber}</div>
                    )}
                    {ocrResult.extractedInfo.prescriptionNumber && (
                      <div><span className="font-medium">Reçete No:</span> {ocrResult.extractedInfo.prescriptionNumber}</div>
                    )}
                    {ocrResult.extractedInfo.reportNumber && (
                      <div><span className="font-medium">Rapor No:</span> {ocrResult.extractedInfo.reportNumber}</div>
                    )}
                  </div>
                )}
                
                {ocrResult.extractedText && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-medium">Çıkarılan Metin</summary>
                    <div className="mt-2 p-2 bg-white border rounded text-xs whitespace-pre-wrap">
                      {ocrResult.extractedText}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Belge ile ilgili notlar..."
          />
        </div>

        {/* Auto Process Option */}
        {!compact && (
          <div className="flex items-center">
            <Input
              type="checkbox"
              id="autoProcess"
              checked={formData.autoProcess || false}
              onChange={(e) => setFormData(prev => ({ ...prev, autoProcess: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoProcess" className="ml-2 block text-sm text-gray-900">
              Otomatik OCR işlemi yap (görüntü dosyaları için)
            </label>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3">
          <Button
            type="submit"
            disabled={uploading || processing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            variant='default'>
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Yükleniyor...
              </>
            ) : processing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                İşleniyor...
              </>
            ) : (
              'Yükle'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
import React, { useState, useCallback, useRef } from 'react';
import { Modal, Button, FileUpload } from '@x-ear/ui-web';
import { useUploadSgkDocuments } from '../../hooks/sgk/useSgkDocuments';
import { X, FileImage, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadStart: () => void;
  onUploadComplete: (results: Array<{ success: boolean; filename: string; error?: string }>) => void;
}

interface FileItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadStart,
  onUploadComplete,
}) => {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadSgkDocuments();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Desteklenmeyen dosya türü: ${file.name}`;
    }
    if (file.size > MAX_SIZE) {
      return `Dosya çok büyük: ${file.name} (Max: 10MB)`;
    }
    return null;
  };

  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    const newErrors: string[] = [];

    for (const file of selectedFiles) {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
        continue; // Skip invalid files, don't stop
      }

      const fileId = `${file.name}-${file.size}-${Date.now()}`;
      // Use functional state update to avoid stale closure
      setFileItems(prev => {
        const isDuplicate = prev.some(
          item => item.file.name === file.name && item.file.size === file.size
        );
        if (isDuplicate) return prev;

        return [...prev, {
          file,
          id: fileId,
          status: 'pending' as const,
          progress: 0,
        }];
      });
    }

    if (newErrors.length > 0) {
      setErrors(prev => [...prev, ...newErrors]);
    }
  }, []);

  const handleFileUploadChange = useCallback((uploadedFiles: Array<{ file?: File } | File>) => {
    const fileObjects = uploadedFiles.map(f => (f as { file?: File }).file || (f as File));
    handleFileSelect(fileObjects);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelect(droppedFiles);
  }, [handleFileSelect]);

  const removeFile = useCallback((id: string) => {
    setFileItems(prev => prev.filter(item => item.id !== id));
    setErrors([]);
  }, []);

  const handleUpload = async () => {
    const pendingItems = fileItems.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    setErrors([]);
    onUploadStart();

    const results: Array<{ success: boolean; filename: string; error?: string }> = [];

    // Upload files sequentially for better error isolation
    for (const item of pendingItems) {
      // Mark as uploading
      setFileItems(prev => prev.map(fi =>
        fi.id === item.id ? { ...fi, status: 'uploading' as const, progress: 30 } : fi
      ));

      try {
        const formData = new FormData();
        formData.append('files', item.file);

        await uploadMutation.mutateAsync(formData);

        // Mark as success
        setFileItems(prev => prev.map(fi =>
          fi.id === item.id ? { ...fi, status: 'success' as const, progress: 100 } : fi
        ));
        results.push({ success: true, filename: item.file.name });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Yükleme başarısız';
        setFileItems(prev => prev.map(fi =>
          fi.id === item.id ? { ...fi, status: 'error' as const, progress: 0, error: errorMsg } : fi
        ));
        results.push({ success: false, filename: item.file.name, error: errorMsg });
      }
    }

    setIsUploading(false);
    onUploadComplete(results);
  };

  const retryFailed = useCallback(() => {
    setFileItems(prev => prev.map(item =>
      item.status === 'error' ? { ...item, status: 'pending' as const, progress: 0, error: undefined } : item
    ));
  }, []);

  const handleClose = () => {
    if (!isUploading) {
      setFileItems([]);
      setErrors([]);
      setIsDragOver(false);
      onClose();
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const pendingCount = fileItems.filter(i => i.status === 'pending').length;
  const successCount = fileItems.filter(i => i.status === 'success').length;
  const errorCount = fileItems.filter(i => i.status === 'error').length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="SGK Dokümanlarını Yükle" size="lg">
      <div className="space-y-6">
        {/* Drag and Drop Area */}
        <div
          className={`
            border-2 border-dashed rounded-2xl p-8 text-center transition-colors
            ${isDragOver
              ? 'border-blue-400 bg-primary/10'
              : 'border-border hover:border-gray-400'
            }
            ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <FileUpload
            multiple
            accept="image/*,.pdf"
            onChange={handleFileUploadChange}
            disabled={isUploading}
            className="w-full"
            description="JPEG, PNG, TIFF, BMP, PDF formatlarında, maksimum 10MB boyutunda dosyalar"
          />
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.map((error, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-destructive/10 border border-red-200 rounded-xl text-sm">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-destructive">{error}</p>
              </div>
            ))}
          </div>
        )}

        {/* Selected Files with Progress */}
        {fileItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">
                Dosyalar ({fileItems.length})
                {successCount > 0 && <span className="text-success ml-2">✓ {successCount}</span>}
                {errorCount > 0 && <span className="text-destructive ml-2">✗ {errorCount}</span>}
              </h4>
              {errorCount > 0 && !isUploading && (
                <button data-allow-raw="true" onClick={retryFailed} className="text-xs text-primary hover:underline">
                  Başarısızları tekrar dene
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {fileItems.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    item.status === 'success' ? 'bg-success/10' :
                    item.status === 'error' ? 'bg-destructive/10' :
                    item.status === 'uploading' ? 'bg-primary/10' :
                    'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    ) : item.status === 'error' ? (
                      <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    ) : (
                      <FileImage className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {item.error && (
                          <p className="text-xs text-destructive truncate">{item.error}</p>
                        )}
                      </div>
                      {/* Progress bar */}
                      {item.status === 'uploading' && (
                        <div className="mt-1 w-full bg-accent rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 animate-pulse"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {!isUploading && item.status !== 'uploading' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(item.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isUploading}
          >
            İptal
          </Button>
          <Button
            onClick={handleUpload}
            disabled={pendingCount === 0 || isUploading}
            className="min-w-[120px]"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Yükleniyor...
              </div>
            ) : (
              `Yükle (${pendingCount} dosya)`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkUploadModal;
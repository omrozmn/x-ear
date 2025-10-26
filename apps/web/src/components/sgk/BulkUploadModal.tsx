import React, { useState, useCallback, useRef } from 'react';
import { Modal, Button, Input, FileUpload } from '@x-ear/ui-web';
import { useUploadSgkDocuments } from '../../hooks/sgk/useSgkDocuments';
import { Upload, X, FileImage, AlertCircle } from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadStart: () => void;
  onUploadComplete: (results: any[]) => void;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadStart,
  onUploadComplete,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadSgkDocuments();

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setError(`Desteklenmeyen dosya türü: ${file.name}`);
      return false;
    }

    if (file.size > maxSize) {
      setError(`Dosya çok büyük: ${file.name} (Max: 10MB)`);
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    
    for (const file of selectedFiles) {
      if (validateFile(file)) {
        validFiles.push(file);
      } else {
        return; // Stop processing if any file is invalid
      }
    }

    // Remove duplicates based on name and size
    const uniqueFiles = validFiles.filter(newFile => 
      !files.some(existingFile => 
        existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    );

    setFiles(prev => [...prev, ...uniqueFiles]);
  }, [files]);

  const handleFileUploadChange = useCallback((uploadedFiles: any[]) => {
    const fileObjects = uploadedFiles.map(f => f.file || f);
    handleFileSelect(fileObjects);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileSelect(selectedFiles);
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

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    onUploadStart();

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await uploadMutation.mutateAsync(formData);
      onUploadComplete([]);
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Yükleme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      onUploadComplete([]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      setError(null);
      setIsDragOver(false);
      onClose();
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="SGK Dokümanlarını Yükle" size="lg">
      <div className="space-y-6">
        {/* Drag and Drop Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
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
            accept="image/*"
            onChange={handleFileUploadChange}
            disabled={isUploading}
            className="w-full"
            description="JPEG, PNG, TIFF, BMP formatlarında, maksimum 10MB boyutunda dosyalar"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Selected Files */}
        {files.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              Seçilen Dosyalar ({files.length})
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileImage className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500 p-1"
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
            disabled={files.length === 0 || isUploading}
            className="min-w-[120px]"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Yükleniyor...
              </div>
            ) : (
              `Yükle (${files.length} dosya)`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkUploadModal;
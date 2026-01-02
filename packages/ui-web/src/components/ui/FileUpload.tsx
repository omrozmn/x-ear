import React, { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';

export interface FileUploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  url?: string;
  preview?: string;
}

export interface FileUploadProps {
  value?: FileUploadFile[];
  onChange: (files: FileUploadFile[]) => void;
  onUpload?: (file: File) => Promise<{ url: string; id?: string }>;
  onRemove?: (file: FileUploadFile) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  minSize?: number; // in bytes
  disabled?: boolean;
  dragAndDrop?: boolean;
  showPreview?: boolean;
  showProgress?: boolean;
  allowReorder?: boolean;
  label?: string;
  description?: string;
  error?: string;
  helperText?: string;
  uploadText?: string;
  dragText?: string;
  browseText?: string;
  removeText?: string;
  retryText?: string;
  className?: string;
  dropzoneClassName?: string;
  fileListClassName?: string;
  fileItemClassName?: string;
  renderFile?: (file: FileUploadFile, onRemove: () => void, onRetry?: () => void) => React.ReactNode;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateFileId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

const isImageFile = (type: string): boolean => {
  return type.startsWith('image/');
};

export const FileUpload: React.FC<FileUploadProps> = ({
  value = [],
  onChange,
  onUpload,
  onRemove,
  accept,
  multiple = false,
  maxFiles,
  maxSize,
  minSize,
  disabled = false,
  dragAndDrop = true,
  showPreview = true,
  showProgress = true,
  allowReorder = false,
  label,
  description,
  error,
  helperText,
  uploadText = "Dosya Yükle",
  dragText = "Dosyaları buraya sürükleyin veya",
  browseText = "göz atın",
  removeText = "Kaldır",
  retryText = "Tekrar Dene",
  className,
  dropzoneClassName,
  fileListClassName,
  fileItemClassName,
  renderFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `Dosya boyutu ${formatFileSize(maxSize)}'dan büyük olamaz`;
    }
    
    if (minSize && file.size < minSize) {
      return `Dosya boyutu ${formatFileSize(minSize)}'dan küçük olamaz`;
    }
    
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isAccepted = acceptedTypes.some(acceptedType => {
        if (acceptedType.startsWith('.')) {
          return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
        }
        if (acceptedType.includes('*')) {
          const baseType = acceptedType.split('/')[0];
          return file.type.startsWith(baseType);
        }
        return file.type === acceptedType;
      });
      
      if (!isAccepted) {
        return `Desteklenmeyen dosya türü. Kabul edilen türler: ${accept}`;
      }
    }
    
    return null;
  };

  // Create file preview
  const createFilePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (isImageFile(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve('');
      }
    });
  };

  // Process files
  const processFiles = useCallback(async (files: File[]) => {
    if (disabled) return;
    
    const currentFiles = value;
    const newFiles: FileUploadFile[] = [];
    
    // Check max files limit
    if (maxFiles && currentFiles.length + files.length > maxFiles) {
      const allowedCount = maxFiles - currentFiles.length;
      files = files.slice(0, allowedCount);
    }
    
    // Process each file
    for (const file of files) {
      const validationError = validateFile(file);
      const preview = showPreview ? await createFilePreview(file) : undefined;
      
      const fileUpload: FileUploadFile = {
        id: generateFileId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validationError ? 'error' : 'pending',
        error: validationError || undefined,
        preview,
      };
      
      newFiles.push(fileUpload);
    }
    
    const updatedFiles = [...currentFiles, ...newFiles];
    onChange(updatedFiles);
    
    // Auto-upload valid files
    if (onUpload) {
      for (const fileUpload of newFiles) {
        if (fileUpload.status === 'pending') {
          handleUpload(fileUpload);
        }
      }
    }
  }, [value, onChange, onUpload, disabled, maxFiles, maxSize, minSize, accept, showPreview]);

  // Handle file upload
  const handleUpload = async (fileUpload: FileUploadFile) => {
    if (!onUpload) return;
    
    // Update status to uploading
    const updatedFiles = value.map(f => 
      f.id === fileUpload.id 
        ? { ...f, status: 'uploading' as const, progress: 0 }
        : f
    );
    onChange(updatedFiles);
    
    try {
      const result = await onUpload(fileUpload.file);
      
      // Update status to success
      const successFiles = value.map(f => 
        f.id === fileUpload.id 
          ? { 
              ...f, 
              status: 'success' as const, 
              progress: 100, 
              url: result.url,
              id: result.id || f.id
            }
          : f
      );
      onChange(successFiles);
    } catch (error) {
      // Update status to error
      const errorFiles = value.map(f => 
        f.id === fileUpload.id 
          ? { 
              ...f, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Yükleme hatası'
            }
          : f
      );
      onChange(errorFiles);
    }
  };

  // Handle file removal
  const handleRemove = async (fileUpload: FileUploadFile) => {
    if (disabled) return;
    
    try {
      if (onRemove) {
        await onRemove(fileUpload);
      }
      
      const updatedFiles = value.filter(f => f.id !== fileUpload.id);
      onChange(updatedFiles);
    } catch (error) {
      console.error('File removal failed:', error);
    }
  };

  // Handle retry
  const handleRetry = (fileUpload: FileUploadFile) => {
    if (fileUpload.status === 'error') {
      handleUpload(fileUpload);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && dragAndDrop) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled || !dragAndDrop) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Handle browse click
  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const canAddMore = !maxFiles || value.length < maxFiles;

  const defaultRenderFile = (file: FileUploadFile, onRemove: () => void, onRetry?: () => void) => (
    <div
      className={clsx(
        'flex items-center p-3 border border-gray-200 rounded-lg',
        file.status === 'error' && 'border-red-200 bg-red-50',
        file.status === 'success' && 'border-green-200 bg-green-50',
        file.status === 'uploading' && 'border-blue-200 bg-blue-50',
        fileItemClassName
      )}
    >
      {/* Preview */}
      {showPreview && file.preview && (
        <img
          src={file.preview}
          alt={file.name}
          className="w-12 h-12 object-cover rounded mr-3"
        />
      )}
      
      {/* File icon for non-images */}
      {(!showPreview || !file.preview) && (
        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mr-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
      
      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        
        {/* Progress bar */}
        {showProgress && file.status === 'uploading' && typeof file.progress === 'number' && (
          <div className="mt-2">
            <div className="bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Error message */}
        {file.status === 'error' && file.error && (
          <p className="text-xs text-red-600 mt-1">{file.error}</p>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 ml-3">
        {/* Status icon */}
        {file.status === 'success' && (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        
        {file.status === 'uploading' && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        )}
        
        {file.status === 'error' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {retryText}
          </button>
        )}
        
        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600"
          disabled={disabled}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      {description && (
        <p className="text-sm text-gray-500 mb-3">{description}</p>
      )}
      
      {/* Dropzone */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={clsx(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragOver && !disabled && 'border-blue-500 bg-blue-50',
            !isDragOver && !disabled && 'border-gray-300 hover:border-gray-400',
            disabled && 'border-gray-200 bg-gray-50 cursor-not-allowed',
            error && 'border-red-300',
            dropzoneClassName
          )}
        >
          <svg
            className={clsx(
              'mx-auto h-12 w-12 mb-4',
              disabled ? 'text-gray-300' : 'text-gray-400'
            )}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="text-sm text-gray-600">
            {dragAndDrop && !disabled ? (
              <>
                <span>{dragText} </span>
                <span className="font-medium text-blue-600 hover:text-blue-500">
                  {browseText}
                </span>
              </>
            ) : (
              <span className="font-medium text-blue-600 hover:text-blue-500">
                {uploadText}
              </span>
            )}
          </div>
          
          {accept && (
            <p className="text-xs text-gray-500 mt-1">
              Desteklenen formatlar: {accept}
            </p>
          )}
          
          {maxSize && (
            <p className="text-xs text-gray-500 mt-1">
              Maksimum dosya boyutu: {formatFileSize(maxSize)}
            </p>
          )}
        </div>
      )}
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      {/* File list */}
      {value.length > 0 && (
        <div className={clsx('mt-4 space-y-2', fileListClassName)}>
          {value.map((file) => (
            <div key={file.id}>
              {renderFile ? 
                renderFile(file, () => handleRemove(file), () => handleRetry(file)) :
                defaultRenderFile(file, () => handleRemove(file), () => handleRetry(file))
              }
            </div>
          ))}
        </div>
      )}
      
      {/* Max files warning */}
      {maxFiles && value.length >= maxFiles && (
        <p className="mt-2 text-sm text-amber-600">
          Maksimum {maxFiles} dosya yükleyebilirsiniz
        </p>
      )}
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Helper text */}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default FileUpload;
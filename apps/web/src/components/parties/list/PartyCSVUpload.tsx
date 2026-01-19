import React, { useRef, useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@x-ear/ui-web';

interface PartyCSVUploadProps {
  onUpload: (file: File) => Promise<void>;
  onClose?: () => void;
  className?: string;
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  progress?: number;
}

export const PartyCSVUpload: React.FC<PartyCSVUploadProps> = ({
  onUpload,
  onClose,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadStatus({
        status: 'error',
        message: 'Lütfen sadece CSV dosyası seçin.'
      });
      return;
    }

    setSelectedFile(file);
    setUploadStatus({ status: 'idle' });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus({ status: 'uploading', progress: 0 });

    try {
      await onUpload(selectedFile);
      setUploadStatus({
        status: 'success',
        message: 'Dosya başarıyla yüklendi!'
      });
      
      // Reset after success
      setTimeout(() => {
        setSelectedFile(null);
        setUploadStatus({ status: 'idle' });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Dosya yüklenirken hata oluştu.'
      });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus({ status: 'idle' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">CSV Dosyası Yükle</h3>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            CSV dosyasını buraya sürükleyin
          </p>
          <p className="text-sm text-gray-500 mb-4">
            veya dosya seçmek için tıklayın
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Dosya Seç
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
            data-allow-raw
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              onClick={handleRemoveFile}
              variant="ghost"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              disabled={uploadStatus.status === 'uploading'}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {uploadStatus.status !== 'idle' && (
            <div className="p-4 rounded-lg">
              {uploadStatus.status === 'uploading' && (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Yükleniyor...</span>
                </div>
              )}
              
              {uploadStatus.status === 'success' && (
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">{uploadStatus.message}</span>
                </div>
              )}
              
              {uploadStatus.status === 'error' && (
                <div className="flex items-center gap-3 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{uploadStatus.message}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={uploadStatus.status === 'uploading'}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploadStatus.status === 'uploading' ? 'Yükleniyor...' : 'Yükle'}
            </Button>
            <Button
              onClick={handleRemoveFile}
              variant="secondary"
              disabled={uploadStatus.status === 'uploading'}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Not:</strong> CSV dosyası şu sütunları içermelidir: Ad, Soyad, E-posta, Telefon, Doğum Tarihi
        </p>
      </div>
    </div>
  );
};
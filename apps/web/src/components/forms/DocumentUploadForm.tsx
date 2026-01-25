import React, { useState, useRef } from 'react';
import { Button, Input, Textarea, Select } from '@x-ear/ui-web';
import { Modal } from '../ui/Modal';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { getCurrentUserId } from '@/utils/auth-utils';

interface DocumentUploadFormProps {
  partyId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpload: (documentData: FormData) => Promise<void>;
  isLoading?: boolean;
}

export const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({
  partyId,
  isOpen,
  onClose,
  onUpload,
  isLoading = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentType('');
    setDescription('');
    setTags('');
    setErrors({});
    setDragActive(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedFile) {
      newErrors.file = 'Dosya seçimi zorunludur';
    }

    if (!documentType) {
      newErrors.documentType = 'Doküman türü seçimi zorunludur';
    }

    // Dosya boyutu kontrolü (10MB)
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      newErrors.file = 'Dosya boyutu 10MB\'dan büyük olamaz';
    }

    // Dosya türü kontrolü
    if (selectedFile) {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        newErrors.file = 'Desteklenmeyen dosya türü. PDF, resim veya doküman dosyaları kabul edilir.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setErrors(prev => ({ ...prev, file: '' }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile!);
      formData.append('partyId', partyId);
      formData.append('documentType', documentType);
      formData.append('description', description);
      formData.append('tags', tags);
      formData.append('uploadedBy', getCurrentUserId());

      await onUpload(formData);
      handleClose();
    } catch (error) {
      console.error('Doküman yüklenirken hata:', error);
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
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Doküman Yükle"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dosya Yükleme Alanı */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dosya Seçimi *
          </label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive
              ? 'border-blue-400 bg-blue-50'
              : selectedFile
                ? 'border-green-400 bg-green-50'
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
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedFile(null)}
                  className="mt-3"
                >
                  <X className="w-4 h-4 mr-1" />
                  Kaldır
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Dosyayı sürükleyin veya tıklayın
                </p>
                <p className="text-xs text-gray-500">
                  PDF, resim veya doküman dosyaları (max 10MB)
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3"
                >
                  Dosya Seç
                </Button>
              </div>
            )}
          </div>
          {errors.file && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.file}
            </p>
          )}
        </div>

        {/* Doküman Türü */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Doküman Türü *
          </label>
          <Select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            options={[
              { value: '', label: 'Doküman türü seçin...' },
              { value: 'sgk_report', label: 'SGK Raporu' },
              { value: 'prescription', label: 'Reçete' },
              { value: 'medical_report', label: 'Tıbbi Rapor' },
              { value: 'invoice', label: 'Fatura' },
              { value: 'receipt', label: 'Makbuz' },
              { value: 'other', label: 'Diğer' }
            ]}
            error={errors.documentType}
            fullWidth
          />
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Açıklama
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Doküman hakkında açıklama..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Etiketler */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Etiketler
          </label>
          <Input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Virgülle ayrılmış etiketler (örn: önemli, acil, kontrol)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Etiketler dokümanın aranmasını kolaylaştırır
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="min-w-[120px]"
          >
            {isLoading ? 'Yükleniyor...' : 'Yükle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
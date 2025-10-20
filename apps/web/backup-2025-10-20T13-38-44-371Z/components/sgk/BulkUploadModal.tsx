import React, { useState, useCallback } from 'react';
import { Modal, Button, Input } from '@x-ear/ui-web';
import { useUploadSgkDocuments } from '../../hooks/sgk/useSgkDocuments';

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
  const uploadMutation = useUploadSgkDocuments();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter(file =>
      file.type.startsWith('image/') &&
      ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp'].includes(file.type)
    );
    setFiles(imageFiles);
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    onUploadStart();

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await uploadMutation.mutateAsync(formData);
      onUploadComplete(response.data?.files || []);
    } catch (error) {
      console.error('Upload failed:', error);
      onUploadComplete([]);
    } finally {
      setIsUploading(false);
      setFiles([]);
      onClose();
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="SGK Dokümanlarını Yükle">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Görsel Dosyaları Seçin
          </label>
          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <p className="text-sm text-gray-500 mt-1">
            JPEG, PNG, TIFF, BMP formatlarındaki dosyaları seçebilirsiniz.
          </p>
        </div>

        {files.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Seçilen Dosyalar ({files.length})</h4>
            <ul className="text-sm text-gray-600 max-h-32 overflow-y-auto">
              {files.map((file, index) => (
                <li key={index} className="truncate">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4">
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
          >
            {isUploading ? 'Yükleniyor...' : `Yükle (${files.length} dosya)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkUploadModal;
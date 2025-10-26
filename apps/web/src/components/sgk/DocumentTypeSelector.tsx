import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button, Select } from '@x-ear/ui-web';

interface DocumentTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (docType: string) => void;
  currentType?: string;
}

const DOCUMENT_TYPES = [
  { value: 'sgk_reçete', label: 'SGK Reçete' },
  { value: 'sgk_rapor', label: 'SGK Rapor' },
  { value: 'odyometri_sonucu', label: 'Odyometri Sonucu' },
  { value: 'garanti_belgesi', label: 'Garanti Belgesi' },
  { value: 'kimlik', label: 'Kimlik' },
  { value: 'diger', label: 'Diğer' },
];

const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentType,
}) => {
  const [selectedType, setSelectedType] = useState(currentType || '');

  const handleSelect = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Doküman Türü Seç">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Doküman Türü
          </label>
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            options={[
              { value: '', label: 'Tür seçin' },
              ...DOCUMENT_TYPES
            ]}
            className="w-full"
          />
        </div>

        <div className="text-sm text-gray-600">
          <p>Otomatik olarak belirlenen tür: <strong>{currentType || 'Belirlenemedi'}</strong></p>
          <p className="mt-1">Gerekirse manuel olarak değiştirebilirsiniz.</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedType}
          >
            Seç
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentTypeSelector;
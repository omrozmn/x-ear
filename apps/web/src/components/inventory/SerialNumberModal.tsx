import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Upload } from 'lucide-react';
import { Button, Input, Modal } from '@x-ear/ui-web';

interface SerialNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  availableCount: number;
  existingSerials?: string[];
  onSave: (serials: string[]) => void;
}

export const SerialNumberModal: React.FC<SerialNumberModalProps> = ({
  isOpen,
  onClose,
  productName,
  availableCount,
  existingSerials = [],
  onSave
}) => {
  const [serials, setSerials] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Initialize with existing serials or empty array
      const initialSerials = [...existingSerials];
      // Fill remaining with empty strings
      while (initialSerials.length < availableCount) {
        initialSerials.push('');
      }
      setSerials(initialSerials.slice(0, availableCount));
    }
  }, [isOpen, availableCount, existingSerials]);

  const handleSerialChange = (index: number, value: string) => {
    const newSerials = [...serials];
    newSerials[index] = value;
    setSerials(newSerials);
  };

  const clearSerial = (index: number) => {
    handleSerialChange(index, '');
  };

  const clearAllSerials = () => {
    if (window.confirm('Tüm seri numaralarını temizlemek istediğinizden emin misiniz?')) {
      setSerials(new Array(availableCount).fill(''));
    }
  };

  const handleSave = () => {
    // Filter out empty serials
    const validSerials = serials.filter(s => s.trim() !== '');
    onSave(validSerials);
    onClose();
  };

  const filteredSerials = serials.map((serial, index) => ({
    index,
    serial,
    matches: searchTerm === '' || serial.toLowerCase().includes(searchTerm.toLowerCase())
  }));

  const filledCount = serials.filter(s => s.trim() !== '').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Seri No Listesi - ${productName}`} size="xl">
      <div className="space-y-4">
        {/* Info */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Lütfen mevcut stok kadar seri girin. {filledCount > 0 && `✅ ${filledCount} adet seri numarası girildi.`}
        </p>

        {/* Search and Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Seri no ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="danger"
            onClick={clearAllSerials}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Tümünü Temizle
          </Button>
        </div>

        {/* Serial Inputs */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSerials.map(({ index, serial, matches }) => (
              matches && (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Seri #{index + 1}
                    </label>
                    <Input
                      type="text"
                      value={serial}
                      onChange={(e) => handleSerialChange(index, e.target.value)}
                      placeholder={`Seri ${index + 1}`}
                    />
                  </div>
                  <button
                    className="mt-5 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    onClick={() => clearSerial(index)}
                    title="Temizle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Kaydet
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SerialNumberModal;

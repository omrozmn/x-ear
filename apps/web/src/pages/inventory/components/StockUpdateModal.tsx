import React, { useState } from 'react';
import { Modal, Button, Input, Select, Textarea, Alert } from '@x-ear/ui-web';
import { InventoryItem } from '../../../types/inventory';

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryItem | null;
  onUpdateStock: (productId: string, data: StockUpdateData) => Promise<void>;
  isLoading?: boolean;
}

export interface StockUpdateData {
  type: 'add' | 'remove' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
}

const UPDATE_TYPES = [
  { value: 'add', label: 'Stok Ekle', icon: '➕', description: 'Mevcut stoka ekleme yapar' },
  { value: 'remove', label: 'Stok Çıkar', icon: '➖', description: 'Mevcut stoktan çıkarma yapar' },
  { value: 'set', label: 'Stok Belirle', icon: '🎯', description: 'Stoku belirtilen değere ayarlar' }
];

const STOCK_REASONS = [
  'Yeni sevkiyat',
  'Satış',
  'Hasarlı ürün',
  'Kayıp ürün',
  'Sayım düzeltmesi',
  'İade',
  'Transfer',
  'Diğer'
];

export const StockUpdateModal: React.FC<StockUpdateModalProps> = ({
  isOpen,
  onClose,
  product,
  onUpdateStock,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<StockUpdateData>({
    type: 'add',
    quantity: 0,
    reason: '',
    notes: ''
  });

  const handleSubmit = async () => {
    if (!product || !formData.quantity || !formData.reason) return;

    await onUpdateStock(product.id, formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      type: 'add',
      quantity: 0,
      reason: '',
      notes: ''
    });
    onClose();
  };

  const calculateNewStock = () => {
    if (!product) return 0;

    switch (formData.type) {
      case 'add':
        return product.availableInventory + formData.quantity;
      case 'remove':
        return Math.max(0, product.availableInventory - formData.quantity);
      case 'set':
        return formData.quantity;
      default:
        return product.availableInventory;
    }
  };

  const selectedType = UPDATE_TYPES.find(type => type.value === formData.type);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Stok Güncelle"
      size="md"
    >
      <div className="space-y-6 dark:text-white">
        {product && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
            <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              Mevcut Stok: <span className="font-medium">{product.availableInventory}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Model: {product.model} | Marka: {product.brand}
            </p>
          </div>
        )}

        <div>
          <Select
            label="İşlem Türü"
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as StockUpdateData['type'] }))}
            options={UPDATE_TYPES.map(type => ({
              value: type.value,
              label: `${type.icon} ${type.label}`
            }))}
            required
          />
          {selectedType && (
            <p className="text-xs text-muted-foreground mt-1">{selectedType.description}</p>
          )}
        </div>

        <div>
          <Input
            label={formData.type === 'set' ? 'Yeni Stok Miktarı' : 'Miktar'}
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
            placeholder="Miktar girin..."
            required
          />
        </div>

        <div>
          <Select
            label="Sebep"
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            options={STOCK_REASONS.map(reason => ({ value: reason, label: reason }))}
            placeholder="Sebep seçin..."
            required
          />
        </div>

        <div>
          <Textarea
            label="Notlar (Opsiyonel)"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Ek açıklama..."
            rows={3}
          />
        </div>

        {formData.quantity > 0 && product && (
          <Alert variant={formData.type === 'remove' && calculateNewStock() === 0 ? 'warning' : 'info'}>
            <strong>Yeni Stok:</strong> {calculateNewStock()} adet
            {formData.type === 'remove' && calculateNewStock() === 0 && (
              <div className="mt-1 text-sm">⚠️ Bu işlem sonrası stok sıfır olacak!</div>
            )}
          </Alert>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.quantity || !formData.reason || isLoading}
            loading={isLoading}
            variant="primary"
          >
            {selectedType?.icon} Stok Güncelle
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StockUpdateModal;
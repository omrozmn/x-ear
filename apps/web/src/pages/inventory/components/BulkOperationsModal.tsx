import React, { useState } from 'react';
import { Modal, Button, Select, Input, Textarea, Alert } from '@x-ear/ui-web';
import { InventoryCategory, InventoryStatus } from '../../../types/inventory';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: string[];
  onBulkOperation: (operation: BulkOperation) => Promise<void>;
  isLoading?: boolean;
}

export interface BulkOperation {
  type: 'delete' | 'update_stock' | 'change_category' | 'change_status' | 'update_price' | 'export' | 'update_supplier' | 'add_features';
  data?: {
    stock?: number;
    category?: InventoryCategory;
    status?: InventoryStatus;
    price?: number;
    reason?: string;
    supplier?: string;
    features?: string[];
    exportFormat?: 'csv' | 'excel' | 'pdf';
  };
}

const OPERATION_TYPES = [
  { value: 'delete', label: 'Seçili Ürünleri Sil', icon: '🗑️', color: 'red' },
  { value: 'update_stock', label: 'Stok Güncelle', icon: '📦', color: 'blue' },
  { value: 'change_category', label: 'Kategori Değiştir', icon: '📂', color: 'green' },
  { value: 'change_status', label: 'Durum Değiştir', icon: '🔄', color: 'yellow' },
  { value: 'update_price', label: 'Fiyat Güncelle', icon: '💰', color: 'purple' },
  { value: 'export', label: 'Seçili Ürünleri Dışa Aktar', icon: '📤', color: 'blue' },
  { value: 'update_supplier', label: 'Tedarikçi Güncelle', icon: '🏢', color: 'green' },
  { value: 'add_features', label: 'Özellik Ekle', icon: '⭐', color: 'purple' }
];

const CATEGORIES = [
  { value: 'hearing_aid', label: 'İşitme Cihazı' },
  { value: 'battery', label: 'Pil' },
  { value: 'accessory', label: 'Aksesuar' },
  { value: 'ear_mold', label: 'Kulak Kalıbı' },
  { value: 'cleaning_supplies', label: 'Temizlik Malzemesi' },
  { value: 'amplifiers', label: 'Amplifikatör' }
];

const STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Pasif' },
  { value: 'discontinued', label: 'Üretimi Durduruldu' },
  { value: 'out_of_stock', label: 'Stokta Yok' }
];

export const BulkOperationsModal: React.FC<BulkOperationsModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  onBulkOperation,
  isLoading = false
}) => {
  const [operationType, setOperationType] = useState<string>('');
  const [formData, setFormData] = useState({
    stock: '',
    category: '',
    status: '',
    price: '',
    reason: '',
    supplier: '',
    features: [] as string[],
    exportFormat: 'csv' as 'csv' | 'excel' | 'pdf',
    newFeature: ''
  });

  const handleSubmit = async () => {
    if (!operationType) return;

    const operation: BulkOperation = {
      type: operationType as BulkOperation['type'],
      data: {
        stock: formData.stock ? parseInt(formData.stock) : undefined,
        category: formData.category as InventoryCategory || undefined,
        status: formData.status as InventoryStatus || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        reason: formData.reason || undefined,
        supplier: formData.supplier || undefined,
        features: formData.features.length > 0 ? formData.features : undefined,
        exportFormat: formData.exportFormat || undefined
      }
    };

    await onBulkOperation(operation);
    handleClose();
  };

  const handleClose = () => {
    setOperationType('');
    setFormData({
      stock: '',
      category: '',
      status: '',
      price: '',
      reason: '',
      supplier: '',
      features: [],
      exportFormat: 'csv',
      newFeature: ''
    });
    onClose();
  };

  const selectedOperation = OPERATION_TYPES.find(op => op.value === operationType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Toplu İşlemler"
      size="md"
    >
      <div className="space-y-6">
        <Alert variant="info">
          {selectedItems.length} ürün seçildi. Bu işlem geri alınamaz.
        </Alert>

        <div>
          <Select
            label="İşlem Türü"
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            options={OPERATION_TYPES.map(op => ({
              value: op.value,
              label: `${op.icon} ${op.label}`
            }))}
            placeholder="İşlem seçin..."
            required
          />
        </div>

        {operationType === 'update_stock' && (
          <div>
            <Input
              label="Yeni Stok Miktarı"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
              placeholder="Stok miktarını girin..."
              required
            />
          </div>
        )}

        {operationType === 'change_category' && (
          <div>
            <Select
              label="Yeni Kategori"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              options={CATEGORIES}
              placeholder="Kategori seçin..."
              required
            />
          </div>
        )}

        {operationType === 'change_status' && (
          <div>
            <Select
              label="Yeni Durum"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              options={STATUSES}
              placeholder="Durum seçin..."
              required
            />
          </div>
        )}

        {operationType === 'update_price' && (
          <div>
            <Input
              label="Yeni Fiyat (₺)"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="Fiyat girin..."
              required
            />
          </div>
        )}

        {operationType === 'export' && (
          <div>
            <Select
              label="Dışa Aktarma Formatı"
              value={formData.exportFormat}
              onChange={(e) => setFormData(prev => ({ ...prev, exportFormat: e.target.value as 'csv' | 'excel' | 'pdf' }))}
              options={[
                { value: 'csv', label: '📊 CSV Dosyası' },
                { value: 'excel', label: '📈 Excel Dosyası' },
                { value: 'pdf', label: '📄 PDF Raporu' }
              ]}
              required
            />
          </div>
        )}

        {operationType === 'update_supplier' && (
          <div>
            <Input
              label="Yeni Tedarikçi"
              value={formData.supplier}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder="Tedarikçi adını girin..."
              required
            />
          </div>
        )}

        {operationType === 'add_features' && (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Input
                label="Yeni Özellik"
                value={formData.newFeature}
                onChange={(e) => setFormData(prev => ({ ...prev, newFeature: e.target.value }))}
                placeholder="Özellik adını girin..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (formData.newFeature.trim() && !formData.features.includes(formData.newFeature.trim())) {
                    setFormData(prev => ({
                      ...prev,
                      features: [...prev.features, prev.newFeature.trim()],
                      newFeature: ''
                    }));
                  }
                }}
                className="mt-6"
              >
                Ekle
              </Button>
            </div>
            {formData.features.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eklenecek Özellikler:
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {feature}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            features: prev.features.filter((_, i) => i !== index)
                          }));
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800 p-0 h-auto"
                      >
                        ×
                      </Button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {operationType && (
          <div>
            <Textarea
              label="İşlem Nedeni (Opsiyonel)"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Bu işlemi neden yapıyorsunuz?"
              rows={3}
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!operationType || isLoading}
            loading={isLoading}
            variant={selectedOperation?.color === 'red' ? 'danger' : 'primary'}
          >
            {selectedOperation?.icon} {selectedOperation?.label}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkOperationsModal;
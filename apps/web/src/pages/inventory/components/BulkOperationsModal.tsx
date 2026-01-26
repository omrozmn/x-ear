import React, { useState } from 'react';
import { Modal, Button, Input, Alert } from '@x-ear/ui-web';
import { Box, Folder, DollarSign, Tag, Truck, Star } from 'lucide-react';
import { InventoryCategory, InventoryStatus } from '../../../types/inventory';
import { SupplierAutocomplete } from './SupplierAutocomplete';
import CategoryAutocomplete from './CategoryAutocomplete';
import BrandAutocomplete from './BrandAutocomplete';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: string[];
  onBulkOperation: (operation: BulkOperation) => Promise<void>;
  isLoading?: boolean;
}

export interface BulkOperation {
  type: 'delete' | 'update_stock' | 'change_category' | 'change_status' | 'update_price' | 'update_supplier' | 'add_features' | 'change_brand';
  data?: {
    stock?: number;
    category?: InventoryCategory;
    status?: InventoryStatus;
    price?: number;
    kdv?: number;
    supplier?: string;
    brand?: string;
    features?: string[];
  };
}

const OPERATION_TYPES = [
  { value: 'update_stock', label: 'Stok Güncelle', icon: <Box className="w-5 h-5" />, color: 'blue' },
  { value: 'change_category', label: 'Kategori Değiştir', icon: <Folder className="w-5 h-5" />, color: 'green' },
  { value: 'update_price', label: 'Fiyat/KDV Güncelle', icon: <DollarSign className="w-5 h-5" />, color: 'purple' },
  { value: 'change_brand', label: 'Marka Değiştir', icon: <Tag className="w-5 h-5" />, color: 'green' },
  { value: 'update_supplier', label: 'Tedarikçi Güncelle', icon: <Truck className="w-5 h-5" />, color: 'green' },
  { value: 'add_features', label: 'Özellik Ekle', icon: <Star className="w-5 h-5" />, color: 'purple' }
];

/*
const CATEGORIES = [
  ...
];
*/

// status changes are not available via bulk operations in this UI

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
    kdv: '',
    supplier: '',
    brand: '',
    features: [] as string[],
    newFeature: ''
  });

  const handleSubmit = async () => {
    if (!operationType) return;

    // Build operation payload only with relevant fields for the selected operation
    const data: Record<string, unknown> = {};
    switch (operationType) {
      case 'delete':
        break;
      case 'update_stock':
        data.stock = (formData.stock !== undefined && formData.stock !== '') ? parseInt(formData.stock) : undefined;
        break;
      case 'change_category':
        data.category = formData.category as InventoryCategory || undefined;
        break;

      case 'update_price':
        data.price = (formData.price !== undefined && formData.price !== '') ? parseFloat(formData.price) : undefined;
        if (formData.kdv !== undefined && formData.kdv !== '') {
          data.kdv = parseFloat(formData.kdv);
        }
        break;
      case 'update_supplier':
        data.supplier = formData.supplier || undefined;
        break;
      case 'change_brand':
        data.brand = formData.brand || undefined;
        break;
      case 'add_features':
        data.features = formData.features.length > 0 ? formData.features : undefined;
        break;
      default:
        break;
    }

    const operation: BulkOperation = {
      type: operationType as BulkOperation['type'],
      data: Object.keys(data).length ? data : undefined
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
      supplier: '',
      brand: '',
      features: [],
      newFeature: '',
      kdv: ''
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
        <Alert variant="info" className="dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-100">
          {selectedItems.length} ürün seçildi. Bu işlem geri alınamaz.
        </Alert>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">İşlem Türü</label>
          <div className="grid grid-cols-3 gap-2">
            {OPERATION_TYPES.map(op => (
              <button
                data-allow-raw="true"
                key={op.value}
                type="button"
                onClick={() => setOperationType(op.value)}
                aria-pressed={operationType === op.value}
                className={`flex items-center space-x-2 p-3 border rounded-md text-sm focus:outline-none transition-colors ${operationType === op.value
                  ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/40 dark:border-blue-500'
                  : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
              >
                <span className={`text-gray-700 dark:text-gray-300 ${operationType === op.value ? 'dark:text-white' : ''}`}>{op.icon}</span>
                <span className={`text-left text-sm text-gray-800 dark:text-gray-200 ${operationType === op.value ? 'dark:text-white' : ''}`}>{op.label}</span>
              </button>
            ))}
          </div>
        </div>

        {operationType === 'update_stock' && (
          <div>
            <Input
              label="Yeni Stok Miktarı"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
              placeholder="Stok miktarını girin..."
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        )}

        {operationType === 'change_category' && (
          <div>
            <CategoryAutocomplete
              value={formData.category}
              onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
              placeholder="Kategori seçin veya yazın"
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
              placeholder="Fiyat girin... (boş bırakılırsa değiştirilmez)"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KDV Oranı (%)</label>
              <select
                data-allow-raw="true"
                value={formData.kdv}
                onChange={(e) => setFormData(prev => ({ ...prev, kdv: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">(Aynı bırak)</option>
                <option value="0">0%</option>
                <option value="1">1%</option>
                <option value="8">8%</option>
                <option value="18">18%</option>
              </select>
            </div>
          </div>
        )}



        {operationType === 'update_supplier' && (
          <div>
            <SupplierAutocomplete
              value={formData.supplier}
              onChange={(val) => setFormData(prev => ({ ...prev, supplier: val }))}
              placeholder="Tedarikçi adını girin veya seçin"
              required
            />
          </div>
        )}

        {operationType === 'change_brand' && (
          <div>
            <BrandAutocomplete
              value={formData.brand}
              onChange={(val) => setFormData(prev => ({ ...prev, brand: val }))}
              placeholder="Marka seçin veya yazın"
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
                className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Eklenecek Özellikler:
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
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
                        className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 p-0 h-auto"
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



        <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!operationType || isLoading}
            loading={isLoading}
            className={`inline-flex items-center px-4 py-2 rounded-md ${selectedOperation?.color === 'red' ? 'bg-red-600 hover:bg-red-700 text-white' :
              selectedOperation?.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                selectedOperation?.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  selectedOperation?.color === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                    selectedOperation?.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            <span className="mr-2">{selectedOperation?.icon}</span>
            <span className="font-medium">{selectedOperation?.label}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkOperationsModal;
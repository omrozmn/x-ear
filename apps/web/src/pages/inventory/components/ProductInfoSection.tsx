import React from 'react';
import { Input, Textarea, Select, Card } from '@x-ear/ui-web';
import { InventoryItem } from '../../../types/inventory';
import { CategoryAutocomplete } from './CategoryAutocomplete';
import { BrandAutocomplete } from './BrandAutocomplete';
import { SupplierAutocomplete } from './SupplierAutocomplete';
import { FeaturesTagManager } from '../../../components/inventory/FeaturesTagManager';

interface ProductInfoSectionProps {
  item: InventoryItem;
  isEditMode: boolean;
  editedItem: Partial<InventoryItem>;
  onEditChange: (updates: Partial<InventoryItem>) => void;
  onFeaturesChange: (features: string[]) => void;
}

export const ProductInfoSection: React.FC<ProductInfoSectionProps> = ({
  item,
  isEditMode,
  editedItem,
  onEditChange,
  onFeaturesChange,
}) => {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Ürün Bilgileri
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ürün Adı
            </label>
            {isEditMode ? (
              <Input
                value={editedItem.name || ''}
                onChange={(e) => onEditChange({ name: e.target.value })}
                fullWidth
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{item.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {isEditMode ? (
                <BrandAutocomplete
                  value={editedItem.brand || ''}
                  onChange={(value) => onEditChange({ brand: value })}
                  label="Marka"
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Marka
                  </label>
                  <p className="text-gray-900 dark:text-white">{item.brand}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model
              </label>
              {isEditMode ? (
                <Input
                  value={editedItem.model || ''}
                  onChange={(e) => onEditChange({ model: e.target.value })}
                  fullWidth
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{item.model}</p>
              )}
            </div>
          </div>

          <div>
            {isEditMode ? (
              <CategoryAutocomplete
                value={editedItem.category || ''}
                onChange={(value) => onEditChange({ category: value as import('../../../types/inventory').InventoryCategory })}
                label="Kategori"
              />
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategori
                </label>
                <p className="text-gray-900 dark:text-white">{item.category}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Barkod
              </label>
              {isEditMode ? (
                <Input
                  value={editedItem.barcode || ''}
                  onChange={(e) => onEditChange({ barcode: e.target.value })}
                  fullWidth
                />
              ) : (
                <p className="text-gray-900 dark:text-white font-mono">{item.barcode || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stok Kodu
              </label>
              {isEditMode ? (
                <Input
                  value={editedItem.stockCode || ''}
                  onChange={(e) => onEditChange({ stockCode: e.target.value })}
                  fullWidth
                />
              ) : (
                <p className="text-gray-900 dark:text-white font-mono">{item.stockCode || '-'}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {isEditMode ? (
                <SupplierAutocomplete
                  value={editedItem.supplier || ''}
                  onChange={(value) => onEditChange({ supplier: value })}
                  label="Tedarikçi"
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tedarikçi
                  </label>
                  <p className="text-gray-900 dark:text-white">{item.supplier || '-'}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Birim
              </label>
              {isEditMode ? (
                <Select
                  value={editedItem.unit || 'adet'}
                  onChange={(e) => onEditChange({ unit: e.target.value })}
                  options={[
                    { value: 'adet', label: 'Adet' },
                    { value: 'kutu', label: 'Kutu' },
                    { value: 'paket', label: 'Paket' },
                    { value: 'set', label: 'Set' },
                    { value: 'metre', label: 'Metre' },
                    { value: 'santimetre', label: 'Santimetre' },
                    { value: 'litre', label: 'Litre' },
                    { value: 'mililitre', label: 'Mililitre' },
                    { value: 'kilogram', label: 'Kilogram' },
                    { value: 'gram', label: 'Gram' },
                    { value: 'dakika', label: 'Dakika' },
                    { value: 'saat', label: 'Saat' },
                    { value: 'gün', label: 'Gün' },
                    { value: 'ay', label: 'Ay' },
                    { value: 'yıl', label: 'Yıl' },
                    { value: 'çift', label: 'Çift' },
                  ]}
                  fullWidth
                />
              ) : (
                <p className="text-gray-900 dark:text-white capitalize">{item.unit || 'adet'}</p>
              )}
            </div>
          </div>

          {item.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Açıklama
              </label>
              {isEditMode ? (
                <Textarea
                  value={editedItem.description || ''}
                  onChange={(e) => onEditChange({ description: e.target.value })}
                  rows={3}
                  fullWidth
                />
              ) : (
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{item.description}</p>
              )}
            </div>
          )}

          <FeaturesTagManager
            features={item.features || []}
            onChange={onFeaturesChange}
            isEditMode={isEditMode}
          />

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Oluşturulma: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : '-'}
            </p>
            {item.lastUpdated && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Son Güncelleme: {new Date(item.lastUpdated).toLocaleDateString('tr-TR')}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

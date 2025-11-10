import React from 'react';
import { Package } from 'lucide-react';
import { Input, Button, Card } from '@x-ear/ui-web';
import { InventoryItem } from '../../../types/inventory';

interface StockInfoSectionProps {
  item: InventoryItem;
  isEditMode: boolean;
  editedItem: Partial<InventoryItem>;
  onEditChange: (updates: Partial<InventoryItem>) => void;
  onSerialModalOpen: () => void;
}

export const StockInfoSection: React.FC<StockInfoSectionProps> = ({
  item,
  isEditMode,
  editedItem,
  onEditChange,
  onSerialModalOpen,
}) => {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Stok Bilgileri
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mevcut Stok
            </label>
            {isEditMode ? (
              <Input
                type="number"
                min="0"
                value={editedItem.availableInventory ?? item.availableInventory}
                onChange={(e) => onEditChange({ availableInventory: parseInt(e.target.value) || 0 })}
                fullWidth
              />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {item.availableInventory} adet
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min. Stok Seviyesi
            </label>
            {isEditMode ? (
              <Input
                type="number"
                min="0"
                value={editedItem.reorderLevel || item.reorderLevel}
                onChange={(e) => onEditChange({ reorderLevel: parseInt(e.target.value) || 0 })}
                fullWidth
              />
            ) : (
              <p className="text-lg text-gray-900 dark:text-white">
                {item.reorderLevel} adet
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={onSerialModalOpen}
              disabled={!item.availableInventory || item.availableInventory === 0}
              fullWidth
            >
              <Package className="w-4 h-4 mr-2" />
              Seri No Listesi ({item.availableInventory || 0} adet)
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

import React from 'react';
import { Shield } from 'lucide-react';
import { Card } from '@x-ear/ui-web';
import { InventoryItem } from '../../../types/inventory';

interface WarrantyInfoSectionProps {
  item: InventoryItem;
}

export const WarrantyInfoSection: React.FC<WarrantyInfoSectionProps> = ({ item }) => {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Garanti Bilgileri
        </h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Garanti Süresi
          </label>
          <p className="text-gray-900 dark:text-white">
            {item.warranty ? `${item.warranty} ay` : 'Belirtilmemiş'}
          </p>
        </div>
      </div>
    </Card>
  );
};

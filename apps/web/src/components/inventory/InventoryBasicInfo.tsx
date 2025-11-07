import React from 'react';
import { Tag, Hash, User, Calendar, FileText } from 'lucide-react';
import { Card, Badge } from '@x-ear/ui-web';
import { InventoryItem } from '../../types/inventory';

interface InventoryBasicInfoProps {
  item: InventoryItem;
}

export const InventoryBasicInfo: React.FC<InventoryBasicInfoProps> = ({ item }) => {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Temel Bilgiler
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4 mr-2" />
              Kategori
            </label>
            <p className="text-gray-900 dark:text-white">{item.category || '-'}</p>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Hash className="w-4 h-4 mr-2" />
              Barkod
            </label>
            <p className="text-gray-900 dark:text-white font-mono">{item.barcode || '-'}</p>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 mr-2" />
              Tedarikçi
            </label>
            <p className="text-gray-900 dark:text-white">{item.supplier || '-'}</p>
          </div>

          {item.warranty && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                Garanti Süresi
              </label>
              <p className="text-gray-900 dark:text-white">{item.warranty} ay</p>
            </div>
          )}

          {item.description && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-4 h-4 mr-2" />
                Açıklama
              </label>
              <p className="text-gray-900 dark:text-white text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          {item.features && item.features.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Özellikler
              </label>
              <div className="flex flex-wrap gap-2">
                {item.features.map((feature, index) => (
                  <Badge key={index} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

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

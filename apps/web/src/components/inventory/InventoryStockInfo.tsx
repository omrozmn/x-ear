import React from 'react';
import { Package, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, Badge } from '@x-ear/ui-web';
import { InventoryItem } from '../../types/inventory';

interface InventoryStockInfoProps {
  item: InventoryItem;
}

export const InventoryStockInfo: React.FC<InventoryStockInfoProps> = ({ item }) => {
  const getStockStatus = () => {
    if (item.availableInventory === 0) {
      return { label: 'Tükendi', color: 'red' as const };
    } else if (item.availableInventory <= item.reorderLevel) {
      return { label: 'Düşük Stok', color: 'yellow' as const };
    } else {
      return { label: 'Stokta', color: 'green' as const };
    }
  };

  const stockStatus = getStockStatus();

  return (
    <div className="space-y-6">
      {/* Stock Status Badge */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Stok Durumu
            </h2>
            <Badge variant={stockStatus.color} size="lg">
              {stockStatus.label}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Stock Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Mevcut Stok
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {item.availableInventory}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Min. Stok
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {item.reorderLevel}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Birim Fiyat
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₺{item.price.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            {item.vatIncludedPrice && (
              <p className="text-xs text-gray-500 mt-2">
                KDV Dahil: ₺{item.vatIncludedPrice.toFixed(2)}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Toplam Değer
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₺{item.totalValue.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stock Info */}
      {(item.totalInventory !== undefined || item.usedInventory !== undefined) && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Stok Detayları
            </h3>
            <div className="space-y-3">
              {item.totalInventory !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Toplam Stok
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.totalInventory}
                  </span>
                </div>
              )}
              {item.usedInventory !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Kullanılan
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.usedInventory}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Kullanılabilir
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {item.availableInventory}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

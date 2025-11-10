import React from 'react';
import { Input, Select, Card } from '@x-ear/ui-web';
import { InventoryItem } from '../../../types/inventory';

interface PricingInfoSectionProps {
  item: InventoryItem;
  isEditMode: boolean;
  editedItem: Partial<InventoryItem>;
  onEditChange: (updates: Partial<InventoryItem>) => void;
  kdvRate: number;
  onKdvRateChange: (rate: number) => void;
  isPriceKdvIncluded: boolean;
  onPriceKdvIncludedChange: (included: boolean) => void;
  isCostKdvIncluded: boolean;
  onCostKdvIncludedChange: (included: boolean) => void;
}

export const PricingInfoSection: React.FC<PricingInfoSectionProps> = ({
  item,
  isEditMode,
  editedItem,
  onEditChange,
  kdvRate,
  onKdvRateChange,
  isPriceKdvIncluded,
  onPriceKdvIncludedChange,
  isCostKdvIncluded,
  onCostKdvIncludedChange,
}) => {
  const currentPrice = isEditMode && editedItem.price !== undefined ? editedItem.price : (item?.price || 0);
  const currentStock = isEditMode && editedItem.availableInventory !== undefined ? editedItem.availableInventory : (item?.availableInventory || 0);
  
  // Calculate prices based on KDV inclusion
  const priceExcludingKdv = isPriceKdvIncluded ? currentPrice / (1 + kdvRate / 100) : currentPrice;
  const priceWithKdv = isPriceKdvIncluded ? currentPrice : currentPrice * (1 + kdvRate / 100);
  const kdvAmount = priceWithKdv - priceExcludingKdv;
  const totalInventoryValue = priceExcludingKdv * currentStock;
  
  const currentCost = isEditMode && editedItem.cost !== undefined ? editedItem.cost : (item?.cost || 0);
  const costExcludingKdv = isCostKdvIncluded ? currentCost / (1 + kdvRate / 100) : currentCost;
  const profitMargin = costExcludingKdv > 0 ? ((priceExcludingKdv - costExcludingKdv) / costExcludingKdv) * 100 : 0;

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Fiyat Bilgileri
        </h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Satış Fiyatı
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPriceKdvIncluded}
                  onChange={(e) => onPriceKdvIncludedChange(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">KDV Dahil</span>
              </label>
            </div>
            {isEditMode ? (
              <>
                <Input
                  type="number"
                  step="0.01"
                  value={editedItem.price || ''}
                  onChange={(e) => onEditChange({ price: parseFloat(e.target.value) })}
                  fullWidth
                />
                {isPriceKdvIncluded ? (
                  editedItem.price && editedItem.price > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      KDV Hariç: ₺{(editedItem.price / (1 + kdvRate / 100)).toFixed(2)}
                    </p>
                  )
                ) : (
                  editedItem.price && editedItem.price > 0 && (
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      KDV Dahil Toplam: ₺{(editedItem.price * (1 + kdvRate / 100)).toFixed(2)}
                    </p>
                  )
                )}
              </>
            ) : (
              <>
                <p className="text-gray-900 dark:text-white">₺{item.price.toFixed(2)}</p>
                {isPriceKdvIncluded ? (
                  item.price > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      KDV Hariç: ₺{(item.price / (1 + kdvRate / 100)).toFixed(2)}
                    </p>
                  )
                ) : (
                  item.price > 0 && (
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      KDV Dahil Toplam: ₺{(item.price * (1 + kdvRate / 100)).toFixed(2)}
                    </p>
                  )
                )}
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Maliyet
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCostKdvIncluded}
                  onChange={(e) => onCostKdvIncludedChange(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">KDV Dahil</span>
              </label>
            </div>
            {isEditMode ? (
              <>
                <Input
                  type="number"
                  step="0.01"
                  value={editedItem.cost || ''}
                  onChange={(e) => onEditChange({ cost: parseFloat(e.target.value) || 0 })}
                  fullWidth
                />
                {isCostKdvIncluded ? (
                  editedItem.cost && editedItem.cost > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      KDV Hariç: ₺{(editedItem.cost / (1 + kdvRate / 100)).toFixed(2)}
                    </p>
                  )
                ) : (
                  editedItem.cost && editedItem.cost > 0 && (
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      KDV Dahil Toplam: ₺{(editedItem.cost * (1 + kdvRate / 100)).toFixed(2)}
                    </p>
                  )
                )}
              </>
            ) : (
              <>
                <p className="text-gray-900 dark:text-white">₺{item.cost?.toFixed(2) || '0.00'}</p>
                {isCostKdvIncluded ? (
                  item.cost && item.cost > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      KDV Hariç: ₺{(item.cost / (1 + kdvRate / 100)).toFixed(2)}
                    </p>
                  )
                ) : (
                  item.cost && item.cost > 0 && (
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      KDV Dahil Toplam: ₺{(item.cost * (1 + kdvRate / 100)).toFixed(2)}
                    </p>
                  )
                )}
              </>
            )}
            {item.cost && item.cost > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Kar Marjı: %{profitMargin.toFixed(1)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              KDV Oranı
            </label>
            <Select
              value={kdvRate.toString()}
              onChange={(e) => onKdvRateChange(parseFloat(e.target.value))}
              options={[
                { value: '0', label: '%0' },
                { value: '1', label: '%1' },
                { value: '10', label: '%10' },
                { value: '20', label: '%20' }
              ]}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              KDV Dahil Birim Fiyat
            </label>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                ₺{priceWithKdv.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                KDV: ₺{kdvAmount.toFixed(2)} (%{kdvRate})
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Toplam Stok Değeri (KDV Hariç)
            </label>
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg">
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                ₺{totalInventoryValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {currentStock} adet × ₺{priceExcludingKdv.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

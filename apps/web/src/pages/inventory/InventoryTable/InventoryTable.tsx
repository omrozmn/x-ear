import React from 'react';
import { InventoryItem } from '../../../types/inventory';
import InventoryRow from './InventoryRow';
import { Checkbox } from '@x-ear/ui-web';

type Props = {
  items: InventoryItem[];
  onEdit: (id: string) => void;
  onViewDetails?: (item: InventoryItem) => void;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
};

const InventoryTable: React.FC<Props> = ({
  items,
  onEdit,
  onViewDetails,
  selectedItems = [],
  onSelectionChange
}) => {
  if (!items || items.length === 0)
    return <div className="p-4 text-sm text-gray-500">Ürün bulunamadı.</div>;

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? items.map(item => item.id) : []);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedItems, itemId]);
      } else {
        onSelectionChange(selectedItems.filter(id => id !== itemId));
      }
    }
  };

  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < items.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <table className="min-w-full table-auto">
        <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
          <tr className="text-left border-b dark:border-gray-700">
            {onSelectionChange && (
              <th className="px-4 py-3">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
            )}
            <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ürün</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Miktar</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fiyat</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              onEdit={onEdit}
              onViewDetails={onViewDetails}
              isSelected={selectedItems.includes(item.id)}
              onSelect={(checked) => handleSelectItem(item.id, checked)}
              showCheckbox={!!onSelectionChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;

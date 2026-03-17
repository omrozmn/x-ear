import React from 'react';
import { InventoryItem } from '../../../types/inventory';
import Button from '../../../components/ui/Button';
import { Checkbox } from '@x-ear/ui-web';

type Props = {
  item: InventoryItem;
  onEdit: (id: string) => void;
  onViewDetails?: (item: InventoryItem) => void;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  showCheckbox?: boolean;
};

const InventoryRow: React.FC<Props> = ({
  item,
  onEdit,
  onViewDetails,
  isSelected = false,
  onSelect,
  showCheckbox = false
}) => {
  return (
    <tr className="border-b hover:bg-muted dark:hover:bg-gray-700 dark:border-gray-700">
      {showCheckbox && (
        <td className="px-4 py-3">
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect?.(e.target.checked)}
          />
        </td>
      )}
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{item.barcode ?? '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.availableInventory}</td>
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{(item.price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY</td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'available' ? 'bg-success/10 text-success' :
            item.status === 'low_stock' ? 'bg-warning/10 text-yellow-800 dark:text-yellow-200' :
              'bg-destructive/10 text-red-800 dark:text-red-200'
          }`}>
          {item.status === 'available' ? 'Mevcut' :
            item.status === 'low_stock' ? 'Düşük Stok' :
              item.status === 'out_of_stock' ? 'Stok Yok' : item.status || '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium">
        <div className="flex space-x-2">
          {onViewDetails && (
            <Button variant="secondary" onClick={() => onViewDetails(item)}>
              Detay
            </Button>
          )}
          <Button variant="secondary" onClick={() => onEdit(item.id)}>
            Düzenle
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default InventoryRow;

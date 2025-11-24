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
    <tr className="border-b hover:bg-gray-50">
      {showCheckbox && (
        <td className="px-4 py-3">
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect?.(e.target.checked)}
          />
        </td>
      )}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.barcode ?? '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">{item.availableInventory}</td>
      <td className="px-4 py-3 text-sm text-gray-900">{(item.price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY</td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          item.status === 'available' ? 'bg-green-100 text-green-800' :
          item.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
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

import React from 'react';
import { InventoryItem } from '../../../services/apiClient';
import Button from '../../../components/ui/Button';

type Props = {
  item: InventoryItem;
  onEdit: (id: string) => void;
};

const InventoryRow: React.FC<Props> = ({ item, onEdit }) => {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-2 py-2">{item.name}</td>
      <td className="px-2 py-2">{item.sku ?? '-'}</td>
      <td className="px-2 py-2">{item.quantity}</td>
      <td className="px-2 py-2">{item.price.toFixed(2)} ₺</td>
      <td className="px-2 py-2">{item.status ?? '—'}</td>
      <td className="px-2 py-2">
        <Button variant="secondary" onClick={() => onEdit(item.id)}>
          Düzenle
        </Button>
      </td>
    </tr>
  );
};

export default InventoryRow;

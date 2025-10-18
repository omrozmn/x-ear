import React from 'react';
import { InventoryItem } from '../../../services/apiClient';
import InventoryRow from './InventoryRow';

type Props = {
  items: InventoryItem[];
  onEdit: (id: string) => void;
};

const InventoryTable: React.FC<Props> = ({ items, onEdit }) => {
  if (!items || items.length === 0)
    return <div className="p-4 text-sm text-gray-500">Ürün bulunamadı.</div>;

  return (
    <table className="min-w-full table-auto">
      <thead>
        <tr className="text-left border-b">
          <th className="px-2 py-2">Ürün</th>
          <th className="px-2 py-2">SKU</th>
          <th className="px-2 py-2">Miktar</th>
          <th className="px-2 py-2">Fiyat</th>
          <th className="px-2 py-2">Durum</th>
          <th className="px-2 py-2">İşlemler</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <InventoryRow key={it.id} item={it} onEdit={onEdit} />
        ))}
      </tbody>
    </table>
  );
};

export default InventoryTable;

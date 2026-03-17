import React from 'react';
import { InventoryItem } from '../../../types/inventory';
import Button from '../../../components/ui/Button';
import { DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';

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
  const inventoryColumns: Column<InventoryItem>[] = [
    {
      key: 'name',
      title: 'Ürün',
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
      ),
    },
    {
      key: '_barcode',
      title: 'SKU',
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-muted-foreground">{item.barcode ?? '-'}</span>
      ),
    },
    {
      key: 'availableInventory',
      title: 'Miktar',
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">{item.availableInventory}</span>
      ),
    },
    {
      key: 'price',
      title: 'Fiyat',
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {(item.price ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Durum',
      render: (_: unknown, item: InventoryItem) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          item.status === 'available' ? 'bg-success/10 text-success' :
          item.status === 'low_stock' ? 'bg-warning/10 text-yellow-800 dark:text-yellow-200' :
          'bg-destructive/10 text-red-800 dark:text-red-200'
        }`}>
          {item.status === 'available' ? 'Mevcut' :
            item.status === 'low_stock' ? 'Düşük Stok' :
            item.status === 'out_of_stock' ? 'Stok Yok' : item.status || '—'}
        </span>
      ),
    },
    {
      key: '_actions',
      title: 'İşlemler',
      render: (_: unknown, item: InventoryItem) => (
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
      ),
    },
  ];

  return (
    <DataTable<InventoryItem>
      data={items || []}
      columns={inventoryColumns}
      rowKey="id"
      rowSelection={onSelectionChange ? {
        selectedRowKeys: selectedItems,
        onChange: (newKeys) => onSelectionChange(newKeys.map(String)),
      } : undefined}
      loading={false}
      emptyText="Ürün bulunamadı."
    />
  );
};

export default InventoryTable;

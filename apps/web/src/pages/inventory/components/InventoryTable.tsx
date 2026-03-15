import React from 'react';
import { InventoryItem } from '../../../types/inventory';
import { Button, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import {
  Edit,
  Trash2,
  Eye,
  Printer,
  Copy,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  selectedItems: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onView: (item: InventoryItem) => void;
  onUpdateStock: (item: InventoryItem) => void;
  onGenerateBarcode: (item: InventoryItem) => void;
  onDuplicate?: (item: InventoryItem) => void;
  onToggleStatus?: (item: InventoryItem) => void;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onEdit,
  onDelete,
  onView,
  onUpdateStock,
  onGenerateBarcode,
  onDuplicate,
  onToggleStatus,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const getStockStatus = (item: InventoryItem) => {
    if (item.availableInventory === 0) {
      return { label: 'Stok Yok', color: 'bg-red-100 text-red-800' };
    } else if (item.availableInventory <= item.reorderLevel) {
      return { label: 'Düşük Stok', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Stokta', color: 'bg-green-100 text-green-800' };
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      'hearing_aid': 'İşitme Cihazı',
      'battery': 'Pil',
      'accessory': 'Aksesuar',
      'ear_mold': 'Kulak Kalıbı',
      'cleaning_supplies': 'Temizlik Malzemeleri',
      'amplifiers': 'Amplifikatör',
    };
    return categoryMap[category] || category;
  };

  const inventoryColumns: Column<InventoryItem>[] = [
    {
      key: 'name',
      title: 'Ürün Adı',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <div
          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
          onClick={() => onView(item)}
        >
          {item.name}
          {item.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {item.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'brand',
      title: 'Marka',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">{item.brand}</span>
      ),
    },
    {
      key: 'model',
      title: 'Model',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">{item.model || '-'}</span>
      ),
    },
    {
      key: 'category',
      title: 'Kategori',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {getCategoryLabel(item.category)}
        </span>
      ),
    },
    {
      key: 'barcode',
      title: 'Barkod',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{item.barcode || '-'}</span>
      ),
    },
    {
      key: 'availableInventory',
      title: 'Stok',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.availableInventory}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">/ {item.totalInventory}</span>
        </div>
      ),
    },
    {
      key: 'reorderLevel',
      title: 'Min. Stok',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">{item.reorderLevel}</span>
      ),
    },
    {
      key: 'price',
      title: 'Fiyat',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_: unknown, item: InventoryItem) => {
        const stockStatus = getStockStatus(item);
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
            {stockStatus.label}
          </span>
        );
      },
    },
    {
      key: '_actions',
      title: 'İşlemler',
      render: (_: unknown, item: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => onView(item)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
            title="Detayları Görüntüle"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onEdit(item)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
            title="Düzenle"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {onDuplicate && (
            <Button
              variant="ghost"
              onClick={() => onDuplicate(item)}
              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
              title="Kopyala"
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => onUpdateStock(item)}
            className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30"
            title="Stok Güncelle"
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onGenerateBarcode(item)}
            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30"
            title="Barkod Oluştur"
          >
            <Printer className="w-4 h-4" />
          </Button>
          {onToggleStatus && (
            <Button
              variant="ghost"
              onClick={() => onToggleStatus(item)}
              className={`p-1 rounded ${
                item.status === 'available'
                  ? 'text-green-600 hover:text-green-900 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800'
              }`}
              title={item.status === 'available' ? 'Pasif Yap' : 'Aktif Yap'}
            >
              {item.status === 'available' ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => onDelete(item)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
            title="Sil"
          >
            <Trash2 className="w-4 h-4" />
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
      sortable={true}
      rowSelection={{
        selectedRowKeys: selectedItems,
        onChange: (newKeys) => {
          const newStringKeys = newKeys.map(String);
          if (newStringKeys.length === 0) {
            onSelectAll(false);
          } else if (newStringKeys.length === (items || []).length) {
            onSelectAll(true);
          } else {
            const newSet = new Set(newStringKeys);
            const oldSet = new Set(selectedItems);
            for (const key of Array.from(newSet)) {
              if (!oldSet.has(key)) onSelectItem(key);
            }
            for (const key of Array.from(oldSet)) {
              if (!newSet.has(key)) onSelectItem(key);
            }
          }
        },
      }}
      pagination={{
        current: currentPage,
        pageSize: itemsPerPage,
        total: (items || []).length,
        showSizeChanger: !!onItemsPerPageChange,
        pageSizeOptions: [10, 20, 50, 100],
        onChange: (page, size) => {
          onPageChange(page);
          if (size !== itemsPerPage && onItemsPerPageChange) {
            onItemsPerPageChange(size);
          }
        },
      }}
      loading={false}
      emptyText="Ürün bulunamadı."
    />
  );
};

export default InventoryTable;

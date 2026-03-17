import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('inventory');
  const getStockStatus = (item: InventoryItem) => {
    if (item.availableInventory === 0) {
      return { label: t('status.out_of_stock'), color: 'bg-destructive/10 text-red-800' };
    } else if (item.availableInventory <= item.reorderLevel) {
      return { label: t('status.low_stock'), color: 'bg-warning/10 text-yellow-800' };
    } else {
      return { label: t('status.in_stock'), color: 'bg-success/10 text-success' };
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      'hearing_aid': t('categories.title'),
      'battery': t('form.description'),
      'accessory': t('form.description'),
      'ear_mold': t('form.description'),
      'cleaning_supplies': t('form.description'),
      'amplifiers': t('form.description'),
    };
    return categoryMap[category] || category;
  };

  const inventoryColumns: Column<InventoryItem>[] = [
    {
      key: 'name',
      title: t('columns.product_name'),
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <div
          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-primary dark:hover:text-blue-400 hover:underline"
          onClick={() => onView(item)}
        >
          {item.name}
          {item.description && (
            <div className="text-sm text-muted-foreground truncate max-w-xs">
              {item.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'brand',
      title: t('columns.brand'),
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
      title: t('columns.category'),
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-blue-800">
          {getCategoryLabel(item.category)}
        </span>
      ),
    },
    {
      key: 'barcode',
      title: t('columns.barcode'),
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{item.barcode || '-'}</span>
      ),
    },
    {
      key: 'availableInventory',
      title: t('columns.stock'),
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.availableInventory}</span>
          <span className="text-xs text-muted-foreground">/ {item.totalInventory}</span>
        </div>
      ),
    },
    {
      key: 'reorderLevel',
      title: t('stock.min_stock'),
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">{item.reorderLevel}</span>
      ),
    },
    {
      key: 'price',
      title: t('columns.sale_price'),
      sortable: true,
      render: (_: unknown, item: InventoryItem) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      title: t('columns.status'),
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
      title: t('columns.status'),
      render: (_: unknown, item: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => onView(item)}
            className="text-primary hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded hover:bg-primary/10 dark:hover:bg-blue-900/30"
            title={t('actions.view_details')}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onEdit(item)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
            title={t('actions.edit')}
          >
            <Edit className="w-4 h-4" />
          </Button>
          {onDuplicate && (
            <Button
              variant="ghost"
              onClick={() => onDuplicate(item)}
              className="text-success hover:text-green-900 dark:hover:text-green-300 p-1 rounded hover:bg-success/10 dark:hover:bg-green-900/30"
              title={t('actions.duplicate')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => onUpdateStock(item)}
            className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30"
            title={t('actions.adjust_stock')}
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onGenerateBarcode(item)}
            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30"
            title={t('actions.print_barcode')}
          >
            <Printer className="w-4 h-4" />
          </Button>
          {onToggleStatus && (
            <Button
              variant="ghost"
              onClick={() => onToggleStatus(item)}
              className={`p-1 rounded ${
                item.status === 'available'
                  ? 'text-success hover:text-green-900 hover:bg-success/10 dark:hover:text-green-300 dark:hover:bg-green-900/30'
                  : 'text-muted-foreground hover:text-gray-900 hover:bg-muted dark:hover:text-gray-300 dark:hover:bg-gray-800'
              }`}
              title={item.status === 'available' ? t('actions.deactivate') : t('actions.activate')}
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
            className="text-destructive hover:text-red-900 dark:hover:text-red-300 p-1 rounded hover:bg-destructive/10 dark:hover:bg-red-900/30"
            title={t('actions.delete')}
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
      emptyText={t('products.not_found')}
    />
  );
};

export default InventoryTable;

import { Button, Badge, DataTable, Checkbox } from '@x-ear/ui-web';
// UniversalImporter moved to page header; keep schemas imported where needed elsewhere
import BulkOperationsModal, { BulkOperation } from '../../pages/inventory/components/BulkOperationsModal';
import WarningModal from '../../pages/inventory/components/WarningModal';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInventoryGetInventoryItems,
  useInventoryDeleteInventoryItem,
  useInventoryUpdateInventoryItem,
  getInventoryGetInventoryItemsQueryKey
} from '../../api/generated/inventory/inventory';
import { InventoryItem as InventoryItemSchema, InventoryGetInventoryItemsParams } from '../../api/generated/schemas';
import { AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react';
import { InventoryItem as FrontendInventoryItem, InventoryFilters, InventoryStatus, InventoryCategory } from '../../types/inventory';
import type { AxiosError } from 'axios';

// Human-friendly category labels (keep in sync with ProductForm CATEGORIES)
const CATEGORY_LABELS: Record<string, string> = {
  hearing_aid: 'İşitme Cihazı',
  battery: 'Pil',
  accessory: 'Aksesuar',
  ear_mold: 'Kulak Kalıbı',
  cleaning_supplies: 'Temizlik Malzemesi',
  amplifiers: 'Amplifikatör'
};

interface InventoryListProps {
  filters?: InventoryFilters;
  onItemSelect?: (item: FrontendInventoryItem) => void;
  onItemEdit?: (item: FrontendInventoryItem) => void;
  onItemDelete?: (item: FrontendInventoryItem) => void;
  className?: string;
  refreshKey?: number;
}

// Define specific type for extended params to handle backend filters not in OpenAPI
interface ExtendedInventoryParams extends InventoryGetInventoryItemsParams {
  brand?: string;
  supplier?: string;
  out_of_stock?: boolean;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  filters = {},
  onItemSelect,
  onItemEdit,
  onItemDelete,
  className = '',
  refreshKey
}) => {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [failureDetails, setFailureDetails] = useState<Array<{ id: string; message: string; status?: number; data?: any }>>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Build API query params
  const queryParams: ExtendedInventoryParams = useMemo(() => {
    const params: ExtendedInventoryParams = {
      page: currentPage,
      per_page: pageSize
    };

    if (filters.category) params.category = filters.category;
    if (filters.brand) params.brand = filters.brand;
    if (filters.search) params.search = filters.search;
    if (filters.supplier) params.supplier = filters.supplier;

    // Stock status filter
    if (filters.stockStatus && filters.stockStatus !== 'all') {
      if (filters.stockStatus === 'low_stock') {
        // Backend key from OpenAPI is camelCase 'lowStock'
        params.lowStock = true;
      } else if (filters.stockStatus === 'out_of_stock') {
        // Custom param not in OpenAPI yet
        params.out_of_stock = true;
      }
    }
    return params;
  }, [currentPage, pageSize, filters]);

  // Data Fetching Query
  // Verify with backend that it accepts extra params (Axios serializes them even if type doesn't say so)
  const {
    data: fetchResponse,
    isLoading,
    error: fetchError,
    refetch
  } = useInventoryGetInventoryItems(queryParams as InventoryGetInventoryItemsParams, {
    query: {
      staleTime: 5000
    }
  });

  // Mutations
  const deleteItemMutation = useInventoryDeleteInventoryItem();
  const updateItemMutation = useInventoryUpdateInventoryItem();

  // Reload when parent signals refresh
  useEffect(() => {
    if (typeof refreshKey !== 'undefined') {
      refetch();
    }
  }, [refreshKey, refetch]);

  // Transform Data
  const { items, totalItems } = useMemo(() => {
    // Check if data exists
    if (!fetchResponse?.data?.data || !Array.isArray(fetchResponse.data.data)) {
      return { items: [], totalItems: 0 };
    }

    const rawItems = fetchResponse.data.data;
    const mappedItems: FrontendInventoryItem[] = rawItems.map((item: any) => {
      // Handle features
      let features: string[] = [];
      if (item.features) {
        if (typeof item.features === 'string') {
          try {
            features = JSON.parse(item.features);
          } catch {
            features = item.features.split(',').map((f: string) => f.trim()).filter(Boolean);
          }
        } else if (Array.isArray(item.features)) {
          features = item.features;
        }
      }

      // Handle serial numbers
      let availableSerials: string[] = [];
      if (item.availableSerials) {
        if (typeof item.availableSerials === 'string') {
          try {
            availableSerials = JSON.parse(item.availableSerials);
          } catch {
            availableSerials = [];
          }
        } else if (Array.isArray(item.availableSerials)) {
          availableSerials = item.availableSerials;
        }
      }

      // Category - Keep as Enum value for Type Safety
      // The render function in columns will handle the label display
      const rawCategory = (item.category as InventoryCategory) || 'accessory'; // Fallback to safe enum

      // Resolve KDV
      const rawKdv = typeof item.kdv !== 'undefined' && item.kdv !== null ? item.kdv : (typeof item.vatRate !== 'undefined' && item.vatRate !== null ? item.vatRate : undefined);
      const parsedKdv = typeof rawKdv !== 'undefined' ? Number(rawKdv) : undefined;
      const kdvVal = typeof parsedKdv === 'number' && !isNaN(parsedKdv) ? parsedKdv : 18;

      const priceNum = parseFloat(item.price) || 0;
      const vatIncluded = priceNum * (1 + (kdvVal / 100.0));

      // Map to FrontendInventoryItem interface
      return {
        id: String(item.id),
        name: item.name || 'Unnamed Product',
        brand: item.brand || '',
        model: item.model || '',
        category: rawCategory,

        availableInventory: item.availableInventory ?? item.stock ?? item.available_inventory ?? 0,
        totalInventory: item.totalInventory ?? item.total_inventory ?? 0,
        usedInventory: item.usedInventory ?? item.used_inventory ?? 0,
        reorderLevel: item.reorderLevel ?? item.minInventory ?? item.min_inventory ?? 5,

        price: priceNum, // Mandatory
        cost: parseFloat(item.cost) || 0,

        vatIncludedPrice: vatIncluded || 0,
        totalValue: (item.availableInventory || item.available_inventory || 0) * priceNum || 0,

        barcode: item.barcode || '',
        supplier: item.supplier || '',
        description: item.description || '',

        status: ((item.availableInventory || 0) > 0 ? 'available' : 'out_of_stock') as InventoryStatus,
        features,
        availableSerials,

        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        lastUpdated: item.updatedAt || item.updated_at || new Date().toISOString()
      };
    });

    // Pagination info from schema: pagination.total
    const total = fetchResponse.data.pagination?.total || mappedItems.length;
    return { items: mappedItems, totalItems: total };
  }, [fetchResponse]);

  // Helper: format numbers as TR locale
  const formatCurrencyTR = (amount: number) => {
    try {
      return (amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TRY';
    } catch (e) {
      return `${Number(amount || 0).toFixed(2)} TRY`;
    }
  };

  // Bulk actions
  const exportSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));

    const headers = [
      'ID', 'Ürün Adı', 'Marka', 'Model', 'Kategori', 'Stok',
      'Fiyat', 'Barkod', 'Tedarikçi'
    ];

    const csvContent = [
      headers.join(','),
      ...selectedItems.map((item: any) => [
        item.id,
        `"${item.name || ''}"`,
        `"${item.brand || ''}"`,
        `"${item.model || ''}"`,
        `"${CATEGORY_LABELS[item.category] || item.category || ''}"`,
        item.availableInventory || 0,
        item.price || 0,
        `"${item.barcode || ''}"`,
        `"${item.supplier || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_selected_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${selectedIds.length} ürünü silmek istediğinizden emin misiniz?`)) return;

    try {
      await Promise.all(selectedIds.map(id => deleteItemMutation.mutateAsync({ itemId: id })));
      setSelectedIds([]);
      // Invalidate specific query keys
      await queryClient.invalidateQueries({ queryKey: getInventoryGetInventoryItemsQueryKey() });
    } catch (err) {
      console.error('Bulk delete failed:', err);
      alert('Toplu silme başarısız oldu');
    }
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    try {
      const selectedItems = items.filter(i => selectedIds.includes(i.id));

      // Perform API-backed bulk operation for each selected item
      const failures: Array<{ id: string; message: string; status?: number; data?: any }> = [];

      // Execute sequentially
      for (const it of selectedItems) {
        try {
          const id = it.id;
          switch (operation.type) {
            case 'delete':
              await deleteItemMutation.mutateAsync({ itemId: id });
              break;
            case 'update_stock':
              await updateItemMutation.mutateAsync({
                itemId: id,
                data: { availableInventory: operation.data?.stock ?? 0 } as unknown as InventoryItemSchema
              });
              break;
            case 'change_category':
              await updateItemMutation.mutateAsync({
                itemId: id,
                data: { category: operation.data?.category } as unknown as InventoryItemSchema
              });
              break;
            case 'change_status':
              // Status might be strict enum in TS but mostly string in API
              await updateItemMutation.mutateAsync({
                itemId: id,
                data: { status: operation.data?.status } as any
              });
              break;
            case 'update_price':
              await updateItemMutation.mutateAsync({
                itemId: id,
                data: {
                  ...(operation.data?.price !== undefined && operation.data?.price !== null ? { price: operation.data.price } : {}),
                  ...(operation.data?.kdv !== undefined ? { kdv: operation.data.kdv, vatRate: operation.data.kdv } : {})
                } as unknown as InventoryItemSchema
              });
              break;
            case 'update_supplier':
              await updateItemMutation.mutateAsync({
                itemId: id,
                data: { supplier: operation.data?.supplier } as unknown as InventoryItemSchema
              });
              break;
            case 'change_brand':
              await updateItemMutation.mutateAsync({
                itemId: id,
                data: { brand: operation.data?.brand } as unknown as InventoryItemSchema
              });
              break;
            case 'add_features':
              {
                const newFeatures = operation.data?.features || [];
                const merged = Array.from(new Set([...(it.features || []), ...newFeatures]));
                await updateItemMutation.mutateAsync({
                  itemId: id,
                  data: { features: merged } as unknown as InventoryItemSchema
                });
              }
              break;
            default:
              console.warn('Unsupported bulk operation:', operation.type);
          }
        } catch (err: any) {
          const status = err?.response?.status;
          const data = err?.response?.data;
          const message = err?.message || String(err);
          const failureData = { ...(data || {}), operation: operation.type, payload: operation.data };
          failures.push({ id: it.id, message, status, data: failureData });
        }
      }

      if (failures.length > 0) {
        console.error('Some bulk operations failed:', failures);
        setFailureDetails(failures);
        setFailureModalOpen(true);
      }

      await queryClient.invalidateQueries({ queryKey: getInventoryGetInventoryItemsQueryKey() });
      setSelectedIds([]);
      setIsBulkModalOpen(false);
    } catch (err: any) {
      console.error('Bulk operation failed:', err);
      const message = err?.message || String(err);
      setFailureDetails([{ id: 'bulk', message, data: err?.response?.data }]);
      setFailureModalOpen(true);
    }
  };

  // Table columns configuration
  const columns = [
    {
      key: '__select__',
      title: (
        <Checkbox
          checked={items.length > 0 && selectedIds.length === items.length}
          indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
          onChange={(e: any) => {
            const checked = e.target.checked;
            if (checked) {
              setSelectedIds(items.map(i => i.id));
            } else {
              setSelectedIds([]);
            }
          }}
        />
      ),
      render: (value: any, record: FrontendInventoryItem) => (
        <Checkbox
          checked={selectedIds.includes(record.id)}
          onChange={() => {
            if (selectedIds.includes(record.id)) {
              setSelectedIds(selectedIds.filter(id => id !== record.id));
            } else {
              setSelectedIds([...selectedIds, record.id]);
            }
          }}
        />
      )
    },
    {
      key: 'name',
      title: 'Ürün Adı',
      sortable: true,
      render: (value: string, record: FrontendInventoryItem) => (
        <div className="flex flex-col">
          <Link
            to="/inventory/$id"
            params={{ id: record.id }}
            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-left transition-colors"
          >
            {value}
          </Link>
          <span className="text-sm text-gray-500 dark:text-gray-400">{record.brand} - {record.model}</span>
        </div>
      )
    },
    {
      key: 'category',
      title: 'Kategori',
      sortable: true,
      render: (value: string) => (
        <Badge variant="secondary">{CATEGORY_LABELS[value] || value}</Badge>
      )
    },
    {
      key: 'availableInventory',
      title: 'Stok',
      sortable: true,
      render: (value: number, record: FrontendInventoryItem) => (
        <div className="flex items-center space-x-2">
          <span className={`font-medium ${value <= record.reorderLevel ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {value}
          </span>
          {value <= record.reorderLevel && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>
      )
    },
    {
      key: 'reorderLevel',
      title: 'Min Stok',
      sortable: true
    },
    {
      key: 'price',
      title: 'Birim Fiyat',
      sortable: true,
      render: (value: number) => formatCurrencyTR(value)
    },
    {
      key: 'kdv',
      title: 'KDV Oranı',
      sortable: true,
      render: (value: number) => `${value}%`
    },
    {
      key: 'vatIncludedPrice',
      title: 'KDV Dahil Fiyat',
      sortable: true,
      render: (value: number) => formatCurrencyTR(value)
    },
    {
      key: 'totalValue',
      title: 'Toplam Değer',
      sortable: true,
      render: (value: number) => formatCurrencyTR(value)
    },
    {
      key: 'status',
      title: 'Durum',
      render: (value: string) => (
        <Badge
          variant={value === 'available' ? 'success' : value === 'low_stock' ? 'warning' : 'danger'}
        >
          {value === 'available' ? 'Mevcut' : value === 'low_stock' ? 'Düşük Stok' : 'Tükendi'}
        </Badge>
      )
    }
  ];

  const actions = [
    {
      key: 'edit',
      label: 'Düzenle',
      icon: <Edit className="w-4 h-4" />,
      onClick: (record: FrontendInventoryItem) => {
        onItemEdit?.(record);
      }
    },
    {
      key: 'delete',
      label: 'Sil',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger' as const,
      onClick: async (record: FrontendInventoryItem) => {
        if (window.confirm(`${record.name} ürününü silmek istediğinizden emin misiniz?`)) {
          if (onItemDelete) {
            onItemDelete(record);
          } else {
            // Default delete behavior/fallback
            try {
              await deleteItemMutation.mutateAsync({ itemId: record.id });
              await queryClient.invalidateQueries({ queryKey: getInventoryGetInventoryItemsQueryKey() });
            } catch (e) {
              console.error("Delete failed", e);
              alert("Silme başarısız");
            }
          }
        }
      }
    }
  ];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Envanter yükleniyor...</span>
      </div>
    );
  }

  if (fetchError) {
    const errorMsg = (fetchError as AxiosError<any>)?.response?.data?.message || fetchError.message || 'Bir hata oluştu';
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Envanter yüklenirken hata</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-400">{errorMsg}</div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Envanter öğesi yok</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">İlk envanter öğenizi ekleyerek başlayın.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-700">{selectedIds.length} seçili</div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setIsBulkModalOpen(true)}>Toplu İşlemler</Button>
            <Button variant="outline" onClick={exportSelected}>Dışa Aktar</Button>
            <Button variant="danger" onClick={deleteSelected}>Seçilenleri Sil</Button>
          </div>
        </div>
      )}
      <DataTable
        columns={columns as any}
        data={items}
        actions={actions}
        loading={isLoading || deleteItemMutation.isPending || updateItemMutation.isPending}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalItems,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (page, newPageSize) => {
            setCurrentPage(page);
            setPageSize(newPageSize);
          }
        }}
      />
      {/* Importer is provided at page/header level */}
      <BulkOperationsModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedItems={selectedIds}
        onBulkOperation={handleBulkOperation}
        isLoading={deleteItemMutation.isPending || updateItemMutation.isPending}
      />
      <WarningModal
        isOpen={failureModalOpen}
        onClose={() => setFailureModalOpen(false)}
        title="Toplu İşlem Hataları"
        failures={failureDetails}
      />
    </div>
  );
};
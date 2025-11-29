import { Button, Badge, DataTable, Checkbox } from '@x-ear/ui-web';
// UniversalImporter moved to page header; keep schemas imported where needed elsewhere
import BulkOperationsModal, { BulkOperation } from '../../pages/inventory/components/BulkOperationsModal';
import WarningModal from '../../pages/inventory/components/WarningModal';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
// Use shared axios instance configured in orval-mutator so auth interceptors apply
import { customInstance as api } from '../../api/orval-mutator';
import { AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react';
import { InventoryItem, InventoryFilters, InventoryStatus } from '../../types/inventory';

// `api` is the shared axios instance with auth interceptors and retry logic

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
  onItemSelect?: (item: InventoryItem) => void;
  onItemEdit?: (item: InventoryItem) => void;
  onItemDelete?: (item: InventoryItem) => void;
  className?: string;
  refreshKey?: number;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  filters = {},
  onItemSelect,
  onItemEdit,
  onItemDelete,
  className = '',
  refreshKey
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [failureDetails, setFailureDetails] = useState<Array<{ id: string; message: string; status?: number; data?: any }>>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  const loadItems = async () => {
    try {
      setLoading(true);

      // Build API query params
      const params: any = {
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
          params.low_stock = true;
        } else if (filters.stockStatus === 'out_of_stock') {
          params.out_of_stock = true;
        }
      }

      const response = await api.get('/api/inventory', { params });

      if (response.data.success && Array.isArray(response.data.data)) {
        // Map backend data to frontend format
        const mappedItems: InventoryItem[] = response.data.data.map((item: any) => {
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
            
            // Normalize category: backend may return either a key string or an object
            // with label/name/value. Prefer human-readable fields when available.
            const rawCategory = item.category;
            let categoryLabel = '';
            if (rawCategory) {
              if (typeof rawCategory === 'string') {
                  // Map known keys to human-friendly labels, otherwise show the raw string
                  categoryLabel = CATEGORY_LABELS[rawCategory] || rawCategory;
                } else if (typeof rawCategory === 'object') {
                categoryLabel = rawCategory.label || rawCategory.name || rawCategory.value || rawCategory.title || '';
              }
            }

            // Resolve KDV safely: prefer explicit kdv, then vatRate, else fallback to 18
            const rawKdv = typeof item.kdv !== 'undefined' && item.kdv !== null ? item.kdv : (typeof item.vatRate !== 'undefined' && item.vatRate !== null ? item.vatRate : undefined);
            const parsedKdv = typeof rawKdv !== 'undefined' ? Number(rawKdv) : undefined;
            const kdvVal = typeof parsedKdv === 'number' && !isNaN(parsedKdv) ? parsedKdv : 18;

            const priceNum = parseFloat(item.price) || 0;
            const vatIncluded = priceNum * (1 + (kdvVal / 100.0));

            return {
              id: String(item.id),
              name: item.name || 'Unnamed Product',
              brand: item.brand || '',
              model: item.model || '',
              category: categoryLabel || '',
              availableInventory: item.availableInventory || item.available_inventory || 0,
              totalInventory: item.totalInventory || item.total_inventory || 0,
              usedInventory: item.usedInventory || item.used_inventory || 0,
              reorderLevel: item.reorderLevel || item.minInventory || item.min_inventory || 5,
              price: priceNum,
              kdv: kdvVal,
              vatIncludedPrice: vatIncluded || 0,
              totalValue: (item.availableInventory || item.available_inventory || 0) * priceNum || 0,
              cost: parseFloat(item.cost) || 0,
              barcode: item.barcode || '',
              supplier: item.supplier || '',
              description: item.description || '',
              status: (item.availableInventory || item.available_inventory || 0) > 0 ? 'available' : 'out_of_stock',
              features,
              availableSerials,
              createdAt: item.createdAt || item.created_at || new Date().toISOString(),
              lastUpdated: item.updatedAt || item.updated_at || new Date().toISOString()
            };
          });
          
        setItems(mappedItems);
        // Backend returns total in meta.total
        const total = response.data.meta?.total || response.data.total || response.data.pagination?.total || mappedItems.length;
        setTotalItems(total);
        setError(null);
      } else {
        setError('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [filters, currentPage, pageSize]);
  // also reload when parent signals refresh
  useEffect(() => {
    if (typeof refreshKey !== 'undefined') {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Helper: format numbers as TR locale with 2 decimals and ` TRY` suffix
  const formatCurrencyTR = (amount: number) => {
    try {
      return (amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TRY';
    } catch (e) {
      return `${Number(amount || 0).toFixed(2)} TRY`;
    }
  };

  // Table columns configuration - Turkish labels
  const columns = [
    // Selection column
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
      render: (value: any, record: InventoryItem) => (
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
      render: (value: string, record: InventoryItem) => (
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
        <Badge variant="secondary">{value}</Badge>
      )
    },
    {
      key: 'availableInventory',
      title: 'Stok',
      sortable: true,
      render: (value: number, record: InventoryItem) => (
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

  // Table actions
  const actions = [
    {
      key: 'edit',
      label: 'Düzenle',
      icon: <Edit className="w-4 h-4" />,
      onClick: (record: InventoryItem) => {
        onItemEdit?.(record);
      }
    },
    {
      key: 'delete',
      label: 'Sil',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger' as const,
      onClick: (record: InventoryItem) => {
        if (window.confirm(`${record.name} ürününü silmek istediğinizden emin misiniz?`)) {
          onItemDelete?.(record);
        }
      }
    }
  ];

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
        `"${item.category || ''}"`,
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
      setLoading(true);
      await Promise.all(selectedIds.map(id => api.delete(`/api/inventory/${id}`)));
      setSelectedIds([]);
      await loadItems();
    } catch (err) {
      console.error('Bulk delete failed:', err);
      alert('Toplu silme başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    try {
      setLoading(true);

      const selectedItems = items.filter(i => selectedIds.includes(i.id));

      // Perform API-backed bulk operation for each selected item
      const failures: Array<{ id: string; message: string; status?: number; data?: any }> = [];

      // Run requests sequentially to avoid overwhelming the backend and get clearer error context
      for (const it of selectedItems) {
        try {
          const id = it.id;
          switch (operation.type) {
            case 'delete':
              await api.delete(`/api/inventory/${id}`);
              break;
            case 'update_stock':
              // Backend inventory API expects availableInventory to be set via PUT /api/inventory/:id
              await api.put(`/api/inventory/${id}`, {
                availableInventory: operation.data?.stock ?? 0
              });
              break;
            case 'change_category':
              await api.put(`/api/inventory/${id}`, { category: operation.data?.category });
              break;
            case 'change_status':
              await api.put(`/api/inventory/${id}`, { status: operation.data?.status });
              break;
            case 'update_price':
              await api.put(`/api/inventory/${id}`, {
                ...(operation.data?.price !== undefined && operation.data?.price !== null ? { price: operation.data.price } : {}),
                ...(operation.data?.kdv !== undefined ? { kdv: operation.data.kdv, vatRate: operation.data.kdv } : {})
              });
              break;
            case 'update_supplier':
              await api.put(`/api/inventory/${id}`, { supplier: operation.data?.supplier });
              break;
            case 'change_brand':
              await api.put(`/api/inventory/${id}`, { brand: operation.data?.brand });
              break;
            case 'add_features':
              {
                const newFeatures = operation.data?.features || [];
                const merged = Array.from(new Set([...(it.features || []), ...newFeatures]));
                await api.put(`/api/inventory/${id}`, { features: merged });
              }
              break;
            // export handled client-side; not part of BulkOperation payload
            default:
              console.warn('Unsupported bulk operation:', operation.type);
          }
        } catch (err: any) {
          const status = err?.response?.status;
          const data = err?.response?.data;
          const message = err?.message || String(err);
          // Attach operation context to the failure data to aid debugging
          const failureData = { ...(data || {}), operation: operation.type, payload: operation.data };
          failures.push({ id: it.id, message, status, data: failureData });
        }
      }


      if (failures.length > 0) {
        console.error('Some bulk operations failed:', failures);
        setFailureDetails(failures);
        setFailureModalOpen(true);
      }

      // Reload items from API to reflect persisted changes
      await loadItems();

      // finalize
      setSelectedIds([]);
      setIsBulkModalOpen(false);
    } catch (err: any) {
      console.error('Bulk operation failed:', err);
      // Surface the error in the failure modal instead of native alert
      const message = err?.message || String(err);
      setFailureDetails([{ id: 'bulk', message, data: err?.response?.data }]);
      setFailureModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Envanter yükleniyor...</span>
      </div>
    );
  }

  if (error) {
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
            <div className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</div>
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
        loading={loading}
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
        isLoading={loading}
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
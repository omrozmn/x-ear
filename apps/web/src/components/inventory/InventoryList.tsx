import { Button, Badge, DataTable } from '@x-ear/ui-web';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import axios from 'axios';
import { AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react';
import { InventoryItem, InventoryFilters, InventoryStatus } from '../../types/inventory';

const api = axios.create({
  baseURL: 'http://localhost:5003'
});

interface InventoryListProps {
  filters?: InventoryFilters;
  onItemSelect?: (item: InventoryItem) => void;
  onItemEdit?: (item: InventoryItem) => void;
  onItemDelete?: (item: InventoryItem) => void;
  className?: string;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  filters = {},
  onItemSelect,
  onItemEdit,
  onItemDelete,
  className = ''
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
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
            
            return {
              id: String(item.id),
              name: item.name || 'Unnamed Product',
              brand: item.brand || '',
              model: item.model || '',
              category: item.category || '',
              availableInventory: item.availableInventory || item.available_inventory || 0,
              totalInventory: item.totalInventory || item.total_inventory || 0,
              usedInventory: item.usedInventory || item.used_inventory || 0,
              reorderLevel: item.reorderLevel || item.minInventory || item.min_inventory || 5,
              price: parseFloat(item.price) || 0,
              vatIncludedPrice: parseFloat(item.price) * 1.18 || 0,
              totalValue: (item.availableInventory || item.available_inventory || 0) * parseFloat(item.price) || 0,
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

    loadItems();
  }, [filters, currentPage, pageSize]);

  // Table columns configuration - Turkish labels
  const columns = [
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
      render: (value: number) => `₺${value.toFixed(2)}`
    },
    {
      key: 'vatIncludedPrice',
      title: 'KDV Dahil Fiyat',
      sortable: true,
      render: (value: number) => `₺${value.toFixed(2)}`
    },
    {
      key: 'totalValue',
      title: 'Toplam Değer',
      sortable: true,
      render: (value: number) => `₺${value.toFixed(2)}`
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
      <DataTable
        columns={columns}
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
    </div>
  );
};
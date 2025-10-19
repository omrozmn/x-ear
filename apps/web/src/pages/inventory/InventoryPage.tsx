import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Spinner, Alert, Select } from '@x-ear/ui-web';
import { 
  Plus, 
  Download, 
  Upload, 
  BarChart3, 
  Package, 
  AlertTriangle, 
  Printer,
  TrendingUp,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import InventoryFilters from './components/InventoryFilters';
import AdvancedFilters from './components/AdvancedFilters';
import InventoryTable from './components/InventoryTable';
import { ProductForm } from './components/ProductForm';
import ProductDetailsModal from './components/ProductDetailsModal';
import { BulkOperationsModal, BulkOperation } from './components/BulkOperationsModal';
import { StockUpdateModal, StockUpdateData } from './components/StockUpdateModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import BulkUpload from './components/BulkUpload';
import { inventoryService } from '../../services/inventory.service';
import { InventoryItem, InventoryFilters as IInventoryFilters, InventoryFormData, InventoryStats, InventoryCategory, InventoryStatus } from '../../types/inventory';
import { exportInventoryToCSV, exportInventoryToExcel, printInventoryReport, exportLowStockToCSV, exportOutOfStockToCSV } from '../../utils/exportUtils';
import { generateBarcode, printBarcodeLabels, printSingleBarcodeLabel } from '../../utils/barcodeUtils';

// Mock data'yı kaldırıp service kullanacak şekilde güncelliyorum
const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  
  // New state for enhanced features
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState<IInventoryFilters>({
    search: '',
    category: undefined,
    brand: '',
    status: undefined,
  });
  const [stats, setStats] = useState<InventoryStats>({
    total: 0,
    available: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
    activeTrials: 0,
    byCategory: {} as Record<InventoryCategory, number>,
    byBrand: {},
    byStatus: {} as Record<InventoryStatus, number>,
    recentlyUpdated: 0,
  });

  // Load data from service
  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [itemsData, statsData] = await Promise.all([
        inventoryService.getAllItems(),
        inventoryService.getStats()
      ]);
      
      setItems(itemsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on current filters
  useEffect(() => {
    let filtered = [...items];

    // Basic search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.brand.toLowerCase().includes(searchTerm) ||
        (item.model && item.model.toLowerCase().includes(searchTerm)) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm))
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Brand filter
    if (filters.brand && filters.brand.trim()) {
      filtered = filtered.filter(item => item.brand === filters.brand);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Advanced filters
    // Price range filter
    if (filters.priceRange?.min !== undefined) {
      filtered = filtered.filter(item => item.price >= filters.priceRange!.min!);
    }
    if (filters.priceRange?.max !== undefined) {
      filtered = filtered.filter(item => item.price <= filters.priceRange!.max!);
    }

    // Date range filter (using lastUpdated)
    if (filters.dateRange?.start) {
      const startDate = new Date(filters.dateRange.start);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.lastUpdated || '');
        return itemDate >= startDate;
      });
    }
    if (filters.dateRange?.end) {
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.lastUpdated || '');
        return itemDate <= endDate;
      });
    }

    // Stock status filter
    if (filters.stockStatus && filters.stockStatus !== 'all') {
      filtered = filtered.filter(item => {
        switch (filters.stockStatus) {
          case 'in_stock':
            return item.availableInventory > item.reorderLevel;
          case 'low_stock':
            return item.availableInventory <= item.reorderLevel && item.availableInventory > 0;
          case 'out_of_stock':
            return item.availableInventory === 0;
          case 'on_trial':
            return item.status === 'on_trial';
          default:
            return true;
        }
      });
    }

    // Supplier filter
    if (filters.supplier && filters.supplier.trim()) {
      filtered = filtered.filter(item => 
        item.supplier && item.supplier.toLowerCase().includes(filters.supplier!.toLowerCase())
      );
    }

    // Warranty period filter
    if (filters.warrantyPeriod && filters.warrantyPeriod.trim()) {
      filtered = filtered.filter(item => {
        const warrantyMonths = item.warranty || 0;
        switch (filters.warrantyPeriod) {
          case '0-12':
            return warrantyMonths <= 12;
          case '12-24':
            return warrantyMonths > 12 && warrantyMonths <= 24;
          case '24+':
            return warrantyMonths > 24;
          default:
            return warrantyMonths === parseInt(filters.warrantyPeriod!);
        }
      });
    }

    // Features filter
    if (filters.features && filters.features.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.features || !Array.isArray(item.features)) return false;
        return filters.features!.some(feature => 
          item.features!.includes(feature)
        );
      });
    }

    setFilteredItems(filtered);
  }, [items, filters]);

  const handleExportCSV = () => {
    exportInventoryToCSV(filteredItems);
  };

  const handleExportExcel = () => {
    exportInventoryToExcel(filteredItems);
  };

  const handlePrint = () => {
    printInventoryReport(filteredItems);
  };

  const handlePrintBarcodes = () => {
    if (selectedItems.length === 0) {
      alert('Lütfen barkod yazdırmak için ürün seçin');
      return;
    }
    
    const selectedProducts = items.filter(item => selectedItems.includes(item.id));
    printBarcodeLabels(selectedProducts);
  };

  const handleGenerateBarcode = async (itemId: string) => {
    try {
      const barcode = await generateBarcode();
      await inventoryService.updateItem(itemId, { id: itemId, barcode });
      
      // Update local state
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, barcode } : item
      ));
      
      alert('Barkod başarıyla oluşturuldu ve atandı');
    } catch (error) {
      console.error('Barkod oluşturma hatası:', error);
      alert('Barkod oluşturulurken hata oluştu');
    }
  };

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    try {
      const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
      
      switch (operation.type) {
        case 'delete':
          // Bulk delete operation
          for (const itemId of selectedItems) {
            await inventoryService.deleteItem(itemId);
          }
          setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
          break;

        case 'update_stock':
          // Bulk stock update
          if (operation.data?.stock !== undefined) {
            for (const itemId of selectedItems) {
              await inventoryService.updateStock({
                itemId,
                operation: 'set',
                quantity: operation.data.stock,
                reason: operation.data.reason || 'Bulk stock update'
              });
            }
            setItems(prev => prev.map(item => 
              selectedItems.includes(item.id) 
                ? { ...item, availableInventory: operation.data!.stock! }
                : item
            ));
          }
          break;

        case 'change_category':
          // Bulk category change
          if (operation.data?.category) {
            for (const itemId of selectedItems) {
              await inventoryService.updateItem(itemId, { 
                id: itemId,
                category: operation.data.category 
              });
            }
            setItems(prev => prev.map(item => 
              selectedItems.includes(item.id) 
                ? { ...item, category: operation.data!.category! }
                : item
            ));
          }
          break;

        case 'change_status':
          // Bulk status change
          if (operation.data?.status) {
            for (const itemId of selectedItems) {
              await inventoryService.updateItem(itemId, { 
                id: itemId,
                status: operation.data.status 
              });
            }
            setItems(prev => prev.map(item => 
              selectedItems.includes(item.id) 
                ? { ...item, status: operation.data!.status! }
                : item
            ));
          }
          break;

        case 'update_price':
          // Bulk price update
          if (operation.data?.price !== undefined) {
            for (const itemId of selectedItems) {
              await inventoryService.updateItem(itemId, { 
                id: itemId,
                price: operation.data.price 
              });
            }
            setItems(prev => prev.map(item => 
              selectedItems.includes(item.id) 
                ? { ...item, price: operation.data!.price! }
                : item
            ));
          }
          break;

        case 'export':
          // Export selected items
          const exportFormat = operation.data?.exportFormat || 'csv';
          if (exportFormat === 'csv') {
            exportInventoryToCSV(selectedItemsData);
          } else if (exportFormat === 'excel') {
            exportInventoryToExcel(selectedItemsData);
          } else if (exportFormat === 'pdf') {
            printInventoryReport(selectedItemsData);
          }
          break;

        case 'update_supplier':
          // Bulk supplier update
          if (operation.data?.supplier) {
            for (const itemId of selectedItems) {
              await inventoryService.updateItem(itemId, { 
                id: itemId,
                supplier: operation.data.supplier 
              });
            }
            setItems(prev => prev.map(item => 
              selectedItems.includes(item.id) 
                ? { ...item, supplier: operation.data!.supplier! }
                : item
            ));
          }
          break;

        case 'add_features':
          // Bulk features addition
          if (operation.data?.features && operation.data.features.length > 0) {
            for (const itemId of selectedItems) {
              const currentItem = items.find(item => item.id === itemId);
              if (currentItem) {
                const updatedFeatures = [...(currentItem.features || []), ...operation.data.features];
                const uniqueFeatures = [...new Set(updatedFeatures)];
                await inventoryService.updateItem(itemId, { 
                  id: itemId,
                  features: uniqueFeatures 
                });
              }
            }
            setItems(prev => prev.map(item => {
              if (selectedItems.includes(item.id)) {
                const updatedFeatures = [...(item.features || []), ...operation.data!.features!];
                const uniqueFeatures = [...new Set(updatedFeatures)];
                return { ...item, features: uniqueFeatures };
              }
              return item;
            }));
          }
          break;

        default:
          console.warn('Unknown bulk operation type:', operation.type);
      }

      // Show success message
      console.log(`Bulk operation ${operation.type} completed successfully for ${selectedItems.length} items`);
      
    } catch (error) {
      console.error('Bulk operation failed:', error);
      // Show error message to user
    } finally {
      setIsBulkModalOpen(false);
      setSelectedItems([]);
    }
  };

  const handleFiltersChange = (newFilters: IInventoryFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: undefined,
      brand: '',
      status: undefined,
    });
  };

  const handleSelectionChange = (itemIds: string[]) => {
    setSelectedItems(itemIds);
  };

  // Handler functions for InventoryTable
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(filteredItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleAddProduct = () => {
    setSelectedItem(null);
    setIsFormModalOpen(true);
    setFormMode('create');
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsFormModalOpen(true);
    setFormMode('edit');
  };

  const handleView = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleBulkUpload = () => {
    setIsBulkUploadOpen(true);
  };

  const handleUpdateStock = (item: InventoryItem, newStock: number) => {
    // Update stock logic here
    console.log('Updating stock for', item.name, 'to', newStock);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    
    try {
      // Delete logic here
      console.log('Deleting item:', selectedItem.name);
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleFormSubmit = async (data: InventoryFormData) => {
    try {
      if (formMode === 'create') {
        console.log('Creating new item:', data);
      } else {
        console.log('Updating item:', data);
      }
      setIsFormModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleBulkUploadSubmit = async (items: InventoryFormData[]) => {
    try {
      console.log('Bulk uploading items:', items);
      setIsBulkUploadOpen(false);
    } catch (error) {
      console.error('Error bulk uploading:', error);
    }
  };

  const handleExport = () => {
    console.log('Exporting inventory data...');
  };

  const handlePrint = () => {
    console.log('Printing inventory report...');
  };

  const getStatusBadgeVariant = (status: InventoryStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'discontinued': return 'destructive';
      case 'on_trial': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: InventoryStatus) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'discontinued': return 'Üretim Durduruldu';
      case 'on_trial': return 'Denemede';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Stok Yönetimi
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ürün stoklarını yönetin ve takip edin
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Dışa Aktar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Yazdır
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkUpload}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Toplu Yükleme
          </Button>
          
          <Button
            onClick={handleAddProduct}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Ürün
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredItems.length}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Düşük Stok
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {filteredItems.filter(item => item.availableInventory <= item.reorderLevel).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Stok Tükendi
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {filteredItems.filter(item => item.availableInventory === 0).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Toplam Değer
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₺{filteredItems.reduce((sum, item) => sum + (item.price * item.availableInventory), 0).toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <InventoryFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters({
          search: '',
          category: '',
          brand: '',
          status: '',
          lowStock: false,
          outOfStock: false,
          supplier: '',
          minPrice: undefined,
          maxPrice: undefined,
          hasSerials: false,
          isMinistryTracked: false,
          priceRange: { min: 0, max: 10000 },
          dateRange: { start: '', end: '' },
          stockStatus: '',
          features: [],
          warrantyPeriod: { min: 0, max: 60 }
        })}
      />

      {/* Table */}
      <Card>
        <InventoryTable
          items={paginatedItems}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Sayfa başına:
              </span>
              <Select
                value={itemsPerPage.toString()}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-20"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {startIndex + 1}-{Math.min(endIndex, filteredItems.length)} / {filteredItems.length} kayıt
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2"
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <ProductForm
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedItem}
        mode={formMode}
      />

      <ProductDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        product={selectedItem}
        onEdit={handleEdit}
        onStockUpdate={handleUpdateStock}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={selectedItem?.name || ''}
        title="Ürünü Sil"
        message="Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      />

      <BulkUpload
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSubmit={handleBulkUploadSubmit}
      />
    </div>
  );
};

export default InventoryPage;

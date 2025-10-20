import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../../../types/inventory';
import Button from '../../../components/ui/Button';
import { 
  ChevronUp, 
  ChevronDown, 
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

type SortField = keyof InventoryItem;
type SortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortField, sortDirection]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

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

  const allSelected = selectedItems.length === paginatedItems.length && paginatedItems.length > 0;
  const someSelected = selectedItems.length > 0 && selectedItems.length < paginatedItems.length;

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Ürün Adı</span>
                  {getSortIcon('name')}
                </div>
              </th>

              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('brand')}
              >
                <div className="flex items-center space-x-1">
                  <span>Marka</span>
                  {getSortIcon('brand')}
                </div>
              </th>

              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('model')}
              >
                <div className="flex items-center space-x-1">
                  <span>Model</span>
                  {getSortIcon('model')}
                </div>
              </th>

              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center space-x-1">
                  <span>Kategori</span>
                  {getSortIcon('category')}
                </div>
              </th>

              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('barcode')}
              >
                <div className="flex items-center space-x-1">
                  <span>Barkod</span>
                  {getSortIcon('barcode')}
                </div>
              </th>

              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('availableInventory')}
              >
                <div className="flex items-center space-x-1">
                  <span>Stok</span>
                  {getSortIcon('availableInventory')}
                </div>
              </th>

              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('reorderLevel')}
              >
                <div className="flex items-center space-x-1">
                  <span>Min. Stok</span>
                  {getSortIcon('reorderLevel')}
                </div>
              </th>

              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center space-x-1">
                  <span>Fiyat</span>
                  {getSortIcon('price')}
                </div>
              </th>

              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Durum</span>
                  {getSortIcon('status')}
                </div>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedItems.map((item) => {
              const stockStatus = getStockStatus(item);
              const isSelected = selectedItems.includes(item.id);
              
              return (
                <tr 
                  key={item.id} 
                  className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectItem(item.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                      onClick={() => onView(item)}
                    >
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {item.description}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.brand}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.model || '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getCategoryLabel(item.category)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {item.barcode || '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">{item.availableInventory}</span>
                      <span className="text-xs text-gray-500">/ {item.totalInventory}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.reorderLevel}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                      {stockStatus.label}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                       
                        onClick={() => onView(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100"
                        title="Detayları Görüntüle"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                       
                        onClick={() => onEdit(item)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-100"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {onDuplicate && (
                        <Button
                          variant="ghost"
                         
                          onClick={() => onDuplicate(item)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-100"
                          title="Kopyala"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                       
                        onClick={() => onUpdateStock(item)}
                        className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-100"
                        title="Stok Güncelle"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                       
                        onClick={() => onGenerateBarcode(item)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-100"
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
                              ? 'text-green-600 hover:text-green-900 hover:bg-green-100' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="secondary"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Önceki
            </Button>
            <Button
              variant="secondary"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Sonraki
            </Button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-700">
                Toplam <span className="font-medium">{items.length}</span> üründen{' '}
                <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, items.length)}
                </span>{' '}
                arası gösteriliyor
              </p>
              
              {onItemsPerPageChange && (
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10 / sayfa</option>
                  <option value={20}>20 / sayfa</option>
                  <option value={50}>50 / sayfa</option>
                  <option value={100}>100 / sayfa</option>
                </select>
              )}
            </div>
            
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {/* First page button */}
                <Button
                  variant="ghost"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="İlk sayfa"
                >
                  İlk
                </Button>
                
                {/* Previous page button */}
                <Button
                  variant="ghost"
                 
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </Button>
                
                {/* Page numbers with ellipsis */}
                {(() => {
                  const getVisiblePages = () => {
                    const maxVisible = 5;
                    const pages: number[] = [];
                    
                    if (totalPages <= maxVisible) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      const start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                      const end = Math.min(totalPages, start + maxVisible - 1);
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                      
                      // Add ellipsis if needed
                      if (start > 1) {
                        pages.unshift(-1); // -1 represents ellipsis
                        pages.unshift(1);
                      }
                      if (end < totalPages) {
                        pages.push(-2); // -2 represents ellipsis
                        pages.push(totalPages);
                      }
                    }
                    
                    return pages;
                  };
                  
                  const visiblePages = getVisiblePages();
                  
                  return visiblePages.map((page, index) => {
                    if (page === -1 || page === -2) {
                      return (
                        <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-400">
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant="ghost"
                       
                        onClick={() => onPageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}
                
                {/* Next page button */}
                <Button
                  variant="ghost"
                 
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </Button>
                
                {/* Last page button */}
                <Button
                  variant="ghost"
                 
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Son sayfa"
                >
                  Son
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-4m-4 0H9m-4 0h4m0 0V9a2 2 0 012-2h2a2 2 0 012 2v4.01" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ürün bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">Henüz hiç ürün eklenmemiş.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
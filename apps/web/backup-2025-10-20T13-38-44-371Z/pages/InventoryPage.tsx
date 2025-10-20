import { Button, Input, Select } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Upload } from 'lucide-react';
import { InventoryList } from '../components/inventory/InventoryList';
import { InventoryStats } from '../components/inventory/InventoryStats';
import { inventoryService } from '../services/inventory.service';
import { InventoryFilters, InventoryCategory, InventoryStatus } from '../types/inventory';

export const InventoryPage: React.FC = () => {
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Initial load to check if service is working
    const checkService = async () => {
      try {
        setLoading(true);
        setError(null);
        await inventoryService.getStats();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Envanter servisi yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    checkService();
  }, []);

  const handleFilterChange = (newFilters: Partial<InventoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportInventory = async () => {
    try {
      // This would typically generate and download a CSV/Excel file
      const data = await inventoryService.searchItems({});
      console.log('Exporting inventory data:', data);
      // Implementation for actual file download would go here
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const importInventory = () => {
    // This would typically open a file picker and handle bulk import
    console.log('Import inventory functionality');
    // Implementation for file upload and bulk import would go here
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Hata Oluştu</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => setError(null)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              variant='default'>
              Tekrar Dene
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Envanter Yönetimi</h1>
              <p className="text-gray-600 mt-2">İşitme cihazları ve aksesuarları yönetin</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={importInventory}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                variant='default'>
                <Upload className="h-4 w-4 mr-2" />
                İçe Aktar
              </Button>
              <Button
                onClick={exportInventory}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                variant='default'>
                <Download className="h-4 w-4 mr-2" />
                Dışa Aktar
              </Button>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium transition-colors ${
                  showFilters
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
                variant='default'>
                <Filter className="h-4 w-4 mr-2" />
                Filtrele
              </Button>
              <Button
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 transition-colors"
                variant='default'>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Ürün
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <InventoryStats />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arama
                </label>
                <Input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  placeholder="Ürün adı, marka, model..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <Select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange({ category: e.target.value as InventoryCategory || undefined })}
                  options={[
                    { value: '', label: 'Tüm Kategoriler' },
                    { value: 'hearing_aid', label: 'İşitme Cihazı' },
                    { value: 'battery', label: 'Pil' },
                    { value: 'accessory', label: 'Aksesuar' },
                    { value: 'ear_mold', label: 'Kulak Kalıbı' },
                    { value: 'cleaning_supplies', label: 'Temizlik Malzemeleri' },
                    { value: 'amplifiers', label: 'Amplifikatör' }
                  ]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durum
                </label>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange({ status: e.target.value as InventoryStatus || undefined })}
                  options={[
                    { value: '', label: 'Tüm Durumlar' },
                    { value: 'available', label: 'Mevcut' },
                    { value: 'assigned', label: 'Atanmış' },
                    { value: 'maintenance', label: 'Bakımda' },
                    { value: 'retired', label: 'Emekli' },
                    { value: 'low_stock', label: 'Düşük Stok' },
                    { value: 'out_of_stock', label: 'Tükendi' }
                  ]}
                  placeholder="Durum seçiniz"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marka
                </label>
                <Input
                  type="text"
                  value={filters.brand || ''}
                  onChange={(e) => handleFilterChange({ brand: e.target.value })}
                  placeholder="Marka adı..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <Input
                    type="checkbox"
                    checked={filters.lowStock || false}
                    onChange={(e) => handleFilterChange({ lowStock: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sadece düşük stok</span>
                </label>
                <label className="flex items-center">
                  <Input
                    type="checkbox"
                    checked={filters.outOfStock || false}
                    onChange={(e) => handleFilterChange({ outOfStock: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sadece tükenen</span>
                </label>
                <label className="flex items-center">
                  <Input
                    type="checkbox"
                    checked={filters.isMinistryTracked || false}
                    onChange={(e) => handleFilterChange({ isMinistryTracked: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">SGK takipli</span>
                </label>
              </div>
              <Button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                variant='default'>
                Filtreleri Temizle
              </Button>
            </div>
          </div>
        )}

        {/* Inventory List */}
        <div className="bg-white rounded-lg shadow">
          <InventoryList
            filters={filters}
            onItemSelect={(item) => console.log('Selected item:', item)}
            onItemEdit={(item) => console.log('Edit item:', item)}
            onItemDelete={(item) => console.log('Delete item:', item)}
          />
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
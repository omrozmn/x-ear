import React from 'react';
import { Button } from '@x-ear/ui-web';
import { InventoryFilters as IInventoryFilters } from '../../../types/inventory';

interface InventoryFiltersProps {
  filters: IInventoryFilters;
  onFiltersChange: (filters: IInventoryFilters) => void;
  onClearFilters: () => void;
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleFilterChange = (key: keyof IInventoryFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Ürün ara..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Kategori:</label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tümü</option>
            <option value="hearing_aid">İşitme Cihazı</option>
            <option value="battery">Pil</option>
            <option value="accessory">Aksesuar</option>
            <option value="ear_mold">Kulak Kalıbı</option>
            <option value="cleaning_supplies">Temizlik Malzemeleri</option>
            <option value="amplifiers">Amplifikatör</option>
          </select>
        </div>

        {/* Brand Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Marka:</label>
          <select
            value={filters.brand || ''}
            onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tümü</option>
            <option value="Phonak">Phonak</option>
            <option value="Oticon">Oticon</option>
            <option value="Widex">Widex</option>
            <option value="Signia">Signia</option>
            <option value="ReSound">ReSound</option>
            <option value="Starkey">Starkey</option>
            <option value="Unitron">Unitron</option>
            <option value="Bernafon">Bernafon</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Durum:</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tümü</option>
            <option value="available">Mevcut</option>
            <option value="assigned">Atanmış</option>
            <option value="maintenance">Bakımda</option>
            <option value="retired">Emekli</option>
            <option value="low_stock">Düşük Stok</option>
            <option value="out_of_stock">Stok Dışı</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Filtreleri Temizle
        </Button>
      </div>
    </div>
  );
};

export default InventoryFilters;
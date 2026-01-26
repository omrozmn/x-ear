import React from 'react';
import { Button } from '@x-ear/ui-web';
import { X } from 'lucide-react';
import type { SupplierFilters as SupplierFiltersType } from './supplier-search.types';

interface SupplierFiltersProps {
  filters?: SupplierFiltersType;
  onFiltersChange: (filters: SupplierFiltersType) => void;
  onClearFilters: () => void;
}

export function SupplierFilters({ 
  filters = {}, 
  onFiltersChange, 
  onClearFilters 
}: SupplierFiltersProps) {
  const hasActiveFilters = Object.keys(filters || {}).length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durum
          </label>
          <div className="flex gap-2">
            <button
              data-allow-raw="true"
              onClick={() => onFiltersChange({ ...(filters || {}), status: undefined })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                !filters?.status
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } border`}
            >
              Tümü
            </button>
            <button
              data-allow-raw="true"
              onClick={() => onFiltersChange({ ...(filters || {}), status: 'ACTIVE' })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                filters?.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } border`}
            >
              Aktif
            </button>
            <button
              data-allow-raw="true"
              onClick={() => onFiltersChange({ ...(filters || {}), status: 'INACTIVE' })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                filters?.status === 'INACTIVE'
                  ? 'bg-gray-100 text-gray-700 border-gray-400'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } border`}
            >
              Pasif
            </button>
          </div>
        </div>

        {/* City Filter */}
        <div>
          <label htmlFor="city-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Şehir
          </label>
          <input
            data-allow-raw="true"
            id="city-filter"
            type="text"
            placeholder="Şehir filtrele..."
            value={filters?.city || ''}
            onChange={(e) => onFiltersChange({ ...(filters || {}), city: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>


      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Filtreleri Temizle
          </Button>
        </div>
      )}
    </div>
  );
}
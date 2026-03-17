import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('suppliers');
  const hasActiveFilters = Object.keys(filters || {}).length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('status', 'Durum')}
          </label>
          <div className="flex gap-2">
            <button
              data-allow-raw="true"
              onClick={() => onFiltersChange({ ...(filters || {}), status: undefined })}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                !filters?.status
                  ? 'bg-primary/10 text-primary border-blue-300'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              } border`}
            >
              {t('all', 'Tümü')}
            </button>
            <button
              data-allow-raw="true"
              onClick={() => onFiltersChange({ ...(filters || {}), status: 'ACTIVE' })}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                filters?.status === 'ACTIVE'
                  ? 'bg-success/10 text-success border-green-300'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              } border`}
            >
              {t('active', 'Aktif')}
            </button>
            <button
              data-allow-raw="true"
              onClick={() => onFiltersChange({ ...(filters || {}), status: 'INACTIVE' })}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                filters?.status === 'INACTIVE'
                  ? 'bg-muted text-foreground border-gray-400'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              } border`}
            >
              {t('inactive', 'Pasif')}
            </button>
          </div>
        </div>

        {/* City Filter */}
        <div>
          <label htmlFor="city-filter" className="block text-sm font-medium text-foreground mb-2">
            {t('city', 'Şehir')}
          </label>
          <input
            data-allow-raw="true"
            id="city-filter"
            type="text"
            placeholder={t('cityFilter', 'Şehir filtrele...')}
            value={filters?.city || ''}
            onChange={(e) => onFiltersChange({ ...(filters || {}), city: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
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
            {t('clearFilters', 'Filtreleri Temizle')}
          </Button>
        </div>
      )}
    </div>
  );
}
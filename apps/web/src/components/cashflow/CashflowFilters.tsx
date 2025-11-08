/**
 * CashflowFilters Component
 * Filter controls for cashflow records
 */
import React from 'react';
import { Input, Button } from '@x-ear/ui-web';
import { Search, X } from 'lucide-react';
import type { CashflowFilters } from '../../types/cashflow';
import { RECORD_TYPE_LABELS } from '../../types/cashflow';

interface CashflowFiltersProps {
  filters: CashflowFilters;
  onFiltersChange: (filters: CashflowFilters) => void;
  onClearFilters: () => void;
}

export function CashflowFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: CashflowFiltersProps) {
  const handleFilterChange = (key: keyof CashflowFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Başlangıç Tarihi
          </label>
          <Input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bitiş Tarihi
          </label>
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İşlem Türü
          </label>
          <select
            value={filters.transactionType || ''}
            onChange={(e) => handleFilterChange('transactionType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tümü</option>
            <option value="income">Gelir</option>
            <option value="expense">Gider</option>
          </select>
        </div>

        {/* Record Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kayıt Türü
          </label>
          <select
            value={filters.recordType || ''}
            onChange={(e) => handleFilterChange('recordType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tümü</option>
            {Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arama
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Hasta adı, açıklama..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Filtreleri Temizle
          </Button>
        </div>
      )}
    </div>
  );
}

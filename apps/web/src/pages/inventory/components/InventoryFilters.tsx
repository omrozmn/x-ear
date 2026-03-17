import { useTranslation } from 'react-i18next';
import React from 'react';
import { Button, Input, Select } from '@x-ear/ui-web';
import { InventoryFilters as IInventoryFilters } from '../../../types/inventory';

interface InventoryFiltersProps {
  filters: IInventoryFilters;
  onFiltersChange: (filters: IInventoryFilters) => void;
  onClearFilters: () => void;
}

const categoryOptions = [
  { value: '', label: t('filters.all_categories') },
  { value: 'hearing_aid', label: t('categories.title') },
  { value: 'battery', label: t('form.description') },
  { value: 'accessory', label: t('form.description') },
  { value: 'ear_mold', label: t('form.description') },
  { value: 'cleaning_supplies', label: t('form.description') },
  { value: 'amplifiers', label: t('form.description') }
];

const brandOptions = [
  { value: '', label: t('filters.all_categories') },
  { value: 'Phonak', label: 'Phonak' },
  { value: 'Oticon', label: 'Oticon' },
  { value: 'Widex', label: 'Widex' },
  { value: 'Signia', label: 'Signia' },
  { value: 'ReSound', label: 'ReSound' },
  { value: 'Starkey', label: 'Starkey' },
  { value: 'Unitron', label: 'Unitron' },
  { value: 'Bernafon', label: 'Bernafon' }
];

const statusOptions = [
  { value: '', label: t('filters.all_categories') },
  { value: 'available', label: t('status.in_stock') },
  { value: 'assigned', label: 'Atanmış' },
  { value: 'maintenance', label: 'Bakımda' },
  { value: 'retired', label: 'Emekli' },
  { value: 'low_stock', label: t('status.low_stock') },
  { value: 'out_of_stock', label: t('status.out_of_stock') }
];

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const { t } = useTranslation('inventory');
  const handleFilterChange = (key: keyof IInventoryFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Input
              type="text"
              placeholder={t('products.search_placeholder')}
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground"
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
          <label className="text-sm font-medium text-foreground">{t('form.category')}:</label>
          <Select
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
            options={categoryOptions}
            className="px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Brand Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-foreground">{t('form.brand')}:</label>
          <Select
            value={filters.brand || ''}
            onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
            options={brandOptions}
            className="px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-foreground">{t('columns.status')}:</label>
          <Select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            options={statusOptions}
            className="px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Clear Filters Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="px-4 py-2 text-muted-foreground bg-muted rounded-2xl hover:bg-accent dark:hover:bg-gray-600 transition-colors"
        >
          Filtreleri Temizle
        </Button>
      </div>
    </div>
  );
};

export default InventoryFilters;
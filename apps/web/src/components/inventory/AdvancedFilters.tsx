import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Button, Checkbox, Badge } from '@x-ear/ui-web';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle
} from 'lucide-react';
import { InventoryCategory, InventoryStatus } from '@/types/inventory';

export interface AdvancedFiltersProps {
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  onClearFilters: () => void;
  categories: string[];
  brands: string[];
  suppliers: string[];
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export interface InventoryFilters {
  search?: string;
  category?: InventoryCategory;
  brand?: string;
  status?: InventoryStatus;
  supplier?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_trial';
  features?: string[];
  warrantyPeriod?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  hasTrials?: boolean;
}

const stockStatusOptions = [
  { value: 'all', label: 'Tüm Durumlar' },
  { value: 'in_stock', label: 'Stokta Var' },
  { value: 'low_stock', label: 'Düşük Stok' },
  { value: 'out_of_stock', label: 'Stok Yok' },
  { value: 'on_trial', label: 'Deneme Aşamasında' }
];

const warrantyOptions = [
  { value: '', label: 'Tüm Garanti Süreleri' },
  { value: '6 months', label: '6 Ay' },
  { value: '1 year', label: '1 Yıl' },
  { value: '2 years', label: '2 Yıl' },
  { value: '3 years', label: '3 Yıl' },
  { value: '5 years', label: '5 Yıl' }
];

const dateRangePresets = [
  { value: 'today', label: 'Bugün' },
  { value: 'week', label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'quarter', label: 'Bu Çeyrek' },
  { value: 'year', label: 'Bu Yıl' },
  { value: 'custom', label: 'Özel Tarih' }
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  categories,
  brands,
  suppliers,
  isExpanded = false,
  onToggleExpanded
}) => {
  const [localFilters, setLocalFilters] = useState<InventoryFilters>(filters);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(filters.features || []);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);

  // Available features - in a real app, this would come from API
  const availableFeatures = [
    'Bluetooth', 'Şarj Edilebilir', 'Su Geçirmez', 'Gürültü Önleme',
    'Telecoil', 'Directional Microphone', 'Feedback Cancellation',
    'Wind Noise Reduction', 'Tinnitus Masker', 'Remote Control'
  ];

  useEffect(() => {
    setLocalFilters(filters);
    setSelectedFeatures(filters.features || []);
  }, [filters]);

  const handleFilterChange = (key: keyof InventoryFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePriceRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    const newPriceRange = {
      ...localFilters.priceRange,
      [type]: numValue
    };
    handleFilterChange('priceRange', newPriceRange);
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const newDateRange = {
      ...localFilters.dateRange,
      [type]: value || undefined
    };
    handleFilterChange('dateRange', newDateRange);
  };

  const handleDatePresetChange = (preset: string) => {
    if (preset === 'custom') {
      setShowCustomDateRange(true);
      return;
    }

    setShowCustomDateRange(false);
    const today = new Date();
    let startDate: Date;
    const endDate = today;

    switch (preset) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    handleFilterChange('dateRange', {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
  };

  const handleFeatureToggle = (feature: string) => {
    const newFeatures = selectedFeatures.includes(feature)
      ? selectedFeatures.filter(f => f !== feature)
      : [...selectedFeatures, feature];
    
    setSelectedFeatures(newFeatures);
    handleFilterChange('features', newFeatures);
  };

  const clearAllFilters = () => {
    setLocalFilters({});
    setSelectedFeatures([]);
    setShowCustomDateRange(false);
    onClearFilters();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.category) count++;
    if (localFilters.brand) count++;
    if (localFilters.status) count++;
    if (localFilters.supplier) count++;
    if (localFilters.priceRange?.min || localFilters.priceRange?.max) count++;
    if (localFilters.dateRange?.start || localFilters.dateRange?.end) count++;
    if (localFilters.stockStatus && localFilters.stockStatus !== 'all') count++;
    if (localFilters.features && localFilters.features.length > 0) count++;
    if (localFilters.warrantyPeriod) count++;
    if (localFilters.lowStock || localFilters.outOfStock || localFilters.hasTrials) count++;
    return count;
  };

  const categoryOptions = categories.map(cat => ({ value: cat, label: cat }));
  const brandOptions = brands.map(brand => ({ value: brand, label: brand }));
  const supplierOptions = suppliers.map(supplier => ({ value: supplier, label: supplier }));

  return (
    <Card className="p-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Filtreler
          </h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getActiveFilterCount()} aktif filtre
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {getActiveFilterCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-1" />
              Temizle
            </Button>
          )}
          {onToggleExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Basic Filters - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Arama
          </label>
          <Input
            placeholder="Ürün adı, marka, model, barkod..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kategori
          </label>
          <Select
            value={localFilters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
            options={[{ value: '', label: 'Tüm Kategoriler' }, ...categoryOptions]}
            placeholder="Kategori seçin"
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Marka
          </label>
          <Input
            list="brand-options"
            value={localFilters.brand || ''}
            onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
            placeholder="Marka seçin veya yazın"
            fullWidth
          />
          <datalist id="brand-options">
            {brandOptions.map(option => (
              <option key={option.value} value={option.value} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stok Durumu
          </label>
          <Select
            value={localFilters.stockStatus || 'all'}
            onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
            options={stockStatusOptions}
            fullWidth
          />
        </div>
      </div>

      {/* Advanced Filters - Collapsible */}
      {isExpanded && (
        <div className="space-y-6 border-t pt-4">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Fiyat Aralığı
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min fiyat"
                value={localFilters.priceRange?.min || ''}
                onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                min="0"
                step="0.01"
              />
              <Input
                type="number"
                placeholder="Max fiyat"
                value={localFilters.priceRange?.max || ''}
                onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Tarih Aralığı
            </label>
            <div className="space-y-2">
              <Select
                value={showCustomDateRange ? 'custom' : ''}
                onChange={(e) => {
                  const preset = e.target.value;
                  if (preset === 'custom') {
                    setShowCustomDateRange(true);
                  } else {
                    setShowCustomDateRange(false);
                    handleDatePresetChange(preset);
                  }
                }}
                options={dateRangePresets}
                placeholder="Tarih aralığı seçin"
              />
              {showCustomDateRange && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={localFilters.dateRange?.start || ''}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  />
                  <Input
                    type="date"
                    value={localFilters.dateRange?.end || ''}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tedarikçi
              </label>
              <Select
                value={localFilters.supplier || ''}
                onChange={(value) => handleFilterChange('supplier', value || undefined)}
                options={[{ value: '', label: 'Tüm Tedarikçiler' }, ...supplierOptions]}
                placeholder="Tedarikçi seçin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Garanti Süresi
              </label>
              <Select
                value={localFilters.warrantyPeriod || ''}
                onChange={(value) => handleFilterChange('warrantyPeriod', value || undefined)}
                options={warrantyOptions}
                placeholder="Garanti süresi seçin"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Özellikler
            </label>
            <div className="flex flex-wrap gap-2">
              {availableFeatures.map((feature) => (
                <button
                  key={feature}
                  onClick={() => handleFeatureToggle(feature)}
                  className="cursor-pointer hover:bg-opacity-80"
                >
                  <Badge
                    variant={selectedFeatures.includes(feature) ? "default" : "secondary"}
                  >
                    {feature}
                    {selectedFeatures.includes(feature) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hızlı Filtreler
            </label>
            <div className="flex flex-wrap gap-4">
              <Checkbox
                checked={localFilters.lowStock || false}
                onChange={(e) => handleFilterChange('lowStock', e.target.checked)}
                label="Düşük Stok"
              />
              <Checkbox
                checked={localFilters.outOfStock || false}
                onChange={(e) => handleFilterChange('outOfStock', e.target.checked)}
                label="Stok Yok"
              />
              <Checkbox
                checked={localFilters.hasTrials || false}
                onChange={(e) => handleFilterChange('hasTrials', e.target.checked)}
                label="Deneme Aşamasında"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
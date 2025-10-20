import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Select, Button, Checkbox, Badge } from '@x-ear/ui-web';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { InventoryFilters as IInventoryFilters } from '../../../types/inventory';

interface AdvancedFiltersProps {
  filters: IInventoryFilters;
  onFiltersChange: (filters: IInventoryFilters) => void;
  onClearFilters: () => void;
  categories: string[];
  brands: string[];
  suppliers: string[];
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  categories,
  brands,
  suppliers,
  isExpanded = false,
  onToggleExpanded
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const handlePriceRangeChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onFiltersChange({
      ...filters,
      priceRange: {
        ...filters.priceRange,
        [field]: numValue
      }
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value || undefined
      }
    });
  };

  const handleFeatureToggle = (feature: string) => {
    const currentFeatures = filters.features || [];
    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter((f: string) => f !== feature)
      : [...currentFeatures, feature];
    
    onFiltersChange({
      ...filters,
      features: newFeatures
    });
  };

  const handleStockStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      stockStatus: value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_trial'
    });
  };

    const value = event.target.value;
    onFiltersChange({
      ...filters,
      warrantyPeriod: value
    });
  };

  const handleFeatureChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const currentFeatures = filters.features || [];
    const updatedFeatures = currentFeatures.includes(value)
      ? currentFeatures.filter(f => f !== value)
      : [...currentFeatures, value];
    
    onFiltersChange({
      ...filters,
      features: updatedFeatures
    });
  };

  const applyDatePreset = (preset: string) => {
    const now = new Date();
    let start: Date;
    
    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }
    
    onFiltersChange({
      ...filters,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof IInventoryFilters];
    if (key === 'priceRange') {
      const range = value as any;
      return range?.min !== undefined || range?.max !== undefined;
    }
    if (key === 'dateRange') {
      const range = value as any;
      return range?.start || range?.end;
    }
    if (key === 'features') {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== undefined && value !== '' && value !== 'all';
  }).length;

  const stockStatusOptions = [
    { value: 'all', label: 'Tüm Durumlar' },
    { value: 'in_stock', label: 'Stokta Var' },
    { value: 'low_stock', label: 'Düşük Stok' },
    { value: 'out_of_stock', label: 'Stok Yok' },
    { value: 'on_trial', label: 'Denemede' }
  ];

  const commonFeatures = [
    'Bluetooth', 'Şarj Edilebilir', 'Su Geçirmez', 'Gürültü Engelleme',
    'Tinnitus Maskeleme', 'Telecoil', 'Yönlü Mikrofon', 'Feedback Engelleme'
  ];

  const warrantyOptions = [
    { value: '', label: 'Tüm Garantiler' },
    { value: '1', label: '1 Yıl' },
    { value: '2', label: '2 Yıl' },
    { value: '3', label: '3 Yıl' },
    { value: '5', label: '5 Yıl' }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Gelişmiş Filtreler</CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary">
                {activeFilterCount} filtre aktif
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded || (() => setLocalExpanded(!localExpanded))}
            >
              {(isExpanded || localExpanded) ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Daralt
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Genişlet
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {(isExpanded || localExpanded) && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Price Range Filter */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Fiyat Aralığı</h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange?.min || ''}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange?.max || ''}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Tarih Aralığı</h4>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyDatePreset('today')}
                >
                  Bugün
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyDatePreset('week')}
                >
                  Bu Hafta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyDatePreset('month')}
                >
                  Bu Ay
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyDatePreset('quarter')}
                >
                  Bu Çeyrek
                </Button>
              </div>
            </div>

            {/* Stock Status Filter */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Stok Durumu</h4>
              <Select
               value={filters.stockStatus || 'all'}
               onChange={handleStockStatusChange}
               options={stockStatusOptions}
             />
            </div>

            {/* Supplier Filter */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Tedarikçi</h4>
              <Select
                value={filters.supplier || ''}
                onChange={(e) => onFiltersChange({ ...filters, supplier: e.target.value || undefined })}
                options={[
                  { value: '', label: 'Tüm Tedarikçiler' },
                  ...suppliers.map(supplier => ({ value: supplier, label: supplier }))
                ]}
              />
            </div>

            {/* Warranty Period Filter */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Garanti Süresi</h4>
              <Select
                value={filters.warrantyPeriod || ''}
                onChange={(e) => onFiltersChange({ ...filters, warrantyPeriod: e.target.value || undefined })}
                options={warrantyOptions}
              />
            </div>

            {/* Features Filter */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Özellikler</h4>
              <div className="grid grid-cols-2 gap-2">
                {commonFeatures.map(feature => (
                  <label key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.features?.includes(feature) || false}
                      onChange={() => handleFeatureToggle(feature)}
                    />
                    <span className="text-sm">{feature}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
            >
              <X className="w-4 h-4 mr-2" />
              Filtreleri Temizle
            </Button>
            
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Badge variant="secondary">
                  {activeFilterCount} filtre aktif
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedFilters;
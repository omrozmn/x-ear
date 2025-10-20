import React, { useState, useCallback } from 'react';
import { Button } from '@x-ear/ui-web';
import { PatientFilters as PatientFiltersType } from '../../types/patient/patient-search.types';
import { Filter, X, ChevronUp, Users, Building, Tag, Calendar } from 'lucide-react';

interface PatientFiltersProps {
  filters: PatientFiltersType;
  onChange: (filters: PatientFiltersType) => void;
  onClearFilters: () => void;
  patientCount?: number;
  loading?: boolean;
  className?: string;
  showCompact?: boolean;
}

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * PatientFilters Component
 * Advanced filtering component for patient search and management
 */
export function PatientFilters({
  filters,
  onChange,
  onClearFilters,
  patientCount = 0,
  loading = false,
  className = '',
  showCompact = false
}: PatientFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!showCompact);

  const handleFilterChange = useCallback((key: keyof PatientFiltersType, value: any) => {
    onChange({
      ...filters,
      [key]: value
    });
  }, [filters, onChange]);

  // Check if any filters are active
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'query') return false; // Exclude query from active filters count
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });

  const statusOptions: FilterOption[] = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Pasif' },
    { value: 'pending', label: 'Beklemede' }
  ];

  const segmentOptions: FilterOption[] = [
    { value: 'trial', label: 'Deneme' },
    { value: 'purchased', label: 'Satın Alınmış' },
    { value: 'lead', label: 'Potansiyel' },
    { value: 'follow_up', label: 'Takip' }
  ];

  const acquisitionOptions: FilterOption[] = [
    { value: 'referral', label: 'Referans' },
    { value: 'online', label: 'Online' },
    { value: 'walk-in', label: 'Yürüyerek Gelen' },
    { value: 'social-media', label: 'Sosyal Medya' },
    { value: 'advertisement', label: 'Reklam' }
  ];

  const branchOptions: FilterOption[] = [
    { value: 'branch-1', label: 'Merkez Şube' },
    { value: 'branch-2', label: 'Kadıköy Şube' },
    { value: 'branch-3', label: 'Beşiktaş Şube' }
  ];

  const handleTagAdd = useCallback((tag: string) => {
    const currentTags = filters.tags || [];
    if (!currentTags.includes(tag)) {
      handleFilterChange('tags', [...currentTags, tag]);
    }
  }, [filters.tags, handleFilterChange]);

  const handleTagRemove = useCallback((tag: string) => {
    const currentTags = filters.tags || [];
    handleFilterChange('tags', currentTags.filter(t => t !== tag));
  }, [filters.tags, handleFilterChange]);

  if (showCompact && !isExpanded) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filtreler</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
              {Object.entries(filters).filter(([key, value]) => 
                key !== 'query' && value && (Array.isArray(value) ? value.length > 0 : true)
              ).length}
            </span>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Filtreleri temizle</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filtreler</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Aktif
            </span>
          )}
          <span className="text-sm text-gray-500">
            ({patientCount} hasta)
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              disabled={loading}
              className="flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Temizle</span>
            </Button>
          )}
          
          {showCompact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      <div className="p-4 space-y-6">
        {/* Status Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Users className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Durum</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('status', 
                  filters.status === option.value ? undefined : option.value
                )}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  filters.status === option.value
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option.label}
                {option.count !== undefined && option.count > 0 && (
                  <span className="ml-1 text-xs opacity-75">({option.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Segment Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Tag className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Segment</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {segmentOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('segment', 
                  filters.segment === option.value ? undefined : option.value
                )}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  filters.segment === option.value
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option.label}
                {option.count !== undefined && option.count > 0 && (
                  <span className="ml-1 text-xs opacity-75">({option.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Acquisition Type Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Building className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Kazanım Türü</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {acquisitionOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('acquisitionType', 
                  filters.acquisitionType === option.value ? undefined : option.value
                )}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  filters.acquisitionType === option.value
                    ? 'bg-purple-100 border-purple-300 text-purple-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option.label}
                {option.count !== undefined && option.count > 0 && (
                  <span className="ml-1 text-xs opacity-75">({option.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Tarih Aralığı</label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Başlangıç</label>
              <input
                type="date"
                value={filters.registrationDateRange?.start || ''}
                onChange={(e) => handleFilterChange('registrationDateRange', 
                  e.target.value ? { ...filters.registrationDateRange, start: e.target.value } : undefined
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Bitiş</label>
              <input
                type="date"
                value={filters.registrationDateRange?.end || ''}
                onChange={(e) => handleFilterChange('registrationDateRange', 
                  e.target.value ? { ...filters.registrationDateRange, end: e.target.value } : undefined
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Branch Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Building className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Şube</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {branchOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('branchId', 
                  filters.branchId === option.value ? undefined : option.value
                )}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  filters.branchId === option.value
                    ? 'bg-orange-100 border-orange-300 text-orange-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option.label}
                {option.count !== undefined && option.count > 0 && (
                  <span className="ml-1 text-xs opacity-75">({option.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tags Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Tag className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Etiketler</label>
          </div>
          
          {/* Selected Tags */}
          {filters.tags && filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => handleTagRemove(tag)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {/* Tag Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Etiket ekle..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement;
                  const tag = target.value.trim();
                  if (tag) {
                    handleTagAdd(tag);
                    target.value = '';
                  }
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                const tag = input?.value.trim();
                if (tag && input) {
                  handleTagAdd(tag);
                  input.value = '';
                }
              }}
            >
              Ekle
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
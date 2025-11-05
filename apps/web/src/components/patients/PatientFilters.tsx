import React, { useState, useCallback, useMemo } from 'react';
import { Button, DatePicker, Autocomplete } from '@x-ear/ui-web';
import type { AutocompleteOption } from '@x-ear/ui-web';
import { PatientFilters as PatientFiltersType } from '../../types/patient/patient-search.types';
import { Filter, X, ChevronUp, Users, Building, Calendar, TrendingUp, MapPin } from 'lucide-react';
import type { PatientStatus, PatientSegment } from '../../types/patient/patient-base.types';
import citiesData from '../../data/cities.json';

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
  showCompact = false // Default false to show expanded
}: PatientFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Default true for always expanded

  const cityOptions = useMemo<AutocompleteOption[]>(() => {
    return citiesData.cities.map(city => ({
      id: city.name,
      value: city.name,
      label: city.name
    }));
  }, []);

  const districtOptions = useMemo<AutocompleteOption[]>(() => {
    if (!filters.city) return [];
    const selectedCity = citiesData.cities.find(c => c.name === filters.city);
    if (!selectedCity) return [];
    return selectedCity.districts.map(district => ({
      id: district,
      value: district,
      label: district
    }));
  }, [filters.city]);

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

  const statusOptions: { value: PatientStatus; label: string; count?: number }[] = [
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'INACTIVE', label: 'Pasif' },
    { value: 'TRIAL', label: 'Deneme' }
  ];

  const segmentOptions: { value: PatientSegment; label: string; count?: number }[] = [
    { value: 'NEW', label: 'Yeni' },
    { value: 'TRIAL', label: 'Deneme' },
    { value: 'PURCHASED', label: 'Satın Alınmış' },
    { value: 'CONTROL', label: 'Kontrol' },
    { value: 'RENEWAL', label: 'Yenileme' }
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Filtreler</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Aktif
            </span>
          )}
          <span className="text-xs text-gray-500">
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
              className="flex items-center space-x-1 text-xs py-1"
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
      <div className="p-3 space-y-3">
        {/* Status Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-3 w-3 text-gray-500" />
            <label className="text-xs font-medium text-gray-700">Durum</label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('status',
                  (filters.status || []).includes(option.value)
                    ? (filters.status || []).filter((s) => s !== option.value)
                    : [ ...(filters.status || []), option.value ]
                )}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  (filters.status || []).includes(option.value)
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
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-3 w-3 text-gray-500" />
            <label className="text-xs font-medium text-gray-700">Segment</label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {segmentOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('segment',
                  (filters.segment || []).includes(option.value)
                    ? (filters.segment || []).filter((s) => s !== option.value)
                    : [ ...(filters.segment || []), option.value ]
                )}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  (filters.segment || []).includes(option.value)
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

        {/* Acquisition Type Filter (Kazanım Türü) */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-3 w-3 text-gray-500" />
            <label className="text-xs font-medium text-gray-700">Kazanım Türü</label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {acquisitionOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('acquisitionType', 
                  filters.acquisitionType?.includes(option.value as any)
                    ? filters.acquisitionType.filter(s => s !== option.value)
                    : [...(filters.acquisitionType || []), option.value as any]
                )}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  filters.acquisitionType?.includes(option.value as any)
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
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-3 w-3 text-gray-500" />
            <label className="text-xs font-medium text-gray-700">Tarih Aralığı</label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <DatePicker
              value={filters.registrationDateRange?.start ? new Date(filters.registrationDateRange.start) : null}
              onChange={(date) => handleFilterChange('registrationDateRange',
                date ? { ...filters.registrationDateRange, start: date.toISOString().split('T')[0] } : { ...filters.registrationDateRange, start: undefined }
              )}
              placeholder="Başlangıç"
              fullWidth
            />
            <DatePicker
              value={filters.registrationDateRange?.end ? new Date(filters.registrationDateRange.end) : null}
              onChange={(date) => handleFilterChange('registrationDateRange',
                date ? { ...filters.registrationDateRange, end: date.toISOString().split('T')[0] } : { ...filters.registrationDateRange, end: undefined }
              )}
              placeholder="Bitiş"
              fullWidth
            />
          </div>
        </div>

        {/* Branch Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Building className="h-3 w-3 text-gray-500" />
            <label className="text-xs font-medium text-gray-700">Şube</label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {branchOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('branchId', 
                  filters.branchId === option.value ? undefined : option.value
                )}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
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

        {/* City/District Filter */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="h-3 w-3 text-gray-500" />
            <label className="text-xs font-medium text-gray-700">Konum</label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Autocomplete
              options={cityOptions}
              value={cityOptions.find(c => c.value === filters.city) || null}
              onChange={(option) => {
                handleFilterChange('city', option?.value || undefined);
                if (option?.value !== filters.city) {
                  handleFilterChange('district', undefined);
                }
              }}
              placeholder="Tüm İller"
              allowClear
              minSearchLength={0}
              maxResults={100}
              className="h-9 text-sm"
            />
            <Autocomplete
              options={districtOptions}
              value={districtOptions.find(d => d.value === filters.district) || null}
              onChange={(option) => handleFilterChange('district', option?.value || undefined)}
              placeholder={filters.city ? 'Tüm İlçeler' : 'Önce İl Seçiniz'}
              disabled={!filters.city}
              allowClear
              minSearchLength={0}
              maxResults={200}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
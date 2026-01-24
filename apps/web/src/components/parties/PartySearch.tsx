import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Button, Loading } from '@x-ear/ui-web';
import { Search, X, Clock, User, Phone, Filter } from 'lucide-react';
import { PartySearchItem } from '../../types/party/party-search.types';

export interface PartySearchFilters {
  query?: string;
  status?: string | string[];
  segment?: string | string[];
  acquisitionType?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  branchId?: string;
  labels?: string[];
  hasDevice?: boolean;
}

interface PartySearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  onFiltersChange?: (filters: PartySearchFilters) => void;
  onClear?: () => void;
  results?: PartySearchItem[];
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  disabled?: boolean;
  showRecentSearches?: boolean;
  showFilters?: boolean;
  initialFilters?: PartySearchFilters;
}

interface RecentSearch {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
}

/**
 * PartySearch Component
 * Advanced search functionality with dropdown results, recent searches, and debounced input
 */
export function PartySearch({
  value,
  onChange,
  onSearch,
  onFiltersChange,
  onClear,
  results = [],
  isSearching = false,
  placeholder = 'Hasta ara... (ad, soyad, telefon, TC)',
  className = '',
  debounceMs = 300,
  disabled = false,
  showRecentSearches = true,
  showFilters = false,
  initialFilters = {}
}: PartySearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<PartySearchFilters>(initialFilters);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches) {
      const saved = localStorage.getItem('party-recent-searches');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setRecentSearches(parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })));
        } catch (error) {
          console.error('Failed to load recent searches:', error);
        }
      }
    }
  }, [showRecentSearches]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
        if (onSearch && localValue.trim().length >= 2) {
          onSearch(localValue.trim());
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, onChange, value, debounceMs, onSearch]);

  // Sync with external value changes
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Save recent search
  const saveRecentSearch = useCallback((query: string, resultCount: number) => {
    if (!showRecentSearches || !query.trim() || query.length < 2) return;

    const newSearch: RecentSearch = {
      id: Date.now().toString(),
      query: query.trim(),
      timestamp: new Date(),
      resultCount
    };

    const updated = [
      newSearch,
      ...recentSearches.filter(s => s.query !== query.trim())
    ].slice(0, 10);

    setRecentSearches(updated);
    localStorage.setItem('party-recent-searches', JSON.stringify(updated));
  }, [recentSearches, showRecentSearches]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Update filters with new query
    const updatedFilters = { ...filters, query: newValue };
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
    
    // Show dropdown when typing or when focused with recent searches
    if (newValue.length > 0 || (showRecentSearches && recentSearches.length > 0)) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [showRecentSearches, recentSearches.length, filters, onFiltersChange]);

  const handleFilterChange = useCallback((key: keyof PartySearchFilters, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  }, [filters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    const clearedFilters: PartySearchFilters = { query: localValue };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  }, [localValue, onFiltersChange]);

  const activeFiltersCount = React.useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => 
      key !== 'query' && value && (Array.isArray(value) ? value.length > 0 : true)
    ).length;
  }, [filters]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    onClear?.();
    setShowDropdown(false);
    inputRef.current?.focus();
  }, [onChange, onClear]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (localValue.length > 0 || (showRecentSearches && recentSearches.length > 0)) {
      setShowDropdown(true);
    }
  }, [localValue, showRecentSearches, recentSearches.length]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding dropdown to allow clicks
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onSearch && localValue.trim()) {
        onSearch(localValue.trim());
        saveRecentSearch(localValue.trim(), results.length);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }, [onSearch, localValue, saveRecentSearch, results.length]);

  const handleRecentSearchClick = useCallback((query: string) => {
    setLocalValue(query);
    onChange(query);
    if (onSearch) {
      onSearch(query);
    }
    setShowDropdown(false);
  }, [onChange, onSearch]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('party-recent-searches');
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loading className="h-5 w-5 text-gray-400" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`pl-10 ${localValue ? 'pr-20' : 'pr-4'} ${showFilters ? 'pr-28' : ''} ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
        />
        
        {/* Clear button */}
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            disabled={disabled}
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}

        {/* Filter toggle button */}
        {showFilters && (
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`absolute inset-y-0 ${localValue ? 'right-8' : 'right-0'} pr-3 flex items-center`}
            disabled={disabled}
          >
            <div className="relative">
              <Filter className={`h-5 w-5 ${showAdvancedFilters ? 'text-blue-600' : 'text-gray-400'} hover:text-gray-600`} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && showAdvancedFilters && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Gelişmiş Filtreler</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Temizle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tümü</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="pending">Beklemede</option>
              </select>
            </div>

            {/* Segment Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Segment
              </label>
              <select
                value={filters.segment || ''}
                onChange={(e) => handleFilterChange('segment', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tümü</option>
                <option value="trial">Deneme</option>
                <option value="purchased">Satın Alınmış</option>
                <option value="lead">Potansiyel</option>
                <option value="follow_up">Takip</option>
              </select>
            </div>

            {/* Acquisition Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Kazanım Türü
              </label>
              <select
                value={filters.acquisitionType || ''}
                onChange={(e) => handleFilterChange('acquisitionType', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tümü</option>
                <option value="referral">Referans</option>
                <option value="online">Online</option>
                <option value="walk-in">Yürüyerek Gelen</option>
                <option value="social-media">Sosyal Medya</option>
                <option value="advertisement">Reklam</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Şube
              </label>
              <select
                value={filters.branchId || ''}
                onChange={(e) => handleFilterChange('branchId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Şubeler</option>
                <option value="branch-1">Merkez Şube</option>
                <option value="branch-2">Kadıköy Şube</option>
                <option value="branch-3">Beşiktaş Şube</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Dropdown */}
      {showDropdown && !showAdvancedFilters && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {/* Search Results */}
          {localValue.length > 0 && (
            <div>
              {isSearching ? (
                <div className="p-4 text-center">
                  <Loading className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Aranıyor...</p>
                </div>
              ) : results.length > 0 ? (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                    Arama Sonuçları ({results.length})
                  </div>
                  {results.slice(0, 8).map((party) => (
                    <div
                      key={party.id}
                      className="px-3 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => console.log('Select party:', party.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {party.firstName} {party.lastName}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              party.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800'
                                : party.status === 'INACTIVE'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {party.status === 'ACTIVE' ? 'Aktif' : 
                               party.status === 'INACTIVE' ? 'Pasif' : 'Arşiv'}
                            </span>
                          </div>
                          
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            {party.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{party.phone}</span>
                              </div>
                            )}
                            
                            <span>
                              Kayıt: {new Date(party.registrationDate).toLocaleDateString('tr-TR')}
                            </span>
                            
                            {party.deviceCount > 0 && (
                              <span className="text-blue-600">
                                {party.deviceCount} cihaz
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {party.priority > 0 && (
                            <div className="text-xs text-orange-600 font-medium">
                              Öncelik: {party.priority}
                            </div>
                          )}
                          
                          {party.outstandingBalance > 0 && (
                            <div className="text-xs text-red-600">
                              Borç: ₺{party.outstandingBalance.toLocaleString('tr-TR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {results.length > 8 && (
                    <div className="px-3 py-2 text-center text-sm text-gray-500 bg-gray-50">
                      +{results.length - 8} hasta daha
                    </div>
                  )}
                </div>
              ) : localValue.length >= 2 ? (
                <div className="p-4 text-center text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Hasta bulunamadı</p>
                  <p className="text-xs mt-1">Farklı arama terimleri deneyin</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Recent Searches */}
          {showRecentSearches && localValue.length === 0 && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                <span>Son Aramalar</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-xs p-1 h-auto"
                >
                  Temizle
                </Button>
              </div>
              
              {recentSearches.slice(0, 5).map((search) => (
                <div
                  key={search.id}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleRecentSearchClick(search.query)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{search.query}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {search.resultCount} sonuç
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {localValue.length === 0 && recentSearches.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Hasta aramaya başlayın</p>
              <p className="text-xs mt-1">Ad, soyad, telefon veya TC ile arayabilirsiniz</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
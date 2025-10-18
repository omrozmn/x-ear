import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

export interface MultiSelectOption {
  id: string | number;
  label: string;
  value: string;
  description?: string;
  category?: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: MultiSelectOption[];
  onChange: (options: MultiSelectOption[]) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  selectAll?: boolean;
  maxSelections?: number;
  minSearchLength?: number;
  maxResults?: number;
  searchDelay?: number;
  noResultsText?: string;
  loadingText?: string;
  selectAllText?: string;
  clearAllText?: string;
  selectedText?: string;
  className?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  tagClassName?: string;
  renderOption?: (option: MultiSelectOption) => React.ReactNode;
  renderTag?: (option: MultiSelectOption, onRemove: () => void) => React.ReactNode;
  filterOptions?: (options: MultiSelectOption[], query: string) => MultiSelectOption[];
}

const defaultFilterOptions = (options: MultiSelectOption[], query: string): MultiSelectOption[] => {
  const lowerQuery = query.toLowerCase();
  return options.filter(option => 
    option.label.toLowerCase().includes(lowerQuery) ||
    option.value.toLowerCase().includes(lowerQuery) ||
    (option.description && option.description.toLowerCase().includes(lowerQuery))
  );
};

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options = [],
  value = [],
  onChange,
  onSearch,
  placeholder = "Seçenekleri seçin...",
  label,
  error,
  helperText,
  disabled = false,
  loading = false,
  searchable = true,
  clearable = true,
  selectAll = false,
  maxSelections,
  minSearchLength = 1,
  maxResults = 10,
  searchDelay = 300,
  noResultsText = "Sonuç bulunamadı",
  loadingText = "Yükleniyor...",
  selectAllText = "Tümünü Seç",
  clearAllText = "Tümünü Temizle",
  selectedText = "seçili",
  className,
  dropdownClassName,
  optionClassName,
  tagClassName,
  renderOption,
  renderTag,
  filterOptions = defaultFilterOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<MultiSelectOption[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Filter options based on search query and exclude selected options
  useEffect(() => {
    let filtered = options;
    
    if (searchable && searchQuery.length >= minSearchLength) {
      filtered = filterOptions(options, searchQuery);
    }
    
    // Don't show already selected options in dropdown
    filtered = filtered.filter(option => 
      !value.some(selected => selected.id === option.id)
    );
    
    setFilteredOptions(filtered.slice(0, maxResults));
  }, [options, searchQuery, value, searchable, minSearchLength, maxResults, filterOptions]);

  // Handle search with debounce
  const handleSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (onSearch && query.length >= minSearchLength) {
        onSearch(query);
      }
    }, searchDelay);
  }, [onSearch, minSearchLength, searchDelay]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!isOpen && query.length >= minSearchLength) {
      setIsOpen(true);
    }
    
    handleSearch(query);
  };

  // Handle option selection
  const handleOptionSelect = (option: MultiSelectOption) => {
    if (option.disabled) return;
    
    if (maxSelections && value.length >= maxSelections) {
      return;
    }
    
    const newValue = [...value, option];
    onChange(newValue);
    
    if (searchable) {
      setSearchQuery('');
    }
  };

  // Handle option removal
  const handleOptionRemove = (optionToRemove: MultiSelectOption) => {
    const newValue = value.filter(option => option.id !== optionToRemove.id);
    onChange(newValue);
  };

  // Handle select all
  const handleSelectAll = () => {
    const availableOptions = options.filter(option => 
      !option.disabled && !value.some(selected => selected.id === option.id)
    );
    
    let newOptions = availableOptions;
    if (maxSelections) {
      const remainingSlots = maxSelections - value.length;
      newOptions = availableOptions.slice(0, remainingSlots);
    }
    
    onChange([...value, ...newOptions]);
  };

  // Handle clear all
  const handleClearAll = () => {
    onChange([]);
    if (searchable) {
      setSearchQuery('');
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const showDropdown = isOpen && (filteredOptions.length > 0 || loading || (searchQuery.length >= minSearchLength && filteredOptions.length === 0));
  const hasSelections = value.length > 0;
  const canSelectMore = !maxSelections || value.length < maxSelections;

  const defaultRenderTag = (option: MultiSelectOption, onRemove: () => void) => (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
        'bg-blue-100 text-blue-800 border border-blue-200',
        tagClassName
      )}
    >
      {option.label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 text-blue-600 hover:text-blue-800"
        disabled={disabled}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div
        className={clsx(
          'min-h-[2.5rem] w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          error && 'border-red-500 focus-within:ring-red-500 focus-within:border-red-500',
          'cursor-text'
        )}
        onClick={() => {
          if (!disabled && searchable) {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        }}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {/* Selected tags */}
          {value.map((option) => (
            <div key={option.id}>
              {renderTag ? renderTag(option, () => handleOptionRemove(option)) : defaultRenderTag(option, () => handleOptionRemove(option))}
            </div>
          ))}
          
          {/* Search input */}
          {searchable && (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => setIsOpen(true)}
              placeholder={hasSelections ? '' : placeholder}
              disabled={disabled}
              className="flex-1 min-w-[120px] outline-none bg-transparent"
            />
          )}
          
          {/* Placeholder when not searchable */}
          {!searchable && !hasSelections && (
            <span className="text-gray-500">{placeholder}</span>
          )}
          
          {/* Selection count */}
          {hasSelections && !searchable && (
            <span className="text-sm text-gray-600">
              {value.length} {selectedText}
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          )}
          
          {clearable && hasSelections && !loading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="text-gray-400 hover:text-gray-600"
              disabled={disabled}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <div className="text-gray-400">
            <svg 
              className={clsx(
                'w-4 h-4 transition-transform',
                isOpen && 'rotate-180'
              )} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={clsx(
            'absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto',
            dropdownClassName
          )}
        >
          {/* Select All / Clear All */}
          {selectAll && !loading && filteredOptions.length > 0 && (
            <div className="border-b border-gray-200">
              <div className="flex justify-between items-center px-3 py-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={!canSelectMore}
                  className={clsx(
                    'text-sm font-medium',
                    canSelectMore ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'
                  )}
                >
                  {selectAllText}
                </button>
                {hasSelections && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    {clearAllText}
                  </button>
                )}
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              {loadingText}
            </div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className={clsx(
                  'px-3 py-2 cursor-pointer text-sm',
                  'hover:bg-gray-100',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  !canSelectMore && 'opacity-50 cursor-not-allowed',
                  optionClassName
                )}
              >
                {renderOption ? renderOption(option) : (
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                    )}
                    {option.category && (
                      <div className="text-xs text-blue-600 mt-1">{option.category}</div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              {noResultsText}
            </div>
          )}
          
          {/* Max selections warning */}
          {maxSelections && value.length >= maxSelections && (
            <div className="border-t border-gray-200 px-3 py-2 text-xs text-amber-600 bg-amber-50">
              Maksimum {maxSelections} seçim yapabilirsiniz
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Helper text */}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default MultiSelect;
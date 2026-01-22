import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

export interface AutocompleteOption {
  id: string | number;
  label: string;
  value: string;
  description?: string;
  category?: string;
}

export interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: AutocompleteOption | null;
  onChange: (option: AutocompleteOption | null) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  loading?: boolean;
  allowClear?: boolean;
  minSearchLength?: number;
  maxResults?: number;
  searchDelay?: number;
  noResultsText?: string;
  loadingText?: string;
  className?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  renderOption?: (option: AutocompleteOption) => React.ReactNode;
  filterOptions?: (options: AutocompleteOption[], query: string) => AutocompleteOption[];
}

const defaultFilterOptions = (options: AutocompleteOption[], query: string): AutocompleteOption[] => {
  const lowerQuery = query.toLowerCase();
  return options.filter(option =>
    option.label.toLowerCase().includes(lowerQuery) ||
    option.value.toLowerCase().includes(lowerQuery) ||
    (option.description && option.description.toLowerCase().includes(lowerQuery))
  );
};

export const Autocomplete: React.FC<AutocompleteProps> = ({
  options = [],
  value,
  onChange,
  onSearch,
  placeholder = "Arama yapın...",
  label,
  error,
  helperText,
  disabled = false,
  loading = false,
  allowClear = true,
  minSearchLength = 1,
  maxResults = 10,
  searchDelay = 300,
  noResultsText = "Sonuç bulunamadı",
  loadingText = "Yükleniyor...",
  className,
  dropdownClassName,
  optionClassName,
  renderOption,
  filterOptions = defaultFilterOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Filter options based on search query
  useEffect(() => {
    if (searchQuery.length >= minSearchLength || minSearchLength === 0) {
      const filtered = filterOptions(options, searchQuery).slice(0, maxResults);
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions([]);
    }
  }, [options, searchQuery, minSearchLength, maxResults, filterOptions]);

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
    setHighlightedIndex(-1);

    if (!isOpen && query.length >= minSearchLength) {
      setIsOpen(true);
    }

    handleSearch(query);
  };

  // Handle option selection
  const handleOptionSelect = (option: AutocompleteOption) => {
    onChange(option);
    setSearchQuery(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle clear
  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            // Select highlighted option
            handleOptionSelect(filteredOptions[highlightedIndex]);
          } else if (filteredOptions.length === 1) {
            // If only one match, select it automatically
            handleOptionSelect(filteredOptions[0]);
          } else if (filteredOptions.length > 0) {
            // If multiple matches and none highlighted, select the first one
            handleOptionSelect(filteredOptions[0]);
          }
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;

      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search query when value changes externally
  useEffect(() => {
    if (value) {
      setSearchQuery(value.label);
    } else if (!isOpen) {
      setSearchQuery('');
    }
  }, [value, isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const showDropdown = isOpen && (filteredOptions.length > 0 || loading || (searchQuery.length >= minSearchLength && filteredOptions.length === 0));

  return (
    <div className={clsx('relative w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.length >= minSearchLength) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            allowClear && value && 'pr-16'
          )}
        />

        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Clear button */}
        {allowClear && value && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg
            className={clsx(
              'w-4 h-4 text-gray-400 transition-transform',
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

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={clsx(
            'absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto',
            dropdownClassName
          )}
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              {loadingText}
            </div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className={clsx(
                  'px-3 py-2 cursor-pointer text-sm',
                  'hover:bg-gray-100',
                  index === highlightedIndex && 'bg-blue-50 text-blue-700',
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

export default Autocomplete;
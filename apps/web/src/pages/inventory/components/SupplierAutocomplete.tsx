import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus } from 'lucide-react';
import { Input, Button } from '@x-ear/ui-web';
import { useAuthStore } from '../../../stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

import {
  useListSuppliers,
  getListSuppliersQueryKey,
  useCreateSupplier
} from '@/api/client/suppliers.client';


interface SupplierAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  error?: string;
  required?: boolean;
}

export const SupplierAutocomplete: React.FC<SupplierAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Tedarikçi adı",
  label = "Tedarikçi",
  className = '',
  error,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Debounce search term to prevent excessive API calls
  const [debouncedSearch, setDebouncedSearch] = useState(value);

  const [filteredSuppliers, setFilteredSuppliers] = useState<string[]>([]);
  // allSuppliers removed as we use server-side search
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Default suppliers (fallback)
  const defaultSuppliers = [
    'Phonak Turkey',
    'Oticon Türkiye',
    'Widex Türkiye',
    'Signia Türkiye',
    'ReSound Türkiye',
    'Starkey Türkiye',
    'Unitron Türkiye',
    'Bernafon Türkiye',
    'Hansaton Türkiye',
    'Sonic Türkiye',
    'GN Hearing Türkiye',
    'Amplifon Türkiye',
    'Audika Türkiye',
    'Hear Clear Türkiye',
    'Beltone Türkiye',
    'Miracle-Ear Türkiye',
    'Connect Hearing Türkiye',
    'Audiology Türkiye',
    'Hearing Life Türkiye',
    'HearingPlanet Türkiye',
    'Medikal Cihaz Ltd.',
    'Sağlık Teknolojileri A.Ş.',
    'Tıbbi Cihaz İthalat Ltd.',
    'Audiomed Türkiye',
    'Hearing Solutions Ltd.',
    'Medical Devices Turkey',
    'Healthcare Tech Ltd.',
    'Auditory Systems Turkey',
    'Sound Solutions Ltd.',
    'Hearing Care Turkey'
  ];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(handler);
  }, [value]);

  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  // Async Search using backend API
  // We request only 10 items for autocomplete performance
  const { data: suppliersData, isLoading: isLoadingSuppliers, isError: isErrorSuppliers } = useListSuppliers(
    { search: debouncedSearch, per_page: 10 },
    {
      query: {
        queryKey: getListSuppliersQueryKey({ search: debouncedSearch, per_page: 10 }),
        enabled: !!token,
        staleTime: 5000
      }
    }
  );

  // NOTE: Inventory scraping removed for scalability/pagination reasons (Phase 4)

  const isLoading = isLoadingSuppliers;
  const isError = isErrorSuppliers;

  // Compute filtered suppliers (Backend Results + Filtered Defaults)
  useEffect(() => {
    if (!isOpen) {
      setFilteredSuppliers([]);
      return;
    }

    const suppliers: string[] = [];

    // 1. Add API Results
     
    if (suppliersData) {
      let supplierArray: unknown[] = [];
      // Handle response wrapping (using unwrapPaginated logic concepts)
      if (Array.isArray(suppliersData)) {
        supplierArray = suppliersData;
      } else if ((suppliersData as Record<string, unknown>)?.data) {
        const innerData = (suppliersData as Record<string, unknown>).data;
        if (Array.isArray(innerData)) {
          supplierArray = innerData;
        } else if (typeof innerData === 'object' && innerData !== null) {
          const innerDataObj = innerData as Record<string, unknown>;
          if (innerDataObj.data && Array.isArray(innerDataObj.data)) {
            // Double wrapped
            supplierArray = innerDataObj.data;
          }
        }
      }

      const apiNames = supplierArray
        .map((s: unknown) => {
          const supplier = s as Record<string, unknown>;
          return String(supplier.companyName || supplier.company_name || supplier.name || '');
        })
        .filter(Boolean);
      suppliers.push(...apiNames);
    }

    // 2. Add Default Suppliers (Client-side filtered fallback)
    // Only if we don't have many results from API, or always?
    // Let's filter defaults using the search term
    if (value) {
      const lowerVal = value.toLocaleLowerCase('tr-TR');
      const matchedDefaults = defaultSuppliers.filter(s =>
        s.toLocaleLowerCase('tr-TR').includes(lowerVal)
      );
      suppliers.push(...matchedDefaults);
    } else {
      // If empty search, show some defaults?
      suppliers.push(...defaultSuppliers.slice(0, 5));
    }

    // Deduplicate
    const unique = [...new Set(suppliers)].slice(0, 10); // Limit to 10
    setFilteredSuppliers(unique);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliersData, value, isOpen]);

  // Check if current value is an exact match (check filtered and defaults)
  const validationList = filteredSuppliers.length > 0 ? filteredSuppliers : defaultSuppliers;
  const valStr = value || '';
  const hasExactMatch = validationList.some(sup => (sup || '').toLowerCase() === valStr.toLowerCase());
  const showCreateNew = value.trim() && !hasExactMatch && isOpen;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    portalRef.current = document.createElement('div');
    portalRef.current.setAttribute('data-portal', 'supplier-autocomplete');
    document.body.appendChild(portalRef.current);
    return () => {
      if (portalRef.current && portalRef.current.parentNode) {
        portalRef.current.parentNode.removeChild(portalRef.current);
      }
      portalRef.current = null;
    };
  }, []);

  const updateDropdownPosition = () => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    const rect = inputEl.getBoundingClientRect();
    setDropdownStyle({
      position: 'absolute',
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.bottom + window.scrollY}px`,
      width: `${rect.width}px`,
      zIndex: 9999
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, filteredSuppliers.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSupplierSelect = (supplier: string) => {
    onChange(supplier);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const createSupplierMutation = useCreateSupplier();

  const handleCreateNew = async () => {
    const newSupplier = value.trim();
    if (!newSupplier) return;

    try {
      await createSupplierMutation.mutateAsync({ data: { name: newSupplier, companyName: newSupplier } });
      console.log('✅ New supplier created:', newSupplier);

      // Invalidate React Query cache to refetch suppliers
      queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } }).response?.status === 409) {
        console.log('Supplier already exists, using existing:', newSupplier);
        // Invalidate cache
        queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
      } else {
        console.warn('Failed to persist supplier to API, using locally:', error);
      }
    }

    onChange(newSupplier);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && filteredSuppliers.length > 0) {
      e.preventDefault();
      // Focus first dropdown item (could be enhanced with keyboard navigation)
      const firstItem = dropdownRef.current?.querySelector('button');
      firstItem?.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          label={label}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          error={error}
          className="pr-8 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />

        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none mt-6">
          <svg
            className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''
              }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (filteredSuppliers.length > 0 || showCreateNew) && portalRef.current && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">
              Yükleniyor...
            </div>
          )}

          {isError && (
            <div className="px-4 py-3 text-sm text-red-500 dark:text-red-400">
              Tedarikçiler yüklenirken hata oluştu.
            </div>
          )}

          {!isLoading && !isError && filteredSuppliers.map((supplier, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => handleSupplierSelect(supplier)}
              className="w-full px-4 py-3 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none first:rounded-t-lg last:rounded-b-lg transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSupplierSelect(supplier);
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                  inputRef.current?.focus();
                }
              }}
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
                  <path d="M6 8h8v2H6V8zm0 4h8v2H6v-2z" />
                </svg>
                <span>{supplier}</span>
              </div>
            </Button>
          ))}

          {/* Create new supplier option */}
          {showCreateNew && (
            <div
              role="option"
              tabIndex={0}
              onClick={handleCreateNew}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCreateNew();
                }
              }}
              className="px-4 py-2 cursor-pointer bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 focus:bg-green-100 dark:focus:bg-green-900/40 focus:outline-none transition-colors border-t border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  "{value}" tedarikçisini ekle
                </span>
              </div>
            </div>
          )}
        </div>
        , portalRef.current)}
    </div>
  );
};
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Plus } from 'lucide-react';
import { Input } from '@x-ear/ui-web';
import { useGetDeviceBrands, useCreateDeviceBrand, getGetDeviceBrandsQueryKey } from '@/api/generated/devices/devices';
import { useQueryClient } from '@tanstack/react-query';

interface BrandAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  error?: string;
  required?: boolean;
}

export const BrandAutocomplete: React.FC<BrandAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Marka seçin",
  label = "Marka",
  className = '',
  error,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredBrands, setFilteredBrands] = useState<string[]>([]);
  const [localBrands, setLocalBrands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const queryClient = useQueryClient();

  // Fetch brands from API
  const { data: brandsData, isLoading, isError } = useGetDeviceBrands();

  // Create brand mutation
  const createBrandMutation = useCreateDeviceBrand({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeviceBrandsQueryKey() });
      }
    }
  });

  // Default hearing aid brands (fallback)
  const defaultBrands = [
    'Phonak',
    'Oticon',
    'Widex',
    'Signia',
    'ReSound',
    'Starkey',
    'Unitron',
    'Bernafon',
    'Hansaton',
    'Sonic',
    'GN Hearing',
    'Amplifon',
    'Beltone',
    'Siemens',
    'Rexton',
    'Audio Service',
    'Cochlear',
    'Med-El',
    'Advanced Bionics',
    'Sennheiser',
    'Sony',
    'Bose',
    'Jabra',
    'Eargo'
  ];

  // Merge API brands with defaults and local additions
  const allBrands = useMemo(() => {
    let apiBrands: string[] = [];

    // Handle different response structures
    if (brandsData) {
      const responseData = brandsData as any;
      if (Array.isArray(responseData)) {
        apiBrands = responseData;
      } else if (responseData?.data) {
        const innerData = responseData.data;
        if (Array.isArray(innerData)) {
          apiBrands = innerData.map((b: any) => typeof b === 'string' ? b : b.name || b.brandName || String(b));
        } else if (innerData?.brands && Array.isArray(innerData.brands)) {
          apiBrands = innerData.brands;
        }
      } else if (responseData?.success && responseData?.data) {
        const innerData = responseData.data;
        if (Array.isArray(innerData)) {
          apiBrands = innerData.map((b: any) => typeof b === 'string' ? b : b.name || b.brandName || String(b));
        }
      }
    }

    // Combine all sources: API, local, and defaults
    const combined = [...new Set([...apiBrands, ...localBrands, ...defaultBrands])];
    return combined.sort();
  }, [brandsData, localBrands]);

  useEffect(() => {
    if (value && isOpen) {
      // Normalize Turkish characters for better matching
      const normalizeTurkish = (str: string) => {
        return str
          .toLowerCase()
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c');
      };

      const normalizedValue = normalizeTurkish(value);

      // Score each brand
      const scored = allBrands.map(brand => {
        const normalizedBrand = normalizeTurkish(brand);
        let score = 0;

        // Exact match
        if (normalizedBrand === normalizedValue) score = 100;
        // Starts with
        else if (normalizedBrand.startsWith(normalizedValue)) score = 90;
        // Contains
        else if (normalizedBrand.includes(normalizedValue)) score = 70;
        // Fuzzy match
        else {
          let matches = 0;
          for (const char of normalizedValue) {
            if (normalizedBrand.includes(char)) matches++;
          }
          score = (matches / normalizedValue.length) * 50;
        }

        return { brand, score };
      });

      // Filter and sort by score
      const filtered = scored
        .filter(item => item.score > 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(item => item.brand);

      setFilteredBrands(filtered);
    } else if (isOpen) {
      setFilteredBrands(allBrands.slice(0, 10));
    } else {
      setFilteredBrands([]);
    }
  }, [value, isOpen, allBrands]);

  // Check if current value is an exact match
  const valStr = value || '';
  const hasExactMatch = allBrands.some(brand => (brand || '').toLowerCase() === valStr.toLowerCase());
  const showCreateNew = valStr.trim() && !hasExactMatch && isOpen;

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    portalRef.current = document.createElement('div');
    portalRef.current.setAttribute('data-portal', 'brand-autocomplete');
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
  }, [isOpen, filteredBrands.length]);

  const handleSelect = (brand: string) => {
    onChange(brand);
    setIsOpen(false);
  };

  const handleCreateNew = async () => {
    const newBrand = value.trim();
    if (!newBrand) return;

    try {
      // Try to create via API
      await createBrandMutation.mutateAsync({ data: { name: newBrand } });
      console.log('✅ New brand created via API:', newBrand);
    } catch (error: any) {
      console.warn('Failed to create brand via API, adding locally:', error);
      // Add to local list as fallback
      setLocalBrands(prev => [...new Set([...prev, newBrand])].sort());
    }

    onChange(newBrand);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && filteredBrands.length > 0) {
      e.preventDefault();
      const firstItem = dropdownRef.current?.querySelector('[role="option"]') as HTMLElement;
      firstItem?.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-300' : 'border-gray-300'
            }`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="brand-autocomplete-list"
        />

        {isOpen && (filteredBrands.length > 0 || showCreateNew) && portalRef.current && ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            id="brand-autocomplete-list"
            style={dropdownStyle}
            className="bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
            role="listbox"
          >
            {isLoading && (
              <div className="px-4 py-2 text-sm text-gray-500 italic">
                Yükleniyor...
              </div>
            )}

            {isError && (
              <div className="px-4 py-2 text-sm text-red-500">
                Markalar yüklenirken hata oluştu.
              </div>
            )}

            {!isLoading && !isError && filteredBrands.map((brand, index) => (
              <div
                key={index}
                role="option"
                tabIndex={0}
                onClick={() => handleSelect(brand)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(brand);
                  }
                }}
                className="px-4 py-2 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{brand}</span>
                </div>
              </div>
            ))}

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
                className="px-4 py-2 cursor-pointer bg-green-50 hover:bg-green-100 focus:bg-green-100 focus:outline-none transition-colors border-t border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    "{value}" markasını ekle
                  </span>
                </div>
              </div>
            )}
          </div>
          , portalRef.current)}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default BrandAutocomplete;

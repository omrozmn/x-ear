import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus } from 'lucide-react';
import { Input } from '@x-ear/ui-web';
import { getCategoryDisplay, getCategoryValue } from '../../../utils/category-mapping';
import { useAuthStore } from '../../../stores/authStore';

import {
  useInventoryGetCategories,
  getInventoryGetCategoriesQueryKey,
  useInventoryCreateCategory
} from '@/api/generated';



interface CategoryAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  error?: string;
  required?: boolean;
}

export const CategoryAutocomplete: React.FC<CategoryAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Kategori seçin",
  label = "Kategori",
  className = '',
  error,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Update display value when value changes
  useEffect(() => {
    setDisplayValue(getCategoryDisplay(value));
  }, [value]);

  // Common product categories (fallback)
  const defaultCategories = [
    'İşitme Cihazı',
    'Pil',
    'Aksesuar',
    'Bakım Ürünleri',
    'Kulaklık',
    'Kulak İçi Cihaz',
    'Kulak Arkası Cihaz',
    'RIC Cihaz',
    'BTE Cihaz',
    'ITE Cihaz',
    'CIC Cihaz',
    'Şarj Cihazı',
    'Kurutma Cihazı',
    'Temizlik Seti',
    'Filtre',
    'Wax Guard',
    'Dome',
    'Tüp',
    'Kablo',
    'Bluetooth Aksesuar',
    'TV Streamer',
    'Telefon Aksesuarı',
    'Uzaktan Kumanda',
    'Taşıma Çantası',
    'Koruma Kılıfı'
  ];

  const { token } = useAuthStore();

  // React Query hook for categories - only fetch if authenticated
  const { data: categoriesData, isLoading, isError } = useInventoryGetCategories({
    query: {
      queryKey: getInventoryGetCategoriesQueryKey(),
      enabled: !!token,
    }
  });

  // Load categories from API data
  useEffect(() => {
    let apiCategories: string[] = [];

    // Handle different response structures
    if (categoriesData) {
      if (Array.isArray(categoriesData)) {
        apiCategories = categoriesData;
      } else if ((categoriesData as any)?.data) {
        const innerData = (categoriesData as any).data;
        if (Array.isArray(innerData)) {
          apiCategories = innerData;
        } else if (innerData?.data && Array.isArray(innerData.data)) {
          apiCategories = innerData.data;
        }
      }
    }

    if (apiCategories.length > 0) {
      const combined = [...new Set([...apiCategories, ...defaultCategories])];
      setAllCategories(combined.sort());
    } else {
      setAllCategories(defaultCategories);
    }
  }, [categoriesData]);

  useEffect(() => {
    const categories = allCategories.length > 0 ? allCategories : defaultCategories;
    if (displayValue && isOpen) {
      // Normalize Turkish characters
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

      const normalizedValue = normalizeTurkish(displayValue);

      const scored = categories.map(cat => {
        const normalizedCat = normalizeTurkish(cat);
        let score = 0;

        if (normalizedCat === normalizedValue) score = 100;
        else if (normalizedCat.startsWith(normalizedValue)) score = 90;
        else if (normalizedCat.includes(normalizedValue)) score = 70;
        else {
          let matches = 0;
          for (const char of normalizedValue) {
            if (normalizedCat.includes(char)) matches++;
          }
          score = (matches / normalizedValue.length) * 50;
        }

        return { cat, score };
      });

      const filtered = scored
        .filter(item => item.score > 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(item => item.cat);

      setFilteredCategories(filtered);
    } else if (isOpen) {
      setFilteredCategories(categories.slice(0, 10));
    } else {
      setFilteredCategories([]);
    }
  }, [displayValue, isOpen, allCategories]);

  // Check if current value is an exact match
  const categories = allCategories.length > 0 ? allCategories : defaultCategories;
  const dv = displayValue || '';
  const hasExactMatch = categories.some(cat => (cat || '').toLowerCase() === dv.toLowerCase());
  const showCreateNew = dv.trim() && !hasExactMatch && isOpen;

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

  // create portal container for dropdown and update position while open
  useEffect(() => {
    portalRef.current = document.createElement('div');
    portalRef.current.setAttribute('data-portal', 'category-autocomplete');
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
  }, [isOpen, filteredCategories.length]);

  const handleSelect = (category: string) => {
    // Convert display label to backend value
    const backendValue = getCategoryValue(category);
    onChange(backendValue);
    setDisplayValue(category);
    setIsOpen(false);
  };

  const createCategoryMutation = useInventoryCreateCategory();

  const handleCreateNew = async () => {
    const newCategory = displayValue.trim();
    if (!newCategory) return;

    try {
      await createCategoryMutation.mutateAsync({ data: { name: newCategory } } as any);
      console.log('✅ New category created:', newCategory);
      // Add to local list immediately
      setAllCategories(prev => [...new Set([...prev, newCategory])].sort());
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('Category already exists, using existing:', newCategory);
      } else {
        console.warn('Failed to persist category to API, using locally:', error);
      }
      // Add to local list anyway
      setAllCategories(prev => [...new Set([...prev, newCategory])].sort());
    }

    onChange(newCategory);
    setDisplayValue(newCategory);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    // Try to find matching backend value
    const backendValue = getCategoryValue(inputValue);
    onChange(backendValue);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && filteredCategories.length > 0) {
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
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-300' : 'border-gray-300'
            }`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="category-autocomplete-list"
        />

        {isOpen && (filteredCategories.length > 0 || showCreateNew) && portalRef.current && ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            id="category-autocomplete-list"
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
                Kategoriler yüklenirken hata oluştu.
              </div>
            )}

            {!isLoading && !isError && filteredCategories.map((category, index) => (
              <div
                key={index}
                role="option"
                tabIndex={0}
                onClick={() => handleSelect(category)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(category);
                  }
                }}
                className="px-4 py-2 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{category}</span>
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
                    "{displayValue}" kategorisini ekle
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

export default CategoryAutocomplete;

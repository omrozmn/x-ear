import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import axios from 'axios';
import { Input } from '@x-ear/ui-web';

const api = axios.create({
  baseURL: 'http://localhost:5003'
});

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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Common product categories
  const categories = [
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

  useEffect(() => {
    if (value && isOpen) {
      const filtered = categories.filter(category =>
        category.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategories(filtered.slice(0, 10));
    } else if (isOpen) {
      setFilteredCategories(categories.slice(0, 10));
    } else {
      setFilteredCategories([]);
    }
  }, [value, isOpen]);

  // Check if current value is an exact match
  const hasExactMatch = categories.some(cat => cat.toLowerCase() === value.toLowerCase());
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
  };

  const handleCreateNew = async () => {
    const newCategory = value.trim();
    if (!newCategory) return;

    try {
      // Try to save to backend
      await api.post('/api/device-categories', { category: newCategory });
      console.log('New category created:', newCategory);
    } catch (error: any) {
      // If 409 conflict (already exists), silently use it
      if (error.response?.status === 409) {
        console.log('Category already exists, using existing:', newCategory);
      } else {
        console.warn('Failed to persist category to API, using locally:', error);
      }
    }
    
    // Use the category regardless of backend success
    onChange(newCategory);
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
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="category-autocomplete-list"
        />
        
        {isOpen && (filteredCategories.length > 0 || showCreateNew) && (
          <div
            ref={dropdownRef}
            id="category-autocomplete-list"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
            role="listbox"
          >
            {filteredCategories.map((category, index) => (
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
                    "{value}" kategorisini ekle
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default CategoryAutocomplete;

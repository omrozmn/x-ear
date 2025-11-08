import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import axios from 'axios';
import { Input } from '@x-ear/ui-web';

const api = axios.create({
  baseURL: 'http://localhost:5003'
});

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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Common hearing aid brands
  const brands = [
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
    'Audika',
    'Hear Clear',
    'Beltone',
    'Miracle-Ear',
    'Connect Hearing',
    'Audiology',
    'Hearing Life',
    'HearingPlanet',
    'Siemens',
    'Interton',
    'Audio Service',
    'Rexton',
    'Coselgi',
    'Audifon',
    'Bellman',
    'Cochlear',
    'Med-El',
    'Advanced Bionics',
    'Nurotron',
    'Oticon Medical',
    'Sennheiser',
    'Sony',
    'Bose',
    'Jabra',
    'Eargo',
    'Lively',
    'Audicus',
    'MDHearing'
  ];

  useEffect(() => {
    if (value && isOpen) {
      const filtered = brands.filter(brand =>
        brand.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredBrands(filtered.slice(0, 10));
    } else if (isOpen) {
      setFilteredBrands(brands.slice(0, 10));
    } else {
      setFilteredBrands([]);
    }
  }, [value, isOpen]);

  // Check if current value is an exact match
  const hasExactMatch = brands.some(brand => brand.toLowerCase() === value.toLowerCase());
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

  const handleSelect = (brand: string) => {
    onChange(brand);
    setIsOpen(false);
  };

  const handleCreateNew = async () => {
    const newBrand = value.trim();
    if (!newBrand) return;

    try {
      await api.post('/api/inventory/brands', { name: newBrand });
      console.log('New brand created:', newBrand);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('Brand already exists, using existing:', newBrand);
      } else {
        console.warn('Failed to persist brand to API, using locally:', error);
      }
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
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="brand-autocomplete-list"
        />
        
        {isOpen && (filteredBrands.length > 0 || showCreateNew) && (
          <div
            ref={dropdownRef}
            id="brand-autocomplete-list"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
            role="listbox"
          >
            {filteredBrands.map((brand, index) => (
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
        )}
      </div>
      
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default BrandAutocomplete;

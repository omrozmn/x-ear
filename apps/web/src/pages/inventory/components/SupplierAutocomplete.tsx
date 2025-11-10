import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import axios from 'axios';
import { Input, Button } from '@x-ear/ui-web';

const api = axios.create({
  baseURL: 'http://localhost:5003'
});

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
  const [filteredSuppliers, setFilteredSuppliers] = useState<string[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Load suppliers from API
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        // Try to load from suppliers endpoint first
        const suppliersResponse = await api.get('/api/suppliers?per_page=1000');
        if (suppliersResponse.data.success && Array.isArray(suppliersResponse.data.data)) {
          const suppliers = suppliersResponse.data.data.map((s: any) => s.companyName).filter(Boolean);
          const combined = [...new Set([...suppliers, ...defaultSuppliers])];
          setAllSuppliers(combined.sort());
          return;
        }
      } catch (error) {
        console.warn('Failed to load from suppliers endpoint, trying inventory:', error);
      }

      // Fallback to inventory endpoint
      try {
        const response = await api.get('/api/inventory');
        if (response.data.success && Array.isArray(response.data.data)) {
          const items = response.data.data;
          const suppliers = [...new Set(items.map((item: any) => item.supplier).filter(Boolean))] as string[];
          const combined = [...new Set([...suppliers, ...defaultSuppliers])];
          setAllSuppliers(combined.sort());
        } else {
          setAllSuppliers(defaultSuppliers);
        }
      } catch (error) {
        console.warn('Failed to load suppliers from API, using defaults:', error);
        setAllSuppliers(defaultSuppliers);
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    const suppliers = allSuppliers.length > 0 ? allSuppliers : defaultSuppliers;
    if (value && isOpen) {
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
      
      const normalizedValue = normalizeTurkish(value);
      
      const scored = suppliers.map(supplier => {
        const normalizedSupplier = normalizeTurkish(supplier);
        let score = 0;
        
        if (normalizedSupplier === normalizedValue) score = 100;
        else if (normalizedSupplier.startsWith(normalizedValue)) score = 90;
        else if (normalizedSupplier.includes(normalizedValue)) score = 70;
        else {
          let matches = 0;
          for (const char of normalizedValue) {
            if (normalizedSupplier.includes(char)) matches++;
          }
          score = (matches / normalizedValue.length) * 50;
        }
        
        return { supplier, score };
      });
      
      const filtered = scored
        .filter(item => item.score > 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(item => item.supplier);
      
      setFilteredSuppliers(filtered);
    } else if (isOpen) {
      setFilteredSuppliers(suppliers.slice(0, 8));
    } else {
      setFilteredSuppliers([]);
    }
  }, [value, isOpen, allSuppliers]);

  // Check if current value is an exact match
  const suppliers = allSuppliers.length > 0 ? allSuppliers : defaultSuppliers;
  const hasExactMatch = suppliers.some(sup => sup.toLowerCase() === value.toLowerCase());
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

  const handleCreateNew = async () => {
    const newSupplier = value.trim();
    if (!newSupplier) return;

    try {
      const response = await api.post('/api/suppliers', { company_name: newSupplier });
      console.log('✅ New supplier created:', newSupplier);
      // Add to local list immediately
      setAllSuppliers(prev => [...new Set([...prev, newSupplier])].sort());
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log('Supplier already exists, using existing:', newSupplier);
        // Still add to local list
        setAllSuppliers(prev => [...new Set([...prev, newSupplier])].sort());
      } else {
        console.warn('Failed to persist supplier to API, using locally:', error);
        // Add to local list anyway
        setAllSuppliers(prev => [...new Set([...prev, newSupplier])].sort());
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
          className="pr-8"
        />
        
        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none mt-6">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
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
      {isOpen && (filteredSuppliers.length > 0 || showCreateNew) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredSuppliers.map((supplier, index) => (
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
                <svg className="w-4 h-4 text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd"/>
                  <path d="M6 8h8v2H6V8zm0 4h8v2H6v-2z"/>
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
              className="px-4 py-2 cursor-pointer bg-green-50 hover:bg-green-100 focus:bg-green-100 focus:outline-none transition-colors border-t border-gray-200"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  "{value}" tedarikçisini ekle
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
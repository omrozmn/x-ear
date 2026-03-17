import React, { useState, useRef, useEffect } from 'react';
import { Search, Package, Tag, DollarSign } from 'lucide-react';
import { Input } from '@x-ear/ui-web';
import { useFuzzySearch } from '../../hooks/useFuzzySearch';
import { useTranslation } from 'react-i18next';

export interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
}

interface ProductSearchProps {
  products: Product[];
  onSelect: (product: Product) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  value?: Product | null;
}

export function ProductSearch({
  products,
  onSelect,
  placeholder,
  className = "",
  disabled = false,
  value
}: ProductSearchProps) {
  const { t } = useTranslation('common');
  const actualPlaceholder = placeholder || t('search_placeholder_product');
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.name || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { results, search, clearSearch, hasResults } = useFuzzySearch(products, {
    threshold: 0.3,
    maxDistance: 3,
    keys: ['name', 'brand', 'model', 'category', 'description'],
    minLength: 1
  });

  // Update input value when external value changes
  useEffect(() => {
    setInputValue(value?.name || '');
  }, [value]);

  // Close dropdown when clicking outside
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    search(newValue);
    setIsOpen(true);
  };

  const handleProductSelect = (product: Product) => {
    setInputValue(product.name);
    setIsOpen(false);
    clearSearch();
    onSelect(product);
  };

  const handleInputFocus = () => {
    if (inputValue) {
      search(inputValue);
    }
    setIsOpen(true);
  };

  const getCategoryDisplayName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'hearing_aid': t('categories.hearing_aid'),
      'aksesuar': t('categories.accessory'),
      'accessory': t('categories.accessory'),
      'pil': t('categories.battery'),
      'battery': t('categories.battery'),
      'bakim': t('categories.maintenance'),
      'maintenance': t('categories.maintenance'),
      'ear_mold': t('categories.ear_mold'),
      'device': t('categories.device')
    };
    return categoryMap[category] || category || t('categories.undefined');
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: t('product.out_of_stock'), color: 'text-destructive' };
    if (stock < 5) return { text: t('product.stock_left', { count: stock }), color: 'text-orange-600' };
    return { text: t('product.stock', { count: stock }), color: 'text-success' };
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={actualPlaceholder}
          disabled={disabled}
          className="pl-10 pr-4"
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full bg-card border border-border rounded-2xl shadow-lg mt-1 max-h-80 overflow-y-auto"
        >
          {hasResults ? (
            <div className="py-1">
              {results.map(({ item: product, score }) => {
                const stockStatus = getStockStatus(product.stock);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {product.name}
                          </h4>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {Math.round(score * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {product.brand} {product.model}
                          </span>
                          <span className="bg-primary/10 text-blue-800 px-2 py-1 rounded">
                            {getCategoryDisplayName(product.category)}
                          </span>
                        </div>

                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 ml-4">
                        <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                          <DollarSign className="w-3 h-3" />
                          {formatPrice(product.price)}
                        </div>
                        <span className={`text-xs ${stockStatus.color}`}>
                          {stockStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {inputValue ? t('no_results') : t('type_to_search')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductSearch;
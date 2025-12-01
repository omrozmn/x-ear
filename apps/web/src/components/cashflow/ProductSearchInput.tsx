/**
 * ProductSearchInput Component
 * Reusable product/inventory search with autocomplete and info card
 */
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@x-ear/ui-web';
import { Search, X, Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customInstance } from '../../api/orval-mutator';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  price?: number;
  cost?: number;
  vatIncludedPrice?: number;
  availableInventory?: number;
  totalInventory?: number;
  brand?: string;
  model?: string;
  barcode?: string;
  availableSerials?: string[];
}

interface ProductSearchInputProps {
  selectedProduct: InventoryItem | null;
  onSelectProduct: (product: InventoryItem | null) => void;
  onPriceSelect?: (price: number) => void;
  onAmountClear?: () => void;
  // If true, render a small action button next to each search result
  showReplaceButton?: boolean;
  // Handler for the replace button when rendered per-item
  onReplaceClick?: (product: InventoryItem) => void;
  className?: string;
}

export function ProductSearchInput({
  selectedProduct,
  onSelectProduct,
  onPriceSelect,
  onAmountClear,
  showReplaceButton = false,
  onReplaceClick,
  className = '',
}: ProductSearchInputProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-items', search],
    queryFn: async () => {
      if (search.length < 2) return { data: [] };
      const response = await customInstance<{ data: InventoryItem[] }>({
        url: `/api/inventory?search=${search}&per_page=10`,
        method: 'GET',
      });
      return response.data;
    },
    enabled: search.length >= 2,
  });

  const items = inventoryData?.data || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemoveProduct = () => {
    onSelectProduct(null);
    if (onAmountClear) {
      onAmountClear();
    }
  };

  if (selectedProduct) {
    return (
      <div className="space-y-3">
        {/* Selected Product Header */}
        <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-purple-900">{selectedProduct.name}</p>
              {selectedProduct.sku && (
                <p className="text-sm text-purple-700">SKU: {selectedProduct.sku}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveProduct}
            className="text-purple-600 hover:text-purple-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Info Card */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Price Info */}
          {selectedProduct.price && (
            <div className="flex items-start space-x-2">
              <DollarSign className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Fiyat</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedProduct.price.toLocaleString('tr-TR')} ₺
                </p>
              </div>
            </div>
          )}

          {/* VAT Included Price */}
          {selectedProduct.vatIncludedPrice && (
            <div className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">KDV Dahil</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedProduct.vatIncludedPrice.toLocaleString('tr-TR')} ₺
                </p>
              </div>
            </div>
          )}

          {/* Stock Info */}
          {selectedProduct.availableInventory !== undefined && (
            <div className="flex items-start space-x-2">
              <Package className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Stok</p>
                <p className={`text-sm font-medium ${selectedProduct.availableInventory > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {selectedProduct.availableInventory} adet
                </p>
              </div>
            </div>
          )}

          {/* Brand/Model */}
          {(selectedProduct.brand || selectedProduct.model) && (
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Marka/Model</p>
                <p className="text-sm font-medium text-gray-900">
                  {[selectedProduct.brand, selectedProduct.model].filter(Boolean).join(' ')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        fullWidth
        placeholder="Ürün adı veya SKU ile ara..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        className="pl-10"
      />
      {showResults && search.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => {
                    onSelectProduct(item);
                    setSearch('');
                    setShowResults(false);
                    if (item.price && onPriceSelect) {
                      onPriceSelect(item.price);
                    }
                  }}>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {[
                        item.sku && `SKU: ${item.sku}`,
                        item.brand,
                        item.availableInventory !== undefined && `Stok: ${item.availableInventory}`,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>

                  <div className="ml-3 text-right flex items-center gap-2">
                    {item.price && (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.price} ₺</p>
                        {item.vatIncludedPrice && (
                          <p className="text-xs text-gray-500">KDV: {item.vatIncludedPrice} ₺</p>
                        )}
                      </div>
                    )}
                    {showReplaceButton && onReplaceClick && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onReplaceClick(item);
                        }}
                        className="product-search-replace-button inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded"
                      >
                        Değiştir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-gray-500">Ürün bulunamadı</div>
          )}
        </div>
      )}
    </div>
  );
}

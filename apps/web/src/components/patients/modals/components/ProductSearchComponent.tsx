import React from 'react';
import { 
  Input, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Badge
} from '@x-ear/ui-web';
import { Search, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  stock: number;
  serialNumber?: string;
  barcode?: string;
  sgkSupported: boolean;
  sgkCode?: string;
}

interface ProductSearchComponentProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchResults: Product[];
  selectedProduct: Product | null;
  onProductSelect: (product: Product) => void;
  isSearching: boolean;
  showResults: boolean;
}

export const ProductSearchComponent: React.FC<ProductSearchComponentProps> = ({
  searchTerm,
  onSearchChange,
  searchResults,
  selectedProduct,
  onProductSelect,
  isSearching,
  showResults
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Search className="w-5 h-5 mr-2 text-green-600" />
          Ürün Seçimi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Search */}
        <div className="relative">
          <div className="relative">
            <Input
              type="text"
              placeholder="Ürün adı, marka, model veya barkod ile arayın..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isSearching && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => onProductSelect(product)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-600">
                        {product.brand} - {product.model}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <Badge variant={product.stock > 0 ? 'success' : 'danger'} size="sm">
                          Stok: {product.stock}
                        </Badge>
                        {product.sgkSupported && (
                          <Badge variant="primary" size="sm">
                            SGK
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">{product.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(product.salePrice)}
                      </div>
                      {product.listPrice > product.salePrice && (
                        <div className="text-xs text-gray-500 line-through">
                          {formatCurrency(product.listPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Product Display */}
        {selectedProduct && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-green-800">{selectedProduct.name}</div>
                <div className="text-sm text-green-700">
                  {selectedProduct.brand} - {selectedProduct.model}
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant={selectedProduct.stock > 0 ? 'success' : 'danger'} size="sm">
                    Stok: {selectedProduct.stock}
                  </Badge>
                  {selectedProduct.sgkSupported && (
                    <Badge variant="primary" size="sm">
                      SGK Destekli
                    </Badge>
                  )}
                  {selectedProduct.serialNumber && (
                    <span className="text-xs text-green-600">
                      SN: {selectedProduct.serialNumber}
                    </span>
                  )}
                  {selectedProduct.barcode && (
                    <span className="text-xs text-green-600">
                      Barkod: {selectedProduct.barcode}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-700 text-lg">
                  {formatCurrency(selectedProduct.salePrice)}
                </div>
                {selectedProduct.listPrice > selectedProduct.salePrice && (
                  <div className="text-sm text-green-600 line-through">
                    {formatCurrency(selectedProduct.listPrice)}
                  </div>
                )}
                <div className="text-xs text-green-600 mt-1">
                  KDV: %{selectedProduct.vatRate}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductSearchComponent;
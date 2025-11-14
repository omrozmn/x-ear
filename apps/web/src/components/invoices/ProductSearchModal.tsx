import { Input, Button } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  code?: string;
  brand?: string;
  model?: string;
  price?: number;
  stockQuantity?: number;
  unit?: string;
  taxRate?: number;
}

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}

export function ProductSearchModal({ isOpen, onClose, onSelect }: ProductSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setProducts([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchProducts();
    } else {
      setProducts([]);
    }
  }, [searchQuery]);

  const searchProducts = async () => {
    setIsLoading(true);
    try {
      // TODO: API entegrasyonu
      // const response = await fetch(`/api/products/search?q=${searchQuery}`);
      // const data = await response.json();
      // setProducts(data);
      
      // Mock data
      setProducts([
        {
          id: '1',
          name: 'Phonak Audeo Paradise P90-R',
          code: 'PHO-P90-R',
          brand: 'Phonak',
          model: 'Audeo Paradise P90-R',
          price: 45000,
          stockQuantity: 5,
          unit: 'Adet',
          taxRate: 18
        },
        {
          id: '2',
          name: 'Oticon More 1',
          code: 'OTI-MORE-1',
          brand: 'Oticon',
          model: 'More 1',
          price: 42000,
          stockQuantity: 3,
          unit: 'Adet',
          taxRate: 18
        }
      ]);
    } catch (error) {
      console.error('Ürün arama hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (product: Product) => {
    onSelect(product);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Ürün Ara
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none">
                <span className="text-2xl">×</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4">
            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ürün adı, kodu veya markası ile arayın..."
                  className="w-full pl-10"
                  autoFocus
                />
                <span className="absolute left-3 top-3 text-gray-400">
                  🔍
                </span>
                {isLoading && (
                  <span className="absolute right-3 top-3 text-gray-400">
                    <i className="fa fa-spinner fa-spin"></i>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                En az 2 karakter girerek ürün arayabilirsiniz
              </p>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {products.length > 0 ? (
                <div className="space-y-2">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelect(product)}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 space-x-3">
                            {product.code && (
                              <span>Kod: {product.code}</span>
                            )}
                            {product.brand && (
                              <span>Marka: {product.brand}</span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center space-x-4 text-sm">
                            {product.price && (
                              <span className="text-green-600 font-medium">
                                {product.price.toLocaleString('tr-TR', {
                                  style: 'currency',
                                  currency: 'TRY'
                                })}
                              </span>
                            )}
                            {product.stockQuantity !== undefined && (
                              <span className={`${
                                product.stockQuantity > 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                Stok: {product.stockQuantity} {product.unit || 'Adet'}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-blue-600 text-xl">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 && !isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Ürün bulunamadı. Manuel olarak girebilirsiniz.
                  </p>
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    Ürün aramak için en az 2 karakter girin
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={onClose}
                variant="default"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                İptal
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductSearchModal;

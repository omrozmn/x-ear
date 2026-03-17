import React, { useState, useRef } from 'react';
import { Button, Input, Card, CardContent } from '@x-ear/ui-web';
import { Search, Trash2 } from 'lucide-react';
import type { InventoryItemRead } from '@/api/generated/schemas';

type InventoryItem = InventoryItemRead;

interface SaleItem {
  id: string;
  product: InventoryItem | null;
  quantity: number;
  price: number;
  kdvRate: number;
  discount: number;
  total: number;
}

interface SaleItemRowProps {
  item: SaleItem;
  index: number;
  products: InventoryItem[];
  onUpdate: (updates: Partial<SaleItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
  searchProducts: (term: string) => InventoryItem[];
}

export function SaleItemRow({ item, index, onUpdate, onRemove, canRemove, searchProducts }: SaleItemRowProps) {
  // products parameter removed - not used (searchProducts function used instead)
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<InventoryItem[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleProductSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length >= 2) {
      const results = searchProducts(term);
      setFilteredProducts(results);
    } else {
      setFilteredProducts([]);
    }
  };

  const selectProduct = (product: InventoryItem) => {
    onUpdate({
      product,
      price: product.price || 0,
      kdvRate: product.vatRate || 18
    });
    setShowProductSearch(false);
    setSearchTerm('');
    setFilteredProducts([]);
  };

  const calculateItemTotal = () => {
    const subtotal = item.quantity * item.price;
    const discountAmount = subtotal * (item.discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (item.kdvRate / 100);
    return afterDiscount + taxAmount;
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-foreground">Ürün {index + 1}</h4>
          {canRemove && (
            <Button
              type="button"
              onClick={onRemove}
              size="sm"
              className="text-destructive hover:text-red-800 hover:bg-destructive/10"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>

        {/* Ürün Seçimi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <label className="block text-sm font-medium text-foreground mb-1">
              Ürün Ara
            </label>
            <div className="relative">
              <Input
                ref={searchRef}
                type="text"
                placeholder="Ürün adı, barkod veya kategori..."
                value={searchTerm}
                onChange={(e) => handleProductSearch(e.target.value)}
                onFocus={() => setShowProductSearch(true)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            </div>

            {/* Ürün Arama Sonuçları */}
            {showProductSearch && filteredProducts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => selectProduct(product)}
                    className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                  >
                    <div className="font-medium text-foreground">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.brand} - {product.model} | Stok: {product.availableInventory}
                    </div>
                    <div className="text-sm font-medium text-primary">
                      {product.price?.toLocaleString('tr-TR')} TL
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seçili Ürün Bilgisi */}
          {item.product && (
            <div className="bg-primary/10 p-3 rounded-2xl">
              <div className="font-medium text-blue-900">{item.product.name}</div>
              <div className="text-sm text-primary">
                {item.product.brand} - {item.product.model}
              </div>
              <div className="text-sm text-primary">
                Stok: {item.product.availableInventory} | KDV: %{item.product.vatRate}
              </div>
            </div>
          )}
        </div>

        {/* Miktar, Fiyat, İndirim */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Miktar
            </label>
            <Input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Birim Fiyat (TL)
            </label>
            <Input
              type="number"
              step="0.01"
              value={item.price}
              onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              İndirim (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={item.discount}
              onChange={(e) => onUpdate({ discount: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              KDV (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={item.kdvRate}
              onChange={(e) => onUpdate({ kdvRate: parseFloat(e.target.value) || 18 })}
            />
          </div>
        </div>

        {/* Toplam */}
        <div className="flex justify-end">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Toplam</div>
            <div className="text-lg font-bold text-foreground">
              {calculateItemTotal().toLocaleString('tr-TR')} TL
            </div>
          </div>
        </div>

        {/* Ürün Detayları */}
        {item.product && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div><span className="text-muted-foreground">Marka:</span> <span className="font-medium ml-1">{item.product.brand}</span></div>
              <div><span className="text-muted-foreground">Model:</span> <span className="font-medium ml-1">{item.product.model}</span></div>
              <div><span className="text-muted-foreground">Kategori:</span> <span className="font-medium ml-1">{item.product.category}</span></div>
              <div><span className="text-muted-foreground">Stok:</span> <span className="font-medium ml-1">{item.product.availableInventory}</span></div>
              <div><span className="text-muted-foreground">Barkod:</span> <span className="font-medium ml-1 font-mono text-xs">{item.product.barcode}</span></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { SaleItem, SaleItemRowProps };
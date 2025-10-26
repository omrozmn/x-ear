import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useToastHelpers } from '@x-ear/ui-web';
import { PatientApiService } from '../../../services/patient/patient-api.service';
import { inventoryGetInventoryItems } from '../../../types/generated/api';
import { InventoryItem, InventoryGetInventoryItems200 } from '../../../types/generated/api';

// Product interface for the dropdown - mapped from InventoryItem
interface Product {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  price: number;
  stock?: number;
}

// Convert InventoryItem to Product interface
const mapInventoryItemToProduct = (item: InventoryItem): Product => ({
  id: item.id || '',
  name: item.name,
  category: item.category,
  brand: item.brand,
  price: item.price,
  stock: item.availableInventory || item.inventory || 0
});

// Searchable Product Dropdown Component
interface ProductDropdownProps {
  selectedProduct: Product | null;
  onProductSelect: (product: Product | null) => void;
  placeholder?: string;
}

const ProductDropdown: React.FC<ProductDropdownProps> = ({ 
  selectedProduct, 
  onProductSelect, 
  placeholder = "Ürün seçin veya arayın..." 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const response = await inventoryGetInventoryItems();
        const inventoryData = response.data as InventoryGetInventoryItems200;
        
        if (inventoryData.data) {
          const productList = inventoryData.data.map(mapInventoryItemToProduct);
          setProducts(productList);
          setFilteredProducts(productList);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
        // Fallback to empty array on error
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(searchLower) ||
          product.category?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setSearchTerm(product.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (!e.target.value) {
      onProductSelect(null);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setSearchTerm('');
    onProductSelect(null);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {/* Search Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Clear Button */}
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {product.category} • {product.brand}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-medium text-gray-900">₺{product.price.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Stok: {product.stock}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-500 text-center">
              <div className="text-sm">Ürün bulunamadı</div>
              <div className="text-xs mt-1">Farklı anahtar kelimeler deneyin</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface PatientSaleFormProps {
  patientId?: string;
  onSaleComplete?: () => void;
}

export const PatientSaleFormRefactored: React.FC<PatientSaleFormProps> = ({
  patientId,
  onSaleComplete
}) => {
  const patientApiService = useMemo(() => new PatientApiService(), []);
  const { success, error } = useToastHelpers();
  
  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [sgkStatus, setSgkStatus] = useState<boolean>(false);
  const [sgkAmount, setSgkAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Update unit price when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(selectedProduct.price);
    } else {
      setUnitPrice(0);
    }
  }, [selectedProduct]);

  // Helper function to get KDV rate based on category
  const getKdvRate = (category: string | undefined): number => {
    if (!category) return 20;
    
    // Hearing aids have 0% KDV, others have 20%
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('işitme') || lowerCategory.includes('hearing') || 
        lowerCategory.includes('cihaz') || lowerCategory.includes('aid')) {
      return 0;
    }
    return 20;
  };

  // Pricing calculation with discount and SGK
  const pricingCalculation = useMemo(() => {
    const basePrice = quantity * unitPrice;
    const netAmount = Math.max(0, basePrice - discountAmount);
    const kdvRate = selectedProduct ? getKdvRate(selectedProduct.category) : 20;
    const kdvAmount = (netAmount * kdvRate) / 100;
    const totalWithKdv = netAmount + kdvAmount;
    const sgkCoverage = sgkStatus ? sgkAmount : 0;
    const finalAmount = totalWithKdv - sgkCoverage;

    return {
      basePrice,
      netAmount,
      kdvRate,
      kdvAmount,
      totalWithKdv,
      sgkCoverage,
      finalAmount
    };
  }, [quantity, unitPrice, discountAmount, selectedProduct, sgkStatus, sgkAmount]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return pricingCalculation.finalAmount;
  }, [pricingCalculation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      alert('Lütfen bir ürün seçin');
      return;
    }

    if (quantity <= 0) {
      alert('Miktar 0\'dan büyük olmalıdır');
      return;
    }

    if (unitPrice <= 0) {
      alert('Birim fiyat 0\'dan büyük olmalıdır');
      return;
    }

    try {
      const saleData = {
        devices: [{
          inventoryId: selectedProduct.id,
          id: selectedProduct.id,
          name: selectedProduct.name,
          category: selectedProduct.category || '',
          brand: selectedProduct.brand || '',
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: pricingCalculation.basePrice,
          listPrice: unitPrice,
          ear: 'both', // Default ear side
          discountType: discountAmount > 0 ? 'amount' : 'none',
          discountValue: discountAmount,
          notes: notes
        }],
        paymentMethod,
        saleDate,
        notes,
        totalAmount: pricingCalculation.finalAmount,
        paidAmount: pricingCalculation.finalAmount,
        sgkScheme: sgkStatus ? 'standard' : 'none',
        sgkAmount: sgkStatus ? sgkAmount : 0,
        discount: discountAmount
      };

      await patientApiService.createSale(patientId || '', saleData);
      
      // Reset form
      resetForm();
      
      success('Satış başarıyla kaydedildi!');
      
      if (onSaleComplete) {
        onSaleComplete();
      }
    } catch (err) {
      console.error('Satış kaydedilirken hata:', err);
      error('Satış kaydedilirken bir hata oluştu');
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice(0);
    setDiscountAmount(0);
    setSgkStatus(false);
    setSgkAmount(0);
    setPaymentMethod('cash');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Ürün Satışı</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ürün Seçimi *
          </label>
          <ProductDropdown
            selectedProduct={selectedProduct}
            onProductSelect={setSelectedProduct}
            placeholder="Ürün adı, kategori veya marka ile arayın..."
          />
        </div>

        {/* Quantity and Unit Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Miktar *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Birim Fiyat (₺) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Discount Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İndirim Tutarı (₺)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="İndirim tutarını girin..."
          />
        </div>

        {/* SGK Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="sgk-status"
              checked={sgkStatus}
              onChange={(e) => setSgkStatus(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="sgk-status" className="ml-2 block text-sm font-medium text-gray-700">
              SGK Kapsamında
            </label>
          </div>
          
          {sgkStatus && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SGK Karşılama Tutarı (₺)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sgkAmount}
                onChange={(e) => setSgkAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SGK karşılama tutarını girin..."
              />
            </div>
          )}
        </div>

        {/* Product Details Display */}
        {selectedProduct && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Ürün Detayları</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Marka:</span>
                <span className="ml-2 text-blue-600">{selectedProduct.brand || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Model:</span>
                <span className="ml-2 text-blue-600">{selectedProduct.name || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Kategori:</span>
                <span className="ml-2 text-blue-600">{selectedProduct.category || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Liste Fiyatı:</span>
                <span className="ml-2 text-blue-600">₺{selectedProduct.price.toLocaleString('tr-TR')}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Stok:</span>
                <span className={`ml-2 font-medium ${
                  (selectedProduct.stock || 0) === 0 ? 'text-red-600' : 
                  (selectedProduct.stock || 0) <= 5 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {selectedProduct.stock || 0} adet
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-700">KDV Oranı:</span>
                <span className="ml-2 text-blue-600">%{getKdvRate(selectedProduct.category)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Pricing Breakdown */}
        {selectedProduct && (
          <div className="space-y-4">
            {/* Discount Section */}
            {discountAmount > 0 && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex justify-between items-center">
                  <span className="text-red-700 font-medium">İndirim Uygulandı</span>
                  <span className="text-red-700 font-bold">-₺{discountAmount.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            )}

            {/* SGK Coverage Section */}
            {sgkStatus && sgkAmount > 0 && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-medium">SGK Karşılaması</span>
                  <span className="text-green-700 font-bold">-₺{sgkAmount.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            )}
            
            {/* Total Amount Breakdown */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-blue-900 text-lg">Toplam Tutar</span>
                <span className="font-bold text-blue-600 text-xl">₺{pricingCalculation.finalAmount.toLocaleString('tr-TR')}</span>
              </div>
              
              {/* Components Breakdown */}
              <div className="border-t border-blue-200 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-blue-700">
                  <span>Liste Fiyatı ({quantity} x ₺{unitPrice.toLocaleString('tr-TR')}):</span>
                  <span>₺{pricingCalculation.basePrice.toLocaleString('tr-TR')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-blue-700">
                    <span>İndirim:</span>
                    <span>-₺{discountAmount.toLocaleString('tr-TR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-blue-700">
                  <span>KDV (%{pricingCalculation.kdvRate}):</span>
                  <span>₺{pricingCalculation.kdvAmount.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between text-sm text-blue-700 font-medium border-t border-blue-200 pt-1">
                  <span>KDV Dahil Toplam:</span>
                  <span>₺{pricingCalculation.totalWithKdv.toLocaleString('tr-TR')}</span>
                </div>
                {sgkStatus && sgkAmount > 0 && (
                  <div className="flex justify-between text-sm text-blue-700">
                    <span>SGK Karşılaması:</span>
                    <span>-₺{sgkAmount.toLocaleString('tr-TR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Total Amount Display */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-700">Toplam Tutar:</span>
            <span className="text-2xl font-bold text-blue-600">₺{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ödeme Yöntemi *
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="cash">Nakit</option>
            <option value="credit_card">Kredi Kartı</option>
            <option value="bank_transfer">Banka Transferi</option>
            <option value="installment">Taksit</option>
          </select>
        </div>

        {/* Sale Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Satış Tarihi *
          </label>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notlar
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Satışla ilgili notlar..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Satışı Kaydet
          </button>
          
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Temizle
          </button>
        </div>
      </form>
    </div>
  );
};
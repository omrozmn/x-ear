import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useToastHelpers } from '@x-ear/ui-web';
import { PatientApiService } from '../../../services/patient/patient-api.service';
import { getAllInventory } from '@/api/generated';
import { unwrapArray } from '../../../utils/response-unwrap';

// InventoryItem type definition (since schema may not export it directly)
interface InventoryItem {
  id?: string;
  name: string;
  category?: string;
  brand?: string;
  price: number;
  availableInventory?: number;
  inventory?: number;
}

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
        const response = await getAllInventory();
        const inventoryItems = unwrapArray<InventoryItem>(response);
        const productList = inventoryItems.map(mapInventoryItemToProduct);
        setProducts(productList);
        setFilteredProducts(productList);
      } catch (error) {
        console.error('Failed to load products:', error);
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
  const { success, error, warning } = useToastHelpers();

  // SGK Support Options
  const sgkSupportOptions = [
    { value: '', label: 'SGK desteği seçiniz' },
    { value: 'no_coverage', label: 'SGK Desteği Yok' },
    { value: 'under4_parent_working', label: '4 Yaş Altı (Veli Çalışan)' },
    { value: 'under4_parent_retired', label: '4 Yaş Altı (Veli Emekli)' },
    { value: 'age5_12_parent_working', label: '5-12 Yaş (Veli Çalışan)' },
    { value: 'age5_12_parent_retired', label: '5-12 Yaş (Veli Emekli)' },
    { value: 'age13_18_parent_working', label: '13-18 Yaş (Veli Çalışan)' },
    { value: 'age13_18_parent_retired', label: '13-18 Yaş (Veli Emekli)' },
    { value: 'over18_working', label: '18+ Yaş (Çalışan)' },
    { value: 'over18_retired', label: '18+ Yaş (Emekli)' }
  ];

  const sgkFallbackValues: Record<string, number> = {
    'no_coverage': 0,
    'under4_parent_working': 6104.44,
    'under4_parent_retired': 7630.56,
    'age5_12_parent_working': 5426.17,
    'age5_12_parent_retired': 6782.72,
    'age13_18_parent_working': 5087.04,
    'age13_18_parent_retired': 6358.88,
    'over18_working': 3391.36,
    'over18_retired': 4239.20
  };

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [sgkSupportType, setSgkSupportType] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [isCollectedAmountManuallySet, setIsCollectedAmountManuallySet] = useState<boolean>(false);
  const [reportStatus, setReportStatus] = useState<string>('no_report');

  // Determine if product is a hearing aid
  const isHearingAid = useMemo(() => {
    if (!selectedProduct?.category) return false;
    const cat = selectedProduct.category.toLowerCase();
    return cat.includes('işitme') || cat.includes('hearing') || cat.includes('cihaz') || cat.includes('aid');
  }, [selectedProduct]);

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

    // Calculate Discount
    let calculatedDiscount = 0;
    if (discountType === 'percentage') {
      calculatedDiscount = (basePrice * discountInput) / 100;
    } else {
      calculatedDiscount = discountInput;
    }

    const netAmount = Math.max(0, basePrice - calculatedDiscount);
    const kdvRate = selectedProduct ? getKdvRate(selectedProduct.category) : 20;
    const kdvAmount = (netAmount * kdvRate) / 100;
    const totalWithKdv = netAmount + kdvAmount;

    // Calculate SGK
    let calculatedSgk = 0;
    if (isHearingAid) {
      const schemeAmount = sgkFallbackValues[sgkSupportType] || 0;
      calculatedSgk = Math.min(schemeAmount, totalWithKdv);
    } else {
      calculatedSgk = 0;
    }

    const finalAmount = Math.max(0, totalWithKdv - calculatedSgk);

    return {
      basePrice,
      netAmount,
      kdvRate,
      kdvAmount,
      totalWithKdv,
      sgkCoverage: calculatedSgk,
      discountAmount: calculatedDiscount,
      finalAmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, unitPrice, discountType, discountInput, selectedProduct, sgkSupportType, isHearingAid]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return pricingCalculation.finalAmount;
  }, [pricingCalculation]);

  // Sync collected amount with final amount strictly if not manually modified
  useEffect(() => {
    if (!isCollectedAmountManuallySet) {
      setCollectedAmount(pricingCalculation.finalAmount);
    }
  }, [pricingCalculation.finalAmount, isCollectedAmountManuallySet]);

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
          discountType: discountType,
          discountValue: discountInput,
          notes: notes
        }],
        paymentMethod,
        saleDate,
        notes,
        totalAmount: pricingCalculation.finalAmount,
        paidAmount: collectedAmount,
        sgkScheme: isHearingAid ? sgkSupportType : 'none',
        sgkAmount: pricingCalculation.sgkCoverage,
        discount: pricingCalculation.discountAmount,
        reportStatus: reportStatus
      };

      const response = await patientApiService.createSale(patientId || '', saleData);

      // Reset form
      resetForm();

      if (response.warnings && response.warnings.length > 0) {
        response.warnings.forEach((w: string) => warning('Stok Uyarısı', w));
      }

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
    setDiscountType('amount');
    setDiscountInput(0);
    setSgkSupportType('');
    setPaymentMethod('cash');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-sm">

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Discount Section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İndirim Tipi
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percentage')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="amount">Tutar (₺)</option>
              <option value="percentage">Yüzde (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İndirim Değeri
            </label>
            <input
              type="number"
              min="0"
              step={discountType === 'percentage' ? '1' : '0.01'}
              max={discountType === 'percentage' ? '100' : undefined}
              value={discountInput}
              onChange={(e) => setDiscountInput(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={discountType === 'percentage' ? '%10' : '100.00'}
            />
          </div>
        </div>

        {/* SGK Section - Only for Hearing Aids */}
        {isHearingAid && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SGK Destek Türü
            </label>
            <select
              value={sgkSupportType}
              onChange={(e) => setSgkSupportType(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {sgkSupportOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {sgkSupportType && sgkFallbackValues[sgkSupportType] > 0 && (
              <div className="text-xs text-green-600 mt-1">
                Tahmini SGK Desteği: ₺{sgkFallbackValues[sgkSupportType].toLocaleString('tr-TR')}
              </div>
            )}
          </div>
        )}

        {/* Product Details Display */}
        {selectedProduct && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Ürün Detayları</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="font-medium text-blue-700">Marka:</span>
                <span className="ml-1 text-blue-600 truncate block">{selectedProduct.brand || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Model:</span>
                <span className="ml-1 text-blue-600 truncate block">{selectedProduct.name || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Liste Fiyatı:</span>
                <span className="ml-1 text-blue-600">₺{selectedProduct.price.toLocaleString('tr-TR')}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Stok:</span>
                <span className={`ml-1 font-medium ${(selectedProduct.stock || 0) === 0 ? 'text-red-600' :
                  (selectedProduct.stock || 0) <= 5 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                  {selectedProduct.stock || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Pricing Breakdown */}
        {selectedProduct && (
          <div className="space-y-3">
            {/* Total Amount Breakdown */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-blue-900 text-base">Toplam Tutar</span>
                <span className="font-bold text-blue-600 text-lg">₺{pricingCalculation.finalAmount.toLocaleString('tr-TR')}</span>
              </div>

              {/* Components Breakdown */}
              <div className="border-t border-blue-200 pt-2 space-y-1">
                {/* Simplified breakdown */}
                <div className="flex justify-between text-xs text-blue-700">
                  <span>Ara Toplam:</span>
                  <span className={pricingCalculation.discountAmount > 0 ? "line-through text-gray-400" : ""}>
                    ₺{pricingCalculation.basePrice.toLocaleString('tr-TR')}
                  </span>
                </div>
                {/* Show discounted net amount if there is a discount */}
                {pricingCalculation.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-blue-700 font-medium">
                    <span>İndirimli Tutar:</span>
                    <span>₺{pricingCalculation.netAmount.toLocaleString('tr-TR')}</span>
                  </div>
                )}
                {pricingCalculation.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>İndirim{discountType === 'percentage' && ` (%${discountInput})`}:</span>
                    <span>-₺{pricingCalculation.discountAmount.toLocaleString('tr-TR')}</span>
                  </div>
                )}
                {pricingCalculation.sgkCoverage > 0 && (
                  <div className="flex justify-between text-xs text-green-700 font-medium">
                    <span>SGK Desteği:</span>
                    <span>-₺{pricingCalculation.sgkCoverage.toLocaleString('tr-TR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-blue-700">
                  <span>KDV (%{pricingCalculation.kdvRate}):</span>
                  <span>₺{pricingCalculation.kdvAmount.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method and Sale Date Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
        </div>

        {/* Collected Amount and Report Status Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tahsil Edilen Tutar (₺)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={collectedAmount}
              onChange={(e) => {
                setCollectedAmount(parseFloat(e.target.value) || 0);
                setIsCollectedAmountManuallySet(true);
              }}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-blue-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rapor Durumu
            </label>
            <select
              value={reportStatus}
              onChange={(e) => setReportStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="no_report">Raporsuz Özel Satış</option>
              <option value="report_pending">Rapor Beklemede</option>
              <option value="report_delivered">Rapor Teslim Alındı</option>
              <option value="report_missing">Rapor Eksik</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Satışla ilgili notlar..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Satışı Kaydet
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Temizle
          </button>
        </div>
      </form>
    </div>
  );
};
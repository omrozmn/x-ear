import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useToastHelpers, Button, Input, Select, Textarea } from '@x-ear/ui-web';
import { PartyApiService } from '../../../services/party/party-api.service';
import { listInventory } from '@/api/client/inventory.client';
import { unwrapArray } from '../../../utils/response-unwrap';
import { createPartyTimeline, createPartyActivities } from '@/api/client/timeline.client';

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
  // selectedProduct,
  onProductSelect,
  placeholder = "Ürün seçin veya arayın..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  // const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      // setLoading(true);
      try {
        const response = await listInventory();
        const inventoryItems = unwrapArray<InventoryItem>(response);
        const productList = inventoryItems.map(mapInventoryItemToProduct);
        setProducts(productList);
        setFilteredProducts(productList);
      } catch (error) {
        console.error('Failed to load products:', error);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        // setLoading(false);
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
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          fullWidth
          rightIcon={
            <div className="flex items-center gap-1">
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="p-1 h-auto text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
              )}
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          }
        />
      </div>

      {/* Dropdown */}
      {
        isOpen && (
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
        )
      }
    </div >
  );
};

interface PartySaleFormProps {
  partyId?: string;
  onSaleComplete?: () => void;
}

export const PartySaleFormRefactored: React.FC<PartySaleFormProps> = ({
  partyId,
  onSaleComplete
}) => {
  const partyApiService = useMemo(() => new PartyApiService(), []);
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
  const [ear, setEar] = useState<'left' | 'right' | 'both'>('right'); // Ear selection for hearing aids - default to right
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
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [serialNumberLeft, setSerialNumberLeft] = useState<string>('');
  const [serialNumberRight, setSerialNumberRight] = useState<string>('');

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
    // 1. Base Price
    const basePrice = quantity * unitPrice;

    // 2. KDV setup (Hearing aids 0%, others 20%)
    const kdvRate = selectedProduct ? getKdvRate(selectedProduct.category) : 20;
    const kdvAmount = (basePrice * kdvRate) / 100;

    // 3. Amount with KDV
    const totalWithKdv = basePrice + kdvAmount;

    // 4. Calculate Discount ON the KDV-inclusive amount
    let calculatedDiscount = 0;
    if (discountType === 'percentage') {
      calculatedDiscount = (totalWithKdv * discountInput) / 100;
    } else {
      calculatedDiscount = discountInput;
    }

    // 5. Net Amount is after discount
    const netAmount = Math.max(0, totalWithKdv - calculatedDiscount);

    // Calculate SGK
    let calculatedSgk = 0;
    if (isHearingAid) {
      const schemeAmount = sgkFallbackValues[sgkSupportType] || 0;
      // For bilateral, SGK support is per ear, so multiply by 2
      const sgkMultiplier = ear === 'both' ? 2 : 1;
      const totalSgkSupport = schemeAmount * sgkMultiplier;
      calculatedSgk = Math.min(totalSgkSupport, totalWithKdv);
    } else {
      calculatedSgk = 0;
    }

    const finalAmount = Math.max(0, totalWithKdv - calculatedSgk);

    return {
      basePrice,
      netAmount, // netAmount is now the amount after discount (and KDV) but before SGK
      kdvRate,
      kdvAmount,
      totalWithKdv,
      sgkCoverage: calculatedSgk,
      discountAmount: calculatedDiscount,
      finalAmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, unitPrice, discountType, discountInput, selectedProduct, sgkSupportType, isHearingAid, ear]);

  // Calculate total amount
  // const totalAmount = useMemo(() => {
  //   return pricingCalculation.finalAmount;
  // }, [pricingCalculation]);

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

    if (isHearingAid) {
      if (ear === 'both') {
        if (!serialNumberLeft.trim() || !serialNumberRight.trim()) {
          alert('Bilateral satışlarda sağ ve sol seri numaraları zorunludur');
          return;
        }
      } else if (ear === 'left') {
        // ✅ FIXED: Seri numarası artık zorunlu değil (User Request)
        // if (!serialNumber.trim()) {
        //   alert('Sol kulak için seri numarası zorunludur');
        //   return;
        // }
      } else if (ear === 'right') {
        // ✅ FIXED: Seri numarası artık zorunlu değil (User Request)
        // if (!serialNumber.trim()) {
        //   alert('Sağ kulak için seri numarası zorunludur');
        //   return;
        // }
      }
    }

    try {
      const saleData: any = {
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
          ear: isHearingAid ? ear : 'both', // Use ear state for hearing aids, 'both' for other products
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

      // Add serial numbers based on ear selection
      if (isHearingAid) {
        if (ear === 'both') {
          if (serialNumberLeft) saleData.serialNumberLeft = serialNumberLeft;
          if (serialNumberRight) saleData.serialNumberRight = serialNumberRight;
        } else {
          if (serialNumber) saleData.serialNumber = serialNumber;
        }
      }

      const response = await partyApiService.createSale(partyId || '', saleData);

      // Create timeline and sales logs
      const saleId = (response as any).data?.id || (response as any).id;
      if (saleId && partyId) {
        try {
          const timelineData = {
            type: 'sale',
            title: 'Ürün Satışı Gerçekleştirildi',
            description: `Ürün satışı yapıldı: ${selectedProduct?.brand || ''} ${selectedProduct?.name || ''}`.trim(),
            details: {
              id: saleId,
              product_id: selectedProduct?.id,
              product_name: `${selectedProduct?.brand || ''} ${selectedProduct?.name || ''}`.trim(),
              amount: pricingCalculation.totalWithKdv,
              payment_method: paymentMethod,
              notes: notes
            },
            user: 'Sistem', // TODO: Get from auth context
            category: 'sales'
          };
          await createPartyTimeline(partyId, timelineData as any);
        } catch (e) {
          console.error('Error creating timeline log:', e);
        }

        try {
          const activityData = {
            type: 'sale',
            title: 'Satış Geliri',
            description: `${selectedProduct?.brand || ''} ${selectedProduct?.name || ''} satışı`.trim(),
            details: {
              party_id: partyId,
              sale_id: saleId,
              product_id: selectedProduct?.id,
              amount: pricingCalculation.finalAmount,
              payment_type: paymentMethod,
              discount: pricingCalculation.discountAmount,
              notes: notes,
              user_name: 'Sistem', // TODO: Get from auth context
              timestamp: new Date().toISOString()
            },
            category: 'sales'
          };
          await createPartyActivities(partyId, activityData as any);
        } catch (e) {
          console.error('Error creating sales log:', e);
        }
      }

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
    setEar('right'); // Reset ear selection to right (default)
    setUnitPrice(0);
    setDiscountType('amount');
    setDiscountInput(0);
    setSgkSupportType('');
    setPaymentMethod('cash');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSerialNumber('');
    setSerialNumberLeft('');
    setSerialNumberRight('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-sm" data-testid="sale-form-container">

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="sale-form">
        {/* Product Selection */}
        <div data-testid="sale-form-product-section">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ürün Seçimi *
          </label>
          <ProductDropdown
            selectedProduct={selectedProduct}
            onProductSelect={setSelectedProduct}
            placeholder="Ürün adı, kategori veya marka ile arayın..."
            data-testid="sale-form-product-dropdown"
          />
        </div>

        {/* Ear Selection (for hearing aids) or Quantity (for other products) and Unit Price */}
        <div className="grid grid-cols-2 gap-4" data-testid="sale-form-quantity-price">
          {isHearingAid ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kulak *
              </label>
              <select
                value={ear}
                onChange={(e) => {
                  const newEar = e.target.value as 'left' | 'right' | 'both';
                  setEar(newEar);
                  // Auto-set quantity based on ear selection
                  setQuantity(newEar === 'both' ? 2 : 1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                data-testid="sale-form-ear-selector"
              >
                <option value="left">Sol Kulak</option>
                <option value="right">Sağ Kulak</option>
                <option value="both">İki Kulak (Bilateral)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Miktar *
              </label>
              <Input
                type="number"
                min="1"
                value={quantity === 0 ? '' : quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="1"
                required
                fullWidth
                data-testid="sale-form-quantity"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Birim Fiyat (₺) *
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice === 0 ? '' : unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              required
              fullWidth
              data-testid="sale-form-unit-price"
            />
          </div>
        </div>

        {/* Serial Number Section - Only for Hearing Aids */}
        {isHearingAid && (
          <div className="grid grid-cols-2 gap-4" data-testid="sale-form-serial-section">
            {ear === 'both' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="text-blue-600">Sol Kulak</span> Seri No
                  </label>
                  <Input
                    type="text"
                    value={serialNumberLeft}
                    onChange={(e) => setSerialNumberLeft(e.target.value)}
                    placeholder="Sol kulak seri numarası"
                    fullWidth
                    data-testid="sale-form-serial-left"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="text-red-600">Sağ Kulak</span> Seri No
                  </label>
                  <Input
                    type="text"
                    value={serialNumberRight}
                    onChange={(e) => setSerialNumberRight(e.target.value)}
                    placeholder="Sağ kulak seri numarası"
                    fullWidth
                    data-testid="sale-form-serial-right"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className={ear === 'left' ? 'text-blue-600' : 'text-red-600'}>
                    {ear === 'left' ? 'Sol Kulak' : 'Sağ Kulak'}
                  </span> Seri No
                </label>
                <Input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Seri numarası"
                  fullWidth
                  data-testid="sale-form-serial-number"
                />
              </div>
            )}
          </div>
        )}

        {/* Discount Section */}
        <div className="grid grid-cols-2 gap-4" data-testid="sale-form-discount-section">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İndirim Tipi
            </label>
            <Select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percentage')}
              fullWidth
              options={[
                { value: 'amount', label: 'Tutar (₺)' },
                { value: 'percentage', label: 'Yüzde (%)' }
              ]}
              data-testid="sale-form-discount-type"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İndirim Değeri
            </label>
            <Input
              type="number"
              min="0"
              step={discountType === 'percentage' ? '1' : '0.01'}
              max={discountType === 'percentage' ? '100' : undefined}
              value={discountInput === 0 ? '' : discountInput}
              onChange={(e) => setDiscountInput(parseFloat(e.target.value) || 0)}
              placeholder={discountType === 'percentage' ? '0' : '0.00'}
              fullWidth
              data-testid="sale-form-discount-value"
            />
          </div>
        </div>

        {/* SGK Section - Only for Hearing Aids */}
        {isHearingAid && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SGK Destek Türü
            </label>
            <Select
              value={sgkSupportType}
              onChange={(e) => setSgkSupportType(e.target.value)}
              className="mb-1"
              fullWidth
              options={sgkSupportOptions}
            />
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
                  <span>
                    ₺{pricingCalculation.basePrice.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-blue-700">
                  <span>KDV (%{pricingCalculation.kdvRate}):</span>
                  <span>₺{pricingCalculation.kdvAmount.toLocaleString('tr-TR')}</span>
                </div>
                {/* Show discounted net amount if there is a discount */}
                {pricingCalculation.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-blue-700 font-medium">
                    <span>Toplam (KDV Dahil):</span>
                    <span className="line-through text-gray-400">₺{pricingCalculation.totalWithKdv.toLocaleString('tr-TR')}</span>
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
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              fullWidth
              options={[
                { value: 'cash', label: 'Nakit' },
                { value: 'credit_card', label: 'Kredi Kartı' },
                { value: 'bank_transfer', label: 'Banka Transferi' },
                { value: 'installment', label: 'Taksit' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Satış Tarihi *
            </label>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
              fullWidth
            />
          </div>
        </div>

        {/* Collected Amount and Report Status Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tahsil Edilen Tutar (₺)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={collectedAmount === 0 ? '' : collectedAmount}
              onChange={(e) => {
                setCollectedAmount(parseFloat(e.target.value) || 0);
                setIsCollectedAmountManuallySet(true);
              }}
              placeholder="0.00"
              className="font-medium text-blue-800"
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rapor Durumu
            </label>
            <Select
              value={reportStatus}
              onChange={(e) => setReportStatus(e.target.value)}
              fullWidth
              options={[
                { value: 'no_report', label: 'Raporsuz Özel Satış' },
                { value: 'report_pending', label: 'Rapor Beklemede' },
                { value: 'report_delivered', label: 'Rapor Teslim Alındı' },
                { value: 'report_missing', label: 'Rapor Eksik' }
              ]}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Satışla ilgili notlar..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <Button
            type="submit"
            className="flex-1"
          >
            Satışı Kaydet
          </Button>

          <Button
            type="button"
            onClick={resetForm}
            variant="outline"
          >
            Temizle
          </Button>
        </div>
      </form>
    </div>
  );
};
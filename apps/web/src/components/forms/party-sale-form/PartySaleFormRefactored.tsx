import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastHelpers, Button, Input, Select, Textarea, Label, DatePicker } from '@x-ear/ui-web';
import { PartyApiService } from '../../../services/party/party-api.service';
import { listInventory } from '@/api/client/inventory.client';
import { unwrapArray } from '../../../utils/response-unwrap';
import { createPartyTimeline, createPartyActivities } from '@/api/client/timeline.client';
import { SerialAutocomplete } from '@/components/shared/SerialAutocomplete';
import { customInstance } from '@/api/orval-mutator';

// InventoryItem type definition (since schema may not export it directly)
interface InventoryItem {
  id?: string;
  name: string;
  category?: string;
  brand?: string;
  price: number;
  availableInventory?: number;
  inventory?: number;
  vatRate?: number;
  availableSerials?: string[];
  unit?: string;
  packageQuantity?: number;
}

// Product interface for the dropdown - mapped from InventoryItem
interface Product {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  price: number;
  stock?: number;
  kdvRate?: number;
  availableSerials?: string[];
  unit?: string;
  packageQuantity?: number;
}

// Convert InventoryItem to Product interface
const mapInventoryItemToProduct = (item: InventoryItem): Product => ({
  id: item.id || '',
  name: item.name,
  category: item.category,
  brand: item.brand,
  price: item.price,
  stock: item.availableInventory || item.inventory || 0,
  kdvRate: item.vatRate ?? 0,
  availableSerials: item.availableSerials || [],
  unit: item.unit,
  packageQuantity: item.packageQuantity,
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
                  className="p-1 h-auto text-muted-foreground hover:text-muted-foreground"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
              )}
              <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          }
        />
      </div>

      {/* Dropdown */}
      {
        isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-2xl shadow-lg max-h-60 overflow-y-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="px-4 py-3 cursor-pointer hover:bg-muted border-b border-border last:border-b-0"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.category} • {product.brand}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-medium text-foreground">₺{product.price.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Stok: {product.stock}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-muted-foreground text-center">
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
  const { t } = useTranslation(['parties_extra', 'patients', 'common']);
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
    // Exclude battery categories from hearing aid detection
    if (cat === 'hearing_aid_battery' || cat === 'implant_battery') return false;
    return cat.includes('işitme') || cat.includes('hearing') || cat.includes('cihaz') || cat.includes('aid');
  }, [selectedProduct]);

  // Determine if product is a hearing aid battery
  const isHearingAidBattery = useMemo(() => {
    if (!selectedProduct?.category) return false;
    const cat = selectedProduct.category.toLowerCase();
    return cat === 'hearing_aid_battery' || cat === 'işitme cihazı pili';
  }, [selectedProduct]);

  // Determine if product is an implant battery
  const isImplantBattery = useMemo(() => {
    if (!selectedProduct?.category) return false;
    const cat = selectedProduct.category.toLowerCase();
    return cat === 'implant_battery' || cat === 'implant pili' || cat === 'İmplant pili';
  }, [selectedProduct]);

  // Combined: is any type of battery with SGK support
  const isSgkBattery = isHearingAidBattery || isImplantBattery;

  // Battery SGK settings from API
  interface BatterySgkScheme {
    label: string;
    quantity_per_ear: number;
    coverage_amount: number;
    kdv_rate: number;
  }
  const [batterySgkSettings, setBatterySgkSettings] = useState<Record<string, BatterySgkScheme>>({});

  // Battery report quantity options (per ear or bilateral)
  const [batteryReportQuantity, setBatteryReportQuantity] = useState<'per_ear' | 'bilateral'>('per_ear');

  // Load battery SGK settings from API
  useEffect(() => {
    const loadBatterySgkSettings = async () => {
      try {
        const response = await customInstance<{ data: { settings: { sgk?: { battery_schemes?: Record<string, BatterySgkScheme> } } } }>({
          url: '/api/settings',
          method: 'GET',
        });
        const schemes = response.data?.settings?.sgk?.battery_schemes;
        if (schemes) {
          setBatterySgkSettings(schemes);
        } else {
          // Fallback defaults
          setBatterySgkSettings({
            hearing_aid_battery: { label: 'İşitme Cihazı Pili', quantity_per_ear: 104, coverage_amount: 790, kdv_rate: 20 },
            implant_battery: { label: 'İmplant Pili', quantity_per_ear: 360, coverage_amount: 2300, kdv_rate: 20 },
          });
        }
      } catch {
        // Fallback defaults
        setBatterySgkSettings({
          hearing_aid_battery: { label: 'İşitme Cihazı Pili', quantity_per_ear: 104, coverage_amount: 790, kdv_rate: 20 },
          implant_battery: { label: 'İmplant Pili', quantity_per_ear: 360, coverage_amount: 2300, kdv_rate: 20 },
        });
      }
    };
    loadBatterySgkSettings();
  }, []);

  // Update unit price when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(selectedProduct.price);
    } else {
      setUnitPrice(0);
    }
  }, [selectedProduct]);

  // Pricing calculation with discount and SGK
  const pricingCalculation = useMemo(() => {
    // 1. Base Price
    const basePrice = quantity * unitPrice;

    // 2. KDV from inventory (hearing aids = 0%, set in inventory)
    const kdvRate = selectedProduct?.kdvRate ?? 0;
    const kdvAmount = (basePrice * kdvRate) / 100;

    // 3. Amount with KDV
    const totalWithKdv = basePrice + kdvAmount;

    // 4. SGK FIRST — for hearing aids (device SGK)
    let calculatedSgk = 0;
    if (isHearingAid) {
      const schemeAmount = sgkFallbackValues[sgkSupportType] || 0;
      const sgkMultiplier = ear === 'both' ? 2 : 1;
      const totalSgkSupport = schemeAmount * sgkMultiplier;
      calculatedSgk = Math.min(totalSgkSupport, totalWithKdv);
    }

    // 4b. SGK for batteries — deduct battery report amount if raporlu
    let batterySgkAmount = 0;
    if (isSgkBattery && reportStatus !== 'no_report') {
      const schemeKey = isHearingAidBattery ? 'hearing_aid_battery' : 'implant_battery';
      const scheme = batterySgkSettings[schemeKey];
      if (scheme) {
        const sgkAmountWithKdv = scheme.coverage_amount * (1 + scheme.kdv_rate / 100);
        const earMultiplier = batteryReportQuantity === 'bilateral' ? 2 : 1;
        batterySgkAmount = Math.min(sgkAmountWithKdv * earMultiplier, totalWithKdv);
      }
    }

    const totalSgkCoverage = calculatedSgk + batterySgkAmount;

    // 5. After SGK
    const afterSgk = totalWithKdv - totalSgkCoverage;

    // 6. Discount SECOND — on SGK-reduced amount
    let calculatedDiscount = 0;
    if (discountType === 'percentage') {
      calculatedDiscount = (afterSgk * discountInput) / 100;
    } else {
      calculatedDiscount = discountInput;
    }

    // 7. Final amount = after SGK and discount
    const finalAmount = Math.max(0, afterSgk - calculatedDiscount);

    return {
      basePrice,
      kdvRate,
      kdvAmount,
      totalWithKdv,
      sgkCoverage: totalSgkCoverage,
      batterySgkAmount,
      discountAmount: calculatedDiscount,
      finalAmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, unitPrice, discountType, discountInput, selectedProduct, sgkSupportType, isHearingAid, ear, isSgkBattery, reportStatus, batteryReportQuantity, batterySgkSettings, isHearingAidBattery]);

  // Calculate total amount
  // const totalAmount = useMemo(() => {
  // return pricingCalculation.finalAmount;
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
      warning('Lütfen bir ürün seçin');
      return;
    }

    if (quantity <= 0) {
      warning('Miktar 0\'dan büyük olmalıdır');
      return;
    }

    if (isHearingAid) {
      // Seri numaraları opsiyoneldir — validation yok
    }

    try {
      const saleData: Record<string, unknown> = {
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
        batterySgkAmount: pricingCalculation.batterySgkAmount || 0,
        batteryReportQuantity: isSgkBattery ? batteryReportQuantity : undefined,
        discount: pricingCalculation.discountAmount,
        reportStatus: reportStatus,
        ear: (isHearingAid || isSgkBattery) ? ear : undefined
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
      const saleId = (response as { id?: string; data?: { id?: string } }).data?.id || (response as { id?: string }).id;
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
          await createPartyTimeline(partyId, timelineData as never);
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
          await createPartyActivities(partyId, activityData as never);
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
    setBatteryReportQuantity('per_ear');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-card rounded-2xl shadow-sm" data-testid="sale-form-container">

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="sale-form">
        {/* Product Selection */}
        <div data-testid="sale-form-product-section">
          <Label className="mb-1">
            Ürün Seçimi *
          </Label>
          <ProductDropdown
            selectedProduct={selectedProduct}
            onProductSelect={setSelectedProduct}
            placeholder="Ürün adı, kategori veya marka ile arayın..."
            data-testid="sale-form-product-dropdown"
          />
        </div>

        {/* Ear Selection (for hearing aids and batteries) or Quantity (for other products) and Unit Price */}
        <div className="grid grid-cols-2 gap-4" data-testid="sale-form-quantity-price">
          {isHearingAid ? (
            <div>
              <Label className="mb-1">
                Kulak *
              </Label>
              <Select
                value={ear}
                onChange={(e) => {
                  const newEar = e.target.value as 'left' | 'right' | 'both';
                  setEar(newEar);
                  // Auto-set quantity based on ear selection
                  setQuantity(newEar === 'both' ? 2 : 1);
                }}
                required
                data-testid="sale-form-ear-selector"
                fullWidth
                options={[
                  { value: 'left', label: 'Sol Kulak' },
                  { value: 'right', label: 'Sağ Kulak' },
                  { value: 'both', label: 'İki Kulak (Bilateral)' }
                ]}
              />
            </div>
          ) : (
            <div>
              <Label className="mb-1">
                Miktar {selectedProduct?.unit === 'paket' ? '(Paket)' : ''} *
              </Label>
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
              {selectedProduct?.unit === 'paket' && selectedProduct?.packageQuantity && (
                <p className="text-xs text-muted-foreground mt-1">
                  Toplam: {quantity * selectedProduct.packageQuantity} adet ({quantity} paket × {selectedProduct.packageQuantity} adet/paket)
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="mb-1">
              Birim Fiyat (₺) *
            </Label>
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
                <SerialAutocomplete
                  value={serialNumberLeft}
                  onChange={setSerialNumberLeft}
                  availableSerials={selectedProduct?.availableSerials || []}
                  placeholder="Sol kulak seri numarası"
                  label="Sol Kulak Seri No"
                  color="blue"
                />
                <SerialAutocomplete
                  value={serialNumberRight}
                  onChange={setSerialNumberRight}
                  availableSerials={selectedProduct?.availableSerials || []}
                  placeholder="Sağ kulak seri numarası"
                  label="Sağ Kulak Seri No"
                  color="red"
                />
              </>
            ) : (
              <div className="col-span-2">
                <SerialAutocomplete
                  value={serialNumber}
                  onChange={setSerialNumber}
                  availableSerials={selectedProduct?.availableSerials || []}
                  placeholder="Seri numarası"
                  label={`${ear === 'left' ? 'Sol Kulak' : 'Sağ Kulak'} Seri No`}
                  color={ear === 'left' ? 'blue' : 'red'}
                />
              </div>
            )}
          </div>
        )}

        {/* Discount Section */}
        <div className="grid grid-cols-2 gap-4" data-testid="sale-form-discount-section">
          <div>
            <Label className="mb-1">
              İndirim Tipi
            </Label>
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
            <Label className="mb-1">
              İndirim Değeri
            </Label>
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
          <div className="bg-muted p-3 rounded-2xl">
            <Label className="mb-1">
              SGK Destek Türü
            </Label>
            <Select
              value={sgkSupportType}
              onChange={(e) => setSgkSupportType(e.target.value)}
              className="mb-1"
              fullWidth
              options={sgkSupportOptions}
            />
            {sgkSupportType && sgkFallbackValues[sgkSupportType] > 0 && (
              <div className="text-xs text-success mt-1">
                Tahmini SGK Desteği: ₺{sgkFallbackValues[sgkSupportType].toLocaleString('tr-TR')}
              </div>
            )}
          </div>
        )}

        {/* Battery SGK Section - Only for hearing_aid_battery and implant_battery */}
        {isSgkBattery && (
          <div className="bg-success/10 p-3 rounded-2xl border border-green-200">
            <Label className="mb-2 text-green-900 font-semibold">
              Raporlu Pil SGK Bilgileri
            </Label>

            {/* Ear selection for battery */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <Label className="mb-1 text-sm">Kulak Seçimi</Label>
                <Select
                  value={ear}
                  onChange={(e) => setEar(e.target.value as 'left' | 'right' | 'both')}
                  fullWidth
                  options={[
                    { value: 'left', label: 'Sol Kulak' },
                    { value: 'right', label: 'Sağ Kulak' },
                    { value: 'both', label: 'İki Kulak (Bilateral)' }
                  ]}
                />
              </div>
              <div>
                <Label className="mb-1 text-sm">Rapor Adet Kapsamı</Label>
                <Select
                  value={batteryReportQuantity}
                  onChange={(e) => setBatteryReportQuantity(e.target.value as 'per_ear' | 'bilateral')}
                  fullWidth
                  options={(() => {
                    const schemeKey = isHearingAidBattery ? 'hearing_aid_battery' : 'implant_battery';
                    const scheme = batterySgkSettings[schemeKey];
                    const qtyPerEar = scheme?.quantity_per_ear || (isHearingAidBattery ? 104 : 360);
                    return [
                      { value: 'per_ear', label: `Tek Kulak (${qtyPerEar} adet)` },
                      { value: 'bilateral', label: `Bilateral (${qtyPerEar * 2} adet)` },
                    ];
                  })()}
                />
              </div>
            </div>

            {/* SGK amount info */}
            {reportStatus !== 'no_report' && (() => {
              const schemeKey = isHearingAidBattery ? 'hearing_aid_battery' : 'implant_battery';
              const scheme = batterySgkSettings[schemeKey];
              if (!scheme) return null;
              const sgkWithKdv = scheme.coverage_amount * (1 + scheme.kdv_rate / 100);
              const earMul = batteryReportQuantity === 'bilateral' ? 2 : 1;
              return (
                <div className="text-xs text-success space-y-1">
                  <div>SGK Ödeme: ₺{scheme.coverage_amount.toLocaleString('tr-TR')} + %{scheme.kdv_rate} KDV = ₺{sgkWithKdv.toFixed(2)} / kulak</div>
                  <div className="font-semibold">Toplam SGK Düşümü: ₺{(sgkWithKdv * earMul).toFixed(2)}</div>
                </div>
              );
            })()}

            {reportStatus === 'no_report' && (
              <div className="text-xs text-amber-600 mt-1">
                Raporsuz özel satış seçili — SGK pil düşümü uygulanmayacak
              </div>
            )}
          </div>
        )}

        {/* Product Details Display */}
        {selectedProduct && (
          <div className="bg-primary/10 p-3 rounded-2xl border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Ürün Detayları</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="font-medium text-primary">Marka:</span>
                <span className="ml-1 text-primary truncate block">{selectedProduct.brand || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-primary">Model:</span>
                <span className="ml-1 text-primary truncate block">{selectedProduct.name || '-'}</span>
              </div>
              <div>
                <span className="font-medium text-primary">Liste Fiyatı:</span>
                <span className="ml-1 text-primary">₺{selectedProduct.price.toLocaleString('tr-TR')}</span>
              </div>
              <div>
                <span className="font-medium text-primary">Stok:</span>
                <span className={`ml-1 font-medium ${(selectedProduct.stock || 0) === 0 ? 'text-destructive' :
                  (selectedProduct.stock || 0) <= 5 ? 'text-yellow-600' : 'text-success'
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
            <div className="bg-primary/10 p-3 rounded-2xl border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-blue-900 text-base">Toplam Tutar</span>
                <span className="font-bold text-primary text-lg">₺{pricingCalculation.finalAmount.toLocaleString('tr-TR')}</span>
              </div>

              {/* Components Breakdown */}
              <div className="border-t border-blue-200 pt-2 space-y-1">
                {/* Simplified breakdown */}
                <div className="flex justify-between text-xs text-primary">
                  <span>Ara Toplam:</span>
                  <span>
                    ₺{pricingCalculation.basePrice.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-primary">
                  <span>KDV (%{pricingCalculation.kdvRate}):</span>
                  <span>₺{pricingCalculation.kdvAmount.toLocaleString('tr-TR')}</span>
                </div>
                {/* Show discounted net amount if there is a discount */}
                {pricingCalculation.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-primary font-medium">
                    <span>Toplam (KDV Dahil):</span>
                    <span className="line-through text-muted-foreground">₺{pricingCalculation.totalWithKdv.toLocaleString('tr-TR')}</span>
                  </div>
                )}
                {pricingCalculation.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-primary">
                    <span>İndirim{discountType === 'percentage' && ` (%${discountInput})`}:</span>
                    <span>-₺{pricingCalculation.discountAmount.toLocaleString('tr-TR')}</span>
                  </div>
                )}
                {pricingCalculation.sgkCoverage > 0 && !isSgkBattery && (
                  <div className="flex justify-between text-xs text-success font-medium">
                    <span>SGK Desteği:</span>
                    <span>-₺{pricingCalculation.sgkCoverage.toLocaleString('tr-TR')}</span>
                  </div>
                )}
                {pricingCalculation.batterySgkAmount > 0 && (
                  <div className="flex justify-between text-xs text-success font-medium">
                    <span>SGK Pil Rapor Düşümü:</span>
                    <span>-₺{pricingCalculation.batterySgkAmount.toLocaleString('tr-TR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Method and Sale Date Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1">
              Ödeme Yöntemi *
            </Label>
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
            <Label className="mb-1">
              Satış Tarihi *
            </Label>
            <DatePicker
              value={saleDate ? new Date(saleDate) : null}
              onChange={(date) => setSaleDate(date ? date.toISOString().split('T')[0] : '')}
              required
              fullWidth
            />
          </div>
        </div>

        {/* Collected Amount and Report Status Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1">
              Tahsil Edilen Tutar (₺)
            </Label>
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
            <Label className="mb-1">
              Rapor Durumu
            </Label>
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
          <Label className="mb-1">
            Notlar
          </Label>
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
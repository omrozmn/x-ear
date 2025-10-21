import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Button, 
  Textarea, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Alert,
  Spinner
} from '@x-ear/ui-web';
import { 
  X, 
  AlertCircle, 
  CheckCircle,
  ShoppingCart,
  FileText,
  Calendar,
  Settings
} from 'lucide-react';
import { Patient } from '../../../types/patient';
import ProductSearchComponent from './components/ProductSearchComponent';
import PricingPreviewComponent from './components/PricingPreviewComponent';
import PaymentOptionsComponent from './components/PaymentOptionsComponent';

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

interface PricingDetails {
  basePrice: number;
  discountAmount: number;
  discountPercent: number;
  vatAmount: number;
  sgkDiscount: number;
  totalAmount: number;
  installmentAmount?: number;
}

interface SaleData {
  patientId: string;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string;
    serialNumber?: string;
    barcode?: string;
    category: string;
  } | null;
  pricing: PricingDetails;
  payment: {
    method: string;
    installmentCount: number | null;
    installmentAmount: number;
    downPayment: number;
  };
  sgk: {
    enabled: boolean;
    discount?: number;
    code?: string;
  };
  notes: string;
  saleDate: string;
  stock: {
    deducted: number;
    remaining: number;
  } | null;
}

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onSaleCreate: (saleData: SaleData) => void;
}

export const SaleModal: React.FC<SaleModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSaleCreate
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Pricing state
  const [customPrice, setCustomPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [sgkEnabled, setSgkEnabled] = useState(false);
  const [sgkDiscount, setSgkDiscount] = useState('');
  const [sgkCode, setSgkCode] = useState('');
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [installmentCount, setInstallmentCount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');
  
  // Sale details state
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [deviceAssignment, setDeviceAssignment] = useState({
    enabled: false,
    assignmentReason: 'sale',
    earSide: 'both' as 'left' | 'right' | 'both'
  });
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock product data
  const mockProducts: Product[] = useMemo(() => [
    {
      id: '1',
      name: 'İşitme Cihazı Premium',
      brand: 'Phonak',
      model: 'Audéo Paradise P90',
      category: 'İşitme Cihazı',
      listPrice: 25000,
      salePrice: 22000,
      vatRate: 18,
      stock: 5,
      serialNumber: 'PH2024001',
      barcode: '1234567890123',
      sgkSupported: true,
      sgkCode: 'SGK001'
    }
  ], []);

  // Debounced search
  const debouncedSearch = useCallback(
    (term: string) => {
      if (term.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      setTimeout(() => {
        const filtered = mockProducts.filter(product =>
          product.name.toLowerCase().includes(term.toLowerCase()) ||
          product.brand.toLowerCase().includes(term.toLowerCase()) ||
          product.model.toLowerCase().includes(term.toLowerCase()) ||
          product.barcode?.includes(term)
        );
        setSearchResults(filtered);
        setShowResults(true);
        setIsSearching(false);
      }, 300);
    },
    [mockProducts]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Calculate pricing
  const pricingDetails = useMemo((): PricingDetails => {
    const basePrice = parseFloat(customPrice) || selectedProduct?.salePrice || 0;
    const discountAmount = (basePrice * (parseFloat(discountPercent) || 0)) / 100;
    const sgkDiscountAmount = sgkEnabled ? (basePrice * (parseFloat(sgkDiscount) || 0)) / 100 : 0;
    const priceAfterDiscounts = basePrice - discountAmount - sgkDiscountAmount;
    const vatAmount = (priceAfterDiscounts * (selectedProduct?.vatRate || 18)) / 100;
    const totalAmount = priceAfterDiscounts + vatAmount;
    
    const installmentAmount = paymentMethod === 'installment' && installmentCount
      ? (totalAmount - (parseFloat(downPayment) || 0)) / parseInt(installmentCount)
      : 0;

    return {
      basePrice,
      discountAmount,
      discountPercent: parseFloat(discountPercent) || 0,
      vatAmount,
      sgkDiscount: sgkDiscountAmount,
      totalAmount,
      installmentAmount
    };
  }, [customPrice, selectedProduct, discountPercent, sgkEnabled, sgkDiscount, paymentMethod, installmentCount, downPayment]);

  // Enhanced validation
  const validateForm = () => {
    const errors: string[] = [];
    
    if (!selectedProduct && !customPrice) {
      errors.push('Ürün seçimi veya özel fiyat girişi zorunludur');
    }
    
    if (customPrice && parseFloat(customPrice) <= 0) {
      errors.push('Geçerli bir fiyat giriniz');
    }
    
    if (discountPercent && (parseFloat(discountPercent) < 0 || parseFloat(discountPercent) > 100)) {
      errors.push('İndirim oranı 0 ile 100 arasında olmalıdır');
    }
    
    if (sgkEnabled && !sgkCode.trim()) {
      errors.push('SGK kodu gereklidir');
    }
    
    if (paymentMethod === 'installment') {
      if (!installmentCount || parseInt(installmentCount) < 2) {
        errors.push('Taksit sayısı en az 2 olmalıdır');
      }
      if (downPayment && parseFloat(downPayment) < 0) {
        errors.push('Peşinat tutarı negatif olamaz');
      }
      if (downPayment && parseFloat(downPayment) >= pricingDetails.totalAmount) {
        errors.push('Peşinat tutarı toplam tutardan küçük olmalıdır');
      }
    }
    
    if (!saleDate) {
      errors.push('Satış tarihi seçiniz');
    }
    
    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors({ submit: validationErrors.join(', ') });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const saleData: SaleData = {
        patientId: patient.id || '',
        product: selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          brand: selectedProduct.brand,
          model: selectedProduct.model,
          serialNumber: selectedProduct.serialNumber,
          barcode: selectedProduct.barcode,
          category: selectedProduct.category
        } : null,
        pricing: pricingDetails,
        payment: {
          method: paymentMethod,
          installmentCount: paymentMethod === 'installment' ? parseInt(installmentCount) : null,
          installmentAmount: pricingDetails.installmentAmount || 0,
          downPayment: parseFloat(downPayment) || 0
        },
        sgk: sgkEnabled ? {
          enabled: true,
          discount: parseFloat(sgkDiscount) || 0,
          code: sgkCode
        } : { enabled: false },
        notes: (document.querySelector('textarea[name="notes"]') as HTMLTextAreaElement)?.value || '',
        saleDate: saleDate,
        stock: selectedProduct ? {
          deducted: 1,
          remaining: selectedProduct.stock - 1
        } : null
      };

      await onSaleCreate(saleData);
      
      // Reset form
      setSearchTerm('');
      setSelectedProduct(null);
      setCustomPrice('');
      setDiscountPercent('');
      setSgkEnabled(false);
      setSgkDiscount('');
      setSgkCode('');
      setPaymentMethod('cash');
      setInstallmentCount('');
      setDownPayment('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      setDeviceAssignment({ enabled: false, assignmentReason: 'sale', earSide: 'both' });
      
      onClose();
    } catch (error) {
      setErrors({ submit: 'Satış kaydedilirken bir hata oluştu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Yeni Satış</h3>
              <p className="text-sm text-gray-600">
                {patient.firstName} {patient.lastName} için satış oluştur
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Product Selection & Details */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Customer Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-600" />
                      Müşteri Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Ad Soyad:</span>
                        <span className="text-gray-900">{patient.firstName} {patient.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">TC No:</span>
                        <span className="text-gray-900">{patient.tcNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Telefon:</span>
                        <span className="text-gray-900">{patient.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">E-posta:</span>
                        <span className="text-gray-900">{patient.email}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Search Component */}
                <ProductSearchComponent
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchResults={searchResults}
                  selectedProduct={selectedProduct}
                  onProductSelect={setSelectedProduct}
                  isSearching={isSearching}
                  showResults={showResults}
                />

                {/* Notes Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-gray-600" />
                      Notlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      name="notes"
                      rows={4}
                      placeholder="Satış ile ilgili notlarınızı buraya yazabilirsiniz..."
                      className="resize-none"
                    />
                  </CardContent>
                </Card>

                {/* Sale Date Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                      Satış Tarihi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </CardContent>
                </Card>

                {/* Device Assignment Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-gray-600" />
                      Cihaz Atama
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="deviceAssignment"
                        checked={deviceAssignment.enabled}
                        onChange={(e) => setDeviceAssignment(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="deviceAssignment" className="text-sm font-medium text-gray-700">
                        Cihaz ataması yap
                      </label>
                    </div>
                    
                    {deviceAssignment.enabled && (
                      <div className="space-y-3 pl-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Atama Nedeni
                          </label>
                          <select
                            value={deviceAssignment.assignmentReason}
                            onChange={(e) => setDeviceAssignment(prev => ({ ...prev, assignmentReason: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="sale">Satış</option>
                            <option value="trial">Deneme</option>
                            <option value="repair">Tamir</option>
                            <option value="replacement">Değişim</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kulak Tarafı
                          </label>
                          <select
                            value={deviceAssignment.earSide}
                            onChange={(e) => setDeviceAssignment(prev => ({ ...prev, earSide: e.target.value as 'left' | 'right' | 'both' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="both">Her İki Kulak</option>
                            <option value="left">Sol Kulak</option>
                            <option value="right">Sağ Kulak</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Pricing & Payment */}
              <div className="space-y-6">
                
                {/* Pricing Preview Component */}
                <PricingPreviewComponent
                  pricingDetails={pricingDetails}
                  customPrice={customPrice}
                  onCustomPriceChange={setCustomPrice}
                  discountPercent={discountPercent}
                  onDiscountPercentChange={setDiscountPercent}
                  sgkEnabled={sgkEnabled}
                  onSgkToggle={setSgkEnabled}
                  sgkDiscount={sgkDiscount}
                  onSgkDiscountChange={setSgkDiscount}
                  sgkCode={sgkCode}
                  onSgkCodeChange={setSgkCode}
                />

                {/* Payment Options Component */}
                <PaymentOptionsComponent
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  installmentCount={installmentCount}
                  onInstallmentCountChange={setInstallmentCount}
                  downPayment={downPayment}
                  onDownPaymentChange={setDownPayment}
                  interestRate={interestRate}
                  onInterestRateChange={setInterestRate}
                  installmentAmount={pricingDetails.installmentAmount || 0}
                  totalAmount={pricingDetails.totalAmount}
                />
              </div>
            </div>

            {/* Form Validation Errors */}
            {errors.submit && (
              <Alert variant="error" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.submit}</span>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4">
              <Button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!selectedProduct && !customPrice)}
                className="px-8 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Satışı Kaydet</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SaleModal;
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  Button, 
  Input, 
  Label, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  Spinner
} from '@x-ear/ui-web';
import { X, Edit, DollarSign, CreditCard, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { Sale, PaymentMethod, SaleStatus } from '../../../types/patient';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  sale: Sale;
  onSaleUpdate: (saleData: any) => void;
  loading?: boolean;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  isOpen,
  onClose,
  patient,
  sale,
  onSaleUpdate,
  loading = false
}) => {
  const [saleType, setSaleType] = useState<'device' | 'service' | 'accessory'>('device');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'installment' | 'check' | 'transfer'>('cash');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [saleStatus, setSaleStatus] = useState<'draft' | 'confirmed' | 'cancelled' | 'paid'>('confirmed');
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productName: '',
    brand: '',
    model: '',
    serialNumber: '',
    listPrice: 0,
    salePrice: 0,
    discountAmount: 0,
    sgkCoverage: 0,
    notes: '',
    saleDate: ''
  });

  // Calculate totals
  const totalPaid = sale.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remainingBalance = formData.salePrice - totalPaid;
  const discountPercentage = formData.listPrice > 0 ? ((formData.discountAmount / formData.listPrice) * 100) : 0;

  useEffect(() => {
    if (sale && isOpen) {
      // Initialize form with sale data
      setFormData({
        productName: sale.productId || '', // In real app, fetch product name from productId
        brand: '', // These would come from product details
        model: '',
        serialNumber: '',
        listPrice: sale.listPriceTotal || 0,
        salePrice: sale.totalAmount,
        discountAmount: sale.discountAmount || 0,
        sgkCoverage: sale.sgkCoverage || 0,
        notes: sale.notes || '',
        saleDate: sale.saleDate ? sale.saleDate.split('T')[0] : ''
      });

      setSaleStatus(sale.status as any || 'confirmed');
      setPaymentMethod(sale.paymentMethod as any || 'cash');
      
      // Determine sale type based on existing data (in real app, this would be stored)
      setSaleType('device'); // Default, would be determined from sale data
      
      setHasChanges(false);
    }
  }, [sale, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    
    setError(null);
    setSuccess(null);
    
    // Validation
    if (!formData.productName.trim()) {
      setError('Ürün adı gereklidir');
      return;
    }
    
    if (!formData.listPrice || formData.listPrice <= 0) {
      setError('Geçerli bir liste fiyatı giriniz');
      return;
    }
    
    if (formData.discountAmount < 0 || formData.discountAmount > formData.listPrice) {
      setError('İndirim tutarı 0 ile liste fiyatı arasında olmalıdır');
      return;
    }
    
    if (!formData.salePrice || formData.salePrice <= 0) {
      setError('Geçerli bir satış fiyatı giriniz');
      return;
    }
    
    if (paymentMethod === 'installment' && installmentCount < 2) {
      setError('Taksit sayısı en az 2 olmalıdır');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const updatedSaleData = {
        id: sale.id,
        patientId: patient.id,
        saleType,
        productName: formData.productName.trim(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        serialNumber: formData.serialNumber.trim(),
        listPriceTotal: formData.listPrice,
        totalAmount: formData.salePrice,
        discountAmount: formData.discountAmount,
        sgkCoverage: formData.sgkCoverage,
        paymentMethod,
        installmentCount: paymentMethod === 'installment' ? installmentCount : 1,
        status: saleStatus,
        notes: formData.notes.trim(),
        saleDate: formData.saleDate,
        updatedAt: new Date().toISOString()
      };

      setSuccess('Satış başarıyla güncellendi');
      
      // Close modal after successful update
      setTimeout(() => {
        setError(null);
        setSuccess(null);
        onSaleUpdate(updatedSaleData);
      }, 2000);
      
    } catch (err) {
      setError('Satış güncellenirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceCalculation = (field: 'listPrice' | 'discountAmount' | 'salePrice', value: number) => {
    const newFormData = { ...formData, [field]: value };
    
    if (field === 'listPrice' || field === 'discountAmount') {
      // Auto-calculate sale price when list price or discount changes
      newFormData.salePrice = newFormData.listPrice - newFormData.discountAmount;
    } else if (field === 'salePrice') {
      // Auto-calculate discount when sale price changes
      newFormData.discountAmount = newFormData.listPrice - newFormData.salePrice;
    }
    
    // Ensure values don't go negative
    newFormData.discountAmount = Math.max(0, newFormData.discountAmount);
    newFormData.salePrice = Math.max(0, newFormData.salePrice);
    
    setFormData(newFormData);
    setHasChanges(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const canEditFinancials = saleStatus !== 'paid' && totalPaid === 0;
  const hasPayments = (sale.payments?.length || 0) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Edit className="w-5 h-5 mr-2" />
            Satış Düzenle
          </h3>
          <Button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Customer & Sale Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Ad Soyad:</span> {patient.firstName} {patient.lastName}</div>
                  <div><span className="font-medium">TC No:</span> {patient.tcNumber}</div>
                  <div><span className="font-medium">Telefon:</span> {patient.phone}</div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Satış Durumu</h4>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Satış ID:</span> {sale.id}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                    <select
                      value={saleStatus}
                      onChange={(e) => {
                        setSaleStatus(e.target.value as any);
                        setHasChanges(true);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Taslak</option>
                      <option value="confirmed">Onaylandı</option>
                      <option value="paid">Ödenmiş</option>
                      <option value="cancelled">İptal Edilmiş</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            {hasPayments && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Ödeme Özeti</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Toplam Tutar:</span> {formatCurrency(sale.totalAmount)}
                  </div>
                  <div>
                    <span className="font-medium">Ödenen:</span> {formatCurrency(totalPaid)}
                  </div>
                  <div className={remainingBalance > 0 ? 'text-red-700 font-medium' : 'text-green-700 font-medium'}>
                    <span className="font-medium">Kalan:</span> {formatCurrency(remainingBalance)}
                  </div>
                </div>
              </div>
            )}

            {/* Financial Edit Warning */}
            {!canEditFinancials && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-center text-yellow-800">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm">
                    Bu satışa ait ödemeler bulunduğu için fiyat bilgileri düzenlenemez. 
                    Fiyat değişikliği için önce ödemeleri iptal etmeniz gerekir.
                  </span>
                </div>
              </div>
            )}

            {/* Sale Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Satış Tarihi</label>
              <Input
                type="date"
                value={formData.saleDate}
                onChange={(e) => handleInputChange('saleDate', e.target.value)}
                className="w-48"
              />
            </div>

            {/* Sale Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Satış Türü</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'device', label: 'Cihaz', icon: '🦻' },
                  { value: 'service', label: 'Hizmet', icon: '🔧' },
                  { value: 'accessory', label: 'Aksesuar', icon: '🔋' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setSaleType(type.value as any);
                      setHasChanges(true);
                    }}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      saleType === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Ürün Bilgileri
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
                  <Input 
                    value={formData.productName}
                    onChange={(e) => handleInputChange('productName', e.target.value)}
                    placeholder="Ürün adını giriniz" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                  <Input 
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Marka" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <Input 
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="Model" 
                  />
                </div>
                {saleType === 'device' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
                    <Input 
                      value={formData.serialNumber}
                      onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                      placeholder="Seri numarası" 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Fiyatlandırma
              </h4>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Liste Fiyatı</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.listPrice}
                    onChange={(e) => handlePriceCalculation('listPrice', parseFloat(e.target.value) || 0)}
                    className="text-right"
                    disabled={!canEditFinancials}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İndirim ({discountPercentage.toFixed(1)}%)
                  </label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.discountAmount}
                    onChange={(e) => handlePriceCalculation('discountAmount', parseFloat(e.target.value) || 0)}
                    className="text-right"
                    disabled={!canEditFinancials}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SGK Karşılığı</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.sgkCoverage}
                    onChange={(e) => handleInputChange('sgkCoverage', parseFloat(e.target.value) || 0)}
                    className="text-right"
                    disabled={!canEditFinancials}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satış Fiyatı *</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.salePrice}
                    onChange={(e) => handlePriceCalculation('salePrice', parseFloat(e.target.value) || 0)}
                    className="text-right font-medium"
                    disabled={!canEditFinancials}
                  />
                </div>
              </div>

              {!canEditFinancials && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Mevcut Fiyat:</strong> {formatCurrency(sale.totalAmount)}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Ödeme Yöntemi
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { value: 'cash', label: 'Nakit' },
                  { value: 'credit', label: 'Kredi Kartı' },
                  { value: 'installment', label: 'Taksit' },
                  { value: 'check', label: 'Çek' },
                  { value: 'transfer', label: 'Havale' }
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method.value as any);
                      setHasChanges(true);
                    }}
                    className={`p-2 border rounded text-sm transition-colors ${
                      paymentMethod === method.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'installment' && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taksit Sayısı</label>
                  <select
                    value={installmentCount}
                    onChange={(e) => {
                      setInstallmentCount(parseInt(e.target.value));
                      setHasChanges(true);
                    }}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 6, 9, 12, 18, 24, 36].map(count => (
                      <option key={count} value={count}>{count} Taksit</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <Textarea 
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Satış ile ilgili notlar..." 
                rows={3}
              />
            </div>

            {/* Status Messages */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Change Summary */}
            {hasChanges && !error && !success && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center text-orange-800 mb-2">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="font-medium">Kaydedilmemiş değişiklikler var</span>
                </div>
                <p className="text-sm text-orange-700">
                  Değişikliklerinizi kaydetmek için "Değişiklikleri Kaydet" butonuna tıklayın.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
              disabled={loading || isLoading || !hasChanges || !!error}
            >
              {(loading || isLoading) && <Spinner className="w-4 h-4 mr-2" />}
              {(loading || isLoading) ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSaleModal;
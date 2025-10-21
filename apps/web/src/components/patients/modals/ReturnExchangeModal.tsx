import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Textarea, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Alert,
  Input
} from '@x-ear/ui-web';
import { 
  X, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  ArrowLeftRight,
  Package
} from 'lucide-react';
import { Patient } from '../../../types/patient';

interface Sale {
  id: string;
  productName: string;
  brand: string;
  model: string;
  serialNumber?: string;
  salePrice: number;
  saleDate: string;
  paymentMethod: string;
  status: string;
}

interface ReturnExchangeData {
  saleId: string;
  type: 'return' | 'exchange';
  reason: string;
  notes: string;
  refundAmount?: number;
  newProductId?: string;
  newProductName?: string;
  priceDifference?: number;
}

interface ReturnExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  sale: Sale;
  onReturnExchangeCreate: (data: ReturnExchangeData) => void;
}

export const ReturnExchangeModal: React.FC<ReturnExchangeModalProps> = ({
  isOpen,
  onClose,
  patient,
  sale,
  onReturnExchangeCreate
}) => {
  const [type, setType] = useState<'return' | 'exchange'>('return');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState(sale.salePrice.toString());
  const [newProductName, setNewProductName] = useState('');
  const [priceDifference, setPriceDifference] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const returnReasons = [
    'Müşteri memnuniyetsizliği',
    'Ürün arızası',
    'Yanlış ürün teslimatı',
    'Boyut/model uyumsuzluğu',
    'Garanti kapsamında değişim',
    'Diğer'
  ];

  useEffect(() => {
    if (isOpen) {
      setType('return');
      setReason('');
      setNotes('');
      setRefundAmount(sale.salePrice.toString());
      setNewProductName('');
      setPriceDifference('0');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, sale.salePrice]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!reason.trim()) {
      errors.push('İade/değişim nedeni seçiniz');
    }
    
    if (type === 'return') {
      if (!refundAmount || parseFloat(refundAmount) <= 0) {
        errors.push('Geçerli bir iade tutarı giriniz');
      }
      if (parseFloat(refundAmount) > sale.salePrice) {
        errors.push('İade tutarı satış fiyatından fazla olamaz');
      }
    }
    
    if (type === 'exchange') {
      if (!newProductName.trim()) {
        errors.push('Yeni ürün adı giriniz');
      }
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const returnExchangeData: ReturnExchangeData = {
        saleId: sale.id,
        type,
        reason,
        notes,
        ...(type === 'return' && { refundAmount: parseFloat(refundAmount) }),
        ...(type === 'exchange' && { 
          newProductName,
          priceDifference: parseFloat(priceDifference)
        })
      };
      
      await onReturnExchangeCreate(returnExchangeData);
      setSuccess(true);
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem gerçekleştirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">İade/Değişim İşlemi</h2>
                <p className="text-sm text-gray-600">
                  {patient.firstName} {patient.lastName} - {patient.tcNumber}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Success Message */}
            {success && (
              <Alert variant="success" className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <span>İşlem başarıyla kaydedildi!</span>
              </Alert>
            )}

            {/* Sale Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Package className="w-5 h-5 mr-2 text-gray-600" />
                  Satış Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Ürün:</span>
                    <span className="text-gray-900">{sale.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Marka/Model:</span>
                    <span className="text-gray-900">{sale.brand} {sale.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Seri No:</span>
                    <span className="text-gray-900">{sale.serialNumber || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Satış Fiyatı:</span>
                    <span className="text-gray-900 font-bold">{formatCurrency(sale.salePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Satış Tarihi:</span>
                    <span className="text-gray-900">{formatDate(sale.saleDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Ödeme Yöntemi:</span>
                    <span className="text-gray-900">{sale.paymentMethod}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Return/Exchange Type Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 text-gray-600" />
                  İşlem Türü
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="return"
                      checked={type === 'return'}
                      onChange={(e) => setType(e.target.value as 'return' | 'exchange')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">İade</div>
                      <div className="text-sm text-gray-600">Ürünü iade et ve para iadesi yap</div>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="exchange"
                      checked={type === 'exchange'}
                      onChange={(e) => setType(e.target.value as 'return' | 'exchange')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Değişim</div>
                      <div className="text-sm text-gray-600">Ürünü başka bir ürünle değiştir</div>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Reason Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">İade/Değişim Nedeni</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Neden seçiniz</option>
                  {returnReasons.map((reasonOption) => (
                    <option key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Return Amount (for returns) */}
            {type === 'return' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">İade Tutarı</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={sale.salePrice}
                    placeholder="İade tutarı"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Maksimum iade tutarı: {formatCurrency(sale.salePrice)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Exchange Details (for exchanges) */}
            {type === 'exchange' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Değişim Detayları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yeni Ürün Adı
                    </label>
                    <Input
                      type="text"
                      placeholder="Değişim yapılacak ürün adı"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fiyat Farkı
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Fiyat farkı (+ ek ödeme, - iade)"
                      value={priceDifference}
                      onChange={(e) => setPriceDifference(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Pozitif değer ek ödeme, negatif değer iade anlamına gelir
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Notlar</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={4}
                  placeholder="İade/değişim ile ilgili notlarınızı buraya yazabilirsiniz..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
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
                disabled={isLoading}
                className="px-6 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{type === 'return' ? 'İade İşlemini Tamamla' : 'Değişim İşlemini Tamamla'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnExchangeModal;
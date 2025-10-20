import React, { useState } from 'react';
import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import { X, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { Patient } from '../../../types/patient';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onSaleCreate: (saleData: any) => void;
  loading?: boolean;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSaleCreate,
  loading = false
}) => {
  const [saleType, setSaleType] = useState<'device' | 'service' | 'accessory'>('device');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'installment' | 'check' | 'transfer'>('cash');
  const [installmentCount, setInstallmentCount] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    const saleData = {
      patientId: patient.id,
      saleType,
      productName: formData.get('productName'),
      brand: formData.get('brand'),
      model: formData.get('model'),
      serialNumber: formData.get('serialNumber'),
      listPrice: parseFloat(formData.get('listPrice') as string) || 0,
      salePrice: parseFloat(formData.get('salePrice') as string) || 0,
      discountAmount: parseFloat(formData.get('discountAmount') as string) || 0,
      paymentMethod,
      installmentCount: paymentMethod === 'installment' ? installmentCount : 1,
      downPayment: paymentMethod === 'installment' ? parseFloat(formData.get('downPayment') as string) || 0 : 0,
      notes: formData.get('notes'),
      saleDate: new Date().toISOString()
    };

    onSaleCreate(saleData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Yeni Satış</h3>
          <Button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Ad Soyad:</span> {patient.firstName} {patient.lastName}
                </div>
                <div>
                  <span className="font-medium">TC No:</span> {patient.tcNumber}
                </div>
                <div>
                  <span className="font-medium">Telefon:</span> {patient.phone}
                </div>
                <div>
                  <span className="font-medium">E-posta:</span> {patient.email}
                </div>
              </div>
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
                    onClick={() => setSaleType(type.value as any)}
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
              <h4 className="font-medium text-gray-900">Ürün Bilgileri</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
                  <Input name="productName" placeholder="Ürün adını giriniz" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                  <Input name="brand" placeholder="Marka" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <Input name="model" placeholder="Model" />
                </div>
                {saleType === 'device' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
                    <Input name="serialNumber" placeholder="Seri numarası" />
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
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Liste Fiyatı</label>
                  <Input 
                    name="listPrice" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İndirim</label>
                  <Input 
                    name="discountAmount" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satış Fiyatı *</label>
                  <Input 
                    name="salePrice" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="text-right font-medium"
                    required
                  />
                </div>
              </div>
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
                    onClick={() => setPaymentMethod(method.value as any)}
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
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taksit Sayısı</label>
                    <select
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 6, 9, 12, 18, 24, 36].map(count => (
                        <option key={count} value={count}>{count} Taksit</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Peşinat</label>
                    <Input 
                      name="downPayment" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="text-right"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <Textarea 
                name="notes" 
                placeholder="Satış ile ilgili notlar..." 
                rows={3}
              />
            </div>
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
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : 'Satış Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSaleModal;
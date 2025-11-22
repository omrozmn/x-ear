import { Input, Textarea, DatePicker } from '@x-ear/ui-web';
import { useState } from 'react';
import { ShoppingCart, Package, Truck, Building2, CreditCard } from 'lucide-react';

interface AdditionalInfoSectionProps {
  orderInfo?: any;
  deliveryInfo?: any;
  shipmentInfo?: any;
  bankInfo?: any;
  paymentTerms?: any;
  onChange: (field: string, value: any) => void;
}

export function AdditionalInfoSection({
  orderInfo,
  deliveryInfo,
  shipmentInfo,
  bankInfo,
  paymentTerms,
  onChange
}: AdditionalInfoSectionProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ek Bilgiler</h3>
      
      {/* Toggle Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <button
          type="button"
          onClick={() => toggleSection('order')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'order'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}>
          <ShoppingCart size={16} />
          Sipariş Bilgisi
        </button>
        
        <button
          type="button"
          onClick={() => toggleSection('delivery')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'delivery'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}>
          <Package size={16} />
          İrsaliye Bilgisi
        </button>
        
        <button
          type="button"
          onClick={() => toggleSection('shipment')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'shipment'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}>
          <Truck size={16} />
          Sevk Bilgisi
        </button>
        
        <button
          type="button"
          onClick={() => toggleSection('bank')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'bank'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}>
          <Building2 size={16} />
          Banka Bilgisi
        </button>
        
        <button
          type="button"
          onClick={() => toggleSection('payment')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'payment'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}>
          <CreditCard size={16} />
          Ödeme Koşulları
        </button>
      </div>

      {/* Sipariş Bilgisi */}
      {activeSection === 'order' && (
        <div className="bg-gray-50 rounded-lg p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Sipariş Bilgileri</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sipariş Numarası
              </label>
              <Input
                type="text"
                value={orderInfo?.orderNumber || ''}
                onChange={(e) => onChange('orderInfo', {
                  ...orderInfo,
                  orderNumber: e.target.value
                })}
                className="w-full"
                placeholder="SIP-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sipariş Tarihi
              </label>
              <DatePicker
                value={orderInfo?.orderDate ? new Date(orderInfo.orderDate) : null}
                onChange={(date) => onChange('orderInfo', {
                  ...orderInfo,
                  orderDate: date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : ''
                })}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sipariş Notu
              </label>
              <Textarea
                value={orderInfo?.orderNote || ''}
                onChange={(e) => onChange('orderInfo', {
                  ...orderInfo,
                  orderNote: e.target.value
                })}
                rows={2}
                className="w-full"
                placeholder="Sipariş ile ilgili notlar..."
              />
            </div>
          </div>
        </div>
      )}

      {/* İrsaliye Bilgisi */}
      {activeSection === 'delivery' && (
        <div className="bg-gray-50 rounded-lg p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-gray-900 mb-3">İrsaliye Bilgileri</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İrsaliye Numarası
              </label>
              <Input
                type="text"
                value={deliveryInfo?.deliveryNumber || ''}
                onChange={(e) => onChange('deliveryInfo', {
                  ...deliveryInfo,
                  deliveryNumber: e.target.value
                })}
                className="w-full"
                placeholder="IRS-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İrsaliye Tarihi
              </label>
              <DatePicker
                value={deliveryInfo?.deliveryDate ? new Date(deliveryInfo.deliveryDate) : null}
                onChange={(date) => onChange('deliveryInfo', {
                  ...deliveryInfo,
                  deliveryDate: date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : ''
                })}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teslim Alan
              </label>
              <Input
                type="text"
                value={deliveryInfo?.receiverName || ''}
                onChange={(e) => onChange('deliveryInfo', {
                  ...deliveryInfo,
                  receiverName: e.target.value
                })}
                className="w-full"
                placeholder="Teslim alan kişi adı"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sevk Bilgisi */}
      {activeSection === 'shipment' && (
        <div className="bg-gray-50 rounded-lg p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Sevk Bilgileri</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sevk Tarihi
              </label>
              <DatePicker
                value={shipmentInfo?.shipmentDate ? new Date(shipmentInfo.shipmentDate) : null}
                onChange={(date) => onChange('shipmentInfo', {
                  ...shipmentInfo,
                  shipmentDate: date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : ''
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kargo Firması
              </label>
              <Input
                type="text"
                value={shipmentInfo?.carrier || ''}
                onChange={(e) => onChange('shipmentInfo', {
                  ...shipmentInfo,
                  carrier: e.target.value
                })}
                className="w-full"
                placeholder="Örn: Aras Kargo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Takip Numarası
              </label>
              <Input
                type="text"
                value={shipmentInfo?.trackingNumber || ''}
                onChange={(e) => onChange('shipmentInfo', {
                  ...shipmentInfo,
                  trackingNumber: e.target.value
                })}
                className="w-full"
                placeholder="Kargo takip numarası"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sevk Adresi
              </label>
              <Textarea
                value={shipmentInfo?.shipmentAddress?.address || ''}
                onChange={(e) => onChange('shipmentInfo', {
                  ...shipmentInfo,
                  shipmentAddress: {
                    ...shipmentInfo?.shipmentAddress,
                    address: e.target.value
                  }
                })}
                rows={2}
                className="w-full"
                placeholder="Sevk adresi..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Banka Bilgisi */}
      {activeSection === 'bank' && (
        <div className="bg-gray-50 rounded-lg p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Banka Hesap Bilgileri</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banka Adı
              </label>
              <Input
                type="text"
                value={bankInfo?.bankName || ''}
                onChange={(e) => onChange('bankInfo', {
                  ...bankInfo,
                  bankName: e.target.value
                })}
                className="w-full"
                placeholder="Örn: Ziraat Bankası"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hesap Numarası
              </label>
              <Input
                type="text"
                value={bankInfo?.accountNumber || ''}
                onChange={(e) => onChange('bankInfo', {
                  ...bankInfo,
                  accountNumber: e.target.value
                })}
                className="w-full"
                placeholder="1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IBAN
              </label>
              <Input
                type="text"
                value={bankInfo?.iban || ''}
                onChange={(e) => onChange('bankInfo', {
                  ...bankInfo,
                  iban: e.target.value
                })}
                className="w-full"
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SWIFT Kodu
              </label>
              <Input
                type="text"
                value={bankInfo?.swiftCode || ''}
                onChange={(e) => onChange('bankInfo', {
                  ...bankInfo,
                  swiftCode: e.target.value
                })}
                className="w-full"
                placeholder="TCZBTR2AXXX"
              />
            </div>
          </div>
        </div>
      )}

      {/* Ödeme Koşulları */}
      {activeSection === 'payment' && (
        <div className="bg-gray-50 rounded-lg p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Ödeme Koşulları</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ödeme Vadesi (Gün)
              </label>
              <Input
                type="number"
                value={paymentTerms?.paymentDays || ''}
                onChange={(e) => onChange('paymentTerms', {
                  ...paymentTerms,
                  paymentDays: parseInt(e.target.value) || 0
                })}
                className="w-full"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Erken Ödeme İndirimi (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={paymentTerms?.earlyPaymentDiscount || ''}
                onChange={(e) => onChange('paymentTerms', {
                  ...paymentTerms,
                  earlyPaymentDiscount: parseFloat(e.target.value) || 0
                })}
                className="w-full"
                placeholder="2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geç Ödeme Cezası (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={paymentTerms?.latePaymentPenalty || ''}
                onChange={(e) => onChange('paymentTerms', {
                  ...paymentTerms,
                  latePaymentPenalty: parseFloat(e.target.value) || 0
                })}
                className="w-full"
                placeholder="1.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ödeme Koşulu
              </label>
              <Input
                type="text"
                value={paymentTerms?.paymentTerm || ''}
                onChange={(e) => onChange('paymentTerms', {
                  ...paymentTerms,
                  paymentTerm: e.target.value
                })}
                className="w-full"
                placeholder="Örn: Peşin, 30 gün vade"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

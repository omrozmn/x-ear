import { Input, Textarea, DatePicker, Button } from '@x-ear/ui-web';
import { useState } from 'react';
import { ShoppingCart, Package, Truck, Building2, CreditCard } from 'lucide-react';
import type { 
  OrderInfo, 
  DeliveryInfo, 
  ShipmentInfoData, 
  BankInfoData, 
  PaymentTermsData 
} from '../../types/invoice';

interface AdditionalInfoSectionProps {
  documentKind?: 'invoice' | 'despatch';
  orderInfo?: OrderInfo;
  deliveryInfo?: DeliveryInfo;
  shipmentInfo?: ShipmentInfoData;
  bankInfo?: BankInfoData;
  paymentTerms?: PaymentTermsData;
  companyBankDefaults?: {
    bankName?: string;
    iban?: string;
    accountHolder?: string;
  };
  onChange: (field: string, value: OrderInfo | DeliveryInfo | ShipmentInfoData | BankInfoData | PaymentTermsData) => void;
}

export function AdditionalInfoSection({
  documentKind = 'invoice',
  orderInfo,
  deliveryInfo,
  shipmentInfo,
  bankInfo,
  paymentTerms,
  companyBankDefaults,
  onChange
}: AdditionalInfoSectionProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="bg-card rounded-2xl shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Ek Bilgiler</h3>
      
      {/* Toggle Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Button
          type="button"
          onClick={() => toggleSection('order')}
          variant={activeSection === 'order' ? 'primary' : 'outline'}
          className={`px-4 py-2 rounded-2xl border text-sm font-medium transition-colors flex items-center gap-2`}>
          <ShoppingCart size={16} />
          Sipariş Bilgisi
        </Button>
        
        <Button
          type="button"
          onClick={() => toggleSection('delivery')}
          variant={activeSection === 'delivery' ? 'primary' : 'outline'}
          className={`px-4 py-2 rounded-2xl border text-sm font-medium transition-colors flex items-center gap-2`}>
          <Package size={16} />
          İrsaliye Bilgisi
        </Button>
        
        <Button
          type="button"
          onClick={() => toggleSection('shipment')}
          variant={activeSection === 'shipment' ? 'primary' : 'outline'}
          className={`px-4 py-2 rounded-2xl border text-sm font-medium transition-colors flex items-center gap-2`}>
          <Truck size={16} />
          Sevk Bilgisi
        </Button>
        
        <Button
          type="button"
          onClick={() => toggleSection('bank')}
          variant={activeSection === 'bank' ? 'primary' : 'outline'}
          className={`px-4 py-2 rounded-2xl border text-sm font-medium transition-colors flex items-center gap-2`}>
          <Building2 size={16} />
          Banka Bilgisi
        </Button>
        
        <Button
          type="button"
          onClick={() => toggleSection('payment')}
          variant={activeSection === 'payment' ? 'primary' : 'outline'}
          className={`px-4 py-2 rounded-2xl border text-sm font-medium transition-colors flex items-center gap-2`}>
          <CreditCard size={16} />
          Ödeme Koşulları
        </Button>
      </div>

      {/* Sipariş Bilgisi */}
      {activeSection === 'order' && (
        <div className="bg-muted rounded-2xl p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-foreground mb-3">Sipariş Bilgileri</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Sipariş Numarası
              </label>
              <Input
                data-testid="additional-order-number"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                Sipariş Tarihi
              </label>
              <DatePicker
                data-testid="additional-order-date"
                value={orderInfo?.orderDate ? new Date(orderInfo.orderDate) : null}
                onChange={(date) => onChange('orderInfo', {
                  ...orderInfo,
                  orderDate: date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : ''
                })}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                Sipariş Notu
              </label>
              <Textarea
                data-testid="additional-order-note"
                value={(orderInfo as Record<string, unknown>)?.orderNote as string || ''}
                onChange={(e) => onChange('orderInfo', {
                  ...orderInfo,
                  orderNote: e.target.value
                } as OrderInfo)}
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
        <div className="bg-muted rounded-2xl p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-foreground mb-3">İrsaliye Bilgileri</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                İrsaliye Numarası
              </label>
              <Input
                data-testid="additional-delivery-number"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                İrsaliye Tarihi
              </label>
              <DatePicker
                data-testid="additional-delivery-date"
                value={deliveryInfo?.deliveryDate ? new Date(deliveryInfo.deliveryDate) : null}
                onChange={(date) => onChange('deliveryInfo', {
                  ...deliveryInfo,
                  deliveryDate: date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : ''
                })}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                Teslim Alan
              </label>
              <Input
                data-testid="additional-delivery-receiver"
                type="text"
                value={(deliveryInfo as Record<string, unknown>)?.receiverName as string || ''}
                onChange={(e) => onChange('deliveryInfo', {
                  ...deliveryInfo,
                  receiverName: e.target.value
                } as DeliveryInfo)}
                className="w-full"
                placeholder="Teslim alan kişi adı"
              />
            </div>
            <div className="md:col-span-2 border-t border-border pt-4">
              <label className="flex items-start gap-3">
                {/* eslint-disable-next-line no-restricted-syntax */}
                <input
                  data-testid="additional-linked-document-toggle"
                  data-allow-raw="true"
                  type="checkbox"
                  checked={Boolean(deliveryInfo?.createLinkedDocument)}
                  onChange={(e) => onChange('deliveryInfo', {
                    ...deliveryInfo,
                    createLinkedDocument: e.target.checked
                  } as DeliveryInfo)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {documentKind === 'despatch' ? 'Bağlı fatura oluştur' : 'Bağlı e-irsaliye oluştur'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {documentKind === 'despatch'
                      ? 'Bu e-irsaliye başarılı olduktan sonra bağlı fatura da oluşturulur.'
                      : 'Bu fatura başarılı olduktan sonra bağlı e-irsaliye de oluşturulur.'}
                  </span>
                </span>
              </label>
            </div>
            {documentKind === 'despatch' && deliveryInfo?.createLinkedDocument && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Bağlı Fatura Tipi
                  </label>
                  {/* eslint-disable-next-line no-restricted-syntax */}
                  <select
                    data-testid="additional-linked-invoice-type"
                    data-allow-raw="true"
                    value={deliveryInfo?.linkedInvoiceType || '0'}
                    onChange={(e) => onChange('deliveryInfo', {
                      ...deliveryInfo,
                      linkedInvoiceType: e.target.value
                    } as DeliveryInfo)}
                    className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <option value="0">Satış Faturası</option>
                    <option value="13">İstisna</option>
                    <option value="11">Tevkifat</option>
                    <option value="12">Özel Matrah</option>
                    <option value="27">İhraç Kayıtlı</option>
                    <option value="14">SGK</option>
                    <option value="earsiv">E-Arşiv</option>
                    <option value="hks">HKS</option>
                    <option value="sarj">Şarj</option>
                    <option value="sarjanlik">Şarj Anlık</option>
                    <option value="yolcu">Yolcu Beraberi</option>
                    <option value="otv">ÖTV</option>
                    <option value="hastane">Hastane</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Bağlı Fatura Senaryosu
                  </label>
                  {/* eslint-disable-next-line no-restricted-syntax */}
                  <select
                    data-testid="additional-linked-scenario"
                    data-allow-raw="true"
                    value={deliveryInfo?.linkedScenario || 'other'}
                    onChange={(e) => onChange('deliveryInfo', {
                      ...deliveryInfo,
                      linkedScenario: e.target.value
                    } as DeliveryInfo)}
                    className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <option value="other">Diğer</option>
                    <option value="export">İhracat</option>
                    <option value="government">Kamu</option>
                    <option value="medical">Tıbbi</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sevk Bilgisi */}
      {activeSection === 'shipment' && (
        <div className="bg-muted rounded-2xl p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-foreground mb-3">Sevk Bilgileri</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Sevk Tarihi
              </label>
              <DatePicker
                data-testid="additional-shipment-date"
                value={shipmentInfo?.shipmentDate ? new Date(shipmentInfo.shipmentDate) : null}
                onChange={(date) => onChange('shipmentInfo', {
                  ...shipmentInfo,
                  shipmentDate: date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : ''
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Kargo Firması
              </label>
              <Input
                data-testid="additional-shipment-carrier"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                Takip Numarası
              </label>
              <Input
                data-testid="additional-shipment-tracking"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                Sevk Adresi
              </label>
              <Textarea
                data-testid="additional-shipment-address"
                value={shipmentInfo?.shipmentAddress?.address || ''}
                onChange={(e) => onChange('shipmentInfo', {
                  ...shipmentInfo,
                  shipmentAddress: {
                    ...shipmentInfo?.shipmentAddress,
                    address: e.target.value
                  }
                } as unknown as ShipmentInfoData)}
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
        <div className="bg-muted rounded-2xl p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-foreground mb-3">Banka Hesap Bilgileri</h4>
          <div className="mb-4">
            <label className="flex items-start gap-3">
              {/* eslint-disable-next-line no-restricted-syntax */}
              <input
                data-testid="additional-bank-use-company-defaults"
                data-allow-raw="true"
                type="checkbox"
                checked={Boolean(bankInfo?.useCompanyDefaults)}
                onChange={(e) => onChange('bankInfo', {
                  ...bankInfo,
                  useCompanyDefaults: e.target.checked,
                  bankName: e.target.checked ? (companyBankDefaults?.bankName || '') : (bankInfo?.bankName || ''),
                  iban: e.target.checked ? (companyBankDefaults?.iban || '') : (bankInfo?.iban || ''),
                  accountHolder: e.target.checked ? (companyBankDefaults?.accountHolder || '') : (bankInfo?.accountHolder || '')
                })}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Firma ayarlarındaki banka bilgilerini kullan</span>
                <span className="block text-xs text-muted-foreground">İşaretlenirse şirket ayarlarındaki banka adı, IBAN ve hesap sahibi otomatik map edilir.</span>
              </span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Banka Adı
              </label>
              <Input
                data-testid="additional-bank-name"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                Hesap Sahibi
              </label>
              <Input
                data-testid="additional-bank-account-holder"
                type="text"
                value={bankInfo?.accountHolder || ''}
                onChange={(e) => onChange('bankInfo', {
                  ...bankInfo,
                  accountHolder: e.target.value
                })}
                className="w-full"
                placeholder="Firma Ünvanı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Hesap Numarası
              </label>
              <Input
                data-testid="additional-bank-account-number"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                IBAN
              </label>
              <Input
                data-testid="additional-bank-iban"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                SWIFT Kodu
              </label>
              <Input
                data-testid="additional-bank-swift"
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
        <div className="bg-muted rounded-2xl p-4 animate-fade-in">
          <h4 className="text-sm font-medium text-foreground mb-3">Ödeme Koşulları</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Vade Tarihi
              </label>
              <DatePicker
                data-testid="additional-payment-due-date"
                value={paymentTerms?.dueDate ? new Date(paymentTerms.dueDate) : null}
                onChange={(date) => onChange('paymentTerms', {
                  ...paymentTerms,
                  dueDate: date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : ''
                } as PaymentTermsData)}
                minDate={new Date()}
                maxDate={new Date(new Date().getFullYear() + 5, 11, 31)}
                placeholder="Tarih seçin"
                className="w-full"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ödeme vade tarihi (opsiyonel)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Ödeme Vadesi (Gün)
              </label>
              <Input
                data-testid="additional-payment-days"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                Erken Ödeme İndirimi (%)
              </label>
              <Input
                data-testid="additional-payment-early-discount"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                Geç Ödeme Cezası (%)
              </label>
              <Input
                data-testid="additional-payment-late-penalty"
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
              <label className="block text-sm font-medium text-foreground mb-1">
                Ödeme Koşulu
              </label>
              <Input
                data-testid="additional-payment-term"
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

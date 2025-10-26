import React from 'react';
import { Card, CardContent, Input, Label, Textarea, Button } from '@x-ear/ui-web';
import { CreditCard, Calendar, DollarSign, FileText, Percent, Package } from 'lucide-react';

interface PaymentInfoProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  saleDate: string;
  onSaleDateChange: (date: string) => void;
  paidAmount: string;
  onPaidAmountChange: (amount: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  sgkApprovalNumber: string;
  onSgkApprovalNumberChange: (number: string) => void;
  sgkApprovalDate: string;
  onSgkApprovalDateChange: (date: string) => void;
  // Legacy form fields
  discountAmount?: string;
  onDiscountAmountChange?: (amount: string) => void;
  vatRate?: string;
  onVatRateChange?: (rate: string) => void;
  productBarcode?: string;
  onProductBarcodeChange?: (barcode: string) => void;
  productSerialNumber?: string;
  onProductSerialNumberChange?: (serial: string) => void;
}

export const PaymentInfo: React.FC<PaymentInfoProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  saleDate,
  onSaleDateChange,
  paidAmount,
  onPaidAmountChange,
  notes,
  onNotesChange,
  sgkApprovalNumber,
  onSgkApprovalNumberChange,
  sgkApprovalDate,
  onSgkApprovalDateChange,
  discountAmount = '0',
  onDiscountAmountChange,
  vatRate = '18',
  onVatRateChange,
  productBarcode = '',
  onProductBarcodeChange,
  productSerialNumber = '',
  onProductSerialNumberChange
}) => {
  // Kullanılmayan import kaldırıldı
  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat('tr-TR', {
  //     style: 'currency',
  //     currency: 'TRY'
  //   }).format(amount);
  // };

  const paymentMethods = [
    { value: 'cash', label: 'Nakit', icon: DollarSign },
    { value: 'card', label: 'Kredi Kartı', icon: CreditCard },
    { value: 'transfer', label: 'Havale/EFT', icon: CreditCard },
    { value: 'installment', label: 'Taksit', icon: CreditCard },
    { value: 'promissory_note', label: 'Senet', icon: FileText }
  ];

  return (
    <Card className="bg-white border-gray-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-800">Ödeme Bilgileri</h3>
        </div>

        {/* Payment Method */}
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-2 block">
            Ödeme Yöntemi
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((method) => {
              const IconComponent = method.icon;
              return (
                <Button
                  key={method.value}
                  type="button"
                  onClick={() => onPaymentMethodChange(method.value)}
                  variant={paymentMethod === method.value ? "default" : "outline"}
                  className="p-2 text-center flex items-center justify-center gap-1"
                  data-allow-raw="true"
                >
                  <IconComponent className="w-3 h-3" />
                  <span className="text-xs font-medium">{method.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Sale Date */}
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1 block">
            Satış Tarihi
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Calendar className="w-3 h-3 text-gray-400" />
            </div>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => onSaleDateChange(e.target.value)}
              className="pl-6"
            />
          </div>
        </div>

        {/* Paid Amount */}
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1 block">
            Ödenen Tutar
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <DollarSign className="w-3 h-3 text-gray-400" />
            </div>
            <Input
              type="number"
              value={paidAmount}
              onChange={(e) => onPaidAmountChange(e.target.value)}
              className="pl-6"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {/* Discount Amount - Legacy Field */}
        {onDiscountAmountChange && (
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1 block">
              İndirim Tutarı (TL)
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Percent className="w-3 h-3 text-gray-400" />
              </div>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => onDiscountAmountChange(e.target.value)}
                className="pl-6"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* VAT Rate - Legacy Field */}
        {onVatRateChange && (
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1 block">
              KDV Oranı (%)
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Percent className="w-3 h-3 text-gray-400" />
              </div>
              <Input
                type="number"
                value={vatRate}
                onChange={(e) => onVatRateChange(e.target.value)}
                className="pl-6"
                step="1"
                min="0"
                max="100"
                placeholder="18"
              />
            </div>
          </div>
        )}

        {/* Product Details - Legacy Fields */}
        {(onProductBarcodeChange || onProductSerialNumberChange) && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Package className="w-3 h-3 text-blue-600" />
              <h4 className="text-xs font-semibold text-gray-700">Ürün Detayları</h4>
            </div>
            
            {onProductBarcodeChange && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">
                  Barkod
                </Label>
                <Input
                  type="text"
                  value={productBarcode}
                  onChange={(e) => onProductBarcodeChange(e.target.value)}
                  placeholder="Ürün barkodu"
                  className="font-mono text-xs"
                />
              </div>
            )}

            {onProductSerialNumberChange && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">
                  Seri Numarası
                </Label>
                <Input
                  type="text"
                  value={productSerialNumber}
                  onChange={(e) => onProductSerialNumberChange(e.target.value)}
                  placeholder="Ürün seri numarası"
                  className="font-mono text-xs"
                />
              </div>
            )}
          </div>
        )}

        {/* SGK Information */}
        <div className="space-y-3 pt-2 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700">SGK Bilgileri</h4>
          
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1 block">
              SGK Onay Numarası
            </Label>
            <Input
              type="text"
              value={sgkApprovalNumber}
              onChange={(e) => onSgkApprovalNumberChange(e.target.value)}
              placeholder="SGK onay numarası"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1 block">
              SGK Onay Tarihi
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Calendar className="w-3 h-3 text-gray-400" />
              </div>
              <Input
                type="date"
                value={sgkApprovalDate}
                onChange={(e) => onSgkApprovalDateChange(e.target.value)}
                className="pl-6"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1 block">
            Notlar
          </Label>
          <div className="relative">
            <div className="absolute top-2 left-2 pointer-events-none">
              <FileText className="w-3 h-3 text-gray-400" />
            </div>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Satış ile ilgili notlar..."
              className="pl-6 min-h-[60px] resize-none"
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
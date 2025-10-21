import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Button
} from '@x-ear/ui-web';
import { CreditCard, DollarSign } from 'lucide-react';

interface PaymentOptionsComponentProps {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  installmentCount: string;
  onInstallmentCountChange: (count: string) => void;
  downPayment: string;
  onDownPaymentChange: (amount: string) => void;
  interestRate: string;
  onInterestRateChange: (rate: string) => void;
  installmentAmount: number;
  totalAmount: number;
}

export const PaymentOptionsComponent: React.FC<PaymentOptionsComponentProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  installmentCount,
  onInstallmentCountChange,
  downPayment,
  onDownPaymentChange,
  interestRate,
  onInterestRateChange,
  installmentAmount,
  totalAmount
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const paymentMethods = [
    { value: 'cash', label: 'Nakit', icon: DollarSign },
    { value: 'credit', label: 'Kredi Kartı', icon: CreditCard },
    { value: 'installment', label: 'Taksitli', icon: CreditCard },
    { value: 'check', label: 'Çek', icon: DollarSign },
    { value: 'transfer', label: 'Havale/EFT', icon: DollarSign }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-indigo-600" />
          Ödeme Seçenekleri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 pt-4 border-t">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ödeme Yöntemi
              </label>
              <div className="space-y-2">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <label key={method.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={(e) => onPaymentMethodChange(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{method.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Satış Tarihi
              </label>
              <Input
                type="date"
                name="saleDate"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>
          </div>

          {/* Installment Options */}
          {paymentMethod === 'installment' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taksit Sayısı
                </label>
                <Input
                  type="number"
                  min="2"
                  max="36"
                  placeholder="Taksit sayısı"
                  value={installmentCount}
                  onChange={(e) => onInstallmentCountChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faiz Oranı (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Faiz oranı"
                  value={interestRate}
                  onChange={(e) => onInterestRateChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peşinat
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Peşinat tutarı"
                  value={downPayment}
                  onChange={(e) => onDownPaymentChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Installment Preview */}
          {paymentMethod === 'installment' && installmentCount && (
            <div className="space-y-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-sm font-medium text-purple-700">Taksit Sayısı:</span>
                  <div className="text-lg font-bold text-purple-800">{installmentCount}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-purple-700">Aylık Taksit:</span>
                  <div className="text-lg font-bold text-purple-800">
                    {formatCurrency(installmentAmount)}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-purple-200 rounded-md">
                <div className="text-sm text-purple-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Toplam Tutar:</span>
                    <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>Peşinat:</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(downPayment) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kalan Tutar:</span>
                    <span className="font-medium">
                      {formatCurrency(totalAmount - (parseFloat(downPayment) || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-purple-800 border-t pt-1">
                    <span>{installmentCount} x Aylık:</span>
                    <span>{formatCurrency(installmentAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentOptionsComponent;
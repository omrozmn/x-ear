import React from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button
} from '@x-ear/ui-web';
import { CreditCard, DollarSign, AlertCircle } from 'lucide-react';
import type { PaymentRecord } from '../types';

interface PaymentSummaryProps {
  totalPaid: number;
  remainingBalance: number;
  discountPercentage: number;
  hasPayments: boolean;
  paymentRecords: PaymentRecord[];
  salePrice: number;
  listPrice: number;
  discountAmount: number;
  onShowPaymentModal: () => void;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  totalPaid,
  remainingBalance,
  discountPercentage,
  hasPayments,
  paymentRecords,
  salePrice,
  listPrice,
  discountAmount,
  onShowPaymentModal
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: PaymentRecord['status']) => {
    const statusConfig = {
      completed: { variant: 'success' as const, label: 'Tamamlandı' },
      pending: { variant: 'warning' as const, label: 'Beklemede' },
      cancelled: { variant: 'danger' as const, label: 'İptal' }
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Ödeme Özeti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Liste Fiyatı:</span>
              <span className="font-medium">{formatCurrency(listPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">İndirim:</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(discountAmount)} ({discountPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Satış Fiyatı:</span>
              <span className="font-bold text-lg">{formatCurrency(salePrice)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Ödenen:</span>
              <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Kalan:</span>
              <span className={`font-medium ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(remainingBalance)}
              </span>
            </div>
            {remainingBalance > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Ödeme bekliyor</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Records */}
        {hasPayments && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Ödeme Geçmişi</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {paymentRecords.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.paymentMethod} • {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                    </div>
                    {payment.notes && (
                      <div className="text-xs text-gray-400 mt-1">{payment.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onShowPaymentModal}
            className="flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Ödeme Yönet
          </Button>
          
          {remainingBalance > 0 && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onShowPaymentModal}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Ödeme Al
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
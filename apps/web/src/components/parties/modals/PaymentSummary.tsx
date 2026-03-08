import React, { useState } from 'react';
import { Button, Alert } from '@x-ear/ui-web';
import { CreditCard, AlertCircle } from 'lucide-react';
import type { SaleRead } from '@/api/client/sales.client';
import type { ExtendedSaleRead } from '@/types/extended-sales';
import PaymentTrackingModal from '../../payments/PaymentTrackingModal';
import { useListPartyPaymentRecords } from '@/api/client/payments.client';
import { unwrapArray } from '@/utils/response-unwrap';

interface PaymentRecord {
  id: string;
  saleId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  notes?: string;
}

interface PaymentSummaryProps {
  // Accept the extended type so parent can pass it
  sale: SaleRead;
  onPaymentUpdate?: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
};

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({ sale: rawSale, onPaymentUpdate }) => {
  const sale = rawSale as unknown as ExtendedSaleRead;
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Load payment records using Orval hook
  const { data: paymentRecordsResponse } = useListPartyPaymentRecords(sale.partyId, undefined, {
    query: {
      enabled: !!sale.partyId
    }
  });

  // Unwrap and filter payment records for this sale
  const allPaymentRecords = unwrapArray<PaymentRecord>(paymentRecordsResponse) || [];
  const paymentRecords = allPaymentRecords.filter(p => p.saleId === sale.id);

  // Calculate payment totals from actual payment records
  const totalPaid = paymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
  
  const totalAmount = sale.totalAmount || 0;
  const remainingBalance = totalAmount - totalPaid;
  const hasPayments = paymentRecords.length > 0;

  const handlePaymentUpdate = () => {
    onPaymentUpdate?.();
  };

  return (
    <>
      {/* Payment Summary Card */}
      {hasPayments ? (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center">
              <CreditCard className="w-4 h-4 mr-2" />
              Ödeme Özeti
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPaymentModal(true);
              }}
              className="text-xs"
            >
              Ödeme Takibi
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Toplam:</span>
              <span className="text-base font-semibold">{formatCurrency(sale.totalAmount || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Ödenen:</span>
              <span className="text-base font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Kalan:</span>
              <span className={`text-base font-semibold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>

          {paymentRecords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-300">
              <div className="text-xs text-gray-600">
                Son ödeme: {new Date(paymentRecords[paymentRecords.length - 1].paymentDate).toLocaleDateString('tr-TR')}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* No Payments Warning */}
      {!hasPayments && sale.totalAmount && sale.totalAmount > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertCircle className="w-4 h-4" />
          <div className="flex items-center justify-between w-full">
            <span>Bu satış için henüz ödeme kaydı bulunmuyor.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentModal(true)}
              className="ml-2 text-xs"
            >
              Ödeme Ekle
            </Button>
          </div>
        </Alert>
      )}

      {/* Payment Tracking Modal */}
      <PaymentTrackingModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        // We pass 'sale' (ExtendedSaleRead) to 'sale' prop of PaymentTrackingModal
        // PaymentTrackingModal must accept ExtendedSaleRead or compatible
        sale={sale as SaleRead}
        onPaymentUpdate={handlePaymentUpdate}
      />
    </>
  );
};

export default PaymentSummary;
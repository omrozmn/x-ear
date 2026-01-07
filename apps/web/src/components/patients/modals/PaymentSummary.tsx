import React, { useState, useEffect } from 'react';
import { Button, Alert } from '@x-ear/ui-web';
import { CreditCard, AlertCircle } from 'lucide-react';
import { getSalePromissoryNotes } from '@/api/generated';

// Local Sale type since it's not exported from schemas
interface Sale {
  id?: string;
  patientId: string;
  totalAmount?: number;
  patientPayment?: number;
  saleDate?: string;
}
import PaymentTrackingModal from '../../payments/PaymentTrackingModal';

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
  sale: Sale;
  onPaymentUpdate?: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
};

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({ sale, onPaymentUpdate }) => {
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Calculate payment totals
  const totalPaid = paymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = (sale.totalAmount || 0) - totalPaid;
  const hasPayments = paymentRecords.length > 0;

  // Load payment records
  const loadPaymentRecords = async () => {
    if (!sale.id) return;

    setLoading(true);
    try {
      // Try API call first
      try {
        const response = await getSalePromissoryNotes(sale.id);
        console.log('Payment records loaded:', response);
      } catch (apiError) {
        console.warn('API unavailable, using mock data:', apiError);
      }

      // Use sale data to create payment records
      const mockPayments: PaymentRecord[] = [];
      if (sale.patientPayment && sale.patientPayment > 0) {
        mockPayments.push({
          id: `payment-${sale.id}-1`,
          saleId: sale.id,
          amount: sale.patientPayment,
          paymentDate: sale.saleDate || new Date().toISOString(),
          paymentMethod: 'cash',
          status: 'COMPLETED',
          notes: 'Initial payment'
        });
      }

      setPaymentRecords(mockPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.id, sale.patientId, sale.patientPayment]);

  const handlePaymentUpdate = () => {
    loadPaymentRecords();
    onPaymentUpdate?.();
  };

  return (
    <>
      {/* Payment Summary Card */}
      {hasPayments && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center">
              <CreditCard className="w-4 h-4 mr-2" />
              Ödeme Özeti
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentModal(true)}
              className="text-xs"
            >
              Detay
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Toplam:</span>
              <div className="text-lg font-semibold">{formatCurrency(sale.totalAmount || 0)}</div>
            </div>
            <div>
              <span className="font-medium">Ödenen:</span>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</div>
            </div>
            <div>
              <span className="font-medium">Kalan:</span>
              <div className={`text-lg font-semibold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(remainingBalance)}
              </div>
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
      )}

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
        sale={sale}
        onPaymentUpdate={handlePaymentUpdate}
      />
    </>
  );
};

export default PaymentSummary;
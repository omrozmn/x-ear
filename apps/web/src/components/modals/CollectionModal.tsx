import React, { useState, useEffect } from 'react';
import { createPaymentRecord } from '@/api/generated';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { Receipt, CreditCard, Banknote, DollarSign, Calendar } from 'lucide-react';
import { Input, Select, Textarea } from '@x-ear/ui-web';

// Local Sale type since it's not exported from schemas
interface Sale {
  id: string;
  patientId: string;
  totalAmount?: number;
  patientPayment?: number;
}

// Local PaymentRecord type
interface PaymentRecord {
  id?: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onCollectPayment?: (paymentData: PaymentRecord) => Promise<void>;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  isOpen,
  onClose,
  sale,
  onCollectPayment
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && sale) {
      // Calculate remaining amount from sale data
      const remainingAmount = (sale.totalAmount || 0) - (sale.patientPayment || 0);
      setPaymentData(prev => ({
        ...prev,
        amount: remainingAmount
      }));
      setError(null);
    }
  }, [isOpen, sale]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentData.amount <= 0) {
      setError('Geçerli bir tutar giriniz');
      return;
    }

    const remainingAmount = (sale.totalAmount || 0) - (sale.patientPayment || 0);
    if (paymentData.amount > remainingAmount) {
      setError('Ödeme tutarı kalan tutardan fazla olamaz');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Create payment plan for the sale
      const paymentPlanData = {
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate,
        referenceNumber: paymentData.referenceNumber,
        notes: paymentData.notes,
        status: 'COMPLETED' as const,
        paymentType: 'COLLECTION'
      };

      // Use Orval-generated function
      const resp = await createPaymentRecord({
        patient_id: sale.patientId,
        sale_id: sale.id,
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        payment_date: paymentData.paymentDate,
        reference_number: paymentData.referenceNumber,
        notes: paymentData.notes,
        payment_type: 'payment'
      } as any);

      const result = (resp as any)?.data || resp;

      // Call the callback if provided
      if (onCollectPayment) {
        await onCollectPayment(result);
      }

      onClose();
    } catch (err: any) {
      console.error('Payment collection error:', err);
      setError(
        err?.response?.data?.error ||
        err?.message ||
        'Ödeme kaydedilemedi'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Nakit';
      case 'card': return 'Kredi Kartı';
      case 'transfer': return 'Havale/EFT';
      case 'check': return 'Çek';
      default: return method;
    }
  };

  const remainingAmount = (sale?.totalAmount || 0) - (sale?.patientPayment || 0);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Ödeme Tahsilat"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Sale Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-3 flex items-center">
            <Receipt className="w-4 h-4 mr-2" />
            Satış Bilgileri
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex justify-between">
              <span>Toplam Tutar:</span>
              <span className="font-medium">{formatCurrency(sale?.totalAmount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ödenen Tutar:</span>
              <span className="font-medium">{formatCurrency(sale?.patientPayment || 0)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Kalan Tutar:</span>
              <span className="font-bold text-red-600">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tahsilat Tutarı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="w-4 h-4 text-gray-400" />
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={remainingAmount}
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-10 pr-4 py-2"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ödeme Yöntemi
            </label>
            <Select
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              options={[
                { value: 'cash', label: 'Nakit' },
                { value: 'card', label: 'Kredi Kartı' },
                { value: 'transfer', label: 'Havale/EFT' },
                { value: 'check', label: 'Çek' }
              ]}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ödeme Tarihi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <Input
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))}
                className="w-full pl-10 pr-4 py-2"
                required
              />
            </div>
          </div>

          {(paymentData.paymentMethod === 'card' || paymentData.paymentMethod === 'transfer' || paymentData.paymentMethod === 'check') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referans Numarası
              </label>
              <Input
                type="text"
                value={paymentData.referenceNumber}
                onChange={(e) => setPaymentData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                className="w-full"
                placeholder={
                  paymentData.paymentMethod === 'card' ? 'İşlem numarası' :
                    paymentData.paymentMethod === 'transfer' ? 'Dekont numarası' :
                      'Çek numarası'
                }
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar
            </label>
            <Textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full"
              placeholder="Ödeme ile ilgili notlar..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isLoading || paymentData.amount <= 0}
          >
            {isLoading ? 'Kaydediliyor...' : `${formatCurrency(paymentData.amount)} Tahsil Et`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
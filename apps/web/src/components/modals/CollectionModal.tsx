import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { Receipt, CreditCard, Banknote, DollarSign, Calendar } from 'lucide-react';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  onCollectPayment?: (paymentData: any) => Promise<void>;
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
      setPaymentData(prev => ({
        ...prev,
        amount: sale.remainingAmount || 0
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

    if (paymentData.amount > (sale?.remainingAmount || 0)) {
      setError('Ödeme tutarı kalan tutardan fazla olamaz');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCollectPayment?.({
        ...paymentData,
        saleId: sale.id,
        patientId: sale.patientId
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme kaydedilemedi');
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
              <span className="font-medium">{formatCurrency(sale?.paidAmount || 0)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Kalan Tutar:</span>
              <span className="font-bold text-red-600">{formatCurrency(sale?.remainingAmount || 0)}</span>
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
              <input
                type="number"
                step="0.01"
                min="0"
                max={sale?.remainingAmount || 0}
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ödeme Yöntemi
            </label>
            <select
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="cash">Nakit</option>
              <option value="card">Kredi Kartı</option>
              <option value="transfer">Havale/EFT</option>
              <option value="check">Çek</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ödeme Tarihi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {(paymentData.paymentMethod === 'card' || paymentData.paymentMethod === 'transfer' || paymentData.paymentMethod === 'check') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referans Numarası
              </label>
              <input
                type="text"
                value={paymentData.referenceNumber}
                onChange={(e) => setPaymentData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { RefreshCw, Calendar, DollarSign, CheckCircle, Clock, AlertCircle, CreditCard } from 'lucide-react';

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  paymentDate?: string;
  paymentMethod?: string;
}

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  onPayInstallment?: (installmentId: string, amount: number, paymentMethod: string) => Promise<void>;
}

export const InstallmentModal: React.FC<InstallmentModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPayInstallment
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'cash'
  });

  useEffect(() => {
    if (isOpen && sale?.id) {
      fetchInstallments();
    }
  }, [isOpen, sale?.id]);

  const fetchInstallments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // For now, use sale.paymentRecords as fallback since API method doesn't exist
      // TODO: Implement proper installments API when available
      let installmentsArray: Installment[] = [];

      if (sale?.paymentRecords && Array.isArray(sale.paymentRecords)) {
        // Convert payment records to installments format
        installmentsArray = sale.paymentRecords.map((record: any, index: number) => ({
          id: record.id || `installment-${index + 1}`,
          installmentNumber: index + 1,
          amount: record.amount || 0,
          paidAmount: record.status === 'paid' ? record.amount : 0,
          dueDate: record.dueDate || record.paymentDate || new Date().toISOString(),
          status: record.status || 'pending',
          paymentDate: record.paymentDate,
          paymentMethod: record.paymentMethod
        }));
      } else {
        installmentsArray = [];
      }

      setInstallments(installmentsArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Taksitler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödendi';
      case 'partial': return 'Kısmi';
      case 'overdue': return 'Gecikmiş';
      default: return 'Bekliyor';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'paid') return false;
    return new Date(dueDate) < new Date();
  };

  const handlePayInstallment = async (installmentId: string) => {
    if (paymentData.amount <= 0) {
      setError('Geçerli bir tutar giriniz');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onPayInstallment?.(installmentId, paymentData.amount, paymentData.paymentMethod);
      setPayingInstallmentId(null);
      setPaymentData({ amount: 0, paymentMethod: 'cash' });
      await fetchInstallments(); // Refresh installments
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme kaydedilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const startPayment = (installment: Installment) => {
    setPayingInstallmentId(installment.id);
    setPaymentData({
      amount: installment.amount - installment.paidAmount,
      paymentMethod: 'cash'
    });
    setError(null);
  };

  const totalInstallments = installments.length;
  const paidInstallments = installments.filter(i => i.status === 'paid').length;
  const overdueInstallments = installments.filter(i => isOverdue(i.dueDate, i.status)).length;
  const totalPaid = installments.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalRemaining = installments.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Taksit Yönetimi"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center">
              <RefreshCw className="w-4 h-4 text-blue-500 mr-2" />
              <div>
                <p className="text-xs text-blue-600">Toplam Taksit</p>
                <p className="text-lg font-semibold text-blue-900">{totalInstallments}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <div>
                <p className="text-xs text-green-600">Ödenen</p>
                <p className="text-lg font-semibold text-green-900">{paidInstallments}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <div>
                <p className="text-xs text-red-600">Gecikmiş</p>
                <p className="text-lg font-semibold text-red-900">{overdueInstallments}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 text-purple-500 mr-2" />
              <div>
                <p className="text-xs text-purple-600">Kalan</p>
                <p className="text-sm font-semibold text-purple-900">{formatCurrency(totalRemaining)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Installments List */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Taksit Detayları</h3>

          {isLoading ? (
            <LoadingSkeleton lines={4} />
          ) : installments.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Taksit planı bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-3">
              {installments.map((installment) => (
                <div 
                  key={installment.id} 
                  className={`border rounded-lg p-4 ${
                    isOverdue(installment.dueDate, installment.status) 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      {getStatusIcon(installment.status)}
                      <span className="ml-2 font-medium">
                        {installment.installmentNumber}. Taksit
                      </span>
                      {isOverdue(installment.dueDate, installment.status) && (
                        <span className="ml-2 text-xs text-red-600 font-medium">
                          (Gecikmiş)
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(installment.status)}`}>
                      {getStatusText(installment.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Tutar:</span>
                      <span className="ml-2 font-medium">{formatCurrency(installment.amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Vade:</span>
                      <span className="ml-2">{formatDate(installment.dueDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ödenen:</span>
                      <span className="ml-2 text-green-600">{formatCurrency(installment.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Kalan:</span>
                      <span className="ml-2 text-red-600">{formatCurrency(installment.amount - installment.paidAmount)}</span>
                    </div>
                  </div>

                  {installment.paymentDate && (
                    <div className="text-sm text-gray-600 mb-3">
                      <span>Ödeme Tarihi: {formatDate(installment.paymentDate)}</span>
                      {installment.paymentMethod && (
                        <span className="ml-4">Yöntem: {installment.paymentMethod}</span>
                      )}
                    </div>
                  )}

                  {installment.status !== 'paid' && (
                    <div className="border-t pt-3">
                      {payingInstallmentId === installment.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Ödeme Tutarı
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={installment.amount - installment.paidAmount}
                                value={paymentData.amount}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Ödeme Yöntemi
                              </label>
                              <select
                                value={paymentData.paymentMethod}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="cash">Nakit</option>
                                <option value="card">Kart</option>
                                <option value="transfer">Havale</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handlePayInstallment(installment.id)}
                              disabled={isLoading || paymentData.amount <= 0}
                              className="text-sm px-3 py-1"
                            >
                              {isLoading ? 'Kaydediliyor...' : 'Öde'}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setPayingInstallmentId(null)}
                              className="text-sm px-3 py-1"
                            >
                              İptal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => startPayment(installment)}
                          className="text-sm"
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          Öde
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
};
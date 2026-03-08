import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  Spinner
} from '@x-ear/ui-web';
import {
  X,
  CreditCard,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { SaleRead } from '@/api/client/sales.client';
import type { ExtendedSaleRead } from '@/types/extended-sales';

import {
  useListPartyPaymentRecords,
  useCreatePaymentRecords,
  useListSalePromissoryNotes,
  getListPartyPaymentRecordsQueryKey,
  getListSalePromissoryNotesQueryKey
} from '@/api/client/payments.client';
import type { RoutersPaymentsPaymentRecordCreate } from '@/api/generated/schemas';
import { unwrapArray } from '../../utils/response-unwrap';

// interface ExtendedSaleRead extends SaleRead {
//   partyPayment?: number;
// }

interface PaymentRecord {
  id: string;
  saleId?: string; // Added to filter by sale
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  referenceNumber?: string;
}

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  notes?: string;
}

interface PromissoryNote {
  id: string;
  amount: number;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue' | 'cancelled';
  noteNumber: string;
  description?: string;
}

interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  remainingBalance: number;
  overdueAmount: number;
  nextDueDate?: string;
  nextDueAmount?: number;
}

interface PaymentTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRead;
  onPaymentUpdate: () => void;
}

export const PaymentTrackingModal: React.FC<PaymentTrackingModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPaymentUpdate
}) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(true);

  // Data states
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [, setPromissoryNotes] = useState<PromissoryNote[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalAmount: 0,
    totalPaid: 0,
    remainingBalance: 0,
    overdueAmount: 0
  });

  // Generate unique reference number
  const generateReferenceNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY-${timestamp}-${random}`;
  };

  // Form states
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
    referenceNumber: generateReferenceNumber()
  });

  // Orval Hooks for real data - FILTER BY SALE ID
  const { data: paymentRecordsResponse } = useListPartyPaymentRecords(sale.partyId, undefined, {
    query: {
      queryKey: getListPartyPaymentRecordsQueryKey(sale.partyId),
      enabled: isOpen && !!sale.partyId
    }
  });

  const { data: promissoryNotesResponse } = useListSalePromissoryNotes(sale.id || '', {
    query: {
      queryKey: getListSalePromissoryNotesQueryKey(sale.id || ''),
      enabled: isOpen && !!sale.id
    }
  });

  const createPaymentMutation = useCreatePaymentRecords({
    mutation: {
      onSuccess: () => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: getListPartyPaymentRecordsQueryKey(sale.partyId) });
      }
    }
  });

  // Mock Installments (Backend Missing) and Data Sync
  useEffect(() => {
    if (isOpen) {
      // Unwrap data safely using strict types and FILTER BY SALE ID
      const allPaymentRecords = unwrapArray<PaymentRecord>(paymentRecordsResponse) || [];
      // Filter to only show payments for THIS sale
      let realPaymentRecords = allPaymentRecords.filter(p => p.saleId === sale.id);
      
      // WORKAROUND: If sale has paidAmount but no payment records, add initial down payment
      if (sale.paidAmount && sale.paidAmount > 0 && realPaymentRecords.length === 0) {
        realPaymentRecords = [{
          id: 'initial-down-payment',
          saleId: sale.id,
          amount: sale.paidAmount,
          paymentDate: sale.saleDate || new Date().toISOString(),
          paymentMethod: sale.paymentMethod || 'cash',
          status: 'paid',
          notes: 'İlk Ön Ödeme'
        }];
      }
      
      const realPromissoryNotes = unwrapArray<PromissoryNote>(promissoryNotesResponse) || [];

      // Mock Installments
      const mockInstallments: Installment[] = [
        { id: '1', installmentNumber: 1, amount: 1000, dueDate: '2024-01-15', status: 'paid', paidDate: '2024-01-15', notes: 'İlk taksit' },
        { id: '2', installmentNumber: 2, amount: 1000, dueDate: '2024-02-15', status: 'paid', paidDate: '2024-02-15', notes: 'İkinci taksit' }
      ];
      
      setPaymentRecords(realPaymentRecords);
      setPromissoryNotes(realPromissoryNotes);
      setInstallments(mockInstallments);
    }
  }, [isOpen, paymentRecordsResponse, promissoryNotesResponse, sale.id, sale.paidAmount, sale.saleDate, sale.paymentMethod]);

  const calculatePaymentSummary = useCallback((payments: PaymentRecord[], installmentList: Installment[]): PaymentSummary => {
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const overdueAmount = installmentList
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.amount, 0);

    const nextDue = installmentList
      .filter(i => i.status === 'pending')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    const extendedSale = sale as unknown as ExtendedSaleRead;
    return {
      totalAmount: extendedSale.totalAmount || 0,
      totalPaid,
      remainingBalance: (extendedSale.totalAmount || 0) - totalPaid,
      overdueAmount,
      nextDueDate: nextDue?.dueDate,
      nextDueAmount: nextDue?.amount
    };
  }, [sale]);

  // Calculate summary
  useEffect(() => {
    const summary = calculatePaymentSummary(paymentRecords, installments);
    setPaymentSummary(summary);
  }, [paymentRecords, installments, calculatePaymentSummary]);

  // Record new payment using Orval mutation
  const handleRecordPayment = async () => {
    if (!sale.id) {
      return;
    }

    if (newPayment.amount <= 0) {
      toast.error('Ödeme tutarı 0\'dan büyük olmalıdır');
      return;
    }

    if (newPayment.amount > paymentSummary.remainingBalance) {
      toast.error('Ödeme tutarı kalan bakiyeden fazla olamaz');
      return;
    }

    setIsLoading(true);
    
    try {
      const paymentData: RoutersPaymentsPaymentRecordCreate = {
        partyId: sale.partyId,
        saleId: sale.id,
        amount: newPayment.amount,
        paymentDate: newPayment.paymentDate,
        paymentMethod: newPayment.paymentMethod,
        notes: newPayment.notes,
        referenceNumber: newPayment.referenceNumber
      };
      
      await createPaymentMutation.mutateAsync({ data: paymentData });

      toast.success('Ödeme başarıyla kaydedildi');
      
      // Reset form with new reference number
      setNewPayment({
        amount: 0,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
        referenceNumber: generateReferenceNumber()
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      onPaymentUpdate();

    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.response?.data?.message ||
                          error?.message || 
                          'Ödeme kaydedilirken hata oluştu';
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };





  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      'cash': 'Nakit',
      'card': 'Kredi Kartı',
      'bank_transfer': 'Havale',
      'check': 'Çek'
    };
    return labels[method] || method;
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-800', label: 'Ödendi' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Bekliyor' },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Gecikmiş' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'İptal' },
      active: { color: 'bg-blue-100 text-blue-800', label: 'Aktif' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={`${config.color} text-xs px-2 py-1`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" 
      data-testid="payment-tracking-modal"
      onClick={(e) => {
        // Prevent clicks inside modal from closing it
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => {
          // Stop propagation to prevent parent modal from receiving events
          e.stopPropagation();
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Ödeme Takibi - Satış #{sale.id}
          </h3>
          <Button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>



        {/* Payment Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Toplam Tutar</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(paymentSummary.totalAmount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Ödenen</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(paymentSummary.totalPaid)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Kalan</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(paymentSummary.remainingBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Gecikmiş</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(paymentSummary.overdueAmount)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Due Alert */}
        {paymentSummary.nextDueDate && (
          <Alert className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800">
            <Clock className="w-4 h-4" />
            <span>
              Sonraki ödeme: {formatDate(paymentSummary.nextDueDate)} - {formatCurrency(paymentSummary.nextDueAmount || 0)}
            </span>
          </Alert>
        )}

        {/* Payment Content - NO TABS */}
        <div className="space-y-6">
            {/* New Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Ödeme Kaydet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    return false;
                  }} 
                  className="space-y-4"
                >
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>Tutar *</Label>
                      <Input
                        data-testid="payment-amount-input"
                        type="number"
                        step="0.01"
                        value={newPayment.amount === 0 ? '' : newPayment.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPayment(prev => ({ ...prev, amount: val === '' ? 0 : parseFloat(val) || 0 }));
                        }}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label>Ödeme Tarihi *</Label>
                      <Input
                        data-testid="payment-date-input"
                        type="date"
                        value={newPayment.paymentDate}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, paymentDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label>Ödeme Yöntemi *</Label>
                      <select
                        data-allow-raw="true"
                        data-testid="payment-method-select"
                        value={newPayment.paymentMethod}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cash">Nakit</option>
                        <option value="card">Kredi Kartı</option>
                        <option value="bank_transfer">Havale</option>
                        <option value="check">Çek</option>
                      </select>
                    </div>
                    <div>
                      <Label>Notlar</Label>
                      <Input
                        value={newPayment.notes}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Ödeme notları"
                      />
                    </div>
                  </div>

                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleRecordPayment();
                    }}
                    disabled={isLoading} 
                    className="w-full" 
                    data-testid="payment-submit-button"
                  >
                    {isLoading && <Spinner className="w-4 h-4 mr-2" />}
                    Ödeme Kaydet
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Payment Records - COLLAPSIBLE */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsPaymentHistoryOpen(!isPaymentHistoryOpen)}
              >
                <CardTitle className="flex items-center justify-between">
                  <span>Ödeme Geçmişi</span>
                  {isPaymentHistoryOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </CardTitle>
              </CardHeader>
              {isPaymentHistoryOpen && (
              <CardContent>
                {paymentRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Henüz ödeme kaydı bulunmuyor
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentRecords.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-6">
                          <div className="text-xl font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-700">
                              {formatDate(payment.paymentDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getPaymentMethodLabel(payment.paymentMethod)}
                            </div>
                            {payment.referenceNumber && (
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                Ref: {payment.referenceNumber}
                              </div>
                            )}
                          </div>
                          {payment.notes && (
                            <div className="text-sm text-gray-600 italic">
                              {payment.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              )}
            </Card>
          </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
          <Button onClick={onClose} variant="outline">
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentTrackingModal;

import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Label,
  Textarea,
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
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import {
  useListPartyPaymentRecords,
  useCreatePaymentRecords,
  useListSalePromissoryNotes,
  getListPartyPaymentRecordsQueryKey,
  getListSalePromissoryNotesQueryKey
} from '../../api/generated/payments/payments';
import type { RoutersPaymentsPaymentRecordCreate as PaymentRecordCreate } from '@/api/generated/schemas/routersPaymentsPaymentRecordCreate';
import { unwrapArray, unwrapObject } from '../../utils/response-unwrap';
// Local Sale interface as it is missing in exports
interface Sale {
  id?: string;
  partyId: string;
  totalAmount?: number;
  [key: string]: any;
}

interface PaymentRecord {
  id: string;
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
  sale: Sale;
  onPaymentUpdate: () => void;
}

export const PaymentTrackingModal: React.FC<PaymentTrackingModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPaymentUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'installments' | 'promissory'>('payments');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data states
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [promissoryNotes, setPromissoryNotes] = useState<PromissoryNote[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalAmount: 0,
    totalPaid: 0,
    remainingBalance: 0,
    overdueAmount: 0
  });

  // Form states
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
    referenceNumber: ''
  });

  const [newPromissoryNote, setNewPromissoryNote] = useState({
    amount: 0,
    dueDate: '',
    description: '',
    noteNumber: ''
  });

  // Orval Hooks for real data
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

  const createPaymentMutation = useCreatePaymentRecords();

  // Unwrap data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const realPaymentRecords = unwrapArray<any>(paymentRecordsResponse) || [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const realPromissoryNotes = unwrapArray<any>(promissoryNotesResponse) || [];

  // Mock Installments (Backend Missing) and Data Sync
  useEffect(() => {
    if (isOpen) {
      // Mock Installments
      const mockInstallments: Installment[] = [
        { id: '1', installmentNumber: 1, amount: 1000, dueDate: '2024-01-15', status: 'paid', paidDate: '2024-01-15', notes: 'İlk taksit' },
        { id: '2', installmentNumber: 2, amount: 1000, dueDate: '2024-02-15', status: 'paid', paidDate: '2024-02-15', notes: 'İkinci taksit' }
      ];
      setInstallments(mockInstallments);
    }
  }, [isOpen]);

  // Sync real data to state
  useEffect(() => {
    if (realPaymentRecords) setPaymentRecords(realPaymentRecords);
    if (realPromissoryNotes) setPromissoryNotes(realPromissoryNotes);
  }, [realPaymentRecords, realPromissoryNotes]);

  // Calculate summary
  useEffect(() => {
    const summary = calculatePaymentSummary(paymentRecords, installments);
    setPaymentSummary(summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentRecords, installments]);

  const calculatePaymentSummary = (payments: PaymentRecord[], installmentList: Installment[]): PaymentSummary => {
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const overdueAmount = installmentList
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.amount, 0);

    const nextDue = installmentList
      .filter(i => i.status === 'pending')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return {
      totalAmount: sale.totalAmount || 0,
      totalPaid,
      remainingBalance: (sale.totalAmount || 0) - totalPaid,
      overdueAmount,
      nextDueDate: nextDue?.dueDate,
      nextDueAmount: nextDue?.amount
    };
  };

  // Record new payment using Orval mutation
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale.id) return;

    setError(null);
    setSuccess(null);

    if (newPayment.amount <= 0) {
      setError('Ödeme tutarı 0\'dan büyük olmalıdır');
      return;
    }

    if (newPayment.amount > paymentSummary.remainingBalance) {
      setError('Ödeme tutarı kalan bakiyeden fazla olamaz');
      return;
    }

    setIsLoading(true);
    try {
      const paymentData: PaymentRecordCreate = {
        partyId: sale.partyId,
        amount: newPayment.amount,
        paymentDate: newPayment.paymentDate,
        paymentMethod: newPayment.paymentMethod,
        notes: newPayment.notes
      };

      await createPaymentMutation.mutateAsync({ data: paymentData });

      setSuccess('Ödeme başarıyla kaydedildi');
      setNewPayment({
        amount: 0,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
        referenceNumber: ''
      });

      onPaymentUpdate();

    } catch (err) {
      console.error('Error recording payment:', err);
      setError('Ödeme kaydedilirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Pay installment (mock implementation until API is available)
  const handlePayInstallment = async (installmentId: string, amount: number) => {
    if (!sale.id) return;

    setIsLoading(true);
    try {
      // Mock installment payment
      setInstallments(prev => prev.map(installment =>
        installment.id === installmentId
          ? { ...installment, status: 'paid' as const, paidDate: new Date().toISOString().split('T')[0] }
          : installment
      ));

      setSuccess('Taksit ödemesi başarıyla kaydedildi');
      // Installments are mock, no need to reload
      onPaymentUpdate();

    } catch (err) {
      console.error('Error paying installment:', err);
      setError('Taksit ödemesi kaydedilirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Ödeme Takibi - Satış #{sale.id}
          </h3>
          <Button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </Alert>
        )}

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

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'payments', label: 'Ödemeler', icon: DollarSign },
              { key: 'installments', label: 'Taksitler', icon: Calendar },
              { key: 'promissory', label: 'Senetler', icon: FileText }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'payments' && (
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
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Tutar</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label>Ödeme Yöntemi</Label>
                      <select
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
                      <Label>Ödeme Tarihi</Label>
                      <Input
                        type="date"
                        value={newPayment.paymentDate}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, paymentDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Referans No</Label>
                      <Input
                        value={newPayment.referenceNumber}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, referenceNumber: e.target.value }))}
                        placeholder="İşlem numarası, çek no, vb."
                      />
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

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading && <Spinner className="w-4 h-4 mr-2" />}
                    Ödeme Kaydet
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Payment Records */}
            <Card>
              <CardHeader>
                <CardTitle>Ödeme Geçmişi</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Henüz ödeme kaydı bulunmuyor
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentRecords.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-lg font-medium">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(payment.paymentDate)}
                          </div>
                          <div className="text-sm text-gray-600 capitalize">
                            {payment.paymentMethod}
                          </div>
                          {payment.referenceNumber && (
                            <div className="text-xs text-gray-500">
                              Ref: {payment.referenceNumber}
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
            </Card>
          </div>
        )}

        {activeTab === 'installments' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Taksit Planı</CardTitle>
              </CardHeader>
              <CardContent>
                {installments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Taksit planı bulunmuyor
                  </div>
                ) : (
                  <div className="space-y-3">
                    {installments.map((installment) => (
                      <div key={installment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium">
                            Taksit {installment.installmentNumber}
                          </div>
                          <div className="text-lg font-medium">
                            {formatCurrency(installment.amount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Vade: {formatDate(installment.dueDate)}
                          </div>
                          {installment.paidDate && (
                            <div className="text-sm text-green-600">
                              Ödendi: {formatDate(installment.paidDate)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(installment.status)}
                          {installment.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handlePayInstallment(installment.id, installment.amount)}
                              disabled={isLoading}
                            >
                              Öde
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'promissory' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Senet Ekle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Senet Tutarı</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPromissoryNote.amount}
                      onChange={(e) => setNewPromissoryNote(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Vade Tarihi</Label>
                    <Input
                      type="date"
                      value={newPromissoryNote.dueDate}
                      onChange={(e) => setNewPromissoryNote(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label>Senet Numarası</Label>
                    <Input
                      value={newPromissoryNote.noteNumber}
                      onChange={(e) => setNewPromissoryNote(prev => ({ ...prev, noteNumber: e.target.value }))}
                      placeholder="Senet numarası"
                    />
                  </div>
                  <div>
                    <Label>Açıklama</Label>
                    <Input
                      value={newPromissoryNote.description}
                      onChange={(e) => setNewPromissoryNote(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Senet açıklaması"
                    />
                  </div>
                </div>

                <Button className="w-full mt-4" disabled={isLoading}>
                  {isLoading && <Spinner className="w-4 h-4 mr-2" />}
                  Senet Ekle
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Senet Listesi</CardTitle>
              </CardHeader>
              <CardContent>
                {promissoryNotes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Senet bulunmuyor
                  </div>
                ) : (
                  <div className="space-y-3">
                    {promissoryNotes.map((note) => (
                      <div key={note.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium">
                            {note.noteNumber}
                          </div>
                          <div className="text-lg font-medium">
                            {formatCurrency(note.amount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Vade: {formatDate(note.dueDate)}
                          </div>
                          {note.description && (
                            <div className="text-sm text-gray-500">
                              {note.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(note.status)}
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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
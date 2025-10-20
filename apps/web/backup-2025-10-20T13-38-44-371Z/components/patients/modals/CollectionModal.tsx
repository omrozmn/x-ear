import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  Textarea,
  Alert,
  Spinner,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@x-ear/ui-web';
import { X, DollarSign, Calendar, Receipt, CreditCard, Banknote, AlertCircle, CheckCircle } from 'lucide-react';
import { Patient } from '../../../types/patient';
import { Sale, Installment } from '../../../types/patient/patient-communication.types';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  sale: Sale;
  onPaymentCreate: (paymentData: any) => void;
  loading?: boolean;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  isOpen,
  onClose,
  patient,
  sale,
  onPaymentCreate,
  loading = false
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'bank_transfer' | 'check'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedInstallments, setSelectedInstallments] = useState<string[]>([]);
  const [generateReceipt, setGenerateReceipt] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculate remaining balance and installment details
  const totalPaid = sale.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remainingBalance = sale.totalAmount - totalPaid;
  
  // Mock installments for demonstration - in real app, this would come from sale data
  const installments: Installment[] = [
    {
      id: '1',
      amount: sale.totalAmount / 3,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      notes: '1. Taksit'
    },
    {
      id: '2', 
      amount: sale.totalAmount / 3,
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      notes: '2. Taksit'
    },
    {
      id: '3',
      amount: sale.totalAmount / 3,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      notes: '3. Taksit'
    }
  ];

  const pendingInstallments = installments.filter(inst => inst.status === 'pending');
  const overdueInstallments = installments.filter(inst => 
    inst.status === 'pending' && new Date(inst.dueDate) < new Date()
  );

  useEffect(() => {
    if (pendingInstallments.length > 0) {
      setPaymentAmount(pendingInstallments[0].amount);
    } else {
      setPaymentAmount(remainingBalance);
    }
  }, [pendingInstallments, remainingBalance]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    setError(null);
    setSuccess(null);
    
    // Validation
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Geçerli bir ödeme tutarı giriniz');
      return;
    }
    
    if (paymentAmount > remainingBalance) {
      setError('Ödeme tutarı kalan bakiyeden fazla olamaz');
      return;
    }
    
    // Validate payment method specific fields
    if (paymentMethod === 'credit') {
      if (!formData.get('cardLast4') || !formData.get('cardType')) {
        setError('Kredi kartı bilgilerini eksiksiz doldurunuz');
        return;
      }
    } else if (paymentMethod === 'bank_transfer') {
      if (!formData.get('bankName') || !formData.get('referenceNumber')) {
        setError('Banka havalesi bilgilerini eksiksiz doldurunuz');
        return;
      }
    } else if (paymentMethod === 'check') {
      if (!formData.get('checkNumber') || !formData.get('checkBank') || !formData.get('checkDate')) {
        setError('Çek bilgilerini eksiksiz doldurunuz');
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const paymentData = {
        saleId: sale.id,
        patientId: patient.id,
        amount: paymentAmount,
        method: paymentMethod,
        date: new Date().toISOString(),
        status: 'completed',
        note: formData.get('notes'),
        installmentIds: selectedInstallments,
        generateReceipt,
        // Payment method specific fields
        ...(paymentMethod === 'credit' && {
          cardLast4: formData.get('cardLast4'),
          cardType: formData.get('cardType'),
          transactionId: formData.get('transactionId')
        }),
        ...(paymentMethod === 'bank_transfer' && {
          bankName: formData.get('bankName'),
          accountNumber: formData.get('accountNumber'),
          referenceNumber: formData.get('referenceNumber')
        }),
        ...(paymentMethod === 'check' && {
          checkNumber: formData.get('checkNumber'),
          checkDate: formData.get('checkDate'),
          bankName: formData.get('checkBank')
        })
      };

      onPaymentCreate(paymentData);
      
      setSuccess('Ödeme başarıyla kaydedildi');
      
      // Reset form after successful submission
      setTimeout(() => {
        setPaymentAmount(0);
        setSelectedInstallments([]);
        setError(null);
        setSuccess(null);
        onClose();
      }, 2000);
      
    } catch (err) {
      setError('Ödeme kaydedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallmentSelection = (installmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedInstallments([...selectedInstallments, installmentId]);
    } else {
      setSelectedInstallments(selectedInstallments.filter(id => id !== installmentId));
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
            Tahsilat İşlemi
          </h3>
          <Button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="text-red-800">
              {error}
            </div>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="text-green-800">
              {success}
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Customer & Sale Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Ad Soyad:</span> {patient.firstName} {patient.lastName}</div>
                  <div><span className="font-medium">TC No:</span> {patient.tcNumber}</div>
                  <div><span className="font-medium">Telefon:</span> {patient.phone}</div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Satış Bilgileri</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Satış ID:</span> {sale.id}</div>
                  <div><span className="font-medium">Toplam Tutar:</span> {formatCurrency(sale.totalAmount)}</div>
                  <div><span className="font-medium">Ödenen:</span> {formatCurrency(totalPaid)}</div>
                  <div className="font-medium text-blue-700">
                    <span>Kalan Bakiye:</span> {formatCurrency(remainingBalance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Installment Information */}
            {pendingInstallments.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Taksit Bilgileri
                </h4>
                
                {overdueInstallments.length > 0 && (
                  <div className="mb-3 p-3 bg-red-100 border border-red-200 rounded">
                    <p className="text-red-800 font-medium text-sm">
                      ⚠️ {overdueInstallments.length} adet gecikmiş taksit bulunmaktadır!
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {pendingInstallments.map((installment) => (
                    <div key={installment.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`installment-${installment.id}`}
                          checked={selectedInstallments.includes(installment.id)}
                          onChange={(e) => handleInstallmentSelection(installment.id, e.target.checked)}
                          className="mr-3"
                        />
                        <label htmlFor={`installment-${installment.id}`} className="text-sm">
                          <span className="font-medium">{installment.notes}</span>
                          <span className="text-gray-600 ml-2">- Vade: {formatDate(installment.dueDate)}</span>
                          {new Date(installment.dueDate) < new Date() && (
                            <span className="text-red-600 ml-2 font-medium">(Gecikmiş)</span>
                          )}
                        </label>
                      </div>
                      <span className="font-medium text-blue-700">
                        {formatCurrency(installment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tahsilat Tutarı *
              </label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="text-right font-medium text-lg"
                required
              />
              <div className="mt-1 flex justify-between text-sm text-gray-600">
                <span>Maksimum: {formatCurrency(remainingBalance)}</span>
                {selectedInstallments.length > 0 && (
                  <span>Seçili taksitler toplamı: {formatCurrency(
                    selectedInstallments.reduce((sum, id) => {
                      const inst = installments.find(i => i.id === id);
                      return sum + (inst?.amount || 0);
                    }, 0)
                  )}</span>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Ödeme Yöntemi
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: 'cash', label: 'Nakit', icon: <Banknote className="w-4 h-4" /> },
                  { value: 'credit', label: 'Kredi Kartı', icon: <CreditCard className="w-4 h-4" /> },
                  { value: 'bank_transfer', label: 'Havale/EFT', icon: <DollarSign className="w-4 h-4" /> },
                  { value: 'check', label: 'Çek', icon: <Receipt className="w-4 h-4" /> }
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value as any)}
                    className={`p-3 border rounded-lg text-center transition-colors flex flex-col items-center ${
                      paymentMethod === method.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {method.icon}
                    <span className="text-sm font-medium mt-1">{method.label}</span>
                  </button>
                ))}
              </div>

              {/* Payment Method Specific Fields */}
              {paymentMethod === 'credit' && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kart Son 4 Hanesi</label>
                    <Input name="cardLast4" placeholder="****" maxLength={4} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kart Türü</label>
                    <select
                      name="cardType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seçiniz</option>
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">American Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">İşlem No</label>
                    <Input name="transactionId" placeholder="İşlem numarası" />
                  </div>
                </div>
              )}

              {paymentMethod === 'bank_transfer' && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banka Adı</label>
                    <Input name="bankName" placeholder="Banka adı" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hesap No</label>
                    <Input name="accountNumber" placeholder="Hesap numarası" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referans No</label>
                    <Input name="referenceNumber" placeholder="Referans numarası" />
                  </div>
                </div>
              )}

              {paymentMethod === 'check' && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Çek No</label>
                    <Input name="checkNumber" placeholder="Çek numarası" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Çek Tarihi</label>
                    <Input name="checkDate" type="date" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banka</label>
                    <Input name="checkBank" placeholder="Banka adı" />
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Options */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="generateReceipt"
                  checked={generateReceipt}
                  onChange={(e) => setGenerateReceipt(e.target.checked)}
                  className="mr-3"
                />
                <label htmlFor="generateReceipt" className="text-sm font-medium text-gray-700">
                  Tahsilat makbuzu oluştur ve yazdır
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <Textarea 
                name="notes" 
                placeholder="Tahsilat ile ilgili notlar..." 
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button 
              type="submit"
              disabled={isLoading || !paymentAmount || paymentAmount <= 0}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Kaydediliyor...
                </>
              ) : (
                'Ödemeyi Kaydet'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectionModal;
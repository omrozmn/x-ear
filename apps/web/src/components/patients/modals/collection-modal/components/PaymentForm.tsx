import React from 'react';
import { 
  Button, 
  Input, 
  Textarea,
  Select,
  Badge,
  Card,
  CardContent,
  Spinner,
  Checkbox
} from '@x-ear/ui-web';
import { DollarSign, Calendar, Receipt, CreditCard, Banknote, AlertCircle, CheckCircle } from 'lucide-react';
import type { CollectionState, PaymentCalculations } from '../types';
import type { PaymentRecord } from '../../../../../types/patient/patient-communication.types';

interface PaymentFormProps {
  state: CollectionState;
  calculations: PaymentCalculations;
  installments: PaymentRecord[];
  onStateUpdate: (updates: Partial<CollectionState>) => void;
  onInstallmentSelection: (installmentId: string, checked: boolean) => void;
  onSubmit: (formData: FormData) => void;
  formatCurrency: (amount: number) => string;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  state,
  calculations,
  installments,
  onStateUpdate,
  onInstallmentSelection,
  onSubmit,
  formatCurrency
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Ödeme Özeti</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Toplam Tutar:</span>
            <span className="font-medium ml-2">{formatCurrency(calculations.totalPaid + calculations.remainingBalance)}</span>
          </div>
          <div>
            <span className="text-gray-600">Ödenen:</span>
            <span className="font-medium ml-2 text-green-600">{formatCurrency(calculations.totalPaid)}</span>
          </div>
          <div>
            <span className="text-gray-600">Kalan:</span>
            <span className="font-medium ml-2 text-red-600">{formatCurrency(calculations.remainingBalance)}</span>
          </div>
          <div>
            <span className="text-gray-600">Vadesi Geçen:</span>
            <span className="font-medium ml-2 text-orange-600">
              {formatCurrency(calculations.overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ödeme Tutarı
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="number"
            step="0.01"
            min="0"
            max={calculations.remainingBalance}
            value={state.paymentAmount || ''}
            onChange={(e) => onStateUpdate({ paymentAmount: parseFloat(e.target.value) || 0 })}
            className="pl-10"
            placeholder="0.00"
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Maksimum: {formatCurrency(calculations.remainingBalance)}
        </p>
      </div>

      {/* Payment Method */}
      <div>
        <Select
          label="Ödeme Yöntemi"
          value={state.paymentMethod}
          onChange={(e) => onStateUpdate({ paymentMethod: e.target.value as any })}
          options={[
            { value: "cash", label: "Nakit" },
            { value: "credit", label: "Kredi Kartı" },
            { value: "bank_transfer", label: "Banka Havalesi" },
            { value: "check", label: "Çek" }
          ]}
        />
      </div>

      {/* Payment Method Specific Fields */}
      {state.paymentMethod === 'credit' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <CreditCard className="h-4 w-4" />
            <span className="font-medium">Kredi Kartı Bilgileri</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kart Son 4 Hanesi
              </label>
              <Input
                name="cardLast4"
                placeholder="****"
                maxLength={4}
                pattern="[0-9]{4}"
                required
              />
            </div>
            <div>
              <Select
                label="Kart Türü"
                name="cardType"
                required
                options={[
                  { value: "", label: "Seçiniz" },
                  { value: "visa", label: "Visa" },
                  { value: "mastercard", label: "Mastercard" },
                  { value: "amex", label: "American Express" }
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İşlem Numarası
            </label>
            <Input
              name="transactionId"
              placeholder="İşlem numarası"
            />
          </div>
        </div>
      )}

      {state.paymentMethod === 'bank_transfer' && (
        <div className="space-y-4 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <Banknote className="h-4 w-4" />
            <span className="font-medium">Banka Havalesi Bilgileri</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banka Adı
              </label>
              <Input
                name="bankName"
                placeholder="Banka adı"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hesap Numarası
              </label>
              <Input
                name="accountNumber"
                placeholder="Hesap numarası"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referans Numarası
            </label>
            <Input
              name="referenceNumber"
              placeholder="Referans numarası"
              required
            />
          </div>
        </div>
      )}

      {state.paymentMethod === 'check' && (
        <div className="space-y-4 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700">
            <Receipt className="h-4 w-4" />
            <span className="font-medium">Çek Bilgileri</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Çek Numarası
              </label>
              <Input
                name="checkNumber"
                placeholder="Çek numarası"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Çek Tarihi
              </label>
              <Input
                name="checkDate"
                type="date"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Banka
            </label>
            <Input
              name="checkBank"
              placeholder="Banka adı"
              required
            />
          </div>
        </div>
      )}

      {/* Installment Selection */}
      {installments.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Taksit Seçimi (İsteğe Bağlı)
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {installments.map((installment) => (
              <div key={installment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`installment-${installment.id}`}
                    checked={state.selectedInstallments.includes(installment.id!)}
                    onChange={(e) => onInstallmentSelection(installment.id!, e.target.checked)}
                  />
                  <label htmlFor={`installment-${installment.id}`} className="text-sm">
                    {installment.note}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{formatCurrency(installment.amount)}</span>
                  <Badge 
                    variant={installment.status === 'pending' ? 'secondary' : 'danger'}
                    size="sm"
                  >
                    {installment.status === 'pending' ? 'Bekliyor' : 'Vadesi Geçti'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notlar (İsteğe Bağlı)
        </label>
        <Textarea
          name="notes"
          placeholder="Ödeme ile ilgili notlar..."
          rows={3}
        />
      </div>

      {/* Generate Receipt Option */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="generateReceipt"
          checked={state.generateReceipt}
          onChange={(e) => onStateUpdate({ generateReceipt: e.target.checked })}
        />
        <label htmlFor="generateReceipt" className="text-sm text-gray-700">
          Makbuz oluştur
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={state.isLoading || !state.paymentAmount || state.paymentAmount <= 0}
          className="min-w-[120px]"
        >
          {state.isLoading ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Kaydediliyor...
            </>
          ) : (
            'Ödeme Kaydet'
          )}
        </Button>
      </div>
    </form>
  );
};
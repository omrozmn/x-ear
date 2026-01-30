/**
 * PaymentsList Component
 * 
 * Displays payment records for a sale with loading, error, and empty states
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */

import { usePayments } from '@/hooks/usePayments';
import type { PaymentRecordRead } from '@/api/generated/schemas';
import { Loader2, AlertCircle, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@x-ear/ui-web';

interface PaymentsListProps {
  saleId: string;
}

export function PaymentsList({ saleId }: PaymentsListProps) {
  const { data, isLoading, error, refetch } = usePayments(saleId);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Ödemeler yükleniyor...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Ödemeler yüklenemedi
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Bir hata oluştu'}
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Tekrar Dene
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle data structure safely
  const payments = (data as { data?: PaymentRecordRead[] })?.data || [];

  // Empty state
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          Henüz ödeme kaydı yok
        </h3>
        <p className="text-sm text-gray-500">
          Bu satış için henüz ödeme kaydı bulunmamaktadır.
        </p>
      </div>
    );
  }

  // Success state - display payments
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Ödeme Kayıtları ({payments.length})
      </h3>

      {payments.map((payment: PaymentRecordRead) => (
        <div
          key={payment.id}
          className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {payment.paymentMethod === 'cash' && 'Nakit'}
                  {payment.paymentMethod === 'card' && 'Kredi Kartı'}
                  {payment.paymentMethod === 'transfer' && 'Havale/EFT'}
                  {!['cash', 'card', 'transfer'].includes(payment.paymentMethod) && payment.paymentMethod}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Tutar:</span>
                  <span className="font-medium text-gray-900">
                    {new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: 'TRY', // Default for now
                    }).format(payment.amount)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Tarih:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(payment.paymentDate || payment.createdAt || '').toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'completed' || payment.status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : payment.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                  }`}
              >
                {payment.status === 'completed' || payment.status === 'paid' ? 'Tamamlandı' : ''}
                {payment.status === 'pending' && 'Beklemede'}
                {payment.status === 'failed' && 'Başarısız'}
                {!['completed', 'paid', 'pending', 'failed'].includes(payment.status || '') && payment.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

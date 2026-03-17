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
      <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Ödemeler yükleniyor...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-destructive/10 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Ödemeler yüklenemedi
            </h3>
            <p className="mt-1 text-sm text-destructive">
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
      <div className="rounded-2xl border border-border bg-muted p-8 text-center">
        <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">
          Henüz ödeme kaydı yok
        </h3>
        <p className="text-sm text-muted-foreground">
          Bu satış için henüz ödeme kaydı bulunmamaktadır.
        </p>
      </div>
    );
  }

  // Success state - display payments
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground mb-3">
        Ödeme Kayıtları ({payments.length})
      </h3>

      {payments.map((payment: PaymentRecordRead) => (
        <div
          key={payment.id}
          className="rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {payment.paymentMethod === 'cash' && 'Nakit'}
                  {payment.paymentMethod === 'card' && 'Kredi Kartı'}
                  {payment.paymentMethod === 'transfer' && 'Havale/EFT'}
                  {!['cash', 'card', 'transfer'].includes(payment.paymentMethod) && payment.paymentMethod}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tutar:</span>
                  <span className="font-medium text-foreground">
                    {new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: 'TRY', // Default for now
                    }).format(payment.amount)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tarih:</span>
                  <span className="font-medium text-foreground">
                    {new Date(payment.paymentDate || payment.createdAt || '').toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'completed' || payment.status === 'paid'
                  ? 'bg-success/10 text-success'
                  : payment.status === 'pending'
                    ? 'bg-warning/10 text-yellow-800'
                    : 'bg-destructive/10 text-red-800'
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

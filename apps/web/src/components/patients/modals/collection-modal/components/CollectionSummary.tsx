import React from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { DollarSign, Calendar, AlertCircle, CheckCircle, FileText, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import type { PaymentCalculations, PromissoryNote } from '../types';
import type { Sale } from '../../../../../types/patient/patient-communication.types';

interface CollectionSummaryProps {
  sale: Sale;
  calculations: PaymentCalculations;
  promissoryNotes: PromissoryNote[];
  formatCurrency: (amount: number) => string;
}

export const CollectionSummary: React.FC<CollectionSummaryProps> = ({
  sale,
  calculations,
  promissoryNotes,
  formatCurrency
}) => {
  const activePromissoryNotes = promissoryNotes.filter(note => note.status !== 'paid');
  const overduePromissoryNotes = promissoryNotes.filter(note => note.status === 'overdue');
  const totalPromissoryAmount = promissoryNotes.reduce((sum, note) => sum + note.remainingAmount, 0);

  return (
    <div className="space-y-4">
      {/* Sale Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Satış Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Toplam Tutar:</span>
                <span className="font-medium">{formatCurrency(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">SGK Katkısı:</span>
                <span className="font-medium text-blue-600">{formatCurrency(sale.sgkCoverage || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">İndirim:</span>
                <span className="font-medium text-orange-600">{formatCurrency(sale.discountAmount || 0)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ödenen:</span>
                <span className="font-medium text-green-600">{formatCurrency(calculations.totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kalan:</span>
                <span className="font-medium text-red-600">{formatCurrency(calculations.remainingBalance)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Durum:</span>
                <Badge variant={calculations.remainingBalance > 0 ? 'warning' : 'success'}>
                  {calculations.remainingBalance > 0 ? 'Bekleyen Ödeme' : 'Tamamlandı'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Ödeme Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {calculations.pendingInstallments.length > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Bekleyen Taksitler</span>
                </div>
                <div className="text-sm">
                  <span>{calculations.pendingInstallments.length} taksit - </span>
                  <span className="font-medium">
                    {formatCurrency(calculations.pendingInstallments.reduce((sum, inst) => sum + inst.amount, 0))}
                  </span>
                </div>
              </div>
            )}

            {calculations.overdueInstallments.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Vadesi Geçen Taksitler</span>
                </div>
                <div className="text-sm">
                  <span>{calculations.overdueInstallments.length} taksit - </span>
                  <span className="font-medium">
                    {formatCurrency(calculations.overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0))}
                  </span>
                </div>
              </div>
            )}

            {calculations.pendingInstallments.length === 0 && calculations.overdueInstallments.length === 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="font-medium">Tüm taksitler güncel</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Promissory Notes Summary */}
      {promissoryNotes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Senet Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Toplam Senet:</span>
                  <div className="font-medium">{promissoryNotes.length}</div>
                </div>
                <div>
                  <span className="text-gray-600">Aktif:</span>
                  <div className="font-medium text-blue-600">{activePromissoryNotes.length}</div>
                </div>
                <div>
                  <span className="text-gray-600">Vadesi Geçen:</span>
                  <div className="font-medium text-red-600">{overduePromissoryNotes.length}</div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Toplam Senet Tutarı:</span>
                  <span className="font-medium">{formatCurrency(totalPromissoryAmount)}</span>
                </div>
              </div>

              {overduePromissoryNotes.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">
                      {overduePromissoryNotes.length} senetin vadesi geçmiş
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
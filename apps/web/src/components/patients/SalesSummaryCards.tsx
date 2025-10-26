import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { DollarSign, Shield, CreditCard, Clock } from 'lucide-react';
import { Sale } from '../../types/patient/patient-communication.types';

interface SalesSummaryCardsProps {
  sales: Sale[];
  sgkCoverageCalculation?: any;
}

export const SalesSummaryCards: React.FC<SalesSummaryCardsProps> = ({
  sales,
  sgkCoverageCalculation
}) => {
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalSGKCoverage = sales.reduce((sum, sale) => sum + (sale.sgkCoverage || 0), 0);
  const totalPatientPayment = sales.reduce((sum, sale) => sum + (sale.totalAmount - (sale.sgkCoverage || 0)), 0);
  const totalPaid = sales.reduce((sum, sale) => {
    const paidAmount = sale.payments?.reduce((paySum, payment) => paySum + payment.amount, 0) || 0;
    return sum + paidAmount;
  }, 0);
  const remainingAmount = totalPatientPayment - totalPaid;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₺{totalSales.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {sales.length} satış
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">SGK Kapsamı</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">₺{totalSGKCoverage.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {totalSales > 0 ? Math.round((totalSGKCoverage / totalSales) * 100) : 0}% kapsam
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hasta Ödemesi</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">₺{totalPatientPayment.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Ödenen: ₺{totalPaid.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Kalan Tutar</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            ₺{remainingAmount.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {remainingAmount > 0 ? 'Bekleyen ödeme' : 'Tamamlandı'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
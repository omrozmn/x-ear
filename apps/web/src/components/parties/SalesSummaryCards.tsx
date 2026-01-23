import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { DollarSign, Shield, CreditCard, Clock } from 'lucide-react';
import { SaleRead } from '../../api/generated/schemas';

// Extended interface to handle runtime properties missing from schema
interface ExtendedSaleRead extends SaleRead {
  partyPayment?: number;
  paidAmount?: number;
  remainingAmount?: number;
}

interface SalesSummaryCardsProps {
  sales: SaleRead[];
  sgkCoverageCalculation?: any;
}

export const SalesSummaryCards: React.FC<SalesSummaryCardsProps> = ({
  sales: rawSales,
  sgkCoverageCalculation
}) => {
  const sales = rawSales as unknown as ExtendedSaleRead[];
  const totalSales = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  const totalSGKCoverage = sales.reduce((sum, sale) => sum + (sale.sgkCoverage || 0), 0);

  // Golden Path: Use backend's 'partyPayment' (aliased from patient_payment)
  const totalPartyPayment = sales.reduce((sum, sale) => sum + (sale.partyPayment || 0), 0);

  // Golden Path: Use backend's 'paidAmount'
  const totalPaid = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);

  // Golden Path: Use backend's 'remainingAmount'
  const remainingAmount = sales.reduce((sum, sale) => sum + (sale.remainingAmount || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium dark:text-gray-200">Toplam Satış</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold dark:text-white">₺{totalSales.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            {sales.length} satış
          </p>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium dark:text-gray-200">SGK Kapsamı</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">₺{totalSGKCoverage.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            {totalSales > 0 ? Math.round((totalSGKCoverage / totalSales) * 100) : 0}% kapsam
          </p>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium dark:text-gray-200">Hasta Ödemesi</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">₺{totalPartyPayment.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            Ödenen: ₺{totalPaid.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium dark:text-gray-200">Kalan Tutar</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${remainingAmount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
            ₺{remainingAmount.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            {remainingAmount > 0 ? 'Bekleyen ödeme' : 'Tamamlandı'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
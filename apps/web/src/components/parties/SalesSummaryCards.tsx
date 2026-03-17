import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { DollarSign, Shield, CreditCard, Clock } from 'lucide-react';
import { SaleRead } from '../../api/generated/schemas';
import { usePermissions } from '../../hooks/usePermissions';

import { ExtendedSaleRead } from '@/types/extended-sales';

interface SalesSummaryCardsProps {
  sales: SaleRead[];
  sgkCoverageCalculation?: {
    totalCoverage: number;
    partyPayment: number;
    deviceCoverage?: {
      maxCoverage: number;
      coveragePercentage: number;
      remainingEntitlement: number;
    } | null;
    batteryCoverage?: {
      maxCoverage: number;
      coveragePercentage: number;
      remainingEntitlement: number;
    } | null;
    totalCoveragePercentage?: number;
  } | null;
}

export const SalesSummaryCards: React.FC<SalesSummaryCardsProps> = ({
  sales: rawSales,
  // sgkCoverageCalculation parameter removed - not used
}) => {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canViewAmounts = isSuperAdmin || hasPermission('sensitive.sales.list.amounts.view');

  const sales = rawSales as unknown as ExtendedSaleRead[];
  const totalSales = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  const totalSGKCoverage = sales.reduce((sum, sale) => sum + (sale.sgkCoverage || 0), 0);

  // Golden Path: Use backend's 'partyPayment' (aliased from patient_payment)
  const totalPartyPayment = sales.reduce((sum, sale) => sum + (sale.partyPayment || 0), 0);

  // Golden Path: Use backend's 'paidAmount'
  const totalPaid = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);

  // Golden Path: Use backend's 'remainingAmount'
  const remainingAmount = sales.reduce((sum, sale) => sum + (sale.remainingAmount || 0), 0);

  const maskedValue = '***';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-200">Toplam Satış</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <div className="text-lg md:text-2xl font-bold dark:text-white">{canViewAmounts ? `₺${totalSales.toLocaleString()}` : maskedValue}</div>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            {sales.length} satış
          </p>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-200">SGK Kapsamı</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <div className="text-lg md:text-2xl font-bold text-success">{canViewAmounts ? `₺${totalSGKCoverage.toLocaleString()}` : maskedValue}</div>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            {canViewAmounts ? `${totalSales > 0 ? Math.round((totalSGKCoverage / totalSales) * 100) : 0}% kapsam` : maskedValue}
          </p>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-200">Hasta Ödemesi</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <div className="text-lg md:text-2xl font-bold text-primary">{canViewAmounts ? `₺${totalPartyPayment.toLocaleString()}` : maskedValue}</div>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            {canViewAmounts ? `Ödenen: ₺${totalPaid.toLocaleString()}` : maskedValue}
          </p>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-200">Kalan Tutar</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <div className={`text-lg md:text-2xl font-bold ${!canViewAmounts ? 'text-muted-foreground' : remainingAmount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-success'}`}>
            {canViewAmounts ? `₺${remainingAmount.toLocaleString()}` : maskedValue}
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            {canViewAmounts ? (remainingAmount > 0 ? 'Bekleyen ödeme' : 'Tamamlandı') : 'Gizli'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
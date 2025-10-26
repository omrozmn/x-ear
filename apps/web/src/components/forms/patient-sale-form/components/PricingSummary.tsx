import React from 'react';
import { Card, CardContent } from '@x-ear/ui-web';
import { Calculator } from 'lucide-react';

interface PricingSummaryProps {
  totalListPrice: number;
  totalSalePrice: number;
  totalSgkCoverage: number;
  totalPatientPayment: number;
  totalDiscount: number;
  totalVat?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

export const PricingSummary: React.FC<PricingSummaryProps> = ({
  totalListPrice,
  totalSalePrice,
  totalSgkCoverage,
  totalPatientPayment,
  totalDiscount,
  totalVat = 0,
  discountType = 'fixed',
  discountValue = 0
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">Fiyat Özeti</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-600">Liste Fiyatı:</span>
            <span className="text-xs font-medium text-gray-800">
              {formatCurrency(totalListPrice)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-600">Satış Fiyatı:</span>
            <span className="text-xs font-medium text-gray-800">
              {formatCurrency(totalSalePrice)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-green-600">İndirim:</span>
            <span className="text-xs font-medium text-green-600">
              -{formatCurrency(totalDiscount)}
              {discountType === 'percentage' && discountValue > 0 && (
                <span className="ml-1 text-xs">(%{discountValue})</span>
              )}
            </span>
          </div>
          
          {totalVat > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-gray-600">KDV:</span>
              <span className="text-xs font-medium text-gray-800">
                {formatCurrency(totalVat)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-blue-600">SGK Desteği:</span>
            <span className="text-xs font-medium text-blue-600">
              {formatCurrency(totalSgkCoverage)}
            </span>
          </div>
          
          <div className="border-t border-gray-300 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">Hasta Payı:</span>
              <span className="text-sm font-bold text-red-600">
                {formatCurrency(totalPatientPayment)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
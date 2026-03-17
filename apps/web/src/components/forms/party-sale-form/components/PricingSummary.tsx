import React from 'react';
import { Card, CardContent } from '@x-ear/ui-web';
import { Calculator } from 'lucide-react';

interface PricingSummaryProps {
  totalListPrice: number;
  totalSalePrice: number;
  totalSgkCoverage: number;
  totalPartyPayment: number;
  totalDiscount: number;
  totalVat?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

export const PricingSummary: React.FC<PricingSummaryProps> = ({
  totalListPrice,
  totalSalePrice,
  totalSgkCoverage,
  totalPartyPayment,
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
    <Card className="bg-muted border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Fiyat Özeti</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-muted-foreground">Liste Fiyatı:</span>
            <span className="text-xs font-medium text-foreground">
              {formatCurrency(totalListPrice)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-muted-foreground">Satış Fiyatı:</span>
            <span className="text-xs font-medium text-foreground">
              {formatCurrency(totalSalePrice)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-success">İndirim:</span>
            <span className="text-xs font-medium text-success">
              -{formatCurrency(totalDiscount)}
              {discountType === 'percentage' && discountValue > 0 && (
                <span className="ml-1 text-xs">(%{discountValue})</span>
              )}
            </span>
          </div>
          
          {totalVat > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-muted-foreground">KDV:</span>
              <span className="text-xs font-medium text-foreground">
                {formatCurrency(totalVat)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-primary">SGK Desteği:</span>
            <span className="text-xs font-medium text-primary">
              {formatCurrency(totalSgkCoverage)}
            </span>
          </div>
          
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Hasta Payı:</span>
              <span className="text-sm font-bold text-destructive">
                {formatCurrency(totalPartyPayment)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
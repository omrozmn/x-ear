import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input
} from '@x-ear/ui-web';
import { Calculator } from 'lucide-react';

interface PricingDetails {
  basePrice: number;
  discountAmount: number;
  discountPercent: number;
  vatAmount: number;
  sgkDiscount: number;
  totalAmount: number;
  installmentAmount?: number;
}

interface PricingPreviewComponentProps {
  pricingDetails: PricingDetails;
  customPrice: string;
  onCustomPriceChange: (value: string) => void;
  discountPercent: string;
  onDiscountPercentChange: (value: string) => void;
  sgkEnabled: boolean;
  onSgkToggle: (enabled: boolean) => void;
  sgkDiscount: string;
  onSgkDiscountChange: (value: string) => void;
  sgkCode: string;
  onSgkCodeChange: (value: string) => void;
}

export const PricingPreviewComponent: React.FC<PricingPreviewComponentProps> = ({
  pricingDetails,
  customPrice,
  onCustomPriceChange,
  discountPercent,
  onDiscountPercentChange,
  sgkEnabled,
  onSgkToggle,
  sgkDiscount,
  onSgkDiscountChange,
  sgkCode,
  onSgkCodeChange
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-purple-600" />
          Fiyat Önizleme
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 p-4 bg-muted border border-border rounded-2xl">
          {/* Custom Price Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Özel Fiyat (Opsiyonel)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Input data-allow-raw="true"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={customPrice}
                onChange={(e) => onCustomPriceChange(e.target.value)}
                className="text-right"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="İndirim %"
                value={discountPercent}
                onChange={(e) => onDiscountPercentChange(e.target.value)}
                className="text-right"
              />
            </div>
          </div>

          {/* SGK Options */}
          <div>
            <label className="flex items-center space-x-2 mb-3">
              <input data-allow-raw="true"
                type="checkbox"
                checked={sgkEnabled}
                onChange={(e) => onSgkToggle(e.target.checked)}
                className="rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-sm font-medium text-foreground">SGK İndirimi Uygula</span>
            </label>
            
            {sgkEnabled && (
              <div className="grid grid-cols-3 gap-4">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="SGK İndirim %"
                  value={sgkDiscount}
                  onChange={(e) => onSgkDiscountChange(e.target.value)}
                  className="text-right"
                />
                <Input
                  type="text"
                  placeholder="SGK Kodu"
                  value={sgkCode}
                  onChange={(e) => onSgkCodeChange(e.target.value)}
                  className="col-span-2"
                />
              </div>
            )}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-2xl">
              <span className="text-sm font-medium text-muted-foreground">Temel Fiyat:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(pricingDetails.basePrice)}
              </span>
            </div>

            {pricingDetails.discountAmount > 0 && (
              <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-2xl">
                <span className="text-sm font-medium text-destructive">
                  İndirim ({pricingDetails.discountPercent.toFixed(1)}%):
                </span>
                <span className="font-semibold text-destructive">
                  -{formatCurrency(pricingDetails.discountAmount)}
                </span>
              </div>
            )}

            {pricingDetails.sgkDiscount > 0 && (
              <div className="flex justify-between items-center p-3 bg-success/10 rounded-2xl">
                <span className="text-sm font-medium text-success">SGK İndirimi:</span>
                <span className="font-semibold text-success">
                  -{formatCurrency(pricingDetails.sgkDiscount)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-2xl">
              <span className="text-sm font-medium text-primary">KDV:</span>
              <span className="font-semibold text-primary">
                {formatCurrency(pricingDetails.vatAmount)}
              </span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                <span className="text-lg font-bold text-success">TOPLAM TUTAR:</span>
                <span className="text-xl font-bold text-success">
                  {formatCurrency(pricingDetails.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingPreviewComponent;
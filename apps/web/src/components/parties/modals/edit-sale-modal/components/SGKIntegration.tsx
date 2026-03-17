import React from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label
} from '@x-ear/ui-web';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';
import type { SGKScheme } from '../types';

interface SGKIntegrationProps {
  sgkSchemes: SGKScheme[];
  selectedScheme: SGKScheme | null;
  sgkCoverage: number;
  sgkApprovalNumber: string;
  sgkApprovalDate: string;
  onSchemeSelect: (scheme: SGKScheme) => void;
  onApprovalNumberChange: (value: string) => void;
  onApprovalDateChange: (value: string) => void;
  onShowSgkModal: () => void;
}

export const SGKIntegration: React.FC<SGKIntegrationProps> = ({
  sgkSchemes,
  selectedScheme,
  sgkCoverage,
  sgkApprovalNumber,
  sgkApprovalDate,
  onSchemeSelect,
  onApprovalNumberChange,
  onApprovalDateChange,
  onShowSgkModal
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          SGK Entegrasyonu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SGK Scheme Selection */}
        <div>
          <Label>SGK Şeması</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {sgkSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className={`p-3 border rounded-2xl cursor-pointer transition-colors ${
                  selectedScheme?.id === scheme.id
                    ? 'border-blue-500 bg-primary/10'
                    : 'border-border hover:border-border'
                }`}
                onClick={() => onSchemeSelect(scheme)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{scheme.name}</div>
                    <div className="text-xs text-muted-foreground">{scheme.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{scheme.coveragePercentage}%</div>
                    {scheme.maxAmount && (
                      <div className="text-xs text-muted-foreground">
                        Max: {formatCurrency(scheme.maxAmount)}
                      </div>
                    )}
                  </div>
                </div>
                {selectedScheme?.id === scheme.id && (
                  <CheckCircle className="w-4 h-4 text-primary mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SGK Coverage Display */}
        {selectedScheme && (
          <div className="p-4 bg-success/10 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-medium text-success">SGK Karşılığı Hesaplandı</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Seçili Şema:</span>
                <div className="font-medium">{selectedScheme.name}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Karşılık Tutarı:</span>
                <div className="font-medium text-success">{formatCurrency(sgkCoverage)}</div>
              </div>
            </div>
          </div>
        )}

        {/* SGK Approval Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sgkApprovalNumber">SGK Onay Numarası</Label>
            <Input
              id="sgkApprovalNumber"
              value={sgkApprovalNumber}
              onChange={(e) => onApprovalNumberChange(e.target.value)}
              placeholder="Onay numarası giriniz"
            />
          </div>

          <div>
            <Label htmlFor="sgkApprovalDate">SGK Onay Tarihi</Label>
            <Input
              id="sgkApprovalDate"
              type="date"
              value={sgkApprovalDate}
              onChange={(e) => onApprovalDateChange(e.target.value)}
            />
          </div>
        </div>

        {/* SGK Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onShowSgkModal}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            SGK Sorgula
          </Button>
          
          {!selectedScheme && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">SGK şeması seçilmedi</span>
            </div>
          )}
        </div>

        {/* SGK Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• SGK karşılığı otomatik olarak hesaplanır</p>
          <p>• Onay numarası ve tarihi zorunlu değildir</p>
          <p>• SGK sorgulama için hasta TC kimlik numarası gereklidir</p>
        </div>
      </CardContent>
    </Card>
  );
};